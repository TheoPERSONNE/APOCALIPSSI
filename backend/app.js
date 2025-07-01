const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
require('dotenv').config();

const app = express();

// Connexion à la base de données
connectDB();

// Configuration de la limite de taux pour éviter le spam
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par fenêtre de temps
  message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
});

// Middlewares de sécurité
app.use(helmet()); // Sécurise les en-têtes HTTP
app.use(limiter); // Applique la limite de taux
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes principales
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const resumeRoutes = require('./routes/resumeRoutes');

app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/resumes', resumeRoutes);

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
console.log(`✅ Serveur démarré sur le port ${PORT}`);
});

module.exports = app;
