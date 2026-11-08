const express = require('express');
const mongoose = require('mongoose');
const Ride = require('../models/Ride');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { itineraire } = require('../services/ors');

const router = express.Router();

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

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
  const pas = Math.ceil(points.length / max);
  const resultat = points.filter((_, i) => i % pas === 0);
  const dernier = points[points.length - 1];
  if (resultat[resultat.length - 1] !== dernier) resultat.push(dernier);
  return resultat;
}
const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function enMinutes(heure) {
  const [h, m] = heure.split(':').map(Number);
  return h * 60 + m;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

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
      return res.status(400).json({ message: "Heure de départ invalide (format HH:MM)" });
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
    });

    const resume = ride.toObject();
    delete resume.itineraire;
    res.status(201).json(resume);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/mine', auth, async (req, res) => {
  try {
    const rides = await Ride.find({ conducteur: req.userId, statut: 'actif' })
      .select('-itineraire')
      .sort({ createdAt: -1 });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
router.get('/search', auth, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const { date, heure } = req.query;
    const rayonKm = Math.min(Number(req.query.rayon) || 5, 20);
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
      statut: 'actif',
      conducteur: { $ne: req.userId },
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
      .populate('conducteur', 'nom noteMoyenne preferences');

    if (heure) {
      const voulu = enMinutes(heure);
      rides = rides.filter((r) => Math.abs(enMinutes(r.heureDepart) - voulu) <= 60);
    }
    if (noteMin > 0) {
      rides = rides.filter((r) => r.conducteur && r.conducteur.noteMoyenne >= noteMin);
    }

    const resultats = rides.map((r) => {
      const o = r.toObject();
      const [lngD, latD] = r.depart.location.coordinates;
      o.distanceDepartKm = Math.round(distanceKm(lat, lng, latD, lngD) * 10) / 10;
      return o;
    });

    res.json(resultats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
router.get('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const ride = await Ride.findById(req.params.id).populate(
      'conducteur',
      'nom noteMoyenne preferences vehicule.marque'
    );

    if (!ride || ride.statut !== 'actif') {
      return res.status(404).json({ message: 'Trajet introuvable' });
    }
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, conducteur: req.userId, statut: 'actif' },
      { $set: { statut: 'annule' } },
      { new: true }
    ).select('-itineraire');

    if (!ride) {
      return res.status(404).json({ message: 'Trajet introuvable' });
    }
    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;