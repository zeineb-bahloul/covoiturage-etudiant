const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trajet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
    },
    note: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    commentaire: {
      type: String,
      trim: true,
      default: '',
    },
    badges: {
      type: [String],
      default: [],
    },
    roleCible: {
      type: String,
      enum: ['conducteur', 'passager'],
      default: 'conducteur',
    },
  },
  { timestamps: true }
);

// Index to avoid double review on the same ride by the same author for the same target
reviewSchema.index({ auteur: 1, cible: 1, trajet: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);

