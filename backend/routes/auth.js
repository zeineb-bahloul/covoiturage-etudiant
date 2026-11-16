const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Optionnel : EMAIL_DOMAINES=isetn.tn,iset.tn dans .env pour n'accepter que les e-mails universitaires
const DOMAINES = (process.env.EMAIL_DOMAINES || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const creerJeton = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const resume = (user) => ({ id: user._id, nom: user.nom, email: user.email, role: user.role });

router.post('/register', async (req, res) => {
  try {
    const { nom, email, motDePasse, filiere } = req.body;
    const mail = (email || '').trim().toLowerCase();

    if (!nom || !nom.trim() || !mail || !motDePasse) {
      return res.status(400).json({ message: 'Nom, e-mail et mot de passe sont obligatoires' });
    }
    if (!EMAIL.test(mail)) {
      return res.status(400).json({ message: 'Adresse e-mail invalide' });
    }
    if (DOMAINES.length && !DOMAINES.some((d) => mail.endsWith(`@${d}`))) {
      return res.status(400).json({ message: `Utilisez votre e-mail universitaire (@${DOMAINES[0]})` });
    }
    if (motDePasse.length < 6) {
      return res.status(400).json({ message: 'Mot de passe : 6 caractères minimum' });
    }

    if (await User.exists({ email: mail })) {
      return res.status(400).json({ message: 'Cet e-mail est déjà utilisé' });
    }

    const hash = await bcrypt.hash(motDePasse, 10);
    const user = await User.create({ nom: nom.trim(), email: mail, motDePasse: hash, filiere: filiere || '' });

    res.status(201).json({ message: 'Compte créé', token: creerJeton(user), user: resume(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const user = await User.findOne({ email: (email || '').trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(motDePasse || '', user.motDePasse))) {
      return res.status(400).json({ message: 'E-mail ou mot de passe incorrect' });
    }
    if (user.bloque) {
      return res.status(403).json({
        message: `Votre compte a été bloqué par l'administration${user.bloqueRaison ? ` : ${user.bloqueRaison}` : ''}.`,
        bloque: true,
      });
    }
    user.derniereActivite = new Date();
    await user.save();
    res.json({ token: creerJeton(user), user: resume(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mot de passe oublié — étape 1 : demander un code
router.post('/forgot', async (req, res) => {
  try {
    const mail = (req.body.email || '').trim().toLowerCase();
    if (!EMAIL.test(mail)) {
      return res.status(400).json({ message: 'Adresse e-mail invalide' });
    }

    const reponse = { message: 'Si un compte existe pour cet e-mail, un code de réinitialisation a été envoyé.' };
    const user = await User.findOne({ email: mail });

    if (user) {
      const code = String(crypto.randomInt(100000, 1000000));
      user.resetCode = await bcrypt.hash(code, 10);
      user.resetExpire = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      // Pas de service d'e-mail gratuit configuré : le code s'affiche dans la console du serveur.
      console.log(`[Mot de passe oublié] Code pour ${mail} : ${code} (valable 15 min)`);
      if (process.env.NODE_ENV !== 'production' || process.env.MODE_DEMO === 'true') reponse.codeDemo = code;
    }
    res.json(reponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mot de passe oublié — étape 2 : choisir un nouveau mot de passe
router.post('/reset', async (req, res) => {
  try {
    const mail = (req.body.email || '').trim().toLowerCase();
    const { code, motDePasse } = req.body;

    if (!motDePasse || motDePasse.length < 6) {
      return res.status(400).json({ message: 'Mot de passe : 6 caractères minimum' });
    }

    const user = await User.findOne({ email: mail }).select('+resetCode +resetExpire');
    const valide =
      user &&
      user.resetCode &&
      user.resetExpire > new Date() &&
      (await bcrypt.compare(String(code || ''), user.resetCode));

    if (!valide) {
      return res.status(400).json({ message: 'Code invalide ou expiré' });
    }

    user.motDePasse = await bcrypt.hash(motDePasse, 10);
    user.resetCode = null;
    user.resetExpire = null;
    await user.save();

    res.json({ message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-motDePasse');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
