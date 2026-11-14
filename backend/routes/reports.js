const express = require('express');
const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
const idValide = (id) => mongoose.isValidObjectId(id);
const MOTIFS = ['retard_excessif', 'conduite_dangereuse', 'comportement_inapproprie', 'annulation_imprevue', 'autre'];

// Signaler un comportement inapproprié (US15)
router.post('/', auth, async (req, res) => {
  try {
    const { utilisateurSignaleId, trajetId, motif } = req.body;
    const commentaire = typeof req.body.commentaire === 'string' ? req.body.commentaire.trim() : '';

    if (!idValide(utilisateurSignaleId)) return res.status(400).json({ message: 'Utilisateur signalé invalide' });
    if (!MOTIFS.includes(motif)) return res.status(400).json({ message: 'Motif de signalement invalide' });
    if (commentaire.length < 10) {
      return res.status(400).json({ message: 'Décrivez la situation en quelques mots (10 caractères minimum)' });
    }
    if (utilisateurSignaleId === req.userId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous signaler vous-même' });
    }
    if (!(await User.exists({ _id: utilisateurSignaleId }))) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const trajet = trajetId && idValide(trajetId) ? trajetId : null;
    const doublon = await Report.exists({
      auteur: req.userId,
      utilisateurSignale: utilisateurSignaleId,
      trajet,
      statut: 'en_attente',
    });
    if (doublon) {
      return res.status(400).json({ message: 'Vous avez déjà un signalement en cours pour cette personne' });
    }

    const signalement = await Report.create({
      auteur: req.userId,
      utilisateurSignale: utilisateurSignaleId,
      trajet,
      motif,
      commentaire: commentaire.slice(0, 1000),
    });

    res.status(201).json({
      message: "Votre signalement a été transmis à l'administration d'UniRide.",
      signalement,
    });
  } catch (err) {
    console.error('Erreur creation signalement :', err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement du signalement" });
  }
});

// Mes signalements
router.get('/my', auth, async (req, res) => {
  try {
    const signalements = await Report.find({ auteur: req.userId })
      .populate('utilisateurSignale', 'nom filiere photo')
      .populate('trajet', 'depart destination date')
      .sort({ createdAt: -1 });
    res.json(signalements);
  } catch (err) {
    console.error('Erreur get my reports :', err);
    res.status(500).json({ message: 'Erreur lors du chargement de vos signalements' });
  }
});

module.exports = router;
