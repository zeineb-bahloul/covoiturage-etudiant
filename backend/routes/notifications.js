const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Récupérer les notifications de l'utilisateur connecté avec compte de non-lues
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ destinataire: req.userId })
      .populate('emetteur', 'nom photo filiere')
      .populate('donnees.trajetId', 'depart destination heureDepart prix statut')
      .sort({ createdAt: -1 })
      .limit(50);

    const nbNonLues = await Notification.countDocuments({
      destinataire: req.userId,
      lu: false,
    });

    res.json({
      notifications,
      nbNonLues,
    });
  } catch (err) {
    console.error('Erreur récupération notifications :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Marquer une notification comme lue
router.patch('/:id/read', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, destinataire: req.userId },
      { $set: { lu: true } },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: 'Notification introuvable' });
    }

    res.json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Marquer toutes les notifications comme lues
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { destinataire: req.userId, lu: false },
      { $set: { lu: true } }
    );
    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer une notification
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    await Notification.findOneAndDelete({
      _id: req.params.id,
      destinataire: req.userId,
    });

    res.json({ message: 'Notification supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

