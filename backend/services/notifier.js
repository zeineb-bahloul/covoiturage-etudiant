const Notification = require('../models/Notification');

async function creerNotification({
  destinataire,
  emetteur = null,
  type,
  titre,
  message,
  donnees = {},
}) {
  try {
    if (!destinataire) return null;
    const notif = await Notification.create({
      destinataire,
      emetteur,
      type,
      titre,
      message,
      donnees,
      lu: false,
    });
    return notif;
  } catch (err) {
    console.error('Erreur lors de la création de notification :', err.message);
    return null;
  }
}

module.exports = { creerNotification };

