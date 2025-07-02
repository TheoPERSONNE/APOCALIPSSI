const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { authenticateToken } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

router.post('/generate', resumeController.generateResume);
router.get('/', resumeController.getUserResumes);
router.get('/document/:documentId', resumeController.getResumeByDocument);
router.get('/:id', resumeController.getResumeById);

module.exports = router;
