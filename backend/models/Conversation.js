const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    trajet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
    },
    titre: {
      type: String,
      default: '',
    },
    dernierMessage: {
      texte: { type: String, default: '' },
      date: { type: Date, default: Date.now },
      expediteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    nonLusPar: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);

