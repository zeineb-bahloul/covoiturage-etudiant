require('dotenv').config();
require('./config/dns');
// Heures des trajets et rappels à l'heure tunisienne, même sur un serveur à l'étranger (Render)
process.env.TZ = process.env.TZ || 'Africa/Tunis';
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { initSocket } = require('./services/socket');
const { demarrerRappels } = require('./services/rappels');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/map', require('./routes/map'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/sos', require('./routes/sos'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  res.json({ message: 'API OK - UniRide Backend' });
});

// Vérification de santé (Render, supervision)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, base: mongoose.connection.readyState === 1 ? 'connectée' : 'déconnectée', heure: new Date().toISOString() });
});

// Route inconnue
app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

// Erreur non prévue (JSON mal formé, etc.)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Requête JSON invalide' });
  }
  console.error(err);
  res.status(500).json({ message: 'Erreur serveur' });
});

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log('MongoDB connecté');
      demarrerRappels();
    })
    .catch((err) => console.error('Erreur MongoDB :', err.message));

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur le port ${PORT} (API + Socket.io)`);
  });
}

module.exports = { app, server };
