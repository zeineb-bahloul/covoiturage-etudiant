const express = require('express');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Ride = require('../models/Ride');
const auth = require('../middleware/auth');
const { creerNotification } = require('../services/notifier');
const { getIO, emettreA, presentsDansConversation } = require('../services/socket');

const router = express.Router();
const idValide = (id) => mongoose.isValidObjectId(id);
const CHAMPS_USER = 'nom photo filiere noteMoyenne';
const CHAMPS_TRAJET = 'depart destination date jours recurrent heureDepart prix statut';
const court = (label) => (label || '').split(',')[0].trim();

function formater(c, userId) {
  const autre = c.participants.find((p) => p && p._id.toString() !== userId);
  return {
    _id: c._id,
    titre:
      c.titre ||
      (c.trajet ? `${court(c.trajet.depart?.label)} → ${court(c.trajet.destination?.label)}` : ''),
    autreParticipant: autre || null,
    trajet: c.trajet,
    dernierMessage: c.dernierMessage,
    nonLu: (c.nonLusPar || []).some((id) => id.toString() === userId),
    updatedAt: c.updatedAt,
  };
}

async function chargerParticipant(conversationId, userId) {
  if (!idValide(conversationId)) return { erreur: [400, 'Identifiant invalide'] };
  const conv = await Conversation.findById(conversationId);
  if (!conv) return { erreur: [404, 'Conversation introuvable'] };
  if (!conv.participants.some((p) => p.toString() === userId)) return { erreur: [403, 'Accès non autorisé'] };
  return { conv };
}

// Liste de mes conversations
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.userId })
      .populate('participants', CHAMPS_USER)
      .populate('trajet', CHAMPS_TRAJET)
      .sort({ updatedAt: -1 });
    res.json(conversations.map((c) => formater(c, req.userId)));
  } catch (err) {
    console.error('Erreur get conversations :', err);
    res.status(500).json({ message: 'Erreur lors du chargement des conversations' });
  }
});

// Nombre de conversations non lues (badge de l'onglet Messages)
router.get('/non-lues', auth, async (req, res) => {
  try {
    const nb = await Conversation.countDocuments({ participants: req.userId, nonLusPar: req.userId });
    res.json({ nb });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer ou retrouver une conversation avec un autre utilisateur
router.post('/', auth, async (req, res) => {
  try {
    const { destinataireId, trajetId, titre } = req.body;
    if (!idValide(destinataireId)) return res.status(400).json({ message: 'Destinataire invalide' });
    if (destinataireId === req.userId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas démarrer une discussion avec vous-même' });
    }
    if (!(await User.exists({ _id: destinataireId }))) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const trajet = trajetId && idValide(trajetId) ? await Ride.findById(trajetId).select('_id') : null;
    const requete = { participants: { $all: [req.userId, destinataireId] }, trajet: trajet ? trajet._id : null };

    let conversation = await Conversation.findOne(requete);
    if (!conversation && !trajet) {
      // Sans trajet précis : réutiliser la discussion la plus récente entre les deux
      conversation = await Conversation.findOne({ participants: { $all: [req.userId, destinataireId] } }).sort({
        updatedAt: -1,
      });
    }
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.userId, destinataireId],
        trajet: trajet ? trajet._id : null,
        titre: typeof titre === 'string' ? titre.slice(0, 80) : '',
      });
    }

    const peuplee = await Conversation.findById(conversation._id)
      .populate('participants', CHAMPS_USER)
      .populate('trajet', CHAMPS_TRAJET);
    res.status(201).json(formater(peuplee, req.userId));
  } catch (err) {
    console.error('Erreur create conversation :', err);
    res.status(500).json({ message: 'Erreur création conversation' });
  }
});

// Détail d'une conversation
router.get('/:id', auth, async (req, res) => {
  try {
    const { erreur } = await chargerParticipant(req.params.id, req.userId);
    if (erreur) return res.status(erreur[0]).json({ message: erreur[1] });
    const c = await Conversation.findById(req.params.id)
      .populate('participants', CHAMPS_USER)
      .populate('trajet', CHAMPS_TRAJET);
    res.json(formater(c, req.userId));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Messages d'une conversation (marque la conversation comme lue)
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { erreur } = await chargerParticipant(req.params.id, req.userId);
    if (erreur) return res.status(erreur[0]).json({ message: erreur[1] });

    await Conversation.updateOne({ _id: req.params.id }, { $pull: { nonLusPar: req.userId } }, { timestamps: false });
    await Message.updateMany(
      { conversationId: req.params.id, luPar: { $ne: req.userId } },
      { $addToSet: { luPar: req.userId } }
    );
    getIO()?.to(`conv:${req.params.id}`).emit('conversation:read', { conversationId: req.params.id, userId: req.userId });

    const messages = await Message.find({ conversationId: req.params.id })
      .populate('expediteur', 'nom photo')
      .sort({ createdAt: 1 })
      .limit(500);
    res.json(messages);
  } catch (err) {
    console.error('Erreur get messages :', err);
    res.status(500).json({ message: 'Erreur chargement messages' });
  }
});

// Marquer comme lu (appelé quand un message arrive alors que le chat est ouvert)
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const { erreur } = await chargerParticipant(req.params.id, req.userId);
    if (erreur) return res.status(erreur[0]).json({ message: erreur[1] });
    await Conversation.updateOne({ _id: req.params.id }, { $pull: { nonLusPar: req.userId } }, { timestamps: false });
    await Message.updateMany(
      { conversationId: req.params.id, luPar: { $ne: req.userId } },
      { $addToSet: { luPar: req.userId } }
    );
    getIO()?.to(`conv:${req.params.id}`).emit('conversation:read', { conversationId: req.params.id, userId: req.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Envoyer un message (US12) — diffusé en temps réel par Socket.io
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const texte = typeof req.body.texte === 'string' ? req.body.texte.trim() : '';
    if (!texte) return res.status(400).json({ message: 'Le message ne peut pas être vide' });
    if (texte.length > 1000) return res.status(400).json({ message: 'Message trop long (1000 caractères max)' });

    const { conv, erreur } = await chargerParticipant(req.params.id, req.userId);
    if (erreur) return res.status(erreur[0]).json({ message: erreur[1] });

    const autres = conv.participants.filter((p) => p.toString() !== req.userId);
    const presents = await presentsDansConversation(conv._id.toString());
    const absents = autres.filter((p) => !presents.has(p.toString()));
    const lecteurs = [req.userId, ...autres.filter((p) => presents.has(p.toString()))];

    const message = await Message.create({
      conversationId: conv._id,
      expediteur: req.userId,
      texte,
      luPar: lecteurs,
    });

    conv.dernierMessage = { texte, date: message.createdAt, expediteur: req.userId };
    conv.nonLusPar = absents;
    await conv.save();

    const peuple = await Message.findById(message._id).populate('expediteur', 'nom photo');

    // Temps réel : message dans la conversation + mise à jour des listes
    getIO()?.to(`conv:${conv._id}`).emit('message:new', peuple.toJSON());
    for (const p of conv.participants) {
      emettreA(p, 'conversation:update', { conversationId: String(conv._id) });
    }

    // Notification seulement pour ceux qui n'ont pas la discussion ouverte
    if (absents.length) {
      const expediteur = await User.findById(req.userId).select('nom');
      for (const destinataire of absents) {
        await creerNotification({
          destinataire,
          emetteur: req.userId,
          type: 'nouveau_message',
          titre: `Message de ${expediteur?.nom || 'un covoitureur'}`,
          message: texte.length > 80 ? `${texte.slice(0, 77)}...` : texte,
          donnees: { conversationId: conv._id, trajetId: conv.trajet || undefined },
        });
      }
    }

    res.status(201).json(peuple);
  } catch (err) {
    console.error('Erreur envoi message :', err);
    res.status(500).json({ message: "Erreur lors de l'envoi du message" });
  }
});

module.exports = router;
