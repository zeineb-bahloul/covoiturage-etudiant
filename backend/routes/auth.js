const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { nom, email, motDePasse, filiere } = req.body;

    if (!nom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }
    if (motDePasse.length < 6) {
      return res.status(400).json({ message: 'Mot de passe : 6 caractères minimum' });
    }

    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) {
      return res.status(400).json({ message: 'Cet e-mail est déjà utilisé' });
    }

    const hash = await bcrypt.hash(motDePasse, 10);
    const user = await User.create({ nom, email, motDePasse: hash, filiere });

    res.status(201).json({
      message: 'Compte créé',
      user: { id: user._id, nom: user.nom, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'E-mail ou mot de passe incorrect' });
    }

    const correct = await bcrypt.compare(motDePasse || '', user.motDePasse);
    if (!correct) {
      return res.status(400).json({ message: 'E-mail ou mot de passe incorrect' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, nom: user.nom, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('-motDePasse');
  res.json(user);
});

module.exports = router;