const Document = require('../models/Document');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non supporté. Seuls les PDF, DOC, DOCX et TXT sont acceptés.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: fileFilter
});

exports.uploadDocument = [
  upload.single('document'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier fourni' });
      }

      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }

      // Déterminer le type de fichier
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      let type;
      switch (fileExtension) {
        case '.pdf':
          type = 'pdf';
          break;
        case '.doc':
          type = 'doc';
          break;
        case '.docx':
          type = 'docx';
          break;
        case '.txt':
          type = 'txt';
          break;
        default:
          type = 'unknown';
      }

      const document = await Document.create({
        nom_fichier: req.file.originalname,
        type: type,
        id_utilisateur: req.user.id,
        taille_fichier: req.file.size,
        chemin_fichier: req.file.path
      });

      res.status(201).json({
        message: 'Document uploadé avec succès',
        document: {
          id: document._id,
          nom_fichier: document.nom_fichier,
          type: document.type,
          date_upload: document.date_upload,
          taille_fichier: document.taille_fichier
        }
      });
    } catch (error) {
      // Supprimer le fichier en cas d'erreur
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ message: error.message });
    }
  }
];

exports.getUserDocuments = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const documents = await Document.find({ id_utilisateur: req.user.id })
      .select('-chemin_fichier')
      .sort({ date_upload: -1 });

    res.json({
      message: 'Documents récupérés avec succès',
      documents
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const document = await Document.findById(req.params.id)
      .populate('id_utilisateur', 'nom email');

    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }

    // Vérifier que l'utilisateur a accès à ce document
    if (document.id_utilisateur._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json({
      message: 'Document récupéré avec succès',
      document
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }

    // Vérifier que l'utilisateur a accès à ce document
    if (document.id_utilisateur.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Supprimer le fichier physique
    if (fs.existsSync(document.chemin_fichier)) {
      fs.unlinkSync(document.chemin_fichier);
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
