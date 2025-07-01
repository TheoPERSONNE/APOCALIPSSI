const Resume = require('../models/Resume');
const Document = require('../models/Document');

exports.generateResume = async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({ message: 'ID du document requis' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    // Vérifier que le document existe
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }

    // Vérifier que l'utilisateur a accès à ce document
    if (document.id_utilisateur.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Vérifier si un résumé existe déjà
    const existingResume = await Resume.findOne({ id_document: documentId });
    if (existingResume) {
      return res.status(200).json({
        message: 'Résumé déjà existant',
        resume: existingResume
      });
    }

    // TODO: Implémenter l'intégration avec l'API LLM
    return res.status(501).json({ 
      message: 'Génération de résumé non implémentée - API LLM requise' 
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getResumeByDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const resume = await Resume.findOne({ id_document: documentId })
      .populate('id_document', 'nom_fichier type date_upload');

    if (!resume) {
      return res.status(404).json({ message: 'Aucun résumé trouvé pour ce document' });
    }

    // Vérifier l'accès via le document
    const document = await Document.findById(documentId);
    if (document.id_utilisateur.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json({
      message: 'Résumé récupéré avec succès',
      resume
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getResumeById = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const resume = await Resume.findById(req.params.id)
      .populate('id_document', 'nom_fichier type date_upload id_utilisateur');

    if (!resume) {
      return res.status(404).json({ message: 'Résumé non trouvé' });
    }

    // Vérifier l'accès
    if (resume.id_document.id_utilisateur.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json({
      message: 'Résumé récupéré avec succès',
      resume
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserResumes = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    // Récupérer tous les documents de l'utilisateur
    const userDocuments = await Document.find({ id_utilisateur: req.user.id }).select('_id');
    const documentIds = userDocuments.map(doc => doc._id);

    // Récupérer tous les résumés des documents de l'utilisateur
    const resumes = await Resume.find({ id_document: { $in: documentIds } })
      .populate('id_document', 'nom_fichier type date_upload')
      .sort({ date_generation: -1 });

    res.json({
      message: 'Résumés récupérés avec succès',
      resumes
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
