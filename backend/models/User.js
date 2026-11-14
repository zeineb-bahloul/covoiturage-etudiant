const mongoose = require('mongoose');

const COULEURS = ['blanc', 'noir', 'gris', 'argent', 'rouge', 'bleu', 'vert', 'jaune', 'orange', 'marron', 'autre'];

const vehiculeSchema = new mongoose.Schema(
  {
    marque: { type: String, required: true, trim: true },
    couleur: { type: String, enum: COULEURS, required: true },
    places: { type: Number, required: true, min: 1, max: 8 },
    matricule: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    motDePasse: { type: String, required: true },
    filiere: { type: String, default: '' },
    adresse: { type: String, default: '' },
    // Adresse approximative géolocalisée (sert au calcul de proximité du matching)
    domicile: {
      type: new mongoose.Schema(
        {
          label: { type: String, required: true },
          location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true },
          },
        },
        { _id: false }
      ),
      default: null,
    },
    photo: { type: String, default: '' },
    telephone: { type: String, default: '' },
    role: { type: String, enum: ['utilisateur', 'admin'], default: 'utilisateur' },
    noteMoyenne: { type: Number, default: 0 },
    nombreAvis: { type: Number, default: 0 },
    badges: { type: [String], default: ['pionnier'] },
    statistiques: {
      co2Economise: { type: Number, default: 0 },
      argentEconomise: { type: Number, default: 0 },
      trajetsEffectues: { type: Number, default: 0 },
    },
    preferences: {
      nonFumeur: { type: Boolean, default: true },
      mixte: { type: Boolean, default: true },
      musique: { type: String, enum: ['calme', 'animee', 'aucune'], default: 'aucune' },
    },
    vehicule: { type: vehiculeSchema, default: null },
    // Mot de passe oublié : code à 6 chiffres (haché) valable 15 minutes
    resetCode: { type: String, default: null, select: false },
    resetExpire: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
