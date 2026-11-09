const express = require('express');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const auth = require('../middleware/auth');

const router = express.Router();

// Récupérer les statistiques personnelles et les badges de l'utilisateur (US16 & US17)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-motDePasse');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    // 1. Trajets en tant que conducteur
    const trajetsConducteur = await Ride.find({
      conducteur: req.userId,
      statut: { $in: ['termine', 'en_cours', 'actif'] },
    });
    const idsTrajetsConducteur = trajetsConducteur.map((t) => t._id);

    // Réservations acceptées sur ses trajets (gains réels)
    const reservationsConducteur = await Booking.find({
      trajet: { $in: idsTrajetsConducteur },
      statut: 'accepte',
    }).populate('trajet', 'prix distance');

    let gainsConducteur = 0;
    reservationsConducteur.forEach((b) => {
      if (b.trajet) {
        gainsConducteur += (b.places || 1) * (b.trajet.prix || 0);
      }
    });

    // 2. Trajets en tant que passager
    const reservationsPassager = await Booking.find({
      passager: req.userId,
      statut: 'accepte',
    }).populate('trajet');

    const trajetsPassagerEffectues = reservationsPassager.filter(
      (b) => b.trajet && (b.trajet.statut === 'termine' || b.trajet.statut === 'en_cours')
    );

    // Calcul de l'argent économisé pour le passager (estimation vs taxi privé à ~8 DT par trajet)
    let argentEconomisePassager = 0;
    trajetsPassagerEffectues.forEach((b) => {
      const coutUniRide = (b.places || 1) * (b.trajet.prix || 2);
      const estimationTaxi = (b.places || 1) * 8; // estimation transport privé/taxi
      argentEconomisePassager += Math.max(0, estimationTaxi - coutUniRide);
    });

    // 3. Calcul du CO2 évité
    // Formule : distance moyenne (ou 25km par défaut pour trajet vers ISET Nabeul) * 0.12 kg CO2 / km
    let distanceTotaleKm = 0;
    trajetsConducteur.forEach((t) => {
      const km = t.distance ? t.distance / 1000 : 25;
      distanceTotaleKm += km;
    });
    trajetsPassagerEffectues.forEach((b) => {
      const km = b.trajet?.distance ? b.trajet.distance / 1000 : 25;
      distanceTotaleKm += km;
    });

    // Économie de CO2 estimée en kg
    const co2TotalKg = parseFloat((distanceTotaleKm * 0.12).toFixed(1));
    const argentTotalEconomise = parseFloat((argentEconomisePassager + gainsConducteur).toFixed(1));
    const nbTotalTrajets = trajetsConducteur.length + trajetsPassagerEffectues.length;

    // Mise à jour automatique des badges selon les progrès
    const badgesActuels = new Set(user.badges || []);
    badgesActuels.add('Pionnier ISET 🎓');

    if (nbTotalTrajets >= 3 && co2TotalKg >= 5) {
      badgesActuels.add('Éco-Conducteur 🌱');
    }
    if (user.noteMoyenne >= 4.7 && user.nombreAvis >= 3) {
      badgesActuels.add('Super Covoitureur ⭐');
    }

    // Sauvegarder les stats et badges actualisés dans le profil User
    user.badges = Array.from(badgesActuels);
    user.statistiques = {
      co2Economise: co2TotalKg,
      argentEconomise: argentTotalEconomise,
      trajetsEffectues: nbTotalTrajets,
    };
    await user.save();

    // 4. Liste complète de tous les badges avec statut d'obtention
    const definitionBadges = [
      {
        nom: 'Pionnier ISET 🎓',
        titre: 'Pionnier ISET',
        emoji: '🎓',
        description: 'Compte étudiant officiel créé sur UniRide ISET Nabeul.',
        debloque: true,
      },
      {
        nom: 'Ponctuel ⏰',
        titre: 'Ponctuel',
        emoji: '⏰',
        description: 'Arrive toujours à l’heure aux points de rendez-vous convenus.',
        debloque: badgesActuels.has('Ponctuel ⏰'),
      },
      {
        nom: 'Conduite Souple 🚗',
        titre: 'Conduite Souple',
        emoji: '🚗',
        description: 'Reconnu pour une conduite sécurisée, fluide et agréable.',
        debloque: badgesActuels.has('Conduite Souple 🚗'),
      },
      {
        nom: 'Sympathique 😊',
        titre: 'Sympathique',
        emoji: '😊',
        description: 'Ambiance conviviale et courtoise durant les déplacements.',
        debloque: badgesActuels.has('Sympathique 😊'),
      },
      {
        nom: 'Éco-Conducteur 🌱',
        titre: 'Éco-Conducteur',
        emoji: '🌱',
        description: 'A partagé au moins 3 trajets et économisé plus de 5 kg de CO₂.',
        debloque: badgesActuels.has('Éco-Conducteur 🌱'),
      },
      {
        nom: 'Super Covoitureur ⭐',
        titre: 'Super Covoitureur',
        emoji: '⭐',
        description: 'Note moyenne ≥ 4.7/5 avec plusieurs avis élogieux.',
        debloque: badgesActuels.has('Super Covoitureur ⭐'),
      },
    ];

    res.json({
      argentEconomise: argentTotalEconomise,
      gainsConducteur,
      argentEconomisePassager,
      co2Economise: co2TotalKg,
      trajetsEffectues: nbTotalTrajets,
      trajetsConducteur: trajetsConducteur.length,
      trajetsPassager: trajetsPassagerEffectues.length,
      noteMoyenne: user.noteMoyenne || 5.0,
      nombreAvis: user.nombreAvis || 0,
      badges: definitionBadges,
      badgesDebloques: user.badges,
    });
  } catch (err) {
    console.error('Erreur get stats :', err);
    res.status(500).json({ message: 'Erreur chargement des statistiques' });
  }
});

module.exports = router;

