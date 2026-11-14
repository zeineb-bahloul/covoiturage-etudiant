/**
 * Données de démonstration UniRide — teste toutes les fonctionnalités des sprints 1 à 5.
 *
 *   npm run seed
 *
 * Ne touche qu'aux comptes de démonstration ci-dessous (ils sont supprimés puis recréés) :
 * vos autres données restent intactes. Mot de passe de tous les comptes : demo123
 */
require('dotenv').config();
require('./config/dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Schedule = require('./models/Schedule');
const Ride = require('./models/Ride');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const Report = require('./models/Report');
const { distanceKm } = require('./services/matching');
const { calculerStatistiques, mettreAJourBadges } = require('./services/badges');

const MOT_DE_PASSE = 'demo123';

// Lieux réels autour de l'ISET Nabeul
const LIEUX = {
  iset: { label: 'ISET Nabeul, Campus universitaire Mrezgua, Nabeul', lat: 36.4378, lng: 10.6794 },
  beniKhiar: { label: 'Béni Khiar, Nabeul, Tunisie', lat: 36.4672, lng: 10.7822 },
  darChaabane: { label: 'Dar Chaâbane El Fehri, Nabeul, Tunisie', lat: 36.47, lng: 10.75 },
  korba: { label: 'Korba, Nabeul, Tunisie', lat: 36.5786, lng: 10.8586 },
  hammamet: { label: 'Hammamet Centre, Nabeul, Tunisie', lat: 36.4, lng: 10.6167 },
  nabeul: { label: 'Nabeul Centre, Nabeul, Tunisie', lat: 36.4561, lng: 10.7376 },
  mrezga: { label: 'Mrezga, Hammamet Nord, Tunisie', lat: 36.425, lng: 10.66 },
  tunis: { label: 'Tunis Centre, Tunisie', lat: 36.8065, lng: 10.1815 },
};

const COMPTES = [
  { cle: 'sara', nom: 'Sara Mansour', filiere: 'Technologies de l’Informatique', domicile: 'darChaabane', prefs: { nonFumeur: true, mixte: true, musique: 'calme' } },
  { cle: 'karim', nom: 'Karim Zouari', filiere: 'Génie Électrique', domicile: 'beniKhiar', prefs: { nonFumeur: true, mixte: true, musique: 'calme' }, vehicule: { marque: 'Peugeot 208', couleur: 'gris', places: 4, matricule: '215 TU 4521' } },
  { cle: 'linda', nom: 'Linda Mejri', filiere: 'Gestion', domicile: 'hammamet', prefs: { nonFumeur: true, mixte: false, musique: 'animee' }, vehicule: { marque: 'Kia Picanto', couleur: 'rouge', places: 3, matricule: '198 TU 7730' } },
  { cle: 'youssef', nom: 'Youssef Ben Ali', filiere: 'Génie Mécanique', domicile: 'korba', prefs: { nonFumeur: false, mixte: true, musique: 'animee' }, vehicule: { marque: 'Renault Clio', couleur: 'blanc', places: 4, matricule: '201 TU 1188' } },
  { cle: 'amira', nom: 'Amira Trabelsi', filiere: 'Technologies de l’Informatique', domicile: 'nabeul', prefs: { nonFumeur: true, mixte: true, musique: 'aucune' } },
  { cle: 'omar', nom: 'Omar Gharbi', filiere: 'Génie des Procédés', domicile: 'mrezga', prefs: { nonFumeur: true, mixte: true, musique: 'aucune' } },
  { cle: 'admin', nom: 'Administration UniRide', filiere: '', role: 'admin' },
];
const email = (cle) => `${cle}@isetn.tn`;

const LUN_VEN = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
const point = (l) => ({ label: l.label, location: { type: 'Point', coordinates: [l.lng, l.lat] } });
const jour = (decalage, h = 12) => {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  d.setHours(h, 0, 0, 0);
  return d;
};
const dateSeule = (decalage) => new Date(`${jour(decalage).toISOString().slice(0, 10)}T00:00:00.000Z`);
const minutesAvant = (m) => new Date(Date.now() - m * 60000);

function ajouterMinutes(heure, minutes) {
  const [h, m] = heure.split(':').map(Number);
  const t = (h * 60 + m + minutes) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

const heureIlYa = (m) => {
  const d = minutesAvant(m);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Itinéraire approché (ligne droite découpée) : pas besoin de clé OpenRouteService. */
function trajet(conducteur, de, vers, heureDepart, extra) {
  const km = Math.round(distanceKm(de.lat, de.lng, vers.lat, vers.lng) * 1.25 * 10) / 10;
  const dureeMin = Math.max(5, Math.round((km / 45) * 60));
  const itineraire = Array.from({ length: 25 }, (_, i) => [de.lng + ((vers.lng - de.lng) * i) / 24, de.lat + ((vers.lat - de.lat) * i) / 24]);
  return {
    conducteur,
    depart: point(de),
    destination: point(vers),
    heureDepart,
    heureArrivee: ajouterMinutes(heureDepart, dureeMin),
    distanceKm: km,
    dureeMin,
    itineraire,
    statut: 'actif',
    ...extra,
  };
}

async function supprimerAnciennesDonnees() {
  const anciens = await User.find({ email: { $in: COMPTES.map((c) => email(c.cle)) } }).select('_id');
  const ids = anciens.map((u) => u._id);
  if (!ids.length) return;
  const rides = await Ride.find({ conducteur: { $in: ids } }).select('_id');
  const rideIds = rides.map((r) => r._id);
  const convs = await Conversation.find({ participants: { $in: ids } }).select('_id');
  await Promise.all([
    Booking.deleteMany({ $or: [{ passager: { $in: ids } }, { conducteur: { $in: ids } }, { trajet: { $in: rideIds } }] }),
    Review.deleteMany({ $or: [{ auteur: { $in: ids } }, { cible: { $in: ids } }] }),
    Message.deleteMany({ conversationId: { $in: convs.map((c) => c._id) } }),
    Conversation.deleteMany({ _id: { $in: convs.map((c) => c._id) } }),
    Notification.deleteMany({ $or: [{ destinataire: { $in: ids } }, { emetteur: { $in: ids } }] }),
    Report.deleteMany({ $or: [{ auteur: { $in: ids } }, { utilisateurSignale: { $in: ids } }] }),
    Schedule.deleteMany({ user: { $in: ids } }),
    Ride.deleteMany({ _id: { $in: rideIds } }),
  ]);
  await User.deleteMany({ _id: { $in: ids } });
}

async function seed() {
  await supprimerAnciennesDonnees();

  // ─── Sprint 1 : comptes, profils, véhicules ───
  const hash = await bcrypt.hash(MOT_DE_PASSE, 10);
  const u = {};
  for (const c of COMPTES) {
    u[c.cle] = await User.create({
      nom: c.nom,
      email: email(c.cle),
      motDePasse: hash,
      filiere: c.filiere,
      role: c.role || 'utilisateur',
      telephone: c.role ? '' : `2${Math.floor(1000000 + Math.random() * 8999999)}`,
      domicile: c.domicile ? point(LIEUX[c.domicile]) : null,
      adresse: c.domicile ? LIEUX[c.domicile].label : '',
      preferences: c.prefs || undefined,
      vehicule: c.vehicule || null,
    });
  }

  // ─── Sprint 2 : emplois du temps ───
  const edt = (debut, fin, jours = LUN_VEN) => jours.map((j) => ({ jour: j, debut, fin }));
  await Schedule.create([
    { user: u.sara._id, jours: [...edt('08:30', '16:00', ['lundi', 'mardi', 'mercredi', 'jeudi']), { jour: 'vendredi', debut: '08:30', fin: '12:00' }, { jour: 'samedi', debut: '09:00', fin: '12:00' }] },
    { user: u.amira._id, jours: edt('08:30', '15:30') },
    { user: u.omar._id, jours: edt('10:00', '17:30', ['lundi', 'mercredi', 'vendredi']) },
    { user: u.karim._id, jours: edt('08:30', '16:00') },
  ]);

  // ─── Sprint 2-3 : trajets ───
  const T = {};
  // Karim : Béni Khiar → ISET, passe par Dar Chaâbane (très compatible avec Sara)
  T.karimRegulier = await Ride.create(trajet(u.karim._id, LIEUX.beniKhiar, LIEUX.iset, '07:55', { recurrent: true, jours: [...LUN_VEN, 'samedi'], places: 2, prix: 2.5 }));
  // Linda : Hammamet → ISET (non mixte, musique animée)
  T.lindaRegulier = await Ride.create(trajet(u.linda._id, LIEUX.hammamet, LIEUX.iset, '08:00', { recurrent: true, jours: [...LUN_VEN, 'samedi'], places: 3, prix: 2 }));
  // Youssef : Korba → ISET (fumeur, arrive après 08:30)
  T.youssefRegulier = await Ride.create(trajet(u.youssef._id, LIEUX.korba, LIEUX.iset, '08:15', { recurrent: true, jours: [...LUN_VEN, 'samedi'], places: 3, prix: 3 }));
  // Linda : Nabeul centre → ISET (pas encore réservé par Sara → apparaît dans ses suggestions)
  T.lindaNabeul = await Ride.create(trajet(u.linda._id, LIEUX.nabeul, LIEUX.iset, '08:05', { recurrent: true, jours: [...LUN_VEN, 'samedi'], places: 2, prix: 1.5 }));
  // Karim : trajet ponctuel demain vers Tunis
  T.karimTunis = await Ride.create(trajet(u.karim._id, LIEUX.nabeul, LIEUX.tunis, '14:00', { recurrent: false, date: dateSeule(1), places: 3, prix: 12 }));
  // Linda : trajet EN COURS avec Amira (suivi en direct)
  T.lindaEnCours = await Ride.create(trajet(u.linda._id, LIEUX.mrezga, LIEUX.iset, heureIlYa(3), { recurrent: false, date: dateSeule(0), places: 2, prix: 1.5, statut: 'en_cours', startedAt: minutesAvant(3) }));
  // Trajets TERMINÉS (historique, statistiques, notation)
  T.karimHier = await Ride.create(trajet(u.karim._id, LIEUX.beniKhiar, LIEUX.iset, '07:55', { recurrent: false, date: dateSeule(-1), places: 1, prix: 2.5, statut: 'termine', startedAt: jour(-1, 7), finishedAt: jour(-1, 8) }));
  T.karimSemaine = await Ride.create(trajet(u.karim._id, LIEUX.beniKhiar, LIEUX.iset, '07:50', { recurrent: false, date: dateSeule(-4), places: 1, prix: 2.5, statut: 'termine', startedAt: jour(-4, 7), finishedAt: jour(-4, 8) }));
  T.youssefPasse = await Ride.create(trajet(u.youssef._id, LIEUX.korba, LIEUX.iset, '07:30', { recurrent: false, date: dateSeule(-6), places: 2, prix: 3, statut: 'termine', startedAt: jour(-6, 7), finishedAt: jour(-6, 8) }));
  // Un trajet annulé
  T.lindaAnnule = await Ride.create(trajet(u.linda._id, LIEUX.hammamet, LIEUX.iset, '08:00', { recurrent: false, date: dateSeule(2), places: 3, prix: 2, statut: 'annule' }));

  // ─── Sprint 3 : réservations (tous les statuts) ───
  const B = {};
  const resa = async (cle, trajetDoc, passager, statut, places = 1, message = '', scoreMatch = null, decalageMin = 60) => {
    B[cle] = await Booking.create({ trajet: trajetDoc._id, passager: passager._id, conducteur: trajetDoc.conducteur, places, statut, message, scoreMatch });
    await Booking.updateOne({ _id: B[cle]._id }, { $set: { createdAt: minutesAvant(decalageMin) } }, { timestamps: false });
  };
  await resa('saraKarim', T.karimRegulier, u.sara, 'acceptee', 1, 'Bonjour, je suis à Dar Chaâbane, près de la mosquée.', 96, 2000);
  await resa('omarKarim', T.karimRegulier, u.omar, 'en_attente', 1, 'Salut ! Possible de me prendre le lundi ?', 71, 30);
  await resa('amiraKarim', T.karimRegulier, u.amira, 'en_attente', 1, '', 88, 15);
  await resa('saraLinda', T.lindaRegulier, u.sara, 'en_attente', 1, 'Je peux venir jusqu’à la route principale.', 58, 120);
  await resa('omarYoussef', T.youssefRegulier, u.omar, 'refusee', 1, '', 45, 3000);
  await resa('amiraYoussef', T.youssefRegulier, u.amira, 'annulee', 1, '', 52, 4000);
  await resa('saraKarimTunis', T.karimTunis, u.sara, 'acceptee', 1, 'Je descends à Tunis Marine.', 64, 200);
  await resa('amiraLinda', T.lindaEnCours, u.amira, 'acceptee', 1, '', 90, 500);
  await resa('saraKarimHier', T.karimHier, u.sara, 'acceptee', 1, '', 96, 3000);
  await resa('amiraKarimSemaine', T.karimSemaine, u.amira, 'acceptee', 1, '', 91, 7000);
  await resa('saraYoussefPasse', T.youssefPasse, u.sara, 'acceptee', 1, '', 60, 9000);
  await resa('omarYoussefPasse', T.youssefPasse, u.omar, 'acceptee', 1, '', 70, 9000);
  await resa('omarLindaAnnule', T.lindaAnnule, u.omar, 'annulee', 1, '', 66, 600);
  // Places restantes cohérentes avec les réservations acceptées
  await Ride.updateOne({ _id: T.karimRegulier._id }, { places: 1 });
  await Ride.updateOne({ _id: T.karimTunis._id }, { places: 2 });
  await Ride.updateOne({ _id: T.lindaEnCours._id }, { places: 1 });

  // ─── Sprint 5 : avis et compliments ───
  const avis = (auteur, cible, trajetDoc, note, commentaire, badges, roleCible, jours) =>
    Review.create({ auteur: auteur._id, cible: cible._id, trajet: trajetDoc._id, note, commentaire, badges, roleCible, createdAt: jour(-jours, 18) });
  await avis(u.amira, u.karim, T.karimSemaine, 5, 'Très ponctuel et conduite agréable !', ['ponctuel', 'conduite_souple'], 'conducteur', 4);
  await avis(u.karim, u.amira, T.karimSemaine, 5, 'Passagère au rendez-vous à l’heure.', ['ponctuel', 'respectueux'], 'passager', 4);
  await avis(u.sara, u.youssef, T.youssefPasse, 3, 'Sympa mais il fumait dans la voiture.', ['sympathique'], 'conducteur', 6);
  await avis(u.omar, u.youssef, T.youssefPasse, 4, 'Bon trajet.', ['sympathique'], 'conducteur', 6);
  await avis(u.youssef, u.sara, T.youssefPasse, 5, '', ['ponctuel', 'sympathique'], 'passager', 6);
  // Trajet d'hier (Karim ↔ Sara) volontairement NON noté → « À noter » pour les deux

  // ─── Sprint 5 : conversations ───
  const conversation = async (a, b, trajetDoc, messages, nonLuPar) => {
    const conv = await Conversation.create({
      participants: [a._id, b._id],
      trajet: trajetDoc ? trajetDoc._id : null,
      titre: trajetDoc ? `${trajetDoc.depart.label.split(',')[0]} → ${trajetDoc.destination.label.split(',')[0]}` : '',
    });
    let dernier = null;
    for (const [i, [auteur, texte, ilYaMin]] of messages.entries()) {
      const date = minutesAvant(ilYaMin);
      const lu = i < messages.length - 1 || !nonLuPar ? [a._id, b._id] : [auteur._id];
      dernier = await Message.create({ conversationId: conv._id, expediteur: auteur._id, texte, luPar: lu, createdAt: date, updatedAt: date });
    }
    if (dernier) {
      conv.dernierMessage = { texte: dernier.texte, date: dernier.createdAt, expediteur: dernier.expediteur };
      conv.nonLusPar = nonLuPar ? [nonLuPar._id] : [];
      await conv.save();
    }
    return conv;
  };
  const convSaraKarim = await conversation(u.sara, u.karim, T.karimRegulier, [
    [u.karim, 'Bonjour Sara ! Votre place est confirmée pour la semaine.', 1500],
    [u.sara, 'Merci beaucoup ! On se retrouve où ?', 1490],
    [u.karim, 'Devant la mosquée de Dar Chaâbane à 08:00, ça vous va ?', 1480],
    [u.sara, 'Parfait, à demain 👍', 1470],
    [u.karim, 'Petit changement demain : je passerai à 07:58, ma Peugeot grise 😉', 20],
  ], u.sara);
  await conversation(u.amira, u.linda, T.lindaEnCours, [
    [u.linda, 'Je suis en route, j’arrive dans 2 minutes.', 5],
    [u.amira, 'Ok je vous attends devant la boulangerie.', 4],
  ], null);
  const convSaraKarimTunis = await conversation(u.sara, u.karim, T.karimTunis, [[u.karim, 'Pour Tunis demain, départ 14:00 devant la gare de Nabeul.', 90]], u.sara);
  await conversation(u.omar, u.karim, T.karimRegulier, [], null);

  // ─── Sprint 4 : notifications ───
  const notif = (dest, emetteur, type, titre, message, donnees, ilYaMin, lu = false) =>
    Notification.create({ destinataire: dest._id, emetteur: emetteur ? emetteur._id : null, type, titre, message, donnees, lu, createdAt: minutesAvant(ilYaMin) });
  await notif(u.sara, u.karim, 'nouveau_message', 'Message de Karim Zouari', 'Petit changement demain : je passerai à 07:58…', { conversationId: convSaraKarim._id, trajetId: T.karimRegulier._id }, 20);
  await notif(u.sara, u.karim, 'trajet_termine', 'Trajet terminé', 'Vous êtes arrivé. Prenez un instant pour noter Karim Zouari.', { trajetId: T.karimHier._id }, 60 * 26);
  await notif(u.sara, u.youssef, 'suggestion', 'Nouveau trajet compatible à 96 %', 'Karim Zouari passe à 0,9 km de chez vous (arrivée 08:10).', { trajetId: T.karimRegulier._id }, 60 * 30, true);
  await notif(u.sara, u.karim, 'reservation_acceptee', 'Réservation acceptée', 'Votre place pour Tunis est confirmée (départ 14:00).', { trajetId: T.karimTunis._id, bookingId: B.saraKarimTunis._id, conversationId: convSaraKarimTunis._id }, 150);
  await notif(u.sara, u.youssef, 'nouvel_avis', 'Nouvel avis : 5/5', 'Youssef Ben Ali vous a noté pour le trajet vers ISET Nabeul.', { trajetId: T.youssefPasse._id }, 60 * 24 * 6, true);
  await notif(u.karim, u.amira, 'reservation_recue', 'Nouvelle demande de réservation', 'Amira Trabelsi demande 1 place pour ISET Nabeul (compatibilité 88 %).', { trajetId: T.karimRegulier._id, bookingId: B.amiraKarim._id }, 15);
  await notif(u.karim, u.omar, 'reservation_recue', 'Nouvelle demande de réservation', 'Omar Gharbi demande 1 place pour ISET Nabeul (compatibilité 71 %).', { trajetId: T.karimRegulier._id, bookingId: B.omarKarim._id }, 30);
  await notif(u.amira, u.linda, 'trajet_demarre', 'Votre conducteur est en route', 'Linda Mejri a démarré le trajet vers ISET Nabeul.', { trajetId: T.lindaEnCours._id, bookingId: B.amiraLinda._id }, 3);
  await notif(u.omar, u.youssef, 'reservation_refusee', 'Demande refusée', 'Le conducteur ne peut pas vous prendre sur ce trajet.', { trajetId: T.youssefRegulier._id, bookingId: B.omarYoussef._id }, 3000, true);
  await notif(u.omar, u.linda, 'trajet_annule', 'Trajet annulé', 'Le conducteur a annulé son trajet vers ISET Nabeul.', { trajetId: T.lindaAnnule._id }, 600);

  // ─── Sprint 5 : signalement (sera traité par l'admin au sprint 6) ───
  await Report.create({ auteur: u.sara._id, utilisateurSignale: u.youssef._id, trajet: T.youssefPasse._id, motif: 'comportement_inapproprie', commentaire: 'Le conducteur a fumé pendant tout le trajet malgré ma demande.' });

  // ─── Notes moyennes, statistiques et badges calculés comme dans l'application ───
  for (const c of COMPTES) {
    const user = await User.findById(u[c.cle]._id);
    const r = await Review.find({ cible: user._id });
    user.nombreAvis = r.length;
    user.noteMoyenne = r.length ? Math.round((r.reduce((s, a) => s + a.note, 0) / r.length) * 10) / 10 : 0;
    await mettreAJourBadges(user, await calculerStatistiques(user._id));
  }

  return u;
}

if (require.main === module) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(seed)
    .then(() => {
      console.log('\n✅ Données de démonstration insérées.\n');
      console.log('Mot de passe de tous les comptes : demo123\n');
      console.log('  sara@isetn.tn     passagère  (suggestions, réservations, chat non lu, trajet à noter)');
      console.log('  karim@isetn.tn    conducteur (2 demandes à accepter, trajets, chat, badges)');
      console.log('  linda@isetn.tn    conductrice (trajet EN COURS à terminer)');
      console.log('  amira@isetn.tn    passagère  (suit le trajet en cours de Linda)');
      console.log('  youssef@isetn.tn  conducteur fumeur (avis moyens, signalé)');
      console.log('  omar@isetn.tn     passager   (demande refusée, trajet annulé)');
      console.log('  admin@isetn.tn    administrateur (pour le sprint 6)\n');
      return mongoose.disconnect();
    })
    .catch((err) => {
      console.error('❌ Erreur :', err.message);
      process.exit(1);
    });
}

module.exports = { seed };
