const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    trajet: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    passager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conducteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    places: { type: Number, required: true, min: 1, default: 1 },
    message: { type: String, default: '' },
    statut: {
      type: String,
      enum: ['en_attente', 'acceptee', 'refusee', 'annulee'],
      default: 'en_attente',
    },
    scoreMatch: { type: Number, default: 91 },
  },
  { timestamps: true }
);

bookingSchema.index({ trajet: 1, passager: 1 });
bookingSchema.index({ conducteur: 1, statut: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

