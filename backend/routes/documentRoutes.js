const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

router.post('/upload', documentController.uploadDocument);
router.get('/', documentController.getUserDocuments);
router.get('/:id', documentController.getDocumentById);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
