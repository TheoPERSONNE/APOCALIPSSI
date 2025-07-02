const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
require('dotenv').config();

const app = express();

// Connexion à la base de données
connectDB();

// Configuration de la limite de taux
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
});

// Middlewares de sécurité
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// ✅ MIDDLEWARE CONDITIONNEL - évite JSON parsing pour upload
app.use((req, res, next) => {
  console.log(`🔍 Request: ${req.method} ${req.path}`);
  console.log(`🔍 Content-Type: ${req.headers['content-type']}`);

  // Si c'est une route upload, on skip le JSON parser
  if (req.path.includes('/upload') && req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('🔍 Upload route detected - skipping JSON parser');
    return next();
  }

  // Sinon, on applique le JSON parser
  console.log('🔍 Applying JSON parser');
  express.json({ limit: '10mb' })(req, res, next);
});

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
  console.error('❌ Server error:', err.stack);
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
