const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const auth = require('../middleware/auth');
const { creerNotification } = require('../services/notifier');
const { calculerScoreCompatibiliteDetaille } = require('../services/matching');

const router = express.Router();

// 1. Réserver une place (US9, US13)
router.post('/', auth, async (req, res) => {
  try {
    const { trajetId, places = 1, message = '' } = req.body;

    if (!mongoose.isValidObjectId(trajetId)) {
      return res.status(400).json({ message: 'Identifiant de trajet invalide' });
    }

    const nbPlaces = Number(places);
    if (!Number.isInteger(nbPlaces) || nbPlaces < 1) {
      return res.status(400).json({ message: 'Nombre de places invalide (minimum 1)' });
    }

    const ride = await Ride.findById(trajetId).populate('conducteur', 'nom preferences noteMoyenne photo filiere');
    if (!ride || (ride.statut !== 'actif' && ride.statut !== 'en_cours')) {
      return res.status(404).json({ message: 'Trajet non disponible ou annulé' });
    }

    if (ride.conducteur._id.toString() === req.userId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas réserver votre propre trajet' });
    }

    if (ride.places < nbPlaces) {
      return res.status(400).json({ message: `Il ne reste que ${ride.places} place(s) disponible(s)` });
    }

    const existant = await Booking.findOne({
      trajet: trajetId,
      passager: req.userId,
      statut: { $in: ['en_attente', 'acceptee'] },
    });

    if (existant) {
      return res.status(400).json({
        message:
          existant.statut === 'acceptee'
            ? 'Vous avez déjà une place confirmée sur ce trajet'
            : 'Vous avez déjà une demande en attente pour ce trajet',
      });
    }

    const passager = await User.findById(req.userId);
    const schedule = await Schedule.findOne({ user: req.userId });

    const resultatScore = calculerScoreCompatibiliteDetaille({
      ride,
      passenger: passager,
      passengerSchedule: schedule,
    });

    const booking = await Booking.create({
      trajet: trajetId,
      passager: req.userId,
      conducteur: ride.conducteur._id,
      places: nbPlaces,
      message: (message || '').trim(),
      statut: 'en_attente',
      scoreMatch: resultatScore.scoreTotal,
    });

    // Envoyer une notification au conducteur (US13)
    await creerNotification({
      destinataire: ride.conducteur._id,
      emetteur: req.userId,
      type: 'reservation_recue',
      titre: 'Nouvelle demande de réservation ! 💺',
      message: `${passager.nom} (${passager.filiere || 'Étudiant'}) souhaite réserver ${nbPlaces} place(s) (${resultatScore.scoreTotal}% match).`,
      donnees: { trajetId: ride._id, bookingId: booking._id },
    });

    const populated = await Booking.findById(booking._id)
      .populate('conducteur', 'nom filiere photo noteMoyenne vehicule')
      .populate('trajet', 'depart destination heureDepart heureArrivee prix date jours recurrent statut');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Erreur réservation :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la réservation' });
  }
});

// 2. Consulter mes réservations (en tant que passager) (US9)
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ passager: req.userId })
      .populate('conducteur', 'nom filiere photo noteMoyenne vehicule preferences')
      .populate('trajet', 'depart destination heureDepart heureArrivee prix statut date jours recurrent places')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 3. Consulter les demandes reçues (en tant que conducteur) (US10)
router.get('/requests', auth, async (req, res) => {
  try {
    const { statut, trajetId } = req.query;
    const filter = { conducteur: req.userId };

    if (statut) {
      filter.statut = statut;
    }
    if (trajetId && mongoose.isValidObjectId(trajetId)) {
      filter.trajet = trajetId;
    }

    const requests = await Booking.find(filter)
      .populate('passager', 'nom email filiere photo noteMoyenne preferences')
      .populate('trajet', 'depart destination heureDepart heureArrivee prix places date jours recurrent statut')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 4. Vérifier si l'utilisateur connecté a déjà réservé un trajet spécifique
router.get('/ride/:rideId', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.rideId)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const booking = await Booking.findOne({
      trajet: req.params.rideId,
      passager: req.userId,
      statut: { $in: ['en_attente', 'acceptee'] },
    });

    res.json({ booked: !!booking, booking: booking || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 5. Accepter une réservation (US10, US13)
router.patch('/:id/accept', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Demande introuvable' });
    }

    if (booking.conducteur.toString() !== req.userId) {
      return res.status(403).json({ message: 'Non autorisé à gérer cette demande' });
    }

    if (booking.statut === 'acceptee') {
      return res.json(booking);
    }

    const ride = await Ride.findById(booking.trajet);
    if (!ride || (ride.statut !== 'actif' && ride.statut !== 'en_cours')) {
      return res.status(400).json({ message: 'Trajet non disponible ou annulé' });
    }

    if (ride.places < booking.places) {
      return res.status(400).json({
        message: `Impossible d'accepter : plus assez de places libres (${ride.places} restante(s))`,
      });
    }

    ride.places = Math.max(0, ride.places - booking.places);
    await ride.save();

    booking.statut = 'acceptee';
    await booking.save();

    // Notifier le passager (US13)
    await creerNotification({
      destinataire: booking.passager,
      emetteur: req.userId,
      type: 'reservation_acceptee',
      titre: 'Réservation acceptée ! 🎉',
      message: `Votre place vers l'ISET Nabeul est confirmée (départ à ${ride.heureDepart}).`,
      donnees: { trajetId: ride._id, bookingId: booking._id },
    });

    const populated = await Booking.findById(booking._id)
      .populate('passager', 'nom email filiere photo noteMoyenne')
      .populate('trajet');

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 6. Refuser une réservation (US10, US13)
router.patch('/:id/refuse', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Demande introuvable' });
    }

    if (booking.conducteur.toString() !== req.userId) {
      return res.status(403).json({ message: 'Non autorisé à gérer cette demande' });
    }

    if (booking.statut === 'acceptee') {
      await Ride.findByIdAndUpdate(booking.trajet, { $inc: { places: booking.places } });
    }

    booking.statut = 'refusee';
    await booking.save();

    // Notifier le passager (US13)
    await creerNotification({
      destinataire: booking.passager,
      emetteur: req.userId,
      type: 'reservation_refusee',
      titre: 'Demande non validée',
      message: `Le conducteur ne peut pas accepter votre demande pour ce trajet.`,
      donnees: { trajetId: booking.trajet, bookingId: booking._id },
    });

    const populated = await Booking.findById(booking._id)
      .populate('passager', 'nom email filiere photo noteMoyenne')
      .populate('trajet');

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 7. Annuler une réservation (par le passager) (US9, US13)
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Réservation introuvable' });
    }

    if (booking.passager.toString() !== req.userId) {
      return res.status(403).json({ message: 'Non autorisé à annuler cette réservation' });
    }

    if (booking.statut === 'annulee') {
      return res.json(booking);
    }

    if (booking.statut === 'acceptee') {
      await Ride.findByIdAndUpdate(booking.trajet, { $inc: { places: booking.places } });
    }

    booking.statut = 'annulee';
    await booking.save();

    // Notifier le conducteur (US13)
    await creerNotification({
      destinataire: booking.conducteur,
      emetteur: req.userId,
      type: 'reservation_annulee',
      titre: 'Place libérée (Annulation passager)',
      message: `Un passager a annulé sa réservation. La place a été remise à disposition.`,
      donnees: { trajetId: booking.trajet, bookingId: booking._id },
    });

    res.json({ message: 'Réservation annulée', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
