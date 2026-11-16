/**
 * Outils communs aux tests : base MongoDB en mémoire (aucune donnée réelle touchée),
 * OpenRouteService simulé (pas besoin de clé ni d'Internet) et petit client HTTP.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const ors = require('../services/ors');

// Itinéraire simulé : ligne droite, 25 min
ors.itineraire = async (d, a) => ({
  distanceKm: 18.4,
  dureeMin: 25,
  points: [[d.lng, d.lat], [(d.lng + a.lng) / 2, (d.lat + a.lat) / 2], [a.lng, a.lat]],
});
ors.geocoder = async () => [{ label: 'Nabeul, Tunisie', lat: 36.45, lng: 10.73 }];

let base;
let server;
let url;

async function demarrer() {
  if (process.env.TEST_DB === 'embedded') {
    const { open } = require('@0q/embedded-mongodb');
    const dossier = require('path').join(require('os').tmpdir(), `uniride-test-${process.pid}`);
    base = await open(dossier);
    await mongoose.connect(base.uri);
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    base = await MongoMemoryServer.create();
    await mongoose.connect(base.getUri());
  }
  ({ server } = require('../server'));
  await new Promise((r) => server.listen(0, r));
  url = `http://127.0.0.1:${server.address().port}`;
  return url;
}

async function arreter() {
  server?.close();
  await mongoose.disconnect();
  if (base?.stop) await base.stop();
  else if (base?.close) await base.close();
}

async function api(method, chemin, token, body) {
  const r = await fetch(`${url}/api${chemin}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}

async function inscrire(nom, email, extra = {}) {
  const r = await api('POST', '/auth/register', null, { nom, email, motDePasse: 'secret1', ...extra });
  return r.data.token;
}

const urlServeur = () => url;

module.exports = { demarrer, arreter, api, inscrire, urlServeur };
