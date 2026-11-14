const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const { creerNotification } = require('../services/notifier');
const { COMPLIMENTS, calculerStatistiques, mettreAJourBadges } = require('../services/badges');

const router = express.Router();
const idValide = (id) => mongoose.isValidObjectId(id);
const court = (label) => (label || '').split(',')[0].trim();

/** Rôle de chacun sur un trajet terminé : null si l'un des deux n'y a pas participé. */
async function rolesSurTrajet(ride, auteurId, cibleId) {
  const conducteurId = ride.conducteur.toString();
  const passagers = (await Booking.find({ trajet: ride._id, statut: 'acceptee' }).select('passager')).map((b) =>
    b.passager.toString()
  );
  const role = (id) => (id === conducteurId ? 'conducteur' : passagers.includes(id) ? 'passager' : null);
  const roleAuteur = role(auteurId);
  const roleCible = role(cibleId);
  // On note toujours l'autre côté : conducteur ↔ passager
  if (!roleAuteur || !roleCible || roleAuteur === roleCible) return null;
  return { roleAuteur, roleCible };
}

// Liste des compliments disponibles (pour l'écran de notation)
router.get('/compliments', auth, (req, res) => {
  res.json(Object.entries(COMPLIMENTS).map(([id, c]) => ({ id, ...c })));
});

// Covoitureurs que je n'ai pas encore notés (trajets terminés)
router.get('/a-noter', auth, async (req, res) => {
  try {
    const depuis = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dejaNotes = await Review.find({ auteur: req.userId }).select('cible trajet');
    const fait = new Set(dejaNotes.map((r) => `${r.trajet}:${r.cible}`));
    const aNoter = [];

    // En tant que passager → noter le conducteur
    const mesBookings = await Booking.find({ passager: req.userId, statut: 'acceptee' }).populate({
      path: 'trajet',
      match: { statut: 'termine', finishedAt: { $gte: depuis } },
      select: 'depart destination finishedAt conducteur',
      populate: { path: 'conducteur', select: 'nom photo filiere' },
    });
    for (const b of mesBookings) {
      const t = b.trajet;
      if (!t || !t.conducteur || fait.has(`${t._id}:${t.conducteur._id}`)) continue;
      aNoter.push({ trajet: t, cible: t.conducteur, roleCible: 'conducteur' });
    }

    // En tant que conducteur → noter chaque passager
    const mesRides = await Ride.find({ conducteur: req.userId, statut: 'termine', finishedAt: { $gte: depuis } }).select(
      'depart destination finishedAt'
    );
    const bookings = await Booking.find({ trajet: { $in: mesRides.map((r) => r._id) }, statut: 'acceptee' }).populate(
      'passager',
      'nom photo filiere'
    );
    for (const b of bookings) {
      if (!b.passager || fait.has(`${b.trajet}:${b.passager._id}`)) continue;
      const t = mesRides.find((r) => r._id.toString() === b.trajet.toString());
      aNoter.push({ trajet: t, cible: b.passager, roleCible: 'passager' });
    }

    aNoter.sort((a, b) => new Date(b.trajet.finishedAt) - new Date(a.trajet.finishedAt));
    res.json(aNoter);
  } catch (err) {
    console.error('Erreur a-noter :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Noter un covoitureur après un trajet (US14) + compliments (US17)
router.post('/', auth, async (req, res) => {
  try {
    const { cibleId, trajetId, note, commentaire, badges } = req.body;

    if (!idValide(cibleId) || !idValide(trajetId)) {
      return res.status(400).json({ message: 'Trajet ou covoitureur invalide' });
    }
    if (cibleId === req.userId) return res.status(400).json({ message: 'Vous ne pouvez pas vous noter vous-même' });

    const noteNum = Number(note);
    if (!Number.isInteger(noteNum) || noteNum < 1 || noteNum > 5) {
      return res.status(400).json({ message: 'La note doit être un nombre entier entre 1 et 5' });
    }

    const trajet = await Ride.findById(trajetId);
    if (!trajet) return res.status(404).json({ message: 'Trajet introuvable' });
    if (trajet.statut !== 'termine') {
      return res.status(400).json({ message: 'Vous pourrez noter ce covoitureur une fois le trajet terminé' });
    }

    const roles = await rolesSurTrajet(trajet, req.userId, cibleId);
    if (!roles) return res.status(403).json({ message: "Vous n'avez pas partagé ce trajet avec cette personne" });

    if (await Review.exists({ auteur: req.userId, cible: cibleId, trajet: trajetId })) {
      return res.status(400).json({ message: 'Vous avez déjà noté cette personne pour ce trajet' });
    }

    const compliments = (Array.isArray(badges) ? badges : []).filter(
      (b) => COMPLIMENTS[b] && COMPLIMENTS[b].roles.includes(roles.roleCible)
    );

    const review = await Review.create({
      auteur: req.userId,
      cible: cibleId,
      trajet: trajetId,
      note: noteNum,
      commentaire: typeof commentaire === 'string' ? commentaire.trim().slice(0, 500) : '',
      badges: [...new Set(compliments)],
      roleCible: roles.roleCible,
    });

    // Nouvelle moyenne de la personne notée
    const [agg] = await Review.aggregate([
      { $match: { cible: new mongoose.Types.ObjectId(cibleId) } },
      { $group: { _id: null, moyenne: { $avg: '$note' }, nb: { $sum: 1 } } },
    ]);
    const cible = await User.findById(cibleId);
    cible.noteMoyenne = Math.round(agg.moyenne * 10) / 10;
    cible.nombreAvis = agg.nb;
    await cible.save();

    const stats = await calculerStatistiques(cible._id);
    const { nouveaux } = await mettreAJourBadges(cible, stats);

    const auteur = await User.findById(req.userId).select('nom');
    await creerNotification({
      destinataire: cibleId,
      emetteur: req.userId,
      type: 'nouvel_avis',
      titre: `Nouvel avis : ${noteNum}/5`,
      message: `${auteur?.nom || 'Un covoitureur'} vous a noté pour le trajet vers ${court(trajet.destination.label)}.`,
      donnees: { trajetId, reviewId: review._id },
    });
    for (const b of nouveaux) {
      await creerNotification({
        destinataire: cibleId,
        type: 'badge_obtenu',
        titre: 'Nouveau badge débloqué',
        message: `Félicitations ! Vous avez obtenu le badge « ${b.titre} ».`,
        donnees: { trajetId },
      });
    }

    res.status(201).json({ message: 'Avis enregistré', review, nouvelleNote: cible.noteMoyenne });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Vous avez déjà noté cette personne pour ce trajet' });
    console.error('Erreur creation review :', err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement de l'avis" });
  }
});

// Avis reçus par un utilisateur
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (!idValide(req.params.userId)) return res.status(400).json({ message: 'Identifiant invalide' });
    const reviews = await Review.find({ cible: req.params.userId })
      .populate('auteur', 'nom photo filiere')
      .populate('trajet', 'depart destination date')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (err) {
    console.error('Erreur get reviews :', err);
    res.status(500).json({ message: 'Erreur lors du chargement des avis' });
  }
});

// Avis déjà laissés par moi pour un trajet
router.get('/check/:rideId', auth, async (req, res) => {
  try {
    if (!idValide(req.params.rideId)) return res.status(400).json({ message: 'Identifiant invalide' });
    res.json(await Review.find({ auteur: req.userId, trajet: req.params.rideId }).select('cible note'));
  } catch (err) {
    res.status(500).json({ message: 'Erreur vérification avis' });
  }
});

module.exports = router;
