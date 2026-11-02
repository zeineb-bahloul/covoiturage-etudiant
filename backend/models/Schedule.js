const mongoose = require('mongoose');

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

const jourSchema = new mongoose.Schema(
  {
    jour: {
      type: String,
      enum: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
      required: true,
    },
    debut: { type: String, required: true, match: HEURE },
    fin: { type: String, required: true, match: HEURE },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    jours: [jourSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Schedule', scheduleSchema);