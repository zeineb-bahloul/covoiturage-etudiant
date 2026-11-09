const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    conducteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    depart: { type: pointSchema, required: true },
    destination: { type: pointSchema, required: true },
    heureDepart: { type: String, required: true },
    heureArrivee: { type: String, required: true },
    recurrent: { type: Boolean, default: false },
    jours: { type: [String], default: [] },
    date: { type: Date },
    places: { type: Number, required: true, min: 1, max: 8 },
    prix: { type: Number, required: true, min: 0 },
    distanceKm: { type: Number, default: 0 },
    dureeMin: { type: Number, default: 0 },
    itineraire: { type: [[Number]], default: [] },
    statut: {
      type: String,
      enum: ['actif', 'en_cours', 'annule', 'termine'],
      default: 'actif',
    },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

rideSchema.index({ 'depart.location': '2dsphere' });
rideSchema.index({ 'destination.location': '2dsphere' });

module.exports = mongoose.model('Ride', rideSchema);