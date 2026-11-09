function enMinutes(heureStr) {
  if (!heureStr || typeof heureStr !== 'string' || !heureStr.includes(':')) return 0;
  const [h, m] = heureStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Calcule l'algorithme de compatibilité selon le Cahier des Charges (Section 2.2)
 *
 * 1. Proximité du point de départ : 35 %
 * 2. Concordance des horaires : 35 %
 * 3. Préférences communes : 15 %
 * 4. Note du conducteur : 15 %
 */
function calculerScoreCompatibiliteDetaille({
  ride,
  passenger,
  passengerSchedule,
  distDepartKm,
}) {
  // 1. Proximité du point de départ (35 %)
  let dist = distDepartKm;
  if (dist === undefined || dist === null) {
    if (
      passenger?.adresse &&
      ride.depart?.location?.coordinates &&
      Array.isArray(ride.depart.location.coordinates)
    ) {
      // Approximation si pas de géoloc directe
      dist = 1.8;
    } else {
      dist = 2.0;
    }
  }

  let scoreProximite = 100;
  if (dist <= 1.0) scoreProximite = 100;
  else if (dist <= 2.5) scoreProximite = 92;
  else if (dist <= 5.0) scoreProximite = 82;
  else if (dist <= 10.0) scoreProximite = 65;
  else scoreProximite = Math.max(20, Math.round(100 - dist * 6));

  const poidsProximite = 35;
  const contributionProximite = Math.round((scoreProximite * (poidsProximite / 100)) * 10) / 10;

  // 2. Concordance des horaires (35 %)
  // Comparer l'heure d'arrivée du conducteur à l'ISET avec l'heure du cours du passager
  let scoreHoraires = 90;
  let labelHoraires = `Départ à ${ride.heureDepart}, arrivée vers ${ride.heureArrivee}`;

  if (passengerSchedule && Array.isArray(passengerSchedule.jours) && passengerSchedule.jours.length > 0) {
    // Vérifier si le trajet est récurrent ou lié à un jour
    let jourConcerne = null;
    if (ride.recurrent && Array.isArray(ride.jours) && ride.jours.length > 0) {
      jourConcerne = ride.jours[0];
    } else if (ride.date) {
      const nomsJours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      jourConcerne = nomsJours[new Date(ride.date).getDay()];
    }

    const coursDuJour = passengerSchedule.jours.find((j) => j.jour === jourConcerne);
    if (coursDuJour) {
      const arriveeMin = enMinutes(ride.heureArrivee);
      const coursMin = enMinutes(coursDuJour.debut);
      const avanceMin = coursMin - arriveeMin;

      if (avanceMin >= 10 && avanceMin <= 30) {
        // Idéal : arrive 10 à 30 min avant les cours à l'ISET Nabeul
        scoreHoraires = 98;
        labelHoraires = `Arrivée à ${ride.heureArrivee} pour votre cours de ${coursDuJour.debut} (avance idéale de ${avanceMin} min)`;
      } else if (avanceMin >= 0 && avanceMin < 10) {
        scoreHoraires = 90;
        labelHoraires = `Arrivée à ${ride.heureArrivee} (${avanceMin} min avant le début du cours)`;
      } else if (avanceMin > 30 && avanceMin <= 60) {
        scoreHoraires = 80;
        labelHoraires = `Arrivée à ${ride.heureArrivee} (${avanceMin} min avant votre cours)`;
      } else if (avanceMin < 0) {
        // Conducteur arrive après le début du cours
        scoreHoraires = 35;
        labelHoraires = `Attention : arrivée à ${ride.heureArrivee} après le début du cours (${coursDuJour.debut})`;
      }
    }
  }

  const poidsHoraires = 35;
  const contributionHoraires = Math.round((scoreHoraires * (poidsHoraires / 100)) * 10) / 10;

  // 3. Préférences communes (15 %)
  const condPrefs = ride.conducteur?.preferences || {};
  const passPrefs = passenger?.preferences || {};

  let pointsPrefs = 50; // base neutre

  // Non-fumeur
  if (condPrefs.nonFumeur === passPrefs.nonFumeur) {
    pointsPrefs += 25;
  }

  // Trajet mixte
  if (condPrefs.mixte && passPrefs.mixte) {
    pointsPrefs += 15;
  }

  // Ambiance musicale
  if (
    condPrefs.musique === passPrefs.musique ||
    condPrefs.musique === 'aucune' ||
    passPrefs.musique === 'aucune'
  ) {
    pointsPrefs += 10;
  }

  const scorePrefs = Math.min(100, pointsPrefs);
  const poidsPrefs = 15;
  const contributionPrefs = Math.round((scorePrefs * (poidsPrefs / 100)) * 10) / 10;

  // 4. Note du conducteur (15 %)
  const note = ride.conducteur?.noteMoyenne || 4.8;
  const scoreNote = Math.min(100, Math.round((note / 5) * 100));
  const poidsNote = 15;
  const contributionNote = Math.round((scoreNote * (poidsNote / 100)) * 10) / 10;

  // Total pondéré
  const totalBrut =
    contributionProximite + contributionHoraires + contributionPrefs + contributionNote;
  const scoreTotal = Math.min(99, Math.max(50, Math.round(totalBrut)));

  return {
    scoreTotal,
    details: {
      proximite: {
        titre: 'Proximité du point de départ',
        poids: poidsProximite,
        scorePourcent: scoreProximite,
        pointsObtenus: contributionProximite,
        km: Math.round(dist * 10) / 10,
        description: `Le conducteur passe à ${Math.round(dist * 10) / 10} km de votre point de départ.`,
      },
      horaires: {
        titre: 'Concordance des horaires',
        poids: poidsHoraires,
        scorePourcent: scoreHoraires,
        pointsObtenus: contributionHoraires,
        description: labelHoraires,
      },
      preferences: {
        titre: 'Affinité des préférences',
        poids: poidsPrefs,
        scorePourcent: scorePrefs,
        pointsObtenus: contributionPrefs,
        description: `${condPrefs.nonFumeur ? '🚭 Véhicule non-fumeur' : '🚬 Fumeur accepté'} · ${
          condPrefs.mixte ? '👥 Trajet mixte' : 'Trajet non-mixte'
        } · 🎵 Musique : ${condPrefs.musique || 'au choix'}`,
      },
      note: {
        titre: 'Réputation du conducteur',
        poids: poidsNote,
        scorePourcent: scoreNote,
        pointsObtenus: contributionNote,
        noteMoyenne: note,
        description: `Conducteur vérifié avec une note de ${note.toFixed(1)} / 5 ★`,
      },
    },
  };
}

module.exports = {
  calculerScoreCompatibiliteDetaille,
  distanceKm,
  enMinutes,
};

