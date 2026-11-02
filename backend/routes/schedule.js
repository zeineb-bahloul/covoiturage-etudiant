const express = require('express');
const Schedule = require('../models/Schedule');
const auth = require('../middleware/auth');

const router = express.Router();

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

router.get('/me', auth, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ user: req.userId });
    res.json(schedule || { jours: [] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { jours } = req.body;

    if (!Array.isArray(jours)) {
      return res.status(400).json({ message: 'Le champ jours doit être une liste' });
    }

    const vus = new Set();
    for (const j of jours) {
      if (!JOURS.includes(j.jour)) {
        return res.status(400).json({ message: `Jour invalide : ${j.jour}` });
      }
      if (vus.has(j.jour)) {
        return res.status(400).json({ message: `Jour en double : ${j.jour}` });
      }
      vus.add(j.jour);

      if (!HEURE.test(j.debut) || !HEURE.test(j.fin)) {
        return res.status(400).json({ message: `Heures invalides (format HH:MM) le ${j.jour}` });
      }
      if (j.debut >= j.fin) {
        return res.status(400).json({ message: `L'heure de fin doit suivre le début le ${j.jour}` });
      }
    }

    const propres = jours.map(({ jour, debut, fin }) => ({ jour, debut, fin }));

    const schedule = await Schedule.findOneAndUpdate(
      { user: req.userId },
      { $set: { jours: propres } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;