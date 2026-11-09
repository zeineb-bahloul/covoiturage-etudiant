const express = require('express');
const Report = require('../models/Report');
const User = require('../models/User');
const Ride = require('../models/Ride');
const auth = require('../middleware/auth');

const router = express.Router();

// Créer un signalement (US15)
router.post('/', auth, async (req, res) => {
  try {
    const { utilisateurSignaleId, trajetId, motif, commentaire } = req.body;

    if (!utilisateurSignaleId || !motif || !commentaire) {
      return res.status(400).json({
        message: 'utilisateurSignaleId, motif et commentaire sont obligatoires',
      });
    }

    if (utilisateurSignaleId.toString() === req.userId.toString()) {
      return res.status(400).json({
        message: 'Vous ne pouvez pas vous signaler vous-même',
      });
    }

    const motifsValides = [
      'retard_excessif',
      'conduite_dangereuse',
      'comportement_inapproprie',
      'annulation_imprevue',
      'autre',
    ];

    if (!motifsValides.includes(motif)) {
      return res.status(400).json({ message: 'Motif de signalement invalide' });
    }

    const signalement = await Report.create({
      auteur: req.userId,
      utilisateurSignale: utilisateurSignaleId,
      trajet: trajetId || null,
      motif,
      commentaire: commentaire.trim(),
    });

    res.status(201).json({
      message: 'Votre signalement a été transmis à l’administration d’UniRide pour traitement.',
      signalement,
    });
  } catch (err) {
    console.error('Erreur creation signalement :', err);
    res.status(500).json({ message: 'Erreur lors de l’enregistrement du signalement' });
  }
});

// Consulter les signalements faits par l'utilisateur connecté
router.get('/my', auth, async (req, res) => {
  try {
    const signalements = await Report.find({ auteur: req.userId })
      .populate('utilisateurSignale', 'nom filiere')
      .populate('trajet', 'depart destination dateDepart')
      .sort({ createdAt: -1 });

    res.json(signalements);
  } catch (err) {
    console.error('Erreur get my reports :', err);
    res.status(500).json({ message: 'Erreur lors du chargement de vos signalements' });
  }
});

module.exports = router;

