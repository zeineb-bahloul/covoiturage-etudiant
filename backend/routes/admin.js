const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Report = require('../models/Report');
const Schedule = require('../models/Schedule');
const Sos = require('../models/Sos');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { creerNotification } = require('../services/notifier');
const { emettreA } = require('../services/socket');
const { CO2_KG_PAR_KM } = require('../services/badges');

const router = express.Router();
router.use(auth, admin);

const idValide = (id) => mongoose.isValidObjectId(id);
const JOUR = 24 * 60 * 60 * 1000;
const court = (label) => (label || '').split(',')[0].trim();
const echapper = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ───────────── US20 : tableau de bord ───────────── */

router.get('/dashboard', async (req, res) => {
  try {
    const maintenant = Date.now();
    const il7j = new Date(maintenant - 7 * JOUR);
    const il30j = new Date(maintenant - 30 * JOUR);
    const etudiants = { role: 'utilisateur' };

    const [
      total,
      actifs7j,
      actifs30j,
      nouveaux7j,
      bloques,
      conducteurs,
      trajetsParStatut,
      reservationsAcceptees,
      avis,
      signalementsEnAttente,
      sosActives,
    ] = await Promise.all([
      User.countDocuments(etudiants),
      User.countDocuments({ ...etudiants, derniereActivite: { $gte: il7j } }),
      User.countDocuments({ ...etudiants, derniereActivite: { $gte: il30j } }),
      User.countDocuments({ ...etudiants, createdAt: { $gte: il7j } }),
      User.countDocuments({ ...etudiants, bloque: true }),
      User.countDocuments({ ...etudiants, vehicule: { $ne: null } }),
      Ride.aggregate([{ $group: { _id: '$statut', nb: { $sum: 1 } } }]),
      Booking.countDocuments({ statut: 'acceptee' }),
      Review.aggregate([
        {
          $group: {
            _id: null,
            nb: { $sum: 1 },
            moyenne: { $avg: '$note' },
            satisfaits: { $sum: { $cond: [{ $gte: ['$note', 4] }, 1, 0] } },
          },
        },
      ]),
      Report.countDocuments({ statut: 'en_attente' }),
      Sos.countDocuments({ statut: 'active' }),
    ]);

    const parStatut = Object.fromEntries(trajetsParStatut.map((t) => [t._id, t.nb]));
    const a = avis[0] || { nb: 0, moyenne: 0, satisfaits: 0 };

    // CO₂ évité et passagers transportés sur les trajets terminés
    const termines = await Ride.find({ statut: 'termine' }).select('distanceKm finishedAt');
    const bookingsTermines = await Booking.find({ trajet: { $in: termines.map((t) => t._id) }, statut: 'acceptee' }).select('trajet places');
    const kmParTrajet = Object.fromEntries(termines.map((t) => [t._id.toString(), t.distanceKm || 0]));
    let co2 = 0;
    let passagers = 0;
    for (const b of bookingsTermines) {
      passagers += b.places || 1;
      co2 += (kmParTrajet[b.trajet.toString()] || 0) * (b.places || 1) * CO2_KG_PAR_KM;
    }

    // Activité des 7 derniers jours
    const jours = [];
    for (let i = 6; i >= 0; i--) {
      const debut = new Date(maintenant - i * JOUR);
      debut.setHours(0, 0, 0, 0);
      jours.push({ debut, fin: new Date(debut.getTime() + JOUR) });
    }
    const [inscriptions, publies] = await Promise.all([
      User.find({ ...etudiants, createdAt: { $gte: jours[0].debut } }).select('createdAt'),
      Ride.find({ createdAt: { $gte: jours[0].debut } }).select('createdAt'),
    ]);
    const compter = (liste, champ, j) => liste.filter((x) => x[champ] >= j.debut && x[champ] < j.fin).length;
    const activite = jours.map((j) => ({
      date: j.debut.toISOString().slice(0, 10),
      jour: j.debut.toLocaleDateString('fr-FR', { weekday: 'short' }),
      trajetsTermines: compter(termines, 'finishedAt', j),
      trajetsPublies: compter(publies, 'createdAt', j),
      inscriptions: compter(inscriptions, 'createdAt', j),
    }));

    // Meilleurs conducteurs (trajets terminés)
    const top = await Ride.aggregate([
      { $match: { statut: 'termine' } },
      { $group: { _id: '$conducteur', trajets: { $sum: 1 } } },
      { $sort: { trajets: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
      { $unwind: '$u' },
      { $project: { trajets: 1, nom: '$u.nom', photo: '$u.photo', noteMoyenne: '$u.noteMoyenne' } },
    ]);

    res.json({
      utilisateurs: { total, actifs7j, actifs30j, nouveaux7j, bloques, conducteurs },
      trajets: {
        publies: Object.values(parStatut).reduce((s, n) => s + n, 0),
        aVenir: parStatut.actif || 0,
        enCours: parStatut.en_cours || 0,
        effectues: parStatut.termine || 0,
        annules: parStatut.annule || 0,
        reservationsAcceptees,
        passagersTransportes: passagers,
      },
      satisfaction: {
        nbAvis: a.nb,
        noteMoyenne: a.nb ? Math.round(a.moyenne * 10) / 10 : 0,
        taux: a.nb ? Math.round((a.satisfaits / a.nb) * 100) : 0,
      },
      co2EviteKg: Math.round(co2 * 10) / 10,
      signalementsEnAttente,
      sosActives,
      activite,
      topConducteurs: top,
    });
  } catch (err) {
    console.error('Erreur dashboard :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* ───────────── US18 : gestion des utilisateurs ───────────── */

router.get('/users', async (req, res) => {
  try {
    const { q, filtre } = req.query;
    const requete = {};
    if (q && q.trim()) {
      const re = new RegExp(echapper(q.trim()), 'i');
      requete.$or = [{ nom: re }, { email: re }, { filiere: re }];
    }
    if (filtre === 'bloques') requete.bloque = true;
    if (filtre === 'conducteurs') requete.vehicule = { $ne: null };
    if (filtre === 'admins') requete.role = 'admin';

    const users = await User.find(requete)
      .select('nom email filiere photo role bloque bloqueRaison bloqueLe noteMoyenne nombreAvis vehicule derniereActivite createdAt')
      .sort({ createdAt: -1 })
      .limit(200);

    const ids = users.map((u) => u._id);
    const [signalements, trajets] = await Promise.all([
      Report.aggregate([{ $match: { utilisateurSignale: { $in: ids } } }, { $group: { _id: '$utilisateurSignale', nb: { $sum: 1 } } }]),
      Ride.aggregate([{ $match: { conducteur: { $in: ids }, statut: 'termine' } }, { $group: { _id: '$conducteur', nb: { $sum: 1 } } }]),
    ]);
    const nbSign = Object.fromEntries(signalements.map((s) => [s._id.toString(), s.nb]));
    const nbTrajets = Object.fromEntries(trajets.map((s) => [s._id.toString(), s.nb]));

    res.json(
      users.map((u) => ({
        ...u.toObject(),
        nbSignalements: nbSign[u._id.toString()] || 0,
        trajetsConducteur: nbTrajets[u._id.toString()] || 0,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });
    const user = await User.findById(req.params.id).select('-motDePasse');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    const [signalements, avis, trajets, reservations] = await Promise.all([
      Report.find({ utilisateurSignale: user._id }).populate('auteur', 'nom').sort({ createdAt: -1 }).limit(20),
      Review.find({ cible: user._id }).populate('auteur', 'nom').sort({ createdAt: -1 }).limit(10),
      Ride.countDocuments({ conducteur: user._id }),
      Booking.countDocuments({ passager: user._id }),
    ]);
    res.json({ user, signalements, avis, trajets, reservations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/** Annule les trajets à venir et les réservations d'un utilisateur (blocage ou suppression). */
async function retirerDeLaCirculation(user, raison) {
  const rides = await Ride.find({ conducteur: user._id, statut: 'actif' });
  for (const ride of rides) {
    ride.statut = 'annule';
    await ride.save();
    const bookings = await Booking.find({ trajet: ride._id, statut: { $in: ['en_attente', 'acceptee'] } });
    for (const b of bookings) {
      b.statut = 'annulee';
      await b.save();
      await creerNotification({
        destinataire: b.passager,
        type: 'trajet_annule',
        titre: 'Trajet annulé',
        message: `Le trajet vers ${court(ride.destination.label)} a été annulé (${raison}).`,
        donnees: { trajetId: ride._id, bookingId: b._id },
      });
    }
  }
  const mesResas = await Booking.find({ passager: user._id, statut: { $in: ['en_attente', 'acceptee'] } }).populate('trajet', 'statut');
  for (const b of mesResas) {
    if (b.trajet && b.trajet.statut !== 'actif') continue;
    if (b.statut === 'acceptee') await Ride.updateOne({ _id: b.trajet._id }, { $inc: { places: b.places } });
    b.statut = 'annulee';
    await b.save();
  }
  return rides.length;
}

router.patch('/users/:id/block', async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });
    if (req.params.id === req.userId) return res.status(400).json({ message: 'Vous ne pouvez pas bloquer votre propre compte' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Impossible de bloquer un administrateur' });

    const raison = String(req.body.raison || '').trim().slice(0, 200) || 'Non-respect des règles de la communauté';
    user.bloque = true;
    user.bloqueRaison = raison;
    user.bloqueLe = new Date();
    await user.save();
    const annules = await retirerDeLaCirculation(user, 'compte du conducteur suspendu');

    // Déconnexion immédiate de l'application
    emettreA(user._id, 'compte:bloque', { raison });

    res.json({ message: `${user.nom} est bloqué(e). ${annules} trajet(s) à venir annulé(s).`, user: { _id: user._id, bloque: true, bloqueRaison: raison } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.patch('/users/:id/unblock', async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { bloque: false, bloqueRaison: '', bloqueLe: null },
      { returnDocument: 'after' }
    ).select('nom bloque');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ message: `${user.nom} est débloqué(e).`, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });
    if (req.params.id === req.userId) return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Impossible de supprimer un administrateur' });

    await retirerDeLaCirculation(user, 'compte supprimé');
    emettreA(user._id, 'compte:bloque', { raison: 'Compte supprimé par l’administration' });
    await Schedule.deleteMany({ user: user._id });
    // L'historique (trajets terminés, avis, messages) est conservé : il affiche « Utilisateur supprimé »
    await User.deleteOne({ _id: user._id });

    res.json({ message: `Le compte de ${user.nom} a été supprimé.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* ───────────── US19 : signalements ───────────── */

router.get('/reports', async (req, res) => {
  try {
    const filtre = ['en_attente', 'traite', 'rejete'].includes(req.query.statut) ? { statut: req.query.statut } : {};
    const reports = await Report.find(filtre)
      .populate('auteur', 'nom email photo')
      .populate('utilisateurSignale', 'nom email photo bloque noteMoyenne nombreAvis')
      .populate('trajet', 'depart destination date heureDepart')
      .sort({ createdAt: -1 })
      .limit(200);

    const ids = [...new Set(reports.map((r) => r.utilisateurSignale?._id?.toString()).filter(Boolean))];
    const compte = await Report.aggregate([
      { $match: { utilisateurSignale: { $in: ids.map((i) => new mongoose.Types.ObjectId(i)) } } },
      { $group: { _id: '$utilisateurSignale', nb: { $sum: 1 } } },
    ]);
    const nb = Object.fromEntries(compte.map((c) => [c._id.toString(), c.nb]));
    res.json(reports.map((r) => ({ ...r.toObject(), nbSignalementsCible: nb[r.utilisateurSignale?._id?.toString()] || 0 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.patch('/reports/:id', async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });
    const { statut, decision, bloquer } = req.body;
    if (!['traite', 'rejete'].includes(statut)) {
      return res.status(400).json({ message: 'Statut attendu : « traite » ou « rejete »' });
    }
    const report = await Report.findById(req.params.id).populate('utilisateurSignale', 'nom role');
    if (!report) return res.status(404).json({ message: 'Signalement introuvable' });

    report.statut = statut;
    report.decisionAdmin = String(decision || '').trim().slice(0, 500) || (statut === 'traite' ? 'Signalement pris en compte.' : 'Signalement non fondé.');
    await report.save();

    let message = statut === 'traite' ? 'Signalement traité.' : 'Signalement rejeté.';
    if (statut === 'traite' && bloquer && report.utilisateurSignale && report.utilisateurSignale.role !== 'admin') {
      const cible = await User.findById(report.utilisateurSignale._id);
      cible.bloque = true;
      cible.bloqueRaison = report.decisionAdmin;
      cible.bloqueLe = new Date();
      await cible.save();
      await retirerDeLaCirculation(cible, 'compte du conducteur suspendu');
      emettreA(cible._id, 'compte:bloque', { raison: report.decisionAdmin });
      message += ` ${cible.nom} a été bloqué(e).`;
    }

    await creerNotification({
      destinataire: report.auteur,
      type: 'signalement_traite',
      titre: statut === 'traite' ? 'Votre signalement a été traité' : 'Signalement examiné',
      message: report.decisionAdmin,
      donnees: { reportId: report._id, trajetId: report.trajet || undefined },
    });

    res.json({ message, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* ───────────── US22 : alertes SOS ───────────── */

router.get('/sos', async (req, res) => {
  try {
    const alertes = await Sos.find(req.query.statut === 'active' ? { statut: 'active' } : {})
      .populate('auteur', 'nom email telephone photo')
      .populate({ path: 'trajet', select: 'depart destination heureDepart conducteur', populate: { path: 'conducteur', select: 'nom telephone vehicule' } })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(alertes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.patch('/sos/:id/resolve', async (req, res) => {
  try {
    if (!idValide(req.params.id)) return res.status(400).json({ message: 'Identifiant invalide' });
    const sos = await Sos.findByIdAndUpdate(
      req.params.id,
      { statut: 'resolue', resoluPar: req.userId, resoluLe: new Date(), noteAdmin: String(req.body.note || '').slice(0, 300) },
      { returnDocument: 'after' }
    );
    if (!sos) return res.status(404).json({ message: 'Alerte introuvable' });
    res.json({ message: 'Alerte marquée comme résolue', sos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
