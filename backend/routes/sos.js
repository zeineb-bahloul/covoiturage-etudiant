const express = require('express');
const mongoose = require('mongoose');
const Sos = require('../models/Sos');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const { creerNotification } = require('../services/notifier');
const { emettreAuxAdmins } = require('../services/socket');

const router = express.Router();

/**
 * Déclencher une alerte SOS (US22). L'application envoie aussi un SMS
 * au contact de confiance avec la position ; ici on enregistre l'alerte
 * et on prévient immédiatement l'administration.
 */
router.post('/', auth, async (req, res) => {
  try {
    const { lat, lng, precision, trajetId, message } = req.body;
    const user = await User.findById(req.userId).select('nom contactConfiance');

    let trajet = null;
    if (trajetId && mongoose.isValidObjectId(trajetId)) {
      const ride = await Ride.findById(trajetId).select('conducteur');
      const participe =
        ride &&
        (ride.conducteur.toString() === req.userId ||
          (await Booking.exists({ trajet: ride._id, passager: req.userId, statut: 'acceptee' })));
      if (participe) trajet = ride._id;
    }

    const aPosition = Number.isFinite(lat) && Number.isFinite(lng);
    const sos = await Sos.create({
      auteur: req.userId,
      trajet,
      position: aPosition ? { type: 'Point', coordinates: [lng, lat] } : undefined,
      precisionM: Number.isFinite(precision) ? Math.round(precision) : null,
      message: String(message || '').slice(0, 300),
      contactPrevenu: user.contactConfiance?.telephone ? user.contactConfiance : undefined,
    });

    const lien = aPosition ? `https://maps.google.com/?q=${lat},${lng}` : 'position indisponible';
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const a of admins) {
      await creerNotification({
        destinataire: a._id,
        emetteur: req.userId,
        type: 'sos',
        titre: `🚨 Alerte SOS de ${user.nom}`,
        message: `Position : ${lien}`,
        donnees: { sosId: sos._id, trajetId: trajet || undefined },
      });
    }
    emettreAuxAdmins('sos:new', { _id: String(sos._id), nom: user.nom, lien });

    res.status(201).json({ message: "Alerte envoyée à l'administration", sos, lien });
  } catch (err) {
    console.error('Erreur SOS :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
