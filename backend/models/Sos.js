const mongoose = require('mongoose');

/** Alerte SOS déclenchée par un utilisateur pendant un trajet (US22). */
const sosSchema = new mongoose.Schema(
  {
    auteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trajet: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', default: null },
    position: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },
    precisionM: { type: Number, default: null },
    message: { type: String, default: '', trim: true },
    contactPrevenu: { nom: String, telephone: String },
    statut: { type: String, enum: ['active', 'resolue'], default: 'active' },
    resoluPar: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resoluLe: { type: Date, default: null },
    noteAdmin: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sos', sosSchema);
