const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const { creerNotification } = require('./notifier');
const { enMinutes, NOMS_JOURS } = require('./matching');

const AVANCE_MIN = 30; // rappel envoyé 30 minutes avant le départ
const court = (label) => (label || '').split(',')[0].trim();

function aujourdhui() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return { iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, jour: NOMS_JOURS[d.getDay()], minutes: d.getHours() * 60 + d.getMinutes() };
}

/** Envoie « Votre trajet part dans 30 min » au conducteur et aux passagers confirmés. */
async function envoyerRappels() {
  const { iso, jour, minutes } = aujourdhui();
  const rides = await Ride.find({
    statut: 'actif',
    rappels: { $ne: iso },
    $or: [{ recurrent: true, jours: jour }, { recurrent: false, date: new Date(`${iso}T00:00:00.000Z`) }],
  }).select('conducteur depart destination heureDepart');

  let envoyes = 0;
  for (const ride of rides) {
    const avant = enMinutes(ride.heureDepart) - minutes;
    if (avant < 0 || avant > AVANCE_MIN) continue;

    // Marquer d'abord pour ne jamais envoyer deux fois (plusieurs serveurs / redémarrage)
    const maj = await Ride.updateOne({ _id: ride._id, rappels: { $ne: iso } }, { $push: { rappels: { $each: [iso], $slice: -14 } } });
    if (!maj.modifiedCount) continue;

    const trajetTexte = `${court(ride.depart.label)} → ${court(ride.destination.label)}`;
    const passagers = await Booking.find({ trajet: ride._id, statut: 'acceptee' }).select('passager');
    await creerNotification({
      destinataire: ride.conducteur,
      type: 'rappel_trajet',
      titre: `Départ dans ${avant} min`,
      message: `${trajetTexte} à ${ride.heureDepart} · ${passagers.length} passager(s) confirmé(s). Pensez à démarrer le trajet.`,
      donnees: { trajetId: ride._id },
    });
    for (const b of passagers) {
      await creerNotification({
        destinataire: b.passager,
        type: 'rappel_trajet',
        titre: `Votre covoiturage part dans ${avant} min`,
        message: `${trajetTexte} à ${ride.heureDepart}. Soyez au point de rendez-vous à l'heure.`,
        donnees: { trajetId: ride._id, bookingId: b._id },
      });
    }
    envoyes += 1;
  }
  return envoyes;
}

function demarrerRappels() {
  const tick = () => envoyerRappels().catch((err) => console.error('Erreur rappels :', err.message));
  setTimeout(tick, 5000);
  return setInterval(tick, 60 * 1000);
}

module.exports = { envoyerRappels, demarrerRappels };
