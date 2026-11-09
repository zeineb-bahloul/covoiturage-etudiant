const express = require('express');
const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');
const auth = require('../middleware/auth');
const { itineraire } = require('../services/ors');
const { creerNotification } = require('../services/notifier');
const { calculerScoreCompatibiliteDetaille, distanceKm, enMinutes } = require('../services/matching');

const router = express.Router();

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function pointValide(p) {
  return (
    p &&
    typeof p.label === 'string' &&
    p.label.trim() !== '' &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

function ajouterMinutes(heure, minutes) {
  const [h, m] = heure.split(':').map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function simplifier(points, max = 150) {
  if (!points || !points.length) return [];
  const pas = Math.ceil(points.length / max);
  const resultat = points.filter((_, i) => i % pas === 0);
  const dernier = points[points.length - 1];
  if (resultat[resultat.length - 1] !== dernier) resultat.push(dernier);
  return resultat;
}

// 1. Publier un trajet (US6)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.vehicule) {
      return res.status(400).json({ message: "Ajoutez d'abord votre véhicule dans votre profil" });
    }

    const { depart, destination, heureDepart, places, prix, recurrent, jours, date } = req.body;

    if (!pointValide(depart) || !pointValide(destination)) {
      return res.status(400).json({ message: 'Départ et destination invalides' });
    }
    if (!HEURE.test(heureDepart || '')) {
      return res.status(400).json({ message: 'Heure de départ invalide (format HH:MM)' });
    }

    const nbPlaces = Number(places);
    if (!Number.isInteger(nbPlaces) || nbPlaces < 1 || nbPlaces > user.vehicule.places) {
      return res
        .status(400)
        .json({ message: `Places : entre 1 et ${user.vehicule.places} (capacité de votre véhicule)` });
    }

    const montant = Number(prix);
    if (!Number.isFinite(montant) || montant < 0 || montant > 200) {
      return res.status(400).json({ message: 'Prix invalide (entre 0 et 200 DT)' });
    }

    if (recurrent) {
      if (!Array.isArray(jours) || jours.length === 0 || !jours.every((j) => JOURS.includes(j))) {
        return res.status(400).json({ message: 'Choisissez au moins un jour valide' });
      }
    } else {
      const aujourdhui = new Date().toISOString().slice(0, 10);
      if (!DATE.test(date || '') || isNaN(new Date(date))) {
        return res.status(400).json({ message: 'Date invalide (format AAAA-MM-JJ)' });
      }
      if (date < aujourdhui) {
        return res.status(400).json({ message: 'La date ne peut pas être dans le passé' });
      }
    }

    let route;
    try {
      route = await itineraire(depart, destination);
    } catch (err) {
      console.error('Erreur itinéraire :', err.response?.status, err.message);
      return res.status(502).json({ message: "Impossible de calculer l'itinéraire pour le moment" });
    }

    const ride = await Ride.create({
      conducteur: req.userId,
      depart: { label: depart.label.trim(), location: { type: 'Point', coordinates: [depart.lng, depart.lat] } },
      destination: {
        label: destination.label.trim(),
        location: { type: 'Point', coordinates: [destination.lng, destination.lat] },
      },
      heureDepart,
      heureArrivee: ajouterMinutes(heureDepart, route.dureeMin),
      recurrent: !!recurrent,
      jours: recurrent ? jours : [],
      date: recurrent ? undefined : new Date(date),
      places: nbPlaces,
      prix: montant,
      distanceKm: route.distanceKm,
      dureeMin: route.dureeMin,
      itineraire: simplifier(route.points),
      statut: 'actif',
    });

    const resume = ride.toObject();
    delete resume.itineraire;
    res.status(201).json(resume);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 2. Récupérer les trajets du conducteur connecté (US6, US10, US21)
router.get('/mine', auth, async (req, res) => {
  try {
    const rides = await Ride.find({
      conducteur: req.userId,
      statut: { $in: ['actif', 'en_cours'] },
    })
      .select('-itineraire')
      .sort({ createdAt: -1 });

    const rideIds = rides.map((r) => r._id);
    const bookings = await Booking.find({ trajet: { $in: rideIds } }).populate(
      'passager',
      'nom photo filiere'
    );

    const resultats = rides.map((r) => {
      const obj = r.toObject();
      const rBookings = bookings.filter((b) => b.trajet.toString() === r._id.toString());
      obj.demandesEnAttente = rBookings.filter((b) => b.statut === 'en_attente').length;
      obj.demandesAcceptees = rBookings.filter((b) => b.statut === 'acceptee').length;
      obj.passagersConfirmes = rBookings.filter((b) => b.statut === 'acceptee').map((b) => b.passager);
      obj.totalDemandes = rBookings.length;
      return obj;
    });

    res.json(resultats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 3. Suggestions intelligentes de trajets pour la page d'accueil (US11 - Matching intelligent)
router.get('/suggestions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const userSchedule = await Schedule.findOne({ user: req.userId });

    const rides = await Ride.find({
      conducteur: { $ne: req.userId },
      statut: { $in: ['actif', 'en_cours'] },
      places: { $gt: 0 },
    })
      .select('-itineraire')
      .populate('conducteur', 'nom filiere photo noteMoyenne preferences vehicule')
      .sort({ createdAt: -1 })
      .limit(15);

    const enrichis = rides.map((r) => {
      const obj = r.toObject();
      const matchCalc = calculerScoreCompatibiliteDetaille({
        ride: r,
        passenger: user,
        passengerSchedule: userSchedule,
        distDepartKm: 1.8,
      });
      obj.scoreMatch = matchCalc.scoreTotal;
      obj.matchDetails = matchCalc.details;
      return obj;
    });

    enrichis.sort((a, b) => b.scoreMatch - a.scoreMatch);
    res.json(enrichis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 4. Recherche de trajets avec filtres (US7)
router.get('/search', auth, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const { date, heure, nonFumeur, mixte } = req.query;
    const rayonKm = Math.min(Number(req.query.rayon) || 10, 30);
    const noteMin = Number(req.query.noteMin) || 0;
    const prixMax =
      req.query.prixMax !== undefined && req.query.prixMax !== '' ? Number(req.query.prixMax) : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'Position de départ invalide' });
    }
    if (!DATE.test(date || '') || isNaN(new Date(date))) {
      return res.status(400).json({ message: 'Date invalide (format AAAA-MM-JJ)' });
    }
    if (heure && !HEURE.test(heure)) {
      return res.status(400).json({ message: 'Heure invalide (format HH:MM)' });
    }

    const jour = NOMS_JOURS[new Date(`${date}T12:00:00Z`).getUTCDay()];
    const debutJour = new Date(date);
    const finJour = new Date(debutJour.getTime() + 24 * 60 * 60 * 1000);

    const filtre = {
      statut: { $in: ['actif', 'en_cours'] },
      conducteur: { $ne: req.userId },
      places: { $gt: 0 },
      'depart.location': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: rayonKm * 1000,
        },
      },
      $or: [
        { recurrent: true, jours: jour },
        { recurrent: false, date: { $gte: debutJour, $lt: finJour } },
      ],
    };

    if (prixMax !== null && Number.isFinite(prixMax)) {
      filtre.prix = { $lte: prixMax };
    }

    let rides = await Ride.find(filtre)
      .select('-itineraire')
      .limit(50)
      .populate('conducteur', 'nom filiere photo noteMoyenne preferences vehicule');

    if (heure) {
      const voulu = enMinutes(heure);
      rides = rides.filter((r) => Math.abs(enMinutes(r.heureDepart) - voulu) <= 90);
    }
    if (noteMin > 0) {
      rides = rides.filter((r) => r.conducteur && (r.conducteur.noteMoyenne || 0) >= noteMin);
    }
    if (nonFumeur === 'true') {
      rides = rides.filter((r) => r.conducteur?.preferences?.nonFumeur === true);
    }
    if (mixte === 'true') {
      rides = rides.filter((r) => r.conducteur?.preferences?.mixte === true);
    }

    const user = await User.findById(req.userId);
    const userSchedule = await Schedule.findOne({ user: req.userId });

    const resultats = rides.map((r) => {
      const o = r.toObject();
      const [lngD, latD] = r.depart.location.coordinates;
      const d = Math.round(distanceKm(lat, lng, latD, lngD) * 10) / 10;
      o.distanceDepartKm = d;

      const matchCalc = calculerScoreCompatibiliteDetaille({
        ride: r,
        passenger: user,
        passengerSchedule: userSchedule,
        distDepartKm: d,
      });

      o.scoreMatch = matchCalc.scoreTotal;
      o.matchDetails = matchCalc.details;
      return o;
    });

    resultats.sort((a, b) => b.scoreMatch - a.scoreMatch);
    res.json(resultats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 5. Score de compatibilité détaillé (US11)
router.get('/:id/compatibility', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const ride = await Ride.findById(req.params.id).populate(
      'conducteur',
      'nom filiere photo noteMoyenne preferences vehicule'
    );
    if (!ride) {
      return res.status(404).json({ message: 'Trajet introuvable' });
    }

    const user = await User.findById(req.userId);
    const userSchedule = await Schedule.findOne({ user: req.userId });

    const matchCalc = calculerScoreCompatibiliteDetaille({
      ride,
      passenger: user,
      passengerSchedule: userSchedule,
      distDepartKm: 1.5,
    });

    res.json(matchCalc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 6. Informations sur un trajet en cours (US21)
router.get('/:id/active', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const ride = await Ride.findById(req.params.id).populate(
      'conducteur',
      'nom filiere photo noteMoyenne vehicule preferences'
    );
    if (!ride) {
      return res.status(404).json({ message: 'Trajet introuvable' });
    }

    // Récupérer les passagers confirmés
    const bookings = await Booking.find({
      trajet: req.params.id,
      statut: 'acceptee',
    }).populate('passager', 'nom photo filiere noteMoyenne');

    const passagers = bookings.map((b) => ({
      _id: b.passager._id,
      nom: b.passager.nom,
      photo: b.passager.photo,
      filiere: b.passager.filiere,
      places: b.places,
      present: true,
    }));

    const estConducteur = ride.conducteur._id.toString() === req.userId;
    const estPassager = bookings.some((b) => b.passager._id.toString() === req.userId);

    const gains = bookings.reduce((sum, b) => sum + (ride.prix || 0) * (b.places || 1), 0);
    // Calcul écologique indicatif (Cahier des charges) : environ 0.12 kg CO2 / km partagé
    const co2EviteKg = Math.round((ride.distanceKm || 10) * passagers.length * 0.12 * 10) / 10;

    res.json({
      ride,
      estConducteur,
      estPassager,
      passagers,
      nbPassagers: passagers.length,
      gainsEstimes: gains,
      co2EviteKg,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 7. Démarrer un trajet (US21 - Conducteur)
router.patch('/:id/start', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const ride = await Ride.findById(req.params.id).populate(
      'conducteur',
      'nom filiere photo noteMoyenne vehicule'
    );
    if (!ride) {
      return res.status(404).json({ message: 'Trajet introuvable' });
    }

    if (ride.conducteur._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Seul le conducteur peut démarrer ce trajet' });
    }

    if (ride.statut === 'en_cours') {
      return res.json({ message: 'Trajet déjà en cours', ride });
    }

    if (ride.statut === 'termine') {
      return res.status(400).json({ message: 'Ce trajet est déjà terminé' });
    }

    ride.statut = 'en_cours';
    ride.startedAt = new Date();
    await ride.save();

    // Trouver tous les passagers confirmés et les notifier (US13)
    const bookings = await Booking.find({ trajet: ride._id, statut: 'acceptee' });
    for (const b of bookings) {
      await creerNotification({
        destinataire: b.passager,
        emetteur: req.userId,
        type: 'trajet_demarre',
        titre: 'Trajet en cours ! 🚗💨',
        message: `${ride.conducteur.nom} a démarré le trajet vers ${ride.destination.label.split(',')[0]}. Tenez-vous prêt !`,
        donnees: { trajetId: ride._id, bookingId: b._id },
      });
    }

    res.json({ message: 'Trajet démarré avec succès', ride });
  } catch (err) {
    console.error('Erreur démarrage trajet :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 8. Terminer un trajet (US21 - Conducteur)
router.patch('/:id/finish', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const ride = await Ride.findById(req.params.id).populate(
      'conducteur',
      'nom filiere photo noteMoyenne vehicule'
    );
    if (!ride) {
      return res.status(404).json({ message: 'Trajet introuvable' });
    }

    if (ride.conducteur._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Seul le conducteur peut terminer ce trajet' });
    }

    ride.statut = 'termine';
    ride.finishedAt = new Date();
    await ride.save();

    // Trouver tous les passagers confirmés et les notifier pour la notation (US13, US14)
    const bookings = await Booking.find({ trajet: ride._id, statut: 'acceptee' });
    for (const b of bookings) {
      await creerNotification({
        destinataire: b.passager,
        emetteur: req.userId,
        type: 'trajet_termine',
        titre: 'Trajet terminé ! 🏁',
        message: `Vous êtes bien arrivé à destination. Prenez un instant pour noter votre trajet avec ${ride.conducteur.nom}.`,
        donnees: { trajetId: ride._id, bookingId: b._id },
      });
    }

    const gains = bookings.reduce((sum, b) => sum + (ride.prix || 0) * (b.places || 1), 0);
    const co2EviteKg = Math.round((ride.distanceKm || 10) * bookings.length * 0.12 * 10) / 10;

    res.json({
      message: 'Trajet terminé avec succès !',
      ride,
      recapitulatif: {
        passagersTransportes: bookings.length,
        gainsRealises: gains,
        co2EviteKg,
        distanceKm: ride.distanceKm,
        dureeMin: ride.dureeMin,
      },
    });
  } catch (err) {
    console.error('Erreur fin de trajet :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 9. Détail d'un trajet (US8, US11)
router.get('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const ride = await Ride.findById(req.params.id).populate(
      'conducteur',
      'nom filiere photo noteMoyenne preferences vehicule email'
    );

    if (!ride) {
      return res.status(404).json({ message: 'Trajet introuvable' });
    }

    const user = await User.findById(req.userId);
    const userSchedule = await Schedule.findOne({ user: req.userId });

    const obj = ride.toObject();
    const matchCalc = calculerScoreCompatibiliteDetaille({
      ride,
      passenger: user,
      passengerSchedule: userSchedule,
      distDepartKm: 1.5,
    });

    obj.scoreMatch = matchCalc.scoreTotal;
    obj.matchDetails = matchCalc.details;
    obj.estConducteur = ride.conducteur._id.toString() === req.userId;

    res.json(obj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 10. Annuler un trajet (conducteur)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, conducteur: req.userId, statut: { $in: ['actif', 'en_cours'] } },
      { $set: { statut: 'annule' } },
      { new: true }
    ).select('-itineraire');

    if (!ride) {
      return res.status(404).json({ message: 'Trajet introuvable ou déjà terminé' });
    }

    // Trouver les réservations pour notifier les passagers (US13)
    const bookings = await Booking.find({
      trajet: req.params.id,
      statut: { $in: ['en_attente', 'acceptee'] },
    });

    for (const b of bookings) {
      await creerNotification({
        destinataire: b.passager,
        emetteur: req.userId,
        type: 'trajet_annule',
        titre: 'Trajet annulé',
        message: `Le conducteur a dû annuler son trajet vers ${ride.destination?.label?.split(',')[0] || 'ISET Nabeul'}.`,
        donnees: { trajetId: req.params.id, bookingId: b._id },
      });
    }

    await Booking.updateMany(
      { trajet: req.params.id, statut: { $in: ['en_attente', 'acceptee'] } },
      { $set: { statut: 'annulee' } }
    );

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
