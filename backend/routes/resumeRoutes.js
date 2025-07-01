const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');

router.post('/generate', resumeController.generateResume);
router.get('/', resumeController.getUserResumes);
router.get('/document/:documentId', resumeController.getResumeByDocument);
router.get('/:id', resumeController.getResumeById);

module.exports = router;
