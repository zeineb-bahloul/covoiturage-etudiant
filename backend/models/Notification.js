const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    destinataire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    emetteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'reservation_recue',
        'reservation_acceptee',
        'reservation_refusee',
        'reservation_annulee',
        'trajet_demarre',
        'trajet_termine',
        'trajet_annule',
        'suggestion',
        'nouveau_message',
        'nouvel_avis',
        'badge_obtenu',
      ],
      required: true,
    },
    titre: { type: String, required: true },
    message: { type: String, required: true },
    donnees: {
      trajetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
      conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
      reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
    },
    lu: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
