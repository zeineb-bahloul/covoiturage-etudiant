const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    utilisateurSignale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trajet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
    },
    motif: {
      type: String,
      required: true,
      enum: [
        'retard_excessif',
        'conduite_dangereuse',
        'comportement_inapproprie',
        'annulation_imprevue',
        'autre',
      ],
    },
    commentaire: {
      type: String,
      required: true,
      trim: true,
    },
    statut: {
      type: String,
      enum: ['en_attente', 'traite', 'rejete'],
      default: 'en_attente',
    },
    decisionAdmin: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);

