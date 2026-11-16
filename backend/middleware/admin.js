/** À placer après le middleware auth : réservé au rôle administrateur. */
module.exports = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé à l’administration' });
  }
  next();
};
