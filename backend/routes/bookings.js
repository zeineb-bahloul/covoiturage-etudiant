const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const { creerNotification } = require('../services/notifier');
const { calculerScore } = require('../services/matching');

const router = express.Router();
const idValide = (id) => mongoose.isValidObjectId(id);
const court = (label) => (label || '').split(',')[0].trim();
const CHAMPS_TRAJET = 'depart destination heureDepart heureArrivee prix places statut date jours recurrent distanceKm dureeMin';

/** Crée (ou retrouve) la discussion conducteur ↔ passager liée au trajet. */
async function conversationDuTrajet(conducteurId, passagerId, ride) {
  let conv = await Conversation.findOne({
    participants: { $all: [conducteurId, passagerId] },
    trajet: ride._id,
  });
  if (!conv) {
    conv = await Conversation.create({
      participants: [conducteurId, passagerId],
      trajet: ride._id,
      titre: `${court(ride.depart.label)} → ${court(ride.destination.label)}`,
    });
  }
  return conv;
}

// 1. Réserver une place (US9)
router.post('/', auth, async (req, res) => {
  try {
    const { trajetId, places = 1, message = '' } = req.body;
    if (!idValide(trajetId)) return res.status(400).json({ message: 'Identifiant de trajet invalide' });

    const nbPlaces = Number(places);
    if (!Number.isInteger(nbPlaces) || nbPlaces < 1) {
      return res.status(400).json({ message: 'Nombre de places invalide (minimum 1)' });
    }

    const ride = await Ride.findById(trajetId).populate('conducteur', 'nom preferences noteMoyenne nombreAvis');
    if (!ride || ride.statut !== 'actif' || !ride.conducteur) {
      return res.status(404).json({ message: 'Trajet non disponible (déjà parti, terminé ou annulé)' });
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

    const [passager, schedule] = await Promise.all([
      User.findById(req.userId),
      Schedule.findOne({ user: req.userId }),
    ]);
    const { scoreTotal } = calculerScore({ ride, passager, schedule });

    const booking = await Booking.create({
      trajet: trajetId,
      passager: req.userId,
      conducteur: ride.conducteur._id,
      places: nbPlaces,
      message: String(message || '').trim().slice(0, 300),
      statut: 'en_attente',
      scoreMatch: scoreTotal,
    });

    await creerNotification({
      destinataire: ride.conducteur._id,
      emetteur: req.userId,
      type: 'reservation_recue',
      titre: 'Nouvelle demande de réservation',
      message: `${passager.nom} demande ${nbPlaces} place(s) pour ${court(ride.destination.label)} (compatibilité ${scoreTotal} %).`,
      donnees: { trajetId: ride._id, bookingId: booking._id },
    });

    const populated = await Booking.findById(booking._id)
      .populate('conducteur', 'nom filiere photo noteMoyenne vehicule')
      .populate('trajet', CHAMPS_TRAJET);
    res.status(201).json(populated);
  } catch (err) {
    console.error('Erreur réservation :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la réservation' });
  }
});

// 2. Mes réservations (passager) — historique complet (US9)
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ passager: req.userId })
      .populate('conducteur', 'nom filiere photo noteMoyenne nombreAvis vehicule preferences')
      .populate('trajet', CHAMPS_TRAJET)
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 3. Demandes reçues (conducteur) (US10)
router.get('/requests', auth, async (req, res) => {
  try {
    const { statut, trajetId } = req.query;
    const filter = { conducteur: req.userId };
    if (['en_attente', 'acceptee', 'refusee', 'annulee'].includes(statut)) filter.statut = statut;
    if (trajetId && idValide(trajetId)) filter.trajet = trajetId;

    const requests = await Booking.find(filter)
      .populate('passager', 'nom filiere photo noteMoyenne nombreAvis preferences')
      .populate('trajet', CHAMPS_TRAJET)
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 4. Ma réservation active pour un trajet donné
router.get('/ride/:rideId', auth, async (req, res) => {
  try {
    if (!idValide(req.params.rideId)) return res.status(400).json({ message: 'Identifiant invalide' });
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

// 5. Accepter une demande (US10)
router.patch('/:id/accept', auth, async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Demande introuvable' });
    if (booking.conducteur.toString() !== req.userId) {
      return res.status(403).json({ message: 'Non autorisé à gérer cette demande' });
    }
    if (booking.statut === 'acceptee') return res.json(booking);
    if (booking.statut !== 'en_attente') {
      return res.status(400).json({ message: 'Cette demande a été annulée ou déjà traitée' });
    }

    // Décrément atomique : impossible d'accepter plus de passagers que de places
    const ride = await Ride.findOneAndUpdate(
      { _id: booking.trajet, statut: 'actif', places: { $gte: booking.places } },
      { $inc: { places: -booking.places } },
      { returnDocument: 'after' }
    );
    if (!ride) {
      return res.status(400).json({ message: 'Plus assez de places libres, ou trajet déjà parti' });
    }

    booking.statut = 'acceptee';
    await booking.save();

    const conv = await conversationDuTrajet(req.userId, booking.passager, ride);

    await creerNotification({
      destinataire: booking.passager,
      emetteur: req.userId,
      type: 'reservation_acceptee',
      titre: 'Réservation acceptée',
      message: `Votre place pour ${court(ride.destination.label)} est confirmée (départ ${ride.heureDepart}). Fixez le point de rendez-vous dans le chat.`,
      donnees: { trajetId: ride._id, bookingId: booking._id, conversationId: conv._id },
    });

    const populated = await Booking.findById(booking._id)
      .populate('passager', 'nom filiere photo noteMoyenne')
      .populate('trajet', CHAMPS_TRAJET);
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 6. Refuser une demande (US10)
router.patch('/:id/refuse', auth, async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Demande introuvable' });
    if (booking.conducteur.toString() !== req.userId) {
      return res.status(403).json({ message: 'Non autorisé à gérer cette demande' });
    }
    if (!['en_attente', 'acceptee'].includes(booking.statut)) {
      return res.status(400).json({ message: 'Cette demande est déjà annulée ou refusée' });
    }

    if (booking.statut === 'acceptee') {
      await Ride.findByIdAndUpdate(booking.trajet, { $inc: { places: booking.places } });
    }
    booking.statut = 'refusee';
    await booking.save();

    await creerNotification({
      destinataire: booking.passager,
      emetteur: req.userId,
      type: 'reservation_refusee',
      titre: 'Demande refusée',
      message: 'Le conducteur ne peut pas vous prendre sur ce trajet. Consultez les autres suggestions.',
      donnees: { trajetId: booking.trajet, bookingId: booking._id },
    });

    const populated = await Booking.findById(booking._id)
      .populate('passager', 'nom filiere photo noteMoyenne')
      .populate('trajet', CHAMPS_TRAJET);
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// 7. Annuler sa réservation (passager)
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });

    const booking = await Booking.findById(req.params.id).populate('passager', 'nom');
    if (!booking) return res.status(404).json({ message: 'Réservation introuvable' });
    if (booking.passager._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Non autorisé à annuler cette réservation' });
    }
    if (!['en_attente', 'acceptee'].includes(booking.statut)) {
      return res.json({ message: 'Réservation déjà close', booking });
    }

    const ride = await Ride.findById(booking.trajet);
    if (ride && ride.statut !== 'actif') {
      return res.status(400).json({ message: 'Le trajet a déjà démarré ou est terminé' });
    }

    if (booking.statut === 'acceptee') {
      await Ride.findByIdAndUpdate(booking.trajet, { $inc: { places: booking.places } });
    }
    booking.statut = 'annulee';
    await booking.save();

    await creerNotification({
      destinataire: booking.conducteur,
      emetteur: req.userId,
      type: 'reservation_annulee',
      titre: 'Réservation annulée',
      message: `${booking.passager.nom} a annulé sa réservation. La place est de nouveau disponible.`,
      donnees: { trajetId: booking.trajet, bookingId: booking._id },
    });

    res.json({ message: 'Réservation annulée', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
