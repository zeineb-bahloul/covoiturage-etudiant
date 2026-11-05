require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
const scheduleRoutes = require('./routes/schedule');
app.use('/api/schedule', scheduleRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API OK' });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch((err) => console.error('Erreur MongoDB :', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});