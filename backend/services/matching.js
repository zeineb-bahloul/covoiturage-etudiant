/**
 * Algorithme de compatibilité passager ↔ conducteur (cahier des charges §2.2)
 *
 *   Proximité du point de départ   35 %
 *   Concordance des horaires       35 %
 *   Préférences communes           15 %
 *   Note du conducteur             15 %
 *
 * Chaque critère donne un pourcentage (0-100) ; le score final est la somme
 * pondérée, arrondie, sur 100. Aucune valeur n'est inventée : quand une
 * information manque (adresse, emploi du temps, avis), le critère reçoit une
 * valeur neutre et la description explique quoi compléter.
 */

const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const POIDS = { proximite: 35, horaires: 35, preferences: 15, note: 15 };

function enMinutes(heure) {
  if (typeof heure !== 'string' || !heure.includes(':')) return null;
  const [h, m] = heure.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const arrondi1 = (n) => Math.round(n * 10) / 10;

/** Distance minimale entre un point et le trajet (départ + points de l'itinéraire). */
function distanceAuTrajet(point, ride) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  const coords = [];
  if (ride.depart?.location?.coordinates) coords.push(ride.depart.location.coordinates);
  if (Array.isArray(ride.itineraire)) coords.push(...ride.itineraire);
  if (coords.length === 0) return null;
  let min = Infinity;
  for (const [lng, lat] of coords) {
    const d = distanceKm(point.lat, point.lng, lat, lng);
    if (d < min) min = d;
  }
  return min;
}

function joursDuTrajet(ride) {
  if (ride.recurrent) return Array.isArray(ride.jours) ? ride.jours : [];
  if (ride.date) return [NOMS_JOURS[new Date(ride.date).getUTCDay()]];
  return [];
}

function critereProximite(point, ride) {
  const d = distanceAuTrajet(point, ride);
  if (d === null) {
    return {
      score: 50,
      km: null,
      description: 'Ajoutez votre adresse dans votre profil pour calculer la proximité.',
    };
  }
  // 100 % jusqu'à 1 km, puis -7 points par km supplémentaire (0 % vers 15 km)
  const score = d <= 1 ? 100 : Math.max(0, Math.round(100 - (d - 1) * 7));
  return {
    score,
    km: arrondi1(d),
    description: `Le conducteur passe à ${arrondi1(d).toString().replace('.', ',')} km de votre point de départ.`,
  };
}

function scoreAvance(avance) {
  // avance = minutes entre l'arrivée du conducteur et le début du cours
  if (avance < 0) return Math.max(0, 40 + avance * 2); // arrive après le début du cours
  if (avance < 5) return 85;
  if (avance <= 30) return 100;
  if (avance <= 60) return Math.round(100 - (avance - 30));
  return Math.max(20, 70 - (avance - 60));
}

function critereHoraires(ride, schedule) {
  const jours = joursDuTrajet(ride);
  const cours = schedule?.jours || [];
  if (cours.length === 0) {
    return { score: 50, description: 'Importez votre emploi du temps pour comparer les horaires.' };
  }
  const arrivee = enMinutes(ride.heureArrivee);
  const communs = cours.filter((c) => jours.includes(c.jour));
  if (communs.length === 0 || arrivee === null) {
    return { score: 10, description: "Ce trajet n'a lieu aucun de vos jours de cours." };
  }
  const scores = communs.map((c) => scoreAvance(enMinutes(c.debut) - arrivee));
  const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const premier = communs[0];
  const avance = enMinutes(premier.debut) - arrivee;
  let description;
  if (avance >= 0) {
    description = `Arrivée à ${ride.heureArrivee}, ${avance} min avant votre cours de ${premier.debut} (${premier.jour}).`;
  } else {
    description = `Arrivée à ${ride.heureArrivee}, après le début de votre cours de ${premier.debut} (${premier.jour}).`;
  }
  if (communs.length > 1) description += ` ${communs.length} jours en commun.`;
  return { score, description };
}

function criterePreferences(conducteur, passager) {
  const c = conducteur?.preferences || {};
  const p = passager?.preferences || {};
  let score = 0;
  const points = [];

  // Fumeur : 40 pts
  if (p.nonFumeur && c.nonFumeur === false) {
    points.push('le conducteur est fumeur');
  } else {
    score += 40;
    if (c.nonFumeur) points.push('non-fumeur');
  }
  // Musique : 30 pts
  const musiqueOk = !c.musique || !p.musique || c.musique === p.musique || c.musique === 'aucune' || p.musique === 'aucune';
  score += musiqueOk ? 30 : 10;
  if (musiqueOk) points.push('musique compatible');
  // Mixte : 30 pts
  if (p.mixte === false && c.mixte === true) {
    points.push('trajet mixte');
  } else {
    score += 30;
  }
  return { score, description: points.length ? `Points communs : ${points.join(', ')}.` : 'Peu de préférences communes.' };
}

function critereNote(conducteur) {
  const nb = conducteur?.nombreAvis || 0;
  const note = conducteur?.noteMoyenne || 0;
  if (nb === 0) {
    return { score: 60, noteMoyenne: null, description: "Nouveau conducteur : pas encore d'avis." };
  }
  return {
    score: Math.round((note / 5) * 100),
    noteMoyenne: note,
    description: `Note de ${note.toFixed(1).replace('.', ',')} / 5 sur ${nb} avis.`,
  };
}

/**
 * @param {object} ride        trajet (avec conducteur peuplé si possible)
 * @param {object} passager    utilisateur qui cherche
 * @param {object} schedule    emploi du temps du passager
 * @param {object} pointDepart {lat, lng} — point de recherche, sinon domicile du passager
 */
function calculerScore({ ride, passager, schedule, pointDepart }) {
  let point = pointDepart;
  if (!point && passager?.domicile?.location?.coordinates?.length === 2) {
    const [lng, lat] = passager.domicile.location.coordinates;
    point = { lat, lng };
  }

  const prox = critereProximite(point, ride);
  const hor = critereHoraires(ride, schedule);
  const pref = criterePreferences(ride.conducteur, passager);
  const note = critereNote(ride.conducteur);

  const contribution = (score, poids) => arrondi1((score * poids) / 100);

  const details = {
    proximite: {
      titre: 'Proximité du point de départ',
      poids: POIDS.proximite,
      scorePourcent: prox.score,
      pointsObtenus: contribution(prox.score, POIDS.proximite),
      km: prox.km,
      description: prox.description,
    },
    horaires: {
      titre: 'Concordance des horaires',
      poids: POIDS.horaires,
      scorePourcent: hor.score,
      pointsObtenus: contribution(hor.score, POIDS.horaires),
      description: hor.description,
    },
    preferences: {
      titre: 'Préférences communes',
      poids: POIDS.preferences,
      scorePourcent: pref.score,
      pointsObtenus: contribution(pref.score, POIDS.preferences),
      description: pref.description,
    },
    note: {
      titre: 'Note du conducteur',
      poids: POIDS.note,
      scorePourcent: note.score,
      pointsObtenus: contribution(note.score, POIDS.note),
      noteMoyenne: note.noteMoyenne,
      description: note.description,
    },
  };

  const total = Object.values(details).reduce((s, d) => s + d.pointsObtenus, 0);
  return { scoreTotal: Math.round(total), details };
}

module.exports = { calculerScore, distanceKm, distanceAuTrajet, enMinutes, joursDuTrajet, NOMS_JOURS };
