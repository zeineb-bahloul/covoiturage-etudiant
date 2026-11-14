const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { calculerStatistiques, mettreAJourBadges } = require('../services/badges');

const router = express.Router();

// Statistiques personnelles et badges (US16, US17)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-motDePasse');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const stats = await calculerStatistiques(user._id);
    const { liste } = await mettreAJourBadges(user, stats);

    res.json({
      ...stats,
      noteMoyenne: user.noteMoyenne || 0,
      nombreAvis: user.nombreAvis || 0,
      badges: liste,
      badgesDebloques: user.badges,
    });
  } catch (err) {
    console.error('Erreur get stats :', err);
    res.status(500).json({ message: 'Erreur chargement des statistiques' });
  }
});

module.exports = router;
