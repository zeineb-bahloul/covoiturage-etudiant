require('dotenv').config();
require('./config/dns');
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { initSocket } = require('./services/socket');

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

app.get('/', (req, res) => {
  res.json({ message: 'API OK - UniRide Backend' });
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
    .then(() => console.log('MongoDB connecté'))
    .catch((err) => console.error('Erreur MongoDB :', err.message));

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur le port ${PORT} (API + Socket.io)`);
  });
}

module.exports = { app, server };
