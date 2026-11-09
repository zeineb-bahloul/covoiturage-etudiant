const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { creerNotification } = require('../services/notifier');

const router = express.Router();

// Récupérer toutes les conversations de l'utilisateur
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.userId })
      .populate('participants', 'nom email photo filiere noteMoyenne telephone')
      .populate('trajet', 'depart destination dateDepart heureDepart prix statut')
      .populate('dernierMessage.expediteur', 'nom')
      .sort({ updatedAt: -1 });

    const formatees = conversations.map((c) => {
      const autreParticipant = c.participants.find(
        (p) => p._id.toString() !== req.userId.toString()
      );
      const nonLu = (c.nonLusPar || []).some(
        (id) => id.toString() === req.userId.toString()
      );

      return {
        _id: c._id,
        titre: c.titre || (c.trajet ? `${c.trajet.depart.label?.split(',')[0]} → ${c.trajet.destination.label?.split(',')[0]}` : autreParticipant?.nom || 'Discussion'),
        autreParticipant,
        trajet: c.trajet,
        dernierMessage: c.dernierMessage,
        nonLu,
        updatedAt: c.updatedAt,
      };
    });

    res.json(formatees);
  } catch (err) {
    console.error('Erreur get conversations :', err);
    res.status(500).json({ message: 'Erreur lors du chargement des conversations' });
  }
});

// Créer ou récupérer une conversation avec un autre utilisateur
router.post('/', auth, async (req, res) => {
  try {
    const { destinataireId, trajetId, titre } = req.body;

    if (!destinataireId) {
      return res.status(400).json({ message: 'destinataireId est requis' });
    }

    if (destinataireId.toString() === req.userId.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas démarrer une discussion avec vous-même' });
    }

    // Vérifier si une conversation existe déjà
    const requete = {
      participants: { $all: [req.userId, destinataireId] },
    };
    if (trajetId) {
      requete.trajet = trajetId;
    }

    let conversation = await Conversation.findOne(requete)
      .populate('participants', 'nom email photo filiere noteMoyenne telephone')
      .populate('trajet', 'depart destination dateDepart heureDepart prix statut');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.userId, destinataireId],
        trajet: trajetId || null,
        titre: titre || '',
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'nom email photo filiere noteMoyenne telephone')
        .populate('trajet', 'depart destination dateDepart heureDepart prix statut');
    }

    res.status(201).json(conversation);
  } catch (err) {
    console.error('Erreur create conversation :', err);
    res.status(500).json({ message: 'Erreur création conversation' });
  }
});

// Récupérer les messages d'une conversation
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable' });
    }

    const estParticipant = conversation.participants.some(
      (p) => p.toString() === req.userId.toString()
    );
    if (!estParticipant) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Retirer l'utilisateur de nonLusPar
    await Conversation.findByIdAndUpdate(req.params.id, {
      $pull: { nonLusPar: req.userId },
    });

    const messages = await Message.find({ conversationId: req.params.id })
      .populate('expediteur', 'nom photo')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('Erreur get messages :', err);
    res.status(500).json({ message: 'Erreur chargement messages' });
  }
});

// Envoyer un message dans une conversation
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { texte } = req.body;
    if (!texte || !texte.trim()) {
      return res.status(400).json({ message: 'Le message ne peut pas être vide' });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable' });
    }

    const estParticipant = conversation.participants.some(
      (p) => p.toString() === req.userId.toString()
    );
    if (!estParticipant) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const nouveauMessage = await Message.create({
      conversationId: req.params.id,
      expediteur: req.userId,
      texte: texte.trim(),
      luPar: [req.userId],
    });

    // Mettre à jour la conversation
    const autresParticipants = conversation.participants.filter(
      (p) => p.toString() !== req.userId.toString()
    );

    await Conversation.findByIdAndUpdate(req.params.id, {
      $set: {
        dernierMessage: {
          texte: texte.trim(),
          date: new Date(),
          expediteur: req.userId,
        },
      },
      $addToSet: {
        nonLusPar: { $each: autresParticipants },
      },
    });

    // Envoyer une notification aux autres participants
    const expediteurUser = await User.findById(req.userId).select('nom');
    for (const destinataireId of autresParticipants) {
      await creerNotification({
        destinataire: destinataireId,
        emetteur: req.userId,
        type: 'nouveau_message',
        titre: `Message de ${expediteurUser?.nom || 'un utilisateur'}`,
        message: texte.trim().length > 60 ? texte.trim().slice(0, 57) + '...' : texte.trim(),
        donnees: {
          conversationId: conversation._id,
          trajetId: conversation.trajet,
        },
      });
    }

    const messagePeuple = await Message.findById(nouveauMessage._id).populate('expediteur', 'nom photo');

    res.status(201).json(messagePeuple);
  } catch (err) {
    console.error('Erreur envoi message :', err);
    res.status(500).json({ message: "Erreur lors de l'envoi du message" });
  }
});

module.exports = router;

