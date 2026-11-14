const express = require('express');
const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Schedule = require('../models/Schedule');
const auth = require('../middleware/auth');
const { itineraire } = require('../services/ors');
const { creerNotification } = require('../services/notifier');
const { calculerScore, distanceKm, enMinutes, NOMS_JOURS } = require('../services/matching');
const { CO2_KG_PAR_KM } = require('../services/badges');

const router = express.Router();

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHAMPS_CONDUCTEUR = 'nom filiere photo noteMoyenne nombreAvis preferences vehicule';
const SEUIL_SUGGESTION = 75; // score minimum pour envoyer une notification « nouvelle suggestion »

const aujourdhui = () => new Date().toISOString().slice(0, 10);
const idValide = (id) => mongoose.isValidObjectId(id);

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
  const total = (enMinutes(heure) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function simplifier(points, max = 150) {
  if (!points || !points.length) return [];
  const pas = Math.ceil(points.length / max);
  const resultat = points.filter((_, i) => i % pas === 0);
  const dernier = points[points.length - 1];
  if (resultat[resultat.length - 1] !== dernier) resultat.push(dernier);
  return resultat;
}

const court = (label) => (label || '').split(',')[0].trim();

/** Trajet encore à venir : récurrent, ou ponctuel dont la date n'est pas passée. */
const filtreAVenir = () => ({
  $or: [{ recurrent: true }, { recurrent: false, date: { $gte: new Date(aujourdhui()) } }],
});

async function contextePassager(userId) {
  const [user, schedule] = await Promise.all([User.findById(userId), Schedule.findOne({ user: userId })]);
  return { user, schedule };
}

function enrichir(ride, ctx, pointDepart) {
  const o = ride.toObject();
  const calc = calculerScore({ ride, passager: ctx.user, schedule: ctx.schedule, pointDepart });
  o.scoreMatch = calc.scoreTotal;
  o.matchDetails = calc.details;
  o.distanceDepartKm = calc.details.proximite.km;
  delete o.itineraire;
  return o;
}

/** Après publication : prévenir les étudiants très compatibles (US13 « nouvelle suggestion »). */
async function notifierSuggestions(ride) {
  try {
    const candidats = await User.find({ _id: { $ne: ride.conducteur._id }, domicile: { $ne: null } }).limit(300);
    for (const user of candidats) {
      const schedule = await Schedule.findOne({ user: user._id });
      if (!schedule || schedule.jours.length === 0) continue;
      const { scoreTotal, details } = calculerScore({ ride, passager: user, schedule });
      if (scoreTotal < SEUIL_SUGGESTION) continue;
      const km = details.proximite.km;
      await creerNotification({
        destinataire: user._id,
        emetteur: ride.conducteur._id,
        type: 'suggestion',
        titre: `Nouveau trajet compatible à ${scoreTotal} %`,
        message: `${ride.conducteur.nom} passe à ${String(km).replace('.', ',')} km de chez vous (arrivée ${ride.heureArrivee}).`,
        donnees: { trajetId: ride._id },
      });
    }
  } catch (err) {
    console.error('Erreur suggestions :', err.message);
  }
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
      return res.status(400).json({ message: `Places : entre 1 et ${user.vehicule.places} (capacité de votre véhicule)` });
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
      if (!DATE.test(date || '') || isNaN(new Date(date))) {
        return res.status(400).json({ message: 'Date invalide (format AAAA-MM-JJ)' });
      }
      if (date < aujourdhui()) {
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
      jours: recurrent ? JOURS.filter((j) => jours.includes(j)) : [],
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

    // Suggestions envoyées après la réponse pour ne pas ralentir la publication
    ride.conducteur = user;
    notifierSuggestions(ride);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 2. Mes trajets (conducteur) — ?historique=1 pour les trajets terminés / annulés
router.get('/mine', auth, async (req, res) => {
  try {
    const historique = req.query.historique === '1';
    const rides = await Ride.find({
      conducteur: req.userId,
      statut: historique ? { $in: ['termine', 'annule'] } : { $in: ['actif', 'en_cours'] },
    })
      .select('-itineraire')
      .sort(historique ? { updatedAt: -1 } : { createdAt: -1 })
      .limit(historique ? 30 : 100);

    const bookings = await Booking.find({ trajet: { $in: rides.map((r) => r._id) } }).populate(
      'passager',
      'nom photo filiere noteMoyenne'
    );

    res.json(
      rides.map((r) => {
        const obj = r.toObject();
        const rb = bookings.filter((b) => b.trajet.toString() === r._id.toString());
        const acceptees = rb.filter((b) => b.statut === 'acceptee');
        obj.demandesEnAttente = rb.filter((b) => b.statut === 'en_attente').length;
        obj.demandesAcceptees = acceptees.length;
        obj.passagersConfirmes = acceptees.map((b) => b.passager).filter(Boolean);
        obj.totalDemandes = rb.length;
        return obj;
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 3. Suggestions intelligentes pour l'accueil (US11 — matching)
router.get('/suggestions', auth, async (req, res) => {
  try {
    const ctx = await contextePassager(req.userId);
    const dejaReserves = await Booking.find({
      passager: req.userId,
      statut: { $in: ['en_attente', 'acceptee'] },
    }).distinct('trajet');

    const rides = await Ride.find({
      conducteur: { $ne: req.userId },
      _id: { $nin: dejaReserves },
      statut: 'actif',
      places: { $gt: 0 },
      ...filtreAVenir(),
    })
      .populate('conducteur', CHAMPS_CONDUCTEUR)
      .sort({ createdAt: -1 })
      .limit(60);

    const resultats = rides
      .filter((r) => r.conducteur)
      .map((r) => enrichir(r, ctx))
      .sort((a, b) => b.scoreMatch - a.scoreMatch)
      .slice(0, 10);

    res.json(resultats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 4. Recherche avec filtres (US7)
router.get('/search', auth, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const { date, heure, nonFumeur, mixte } = req.query;
    const rayonKm = Math.min(Number(req.query.rayon) || 15, 50);
    const noteMin = Number(req.query.noteMin) || 0;
    const prixMax = req.query.prixMax !== undefined && req.query.prixMax !== '' ? Number(req.query.prixMax) : null;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'Position de départ invalide' });
    }
    if (!DATE.test(date || '') || isNaN(new Date(date))) {
      return res.status(400).json({ message: 'Date invalide (format AAAA-MM-JJ)' });
    }
    if (date < aujourdhui()) {
      return res.status(400).json({ message: 'Choisissez une date à partir d’aujourd’hui' });
    }
    if (heure && !HEURE.test(heure)) {
      return res.status(400).json({ message: 'Heure invalide (format HH:MM)' });
    }

    const jour = NOMS_JOURS[new Date(`${date}T12:00:00Z`).getUTCDay()];
    const debutJour = new Date(date);
    const finJour = new Date(debutJour.getTime() + 24 * 60 * 60 * 1000);

    const filtre = {
      statut: 'actif',
      conducteur: { $ne: req.userId },
      places: { $gt: 0 },
      'depart.location': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: rayonKm * 1000,
        },
      },
      $or: [{ recurrent: true, jours: jour }, { recurrent: false, date: { $gte: debutJour, $lt: finJour } }],
    };
    if (prixMax !== null && Number.isFinite(prixMax)) filtre.prix = { $lte: prixMax };

    let rides = await Ride.find(filtre).limit(50).populate('conducteur', CHAMPS_CONDUCTEUR);
    rides = rides.filter((r) => r.conducteur);

    if (heure) {
      const voulu = enMinutes(heure);
      rides = rides.filter((r) => Math.abs(enMinutes(r.heureDepart) - voulu) <= 90);
    }
    if (noteMin > 0) rides = rides.filter((r) => (r.conducteur.noteMoyenne || 0) >= noteMin);
    if (nonFumeur === 'true') rides = rides.filter((r) => r.conducteur.preferences?.nonFumeur === true);
    if (mixte === 'true') rides = rides.filter((r) => r.conducteur.preferences?.mixte === true);

    const ctx = await contextePassager(req.userId);
    const resultats = rides.map((r) => {
      const o = enrichir(r, ctx, { lat, lng });
      const [lngD, latD] = r.depart.location.coordinates;
      o.distanceDepartKm = Math.round(distanceKm(lat, lng, latD, lngD) * 10) / 10;
      return o;
    });

    const tri = req.query.tri;
    if (tri === 'prix') resultats.sort((a, b) => a.prix - b.prix);
    else if (tri === 'heure') resultats.sort((a, b) => enMinutes(a.heureDepart) - enMinutes(b.heureDepart));
    else resultats.sort((a, b) => b.scoreMatch - a.scoreMatch);

    res.json(resultats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 5. Score de compatibilité détaillé (US11)
router.get('/:id/compatibility', auth, async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });
    const ride = await Ride.findById(req.params.id).populate('conducteur', CHAMPS_CONDUCTEUR);
    if (!ride) return res.status(404).json({ message: 'Trajet introuvable' });

    const ctx = await contextePassager(req.userId);
    res.json(calculerScore({ ride, passager: ctx.user, schedule: ctx.schedule }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 6. Informations sur un trajet en cours (US21)
router.get('/:id/active', auth, async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });

    const ride = await Ride.findById(req.params.id).populate('conducteur', CHAMPS_CONDUCTEUR);
    if (!ride) return res.status(404).json({ message: 'Trajet introuvable' });

    const bookings = await Booking.find({ trajet: ride._id, statut: 'acceptee' }).populate(
      'passager',
      'nom photo filiere noteMoyenne'
    );

    const estConducteur = ride.conducteur._id.toString() === req.userId;
    const estPassager = bookings.some((b) => b.passager?._id.toString() === req.userId);
    if (!estConducteur && !estPassager) {
      return res.status(403).json({ message: 'Vous ne participez pas à ce trajet' });
    }

    const passagers = bookings
      .filter((b) => b.passager)
      .map((b) => ({
        _id: b.passager._id,
        nom: b.passager.nom,
        photo: b.passager.photo,
        filiere: b.passager.filiere,
        noteMoyenne: b.passager.noteMoyenne,
        places: b.places,
      }));
    const nbPlaces = bookings.reduce((s, b) => s + (b.places || 1), 0);

    res.json({
      ride,
      estConducteur,
      estPassager,
      passagers,
      nbPassagers: passagers.length,
      gainsEstimes: nbPlaces * (ride.prix || 0),
      co2EviteKg: Math.round((ride.distanceKm || 0) * nbPlaces * CO2_KG_PAR_KM * 10) / 10,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 7. Démarrer un trajet (US21)
router.patch('/:id/start', auth, async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });

    const ride = await Ride.findById(req.params.id).populate('conducteur', 'nom');
    if (!ride) return res.status(404).json({ message: 'Trajet introuvable' });
    if (ride.conducteur._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Seul le conducteur peut démarrer ce trajet' });
    }
    if (ride.statut === 'en_cours') return res.json({ message: 'Trajet déjà en cours', ride });
    if (ride.statut !== 'actif') {
      return res.status(400).json({ message: 'Ce trajet est terminé ou annulé' });
    }

    ride.statut = 'en_cours';
    ride.startedAt = new Date();
    await ride.save();

    // Les demandes encore en attente ne sont plus valables une fois parti
    const enAttente = await Booking.find({ trajet: ride._id, statut: 'en_attente' });
    for (const b of enAttente) {
      b.statut = 'refusee';
      await b.save();
      await creerNotification({
        destinataire: b.passager,
        emetteur: req.userId,
        type: 'reservation_refusee',
        titre: 'Demande expirée',
        message: `Le trajet vers ${court(ride.destination.label)} a démarré sans que votre demande soit acceptée.`,
        donnees: { trajetId: ride._id, bookingId: b._id },
      });
    }

    const bookings = await Booking.find({ trajet: ride._id, statut: 'acceptee' });
    for (const b of bookings) {
      await creerNotification({
        destinataire: b.passager,
        emetteur: req.userId,
        type: 'trajet_demarre',
        titre: 'Votre conducteur est en route',
        message: `${ride.conducteur.nom} a démarré le trajet vers ${court(ride.destination.label)}.`,
        donnees: { trajetId: ride._id, bookingId: b._id },
      });
    }

    res.json({ message: 'Trajet démarré', ride });
  } catch (err) {
    console.error('Erreur démarrage trajet :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 8. Terminer un trajet (US21)
router.patch('/:id/finish', auth, async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });

    const ride = await Ride.findById(req.params.id).populate('conducteur', 'nom');
    if (!ride) return res.status(404).json({ message: 'Trajet introuvable' });
    if (ride.conducteur._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Seul le conducteur peut terminer ce trajet' });
    }
    if (ride.statut !== 'en_cours') {
      return res.status(400).json({ message: "Démarrez le trajet avant de le terminer" });
    }

    ride.statut = 'termine';
    ride.finishedAt = new Date();
    await ride.save();

    const bookings = await Booking.find({ trajet: ride._id, statut: 'acceptee' });
    for (const b of bookings) {
      await creerNotification({
        destinataire: b.passager,
        emetteur: req.userId,
        type: 'trajet_termine',
        titre: 'Trajet terminé',
        message: `Vous êtes arrivé. Prenez un instant pour noter ${ride.conducteur.nom}.`,
        donnees: { trajetId: ride._id, bookingId: b._id },
      });
    }

    const nbPlaces = bookings.reduce((s, b) => s + (b.places || 1), 0);
    res.json({
      message: 'Trajet terminé',
      ride,
      recapitulatif: {
        passagersTransportes: bookings.length,
        gainsRealises: nbPlaces * (ride.prix || 0),
        co2EviteKg: Math.round((ride.distanceKm || 0) * nbPlaces * CO2_KG_PAR_KM * 10) / 10,
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
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });

    const ride = await Ride.findById(req.params.id).populate('conducteur', CHAMPS_CONDUCTEUR);
    if (!ride || !ride.conducteur) return res.status(404).json({ message: 'Trajet introuvable' });

    const ctx = await contextePassager(req.userId);
    const calc = calculerScore({ ride, passager: ctx.user, schedule: ctx.schedule });
    const obj = ride.toObject();
    obj.scoreMatch = calc.scoreTotal;
    obj.matchDetails = calc.details;
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
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, conducteur: req.userId, statut: 'actif' },
      { $set: { statut: 'annule' } },
      { returnDocument: 'after' }
    ).select('-itineraire');

    if (!ride) {
      return res.status(404).json({ message: 'Trajet introuvable, déjà démarré ou terminé' });
    }

    const bookings = await Booking.find({ trajet: ride._id, statut: { $in: ['en_attente', 'acceptee'] } });
    for (const b of bookings) {
      await creerNotification({
        destinataire: b.passager,
        emetteur: req.userId,
        type: 'trajet_annule',
        titre: 'Trajet annulé',
        message: `Le conducteur a annulé son trajet vers ${court(ride.destination?.label) || 'ISET Nabeul'}.`,
        donnees: { trajetId: ride._id, bookingId: b._id },
      });
    }
    await Booking.updateMany(
      { trajet: ride._id, statut: { $in: ['en_attente', 'acceptee'] } },
      { $set: { statut: 'annulee' } }
    );

    res.json(ride);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 11. Modifier un trajet (conducteur) : heure, places, prix
router.patch('/:id', auth, async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });

    const ride = await Ride.findOne({ _id: req.params.id, conducteur: req.userId });
    if (!ride) return res.status(404).json({ message: 'Trajet introuvable' });
    if (ride.statut !== 'actif') return res.status(400).json({ message: 'Seul un trajet à venir peut être modifié' });

    const user = await User.findById(req.userId);
    const { heureDepart, places, prix } = req.body;
    const changements = [];

    if (heureDepart !== undefined && heureDepart !== ride.heureDepart) {
      if (!HEURE.test(heureDepart)) return res.status(400).json({ message: 'Heure invalide (format HH:MM)' });
      ride.heureDepart = heureDepart;
      ride.heureArrivee = ajouterMinutes(heureDepart, ride.dureeMin || 0);
      changements.push(`départ à ${heureDepart}`);
    }
    if (places !== undefined) {
      const n = Number(places);
      const max = user?.vehicule?.places || 8;
      if (!Number.isInteger(n) || n < 0 || n > max) {
        return res.status(400).json({ message: `Places libres : entre 0 et ${max}` });
      }
      ride.places = n;
    }
    if (prix !== undefined && Number(prix) !== ride.prix) {
      const m = Number(prix);
      if (!Number.isFinite(m) || m < 0 || m > 200) return res.status(400).json({ message: 'Prix invalide (entre 0 et 200 DT)' });
      ride.prix = m;
      changements.push(`prix ${m} DT`);
    }
    await ride.save();

    if (changements.length) {
      const bookings = await Booking.find({ trajet: ride._id, statut: { $in: ['en_attente', 'acceptee'] } });
      for (const b of bookings) {
        await creerNotification({
          destinataire: b.passager,
          emetteur: req.userId,
          type: 'trajet_modifie',
          titre: 'Trajet modifié',
          message: `Le conducteur a modifié le trajet vers ${court(ride.destination.label)} : ${changements.join(', ')}.`,
          donnees: { trajetId: ride._id, bookingId: b._id },
        });
      }
    }

    const o = ride.toObject();
    delete o.itineraire;
    res.json(o);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
