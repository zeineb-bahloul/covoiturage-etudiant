const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });

  // Authentification par jeton JWT (même jeton que l'API REST)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Jeton invalide'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    socket.on('conversation:join', async (conversationId) => {
      try {
        const conv = await Conversation.findById(conversationId).select('participants');
        if (conv && conv.participants.some((p) => p.toString() === userId)) {
          socket.join(`conv:${conversationId}`);
        }
      } catch (e) {
        /* identifiant invalide : ignoré */
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('conversation:typing', (conversationId) => {
      if (socket.rooms.has(`conv:${conversationId}`)) {
        socket.to(`conv:${conversationId}`).emit('conversation:typing', { conversationId, userId });
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

/** Envoie un évènement à un utilisateur (toutes ses connexions). */
function emettreA(userId, evenement, donnees) {
  if (io && userId) io.to(`user:${userId.toString()}`).emit(evenement, donnees);
}

/** Identifiants des utilisateurs qui ont la conversation ouverte en ce moment. */
async function presentsDansConversation(conversationId) {
  if (!io) return new Set();
  const sockets = await io.in(`conv:${conversationId}`).fetchSockets();
  return new Set(sockets.map((s) => s.data.userId));
}

module.exports = { initSocket, getIO, emettreA, presentsDansConversation };
