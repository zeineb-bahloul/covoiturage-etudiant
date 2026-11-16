/**
 * Tests d'intégration de l'API UniRide (sprints 1 à 6).
 * Lancer :  npm test
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { demarrer, arreter, api, inscrire, urlServeur } = require('./helpers');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Notification = require('../models/Notification');

const ISET = { label: 'ISET Nabeul', lat: 36.4378, lng: 10.6794 };
const ARIANA = { label: 'Ariana, Tunis', lat: 36.87, lng: 10.2 };

function prochain(jourSemaine) {
  const d = new Date();
  d.setDate(d.getDate() + (((jourSemaine - d.getDay() + 7) % 7) || 7));
  return d.toISOString().slice(0, 10);
}

describe('API UniRide', () => {
  const t = {};
  const id = {};

  before(async () => {
    await demarrer();
    t.karim = await inscrire('Karim Zouari', 'karim@isetn.tn', { filiere: 'TI' });
    t.sara = await inscrire('Sara Mansour', 'sara@isetn.tn');
    t.omar = await inscrire('Omar Gharbi', 'omar@isetn.tn');
    await inscrire('Admin', 'admin@isetn.tn');
    await User.updateOne({ email: 'admin@isetn.tn' }, { role: 'admin' });
    t.admin = (await api('POST', '/auth/login', null, { email: 'admin@isetn.tn', motDePasse: 'secret1' })).data.token;
    for (const n of ['karim', 'sara', 'omar', 'admin']) id[n] = (await api('GET', '/auth/me', t[n])).data._id;
  });

  after(arreter);

  describe('Sprint 1 — comptes et profil', () => {
    it('refuse un e-mail déjà utilisé', async () => {
      const r = await api('POST', '/auth/register', null, { nom: 'X', email: 'sara@isetn.tn', motDePasse: 'secret1' });
      assert.equal(r.status, 400);
    });
    it('refuse un mauvais mot de passe', async () => {
      const r = await api('POST', '/auth/login', null, { email: 'sara@isetn.tn', motDePasse: 'faux' });
      assert.equal(r.status, 400);
    });
    it('réinitialise le mot de passe avec le code', async () => {
      const { data } = await api('POST', '/auth/forgot', null, { email: 'omar@isetn.tn' });
      assert.match(data.codeDemo, /^\d{6}$/);
      assert.equal((await api('POST', '/auth/reset', null, { email: 'omar@isetn.tn', code: '000000', motDePasse: 'nouveau1' })).status, 400);
      assert.equal((await api('POST', '/auth/reset', null, { email: 'omar@isetn.tn', code: data.codeDemo, motDePasse: 'nouveau1' })).status, 200);
      assert.equal((await api('POST', '/auth/login', null, { email: 'omar@isetn.tn', motDePasse: 'nouveau1' })).status, 200);
    });
    it('enregistre adresse, préférences et contact de confiance', async () => {
      const r = await api('PUT', '/users/me', t.sara, {
        preferences: { nonFumeur: true, musique: 'calme' },
        domicile: { label: 'Ariana', lat: 36.86, lng: 10.19 },
        contactConfiance: { nom: 'Maman', telephone: '+216 22 123 456' },
      });
      assert.equal(r.status, 200);
      assert.equal(r.data.domicile.label, 'Ariana');
      assert.equal(r.data.contactConfiance.telephone, '+21622123456');
    });
    it('ajoute un véhicule', async () => {
      const r = await api('PUT', '/users/me/vehicule', t.karim, { marque: 'Clio', couleur: 'gris', places: 4, matricule: '123 TU 456' });
      assert.equal(r.status, 200);
    });
  });

  describe('Sprint 2 — emploi du temps et publication', () => {
    it('importe un emploi du temps CSV', async () => {
      const r = await api('POST', '/schedule/import', t.sara, { contenu: 'jour;debut;fin\nlundi;08:30;10:00\nlundi;14:00;16:00\nmardi;08:30;12:00' });
      assert.equal(r.status, 200);
      assert.deepEqual(r.data.jours.map((j) => [j.jour, j.debut, j.fin]), [['lundi', '08:30', '16:00'], ['mardi', '08:30', '12:00']]);
      await api('PUT', '/schedule/me', t.sara, { jours: r.data.jours });
    });
    it('publie un trajet récurrent et calcule l’arrivée', async () => {
      const r = await api('POST', '/rides', t.karim, { depart: ARIANA, destination: ISET, heureDepart: '07:45', places: 3, prix: 5, recurrent: true, jours: ['lundi', 'mardi'] });
      assert.equal(r.status, 201);
      assert.equal(r.data.heureArrivee, '08:10');
      id.ride = r.data._id;
    });
    it('refuse plus de places que le véhicule', async () => {
      const r = await api('POST', '/rides', t.karim, { depart: ARIANA, destination: ISET, heureDepart: '07:45', places: 9, prix: 5, recurrent: true, jours: ['lundi'] });
      assert.equal(r.status, 400);
    });
    it('refuse un passager sans véhicule', async () => {
      const r = await api('POST', '/rides', t.sara, { depart: ARIANA, destination: ISET, heureDepart: '07:45', places: 1, prix: 5, recurrent: true, jours: ['lundi'] });
      assert.equal(r.status, 400);
    });
  });

  describe('Sprints 3-4 — recherche, matching, réservation', () => {
    it('suggère le trajet avec un score élevé', async () => {
      const r = await api('GET', '/rides/suggestions', t.sara);
      assert.equal(r.data.length, 1);
      assert.ok(r.data[0].scoreMatch >= 80, `score ${r.data[0].scoreMatch}`);
      assert.equal(r.data[0].matchDetails.horaires.scorePourcent, 100);
    });
    it('trouve le trajet par la recherche avec filtres', async () => {
      const r = await api('GET', `/rides/search?lat=36.86&lng=10.19&date=${prochain(1)}&heure=07:30&nonFumeur=true`, t.sara);
      assert.equal(r.status, 200);
      assert.equal(r.data.length, 1);
    });
    it('refuse une date passée', async () => {
      assert.equal((await api('GET', '/rides/search?lat=36.86&lng=10.19&date=2020-01-01', t.sara)).status, 400);
    });
    it('réserve, accepte et décrémente les places', async () => {
      const b = await api('POST', '/bookings', t.sara, { trajetId: id.ride, places: 1 });
      assert.equal(b.status, 201);
      assert.equal((await api('POST', '/bookings', t.sara, { trajetId: id.ride })).status, 400);
      const a = await api('PATCH', `/bookings/${b.data._id}/accept`, t.karim);
      assert.equal(a.data.statut, 'acceptee');
      assert.equal((await api('GET', `/rides/${id.ride}`, t.sara)).data.places, 2);
    });
    it('crée la discussion après acceptation', async () => {
      const r = await api('GET', '/conversations', t.sara);
      assert.equal(r.data.length, 1);
      id.conv = r.data[0]._id;
    });
    it('envoie le rappel 30 min avant le départ', async () => {
      const { envoyerRappels } = require('../services/rappels');
      const dans20 = new Date(Date.now() + 20 * 60000);
      const heure = `${String(dans20.getHours()).padStart(2, '0')}:${String(dans20.getMinutes()).padStart(2, '0')}`;
      const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const ride = await Ride.create({
        conducteur: id.karim, depart: { label: 'A', location: { type: 'Point', coordinates: [10.2, 36.87] } },
        destination: { label: 'B', location: { type: 'Point', coordinates: [10.67, 36.43] } },
        heureDepart: heure, heureArrivee: heure, recurrent: true, jours: [jours[dans20.getDay()]], places: 2, prix: 2,
      });
      assert.ok((await envoyerRappels()) >= 1);
      assert.equal(await envoyerRappels(), 0, 'pas de doublon');
      assert.ok(await Notification.exists({ destinataire: id.karim, type: 'rappel_trajet', 'donnees.trajetId': ride._id }));
      await Ride.deleteOne({ _id: ride._id });
    });
  });

  describe('Sprint 5 — chat temps réel, avis, statistiques', () => {
    it('diffuse les messages par Socket.io', async () => {
      const { io } = require('socket.io-client');
      const socket = io(urlServeur(), { auth: { token: t.sara }, transports: ['websocket'] });
      await new Promise((r) => socket.on('connect', r));
      socket.emit('conversation:join', id.conv);
      await new Promise((r) => setTimeout(r, 200));
      const recu = new Promise((r) => socket.on('message:new', r));
      await api('POST', `/conversations/${id.conv}/messages`, t.karim, { texte: 'RDV devant la pharmacie' });
      assert.equal((await recu).texte, 'RDV devant la pharmacie');
      socket.close();
    });
    it('n’autorise la notation qu’après le trajet', async () => {
      assert.equal((await api('POST', '/reviews', t.sara, { cibleId: id.karim, trajetId: id.ride, note: 5 })).status, 400);
      assert.equal((await api('PATCH', `/rides/${id.ride}/finish`, t.karim)).status, 400);
      assert.equal((await api('PATCH', `/rides/${id.ride}/start`, t.karim)).status, 200);
      const fin = await api('PATCH', `/rides/${id.ride}/finish`, t.karim);
      assert.equal(fin.data.recapitulatif.gainsRealises, 5);
    });
    it('enregistre un avis et refuse le doublon', async () => {
      const r = await api('POST', '/reviews', t.sara, { cibleId: id.karim, trajetId: id.ride, note: 5, badges: ['ponctuel', 'inconnu'] });
      assert.equal(r.status, 201);
      assert.deepEqual(r.data.review.badges, ['ponctuel']);
      assert.equal((await api('POST', '/reviews', t.sara, { cibleId: id.karim, trajetId: id.ride, note: 4 })).status, 400);
      assert.equal((await api('POST', '/reviews', t.omar, { cibleId: id.karim, trajetId: id.ride, note: 1 })).status, 403);
    });
    it('calcule les statistiques réelles', async () => {
      const k = (await api('GET', '/stats/me', t.karim)).data;
      assert.equal(k.trajetsConducteur, 1);
      assert.equal(k.gainsConducteur, 5);
      assert.ok(k.badges.find((b) => b.id === 'premier_trajet').debloque);
      const s = (await api('GET', '/stats/me', t.sara)).data;
      assert.equal(s.trajetsPassager, 1);
      assert.ok(s.co2Economise > 0);
    });
    it('enregistre un signalement', async () => {
      const r = await api('POST', '/reports', t.sara, { utilisateurSignaleId: id.karim, trajetId: id.ride, motif: 'retard_excessif', commentaire: 'Retard de 30 minutes sans prévenir' });
      assert.equal(r.status, 201);
      id.report = r.data.signalement._id;
    });
  });

  describe('Sprint 6 — SOS et administration', () => {
    it('déclenche un SOS et prévient l’administration', async () => {
      const r = await api('POST', '/sos', t.sara, { lat: 36.45, lng: 10.73, trajetId: id.ride });
      assert.equal(r.status, 201);
      assert.match(r.data.lien, /maps\.google\.com/);
      assert.ok(await Notification.exists({ destinataire: id.admin, type: 'sos' }));
      id.sos = r.data.sos._id;
    });
    it('refuse l’administration aux étudiants', async () => {
      assert.equal((await api('GET', '/admin/dashboard', t.sara)).status, 403);
    });
    it('affiche le tableau de bord global', async () => {
      const r = await api('GET', '/admin/dashboard', t.admin);
      assert.equal(r.status, 200);
      assert.equal(r.data.utilisateurs.total, 3);
      assert.equal(r.data.trajets.effectues, 1);
      assert.equal(r.data.satisfaction.taux, 100);
      assert.equal(r.data.signalementsEnAttente, 1);
      assert.equal(r.data.sosActives, 1);
      assert.equal(r.data.activite.length, 7);
    });
    it('liste et recherche les utilisateurs', async () => {
      const r = await api('GET', '/admin/users?q=kar', t.admin);
      assert.equal(r.data.length, 1);
      assert.equal(r.data[0].nbSignalements, 1);
    });
    it('traite un signalement en bloquant la personne', async () => {
      const r = await api('PATCH', `/admin/reports/${id.report}`, t.admin, { statut: 'traite', decision: 'Retards répétés', bloquer: true });
      assert.equal(r.status, 200);
      const bloque = await api('GET', '/auth/me', t.karim);
      assert.equal(bloque.status, 403);
      assert.equal((await api('POST', '/auth/login', null, { email: 'karim@isetn.tn', motDePasse: 'secret1' })).status, 403);
      assert.ok(await Notification.exists({ destinataire: id.sara, type: 'signalement_traite' }));
    });
    it('débloque un utilisateur', async () => {
      await api('PATCH', `/admin/users/${id.karim}/unblock`, t.admin);
      assert.equal((await api('GET', '/auth/me', t.karim)).status, 200);
    });
    it('résout une alerte SOS', async () => {
      const r = await api('PATCH', `/admin/sos/${id.sos}/resolve`, t.admin, { note: 'Étudiante rappelée, tout va bien' });
      assert.equal(r.data.sos.statut, 'resolue');
    });
    it('supprime un compte et protège les administrateurs', async () => {
      assert.equal((await api('DELETE', `/admin/users/${id.admin}`, t.admin)).status, 400);
      assert.equal((await api('DELETE', `/admin/users/${id.omar}`, t.admin)).status, 200);
      assert.equal((await api('GET', '/auth/me', t.omar)).status, 401);
    });
  });
});
