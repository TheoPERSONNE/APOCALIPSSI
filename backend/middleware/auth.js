const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Token d\'accès requis' 
      });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Récupérer l'utilisateur depuis la base de données
    const user = await User.findById(decoded.id).select('-mot_de_passe');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Token invalide - utilisateur non trouvé' 
      });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token invalide' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expiré' 
      });
    }

    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la vérification du token' 
    });
  }
};

// Middleware optionnel - n'échoue pas si pas de token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-mot_de_passe');
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // En mode optionnel, on continue même en cas d'erreur
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
