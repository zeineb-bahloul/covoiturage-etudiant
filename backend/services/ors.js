const axios = require('axios');

const BASE = 'https://api.openrouteservice.org';

async function geocoder(texte) {
  const { data } = await axios.get(`${BASE}/geocode/search`, {
    params: {
      api_key: process.env.ORS_API_KEY,
      text: texte,
      'boundary.country': 'TN',
      size: 5,
    },
    timeout: 10000,
  });

  return data.features.map((f) => ({
    label: f.properties.label,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
  }));
}

async function itineraire(depart, arrivee) {
  const { data } = await axios.post(
    `${BASE}/v2/directions/driving-car/geojson`,
    {
      coordinates: [
        [depart.lng, depart.lat],
        [arrivee.lng, arrivee.lat],
      ],
    },
    {
      headers: { Authorization: process.env.ORS_API_KEY, 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );

  const feature = data.features[0];
  const { distance, duration } = feature.properties.summary;

  return {
    distanceKm: Math.round(distance / 100) / 10,
    dureeMin: Math.max(1, Math.round(duration / 60)),
    points: feature.geometry.coordinates,
  };
}

module.exports = { geocoder, itineraire };