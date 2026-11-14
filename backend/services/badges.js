const Review = require('../models/Review');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');

/**
 * Badges de confiance (US17). Les compliments sont choisis par les
 * covoitureurs lors de la notation (US14) ; les autres badges sont automatiques.
 */
const COMPLIMENTS = {
  ponctuel: { titre: 'Ponctuel', icone: 'time-outline', roles: ['conducteur', 'passager'] },
  conduite_souple: { titre: 'Conduite souple', icone: 'car-outline', roles: ['conducteur'] },
  sympathique: { titre: 'Sympathique', icone: 'happy-outline', roles: ['conducteur', 'passager'] },
  respectueux: { titre: 'Respectueux', icone: 'hand-left-outline', roles: ['passager'] },
};

const BADGES = [
  { id: 'pionnier', titre: 'Pionnier ISET', icone: 'school-outline', description: 'Compte étudiant créé sur UniRide.' },
  { id: 'premier_trajet', titre: 'Premier trajet', icone: 'flag-outline', description: 'A terminé un premier covoiturage.' },
  { id: 'conducteur_ponctuel', titre: 'Conducteur ponctuel', icone: 'time-outline', description: 'Complimenté au moins 2 fois pour sa ponctualité au volant.' },
  { id: 'sympathique', titre: 'Sympathique', icone: 'happy-outline', description: 'Complimenté au moins 2 fois pour sa bonne humeur.' },
  { id: 'eco', titre: 'Éco-covoitureur', icone: 'leaf-outline', description: 'Au moins 3 trajets partagés et 5 kg de CO₂ évités.' },
  { id: 'super', titre: 'Super covoitureur', icone: 'star-outline', description: 'Note moyenne ≥ 4,5 avec au moins 3 avis.' },
];

const CO2_KG_PAR_KM = 0.12; // émission moyenne d'une voiture évitée
const TAXI_BASE_DT = 1; // estimation du coût d'un taxi : 1 DT + 0,6 DT/km
const TAXI_DT_PAR_KM = 0.6;

const arrondi1 = (n) => Math.round(n * 10) / 10;

/** Statistiques réelles d'un utilisateur (US16) calculées à partir des trajets terminés. */
async function calculerStatistiques(userId) {
  // Côté conducteur : trajets terminés avec au moins un passager accepté
  const ridesConducteur = await Ride.find({ conducteur: userId, statut: 'termine' }).select('prix distanceKm');
  const idsRides = ridesConducteur.map((r) => r._id);
  const bookingsSurMesRides = await Booking.find({ trajet: { $in: idsRides }, statut: 'acceptee' }).select('trajet places');

  let gainsConducteur = 0;
  let co2Conducteur = 0;
  let trajetsConducteur = 0;
  for (const r of ridesConducteur) {
    const bs = bookingsSurMesRides.filter((b) => b.trajet.toString() === r._id.toString());
    if (bs.length === 0) continue;
    trajetsConducteur += 1;
    const places = bs.reduce((s, b) => s + (b.places || 1), 0);
    gainsConducteur += places * (r.prix || 0);
    co2Conducteur += (r.distanceKm || 0) * places * CO2_KG_PAR_KM;
  }

  // Côté passager : réservations acceptées sur des trajets terminés
  const mesBookings = await Booking.find({ passager: userId, statut: 'acceptee' }).populate('trajet', 'prix distanceKm statut');
  const effectues = mesBookings.filter((b) => b.trajet && b.trajet.statut === 'termine');
  let economiePassager = 0;
  let co2Passager = 0;
  for (const b of effectues) {
    const km = b.trajet.distanceKm || 0;
    const places = b.places || 1;
    const taxi = TAXI_BASE_DT + TAXI_DT_PAR_KM * km;
    economiePassager += Math.max(0, taxi - (b.trajet.prix || 0)) * places;
    co2Passager += km * places * CO2_KG_PAR_KM;
  }

  return {
    trajetsConducteur,
    trajetsPassager: effectues.length,
    trajetsEffectues: trajetsConducteur + effectues.length,
    gainsConducteur: arrondi1(gainsConducteur),
    argentEconomisePassager: arrondi1(economiePassager),
    argentEconomise: arrondi1(economiePassager + gainsConducteur),
    co2Economise: arrondi1(co2Conducteur + co2Passager),
  };
}

/** Recalcule les badges, les enregistre dans le profil et renvoie la liste détaillée. */
async function mettreAJourBadges(user, stats) {
  const avis = await Review.find({ cible: user._id }).select('badges roleCible');
  const compte = {};
  for (const a of avis) {
    for (const b of a.badges || []) {
      const cle = `${b}:${a.roleCible}`;
      compte[cle] = (compte[cle] || 0) + 1;
      compte[b] = (compte[b] || 0) + 1;
    }
  }

  const obtenus = new Set(['pionnier']);
  if (stats.trajetsEffectues >= 1) obtenus.add('premier_trajet');
  if ((compte['ponctuel:conducteur'] || 0) >= 2) obtenus.add('conducteur_ponctuel');
  if ((compte.sympathique || 0) >= 2) obtenus.add('sympathique');
  if (stats.trajetsEffectues >= 3 && stats.co2Economise >= 5) obtenus.add('eco');
  if ((user.noteMoyenne || 0) >= 4.5 && (user.nombreAvis || 0) >= 3) obtenus.add('super');

  const anciens = new Set(user.badges || []);
  const nouveaux = [...obtenus].filter((b) => !anciens.has(b));

  user.badges = [...obtenus];
  user.statistiques = {
    co2Economise: stats.co2Economise,
    argentEconomise: stats.argentEconomise,
    trajetsEffectues: stats.trajetsEffectues,
  };
  await user.save();

  return {
    nouveaux: BADGES.filter((b) => nouveaux.includes(b.id)),
    liste: BADGES.map((b) => ({ ...b, debloque: obtenus.has(b.id) })),
  };
}

module.exports = { COMPLIMENTS, BADGES, calculerStatistiques, mettreAJourBadges, CO2_KG_PAR_KM };
