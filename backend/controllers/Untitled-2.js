const Resume = require('../models/Resume');
const Document = require('../models/Document');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Configuration de l'API IA Python
const AI_API_URL = process.env.AI_API_URL || 'http://127.0.0.1:8000';

const callAISummaryAPI = async (filePath) => {
  try {
    console.log(`🔗 Tentative de connexion à l'API IA: ${AI_API_URL}`);
    console.log(`📂 Chemin du fichier: ${filePath}`);
    console.log(`📊 Fichier existe: ${fs.existsSync(filePath)}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Le fichier ${filePath} n'existe pas`);
    }

    // Vérifier la taille du fichier
    const stats = fs.statSync(filePath);
    console.log(`📦 Taille du fichier: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Test de santé de l'API avant l'appel principal
    try {
      console.log(`🏥 Test de santé de l'API...`);
      const healthCheck = await axios.get(`${AI_API_URL}/health`, { timeout: 5000 });
      console.log('✅ API IA disponible:', healthCheck.data.status);
    } catch (healthError) {
      console.error('❌ Test de santé de l\'API IA échoué:', healthError.message);
      throw new Error('API IA non disponible. Vérifiez que le service Python est démarré sur le bon port.');
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    console.log(`📤 Envoi du fichier vers: ${AI_API_URL}/summarize_pdf/`);
    console.log(`📋 Headers de la requête:`, form.getHeaders());
    
    const response = await axios.post(`${AI_API_URL}/summarize_pdf/`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 120000, // 2 minutes timeout pour l'IA
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('✅ Résumé reçu de l\'API IA');
    console.log(`📊 Statut de la réponse: ${response.status}`);
    console.log(`📝 Taille de la réponse: ${JSON.stringify(response.data).length} caractères`);
    
    return response.data.summary;
  } catch (error) {
    console.error('🚨 Erreur détaillée lors de l\'appel API IA:', {
      message: error.message,
      code: error.code,
      address: error.address,
      port: error.port,
      url: AI_API_URL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

    if (error.response) {
      throw new Error(`Erreur API IA (${error.response.status}): ${error.response.data.detail || error.response.data.message || 'Erreur inconnue'}`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`API IA non disponible sur ${AI_API_URL}. Vérifiez que le service Python est démarré et accessible.`);
    } else if (error.code === 'ENOTFOUND') {
      throw new Error(`Impossible de résoudre l'adresse ${AI_API_URL}. Vérifiez la configuration AI_API_URL.`);
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Timeout lors de l\'appel à l\'API IA. Le traitement prend trop de temps.');
    } else {
      throw new Error(`Erreur lors de l'appel à l'API IA: ${error.message}`);
    }
  }
};

// Fonction pour générer des suggestions et points clés basiques à partir du résumé
const generateSuggestionsAndKeyPoints = (summary) => {
  // Suggestions basiques basées sur des mots-clés
  const suggestions = [];
  const keyPoints = [];

  // Analyse simple du contenu pour générer des suggestions
  const summaryLower = summary.toLowerCase();
  
  if (summaryLower.includes('conformité') || summaryLower.includes('réglementation')) {
    suggestions.push({
      action: "Vérifier la conformité réglementaire",
      categorie: "important"
    });
  }
  
  if (summaryLower.includes('échéance') || summaryLower.includes('deadline') || summaryLower.includes('date limite')) {
    suggestions.push({
      action: "Planifier les échéances importantes",
      categorie: "urgent"
    });
  }
  
  if (summaryLower.includes('procédure') || summaryLower.includes('processus')) {
    suggestions.push({
      action: "Réviser les procédures internes",
      categorie: "normal"
    });
  }

  // Points clés basiques (diviser le résumé en phrases importantes)
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
  sentences.slice(0, 3).forEach((sentence, index) => {
    keyPoints.push({
      texte: sentence.trim(),
      importance: Math.max(3, 5 - index) // Importance décroissante
    });
  });

  // Ajouter au moins une suggestion et un point clé par défaut
  if (suggestions.length === 0) {
    suggestions.push({
      action: "Analyser les informations du document",
      categorie: "normal"
    });
  }

  if (keyPoints.length === 0) {
    keyPoints.push({
      texte: summary.substring(0, 100) + "...",
      importance: 3
    });
  }

  return { suggestions, keyPoints };
};

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

    // Vérifier que le fichier existe physiquement
    if (!fs.existsSync(document.chemin_fichier)) {
      return res.status(404).json({ message: 'Fichier document introuvable sur le serveur' });
    }

    // Appeler l'API IA Python pour générer le résumé
    console.log(`📄 Génération du résumé pour: ${document.nom_fichier}`);
    const aiSummary = await callAISummaryAPI(document.chemin_fichier);

    // Générer les suggestions et points clés
    const { suggestions, keyPoints } = generateSuggestionsAndKeyPoints(aiSummary);

    // Créer le résumé en base de données
    const resume = await Resume.create({
      contenu: aiSummary,
      id_document: documentId,
      suggestions: suggestions,
      points_cles: keyPoints
    });

    // Populate le document pour la réponse
    await resume.populate('id_document', 'nom_fichier type date_upload');

    console.log(`✅ Résumé généré avec succès pour: ${document.nom_fichier}`);

    res.status(201).json({
      message: 'Résumé généré avec succès',
      resume
    });
  } catch (error) {
    console.error('❌ Erreur lors de la génération du résumé:', error.message);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du résumé',
      error: error.message 
    });
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
