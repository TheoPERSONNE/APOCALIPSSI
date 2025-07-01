const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')

// Routes publiques
router.post('/register', userController.register);
router.post('/login', userController.login);

// Routes protégées (ajout du middleware d'authentification plus tard)
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

module.exports = router;
