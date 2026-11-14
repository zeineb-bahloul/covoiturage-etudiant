const Notification = require('../models/Notification');
const { emettreA } = require('./socket');

/** Crée une notification en base et la pousse en temps réel (Socket.io). */
async function creerNotification({ destinataire, emetteur = null, type, titre, message, donnees = {} }) {
  try {
    if (!destinataire) return null;
    const notif = await Notification.create({ destinataire, emetteur, type, titre, message, donnees, lu: false });
    emettreA(destinataire, 'notification:new', notif.toJSON());
    return notif;
  } catch (err) {
    console.error('Erreur lors de la création de notification :', err.message);
    return null;
  }
}

module.exports = { creerNotification };
