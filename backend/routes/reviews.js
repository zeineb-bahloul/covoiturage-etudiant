const express = require('express');
const Review = require('../models/Review');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const { creerNotification } = require('../services/notifier');

const router = express.Router();

// Soumettre un avis / notation après un trajet (US14 & US17)
router.post('/', auth, async (req, res) => {
  try {
    const { cibleId, trajetId, note, commentaire, badges, roleCible } = req.body;

    if (!cibleId || !trajetId || !note) {
      return res.status(400).json({ message: 'cibleId, trajetId et note sont requis' });
    }

    if (cibleId.toString() === req.userId.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous noter vous-même' });
    }

    const noteNum = Number(note);
    if (isNaN(noteNum) || noteNum < 1 || noteNum > 5) {
      return res.status(400).json({ message: 'La note doit être comprise entre 1 et 5' });
    }

    const trajet = await Ride.findById(trajetId);
    if (!trajet) {
      return res.status(404).json({ message: 'Trajet introuvable' });
    }

    // Vérifier si un avis a déjà été laissé
    const existant = await Review.findOne({
      auteur: req.userId,
      cible: cibleId,
      trajet: trajetId,
    });

    if (existant) {
      return res.status(400).json({ message: 'Vous avez déjà noté cet utilisateur pour ce trajet' });
    }

    const badgesSelectionnes = Array.isArray(badges) ? badges : [];

    const review = await Review.create({
      auteur: req.userId,
      cible: cibleId,
      trajet: trajetId,
      note: noteNum,
      commentaire: commentaire ? commentaire.trim() : '',
      badges: badgesSelectionnes,
      roleCible: roleCible || 'conducteur',
    });

    // Recalculer la note moyenne de la cible
    const tousLesAvis = await Review.find({ cible: cibleId });
    const sommeNotes = tousLesAvis.reduce((acc, a) => acc + a.note, 0);
    const nouvelleMoyenne = parseFloat((sommeNotes / tousLesAvis.length).toFixed(1));

    // Mettre à jour les badges de la cible
    const userCible = await User.findById(cibleId);
    const badgesActuels = new Set(userCible?.badges || []);

    // Ajouter les badges attribués
    badgesSelectionnes.forEach((b) => badgesActuels.add(b));

    // Badge automatique "Super Covoitureur ⭐" si note >= 4.7 et >= 3 avis
    let nouveauBadgeSuper = false;
    if (nouvelleMoyenne >= 4.7 && tousLesAvis.length >= 3 && !badgesActuels.has('Super Covoitureur ⭐')) {
      badgesActuels.add('Super Covoitureur ⭐');
      nouveauBadgeSuper = true;
    }

    await User.findByIdAndUpdate(cibleId, {
      $set: {
        noteMoyenne: nouvelleMoyenne,
        nombreAvis: tousLesAvis.length,
        badges: Array.from(badgesActuels),
      },
    });

    const auteurUser = await User.findById(req.userId).select('nom');

    // Notification avis reçu
    await creerNotification({
      destinataire: cibleId,
      emetteur: req.userId,
      type: 'nouvel_avis',
      titre: `Nouvel avis : ${noteNum} ★`,
      message: `${auteurUser?.nom || 'Un covoitureur'} vous a donné ${noteNum}/5${badgesSelectionnes.length ? ` et ${badgesSelectionnes.length} badge(s)` : ''} !`,
      donnees: {
        trajetId,
        reviewId: review._id,
      },
    });

    if (nouveauBadgeSuper) {
      await creerNotification({
        destinataire: cibleId,
        emetteur: null,
        type: 'badge_obtenu',
        titre: 'Nouveau Badge débloqué ! 🏆',
        message: 'Félicitations ! Vous avez obtenu le badge « Super Covoitureur ⭐ » grâce à vos excellentes évaluations.',
        donnees: { trajetId },
      });
    }

    res.status(201).json({
      message: 'Avis enregistré avec succès',
      review,
      nouvelleNote: nouvelleMoyenne,
    });
  } catch (err) {
    console.error('Erreur creation review :', err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement de l'avis" });
  }
});

// Récupérer les avis reçus par un utilisateur
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ cible: req.params.userId })
      .populate('auteur', 'nom photo filiere')
      .populate('trajet', 'depart destination dateDepart')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error('Erreur get reviews :', err);
    res.status(500).json({ message: 'Erreur lors du chargement des avis' });
  }
});

// Vérifier si l'utilisateur connecté a déjà noté pour un trajet
router.get('/check/:rideId', auth, async (req, res) => {
  try {
    const avis = await Review.find({
      auteur: req.userId,
      trajet: req.params.rideId,
    }).select('cible note');

    res.json(avis);
  } catch (err) {
    console.error('Erreur check review :', err);
    res.status(500).json({ message: 'Erreur vérification avis' });
  }
});

module.exports = router;

