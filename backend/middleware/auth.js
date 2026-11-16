const jwt = require('jsonwebtoken');
const User = require('../models/User');

const DIX_MINUTES = 10 * 60 * 1000;

/**
 * Vérifie le jeton JWT, refuse les comptes bloqués ou supprimés (US18)
 * et enregistre la dernière activité (utilisateurs actifs du tableau de bord).
 */
module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès refusé : jeton manquant' });
  }

  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Jeton invalide ou expiré' });
  }

  try {
    const user = await User.findById(decoded.id).select('role bloque bloqueRaison derniereActivite');
    if (!user) return res.status(401).json({ message: 'Compte introuvable ou supprimé' });
    if (user.bloque) {
      return res.status(403).json({
        message: `Votre compte a été bloqué par l'administration${user.bloqueRaison ? ` : ${user.bloqueRaison}` : ''}.`,
        bloque: true,
      });
    }

    req.userId = decoded.id;
    req.userRole = user.role;

    if (!user.derniereActivite || Date.now() - user.derniereActivite.getTime() > DIX_MINUTES) {
      User.updateOne({ _id: user._id }, { derniereActivite: new Date() }, { timestamps: false }).catch(() => {});
    }
    next();
  } catch (err) {
    console.error('Erreur auth :', err.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
