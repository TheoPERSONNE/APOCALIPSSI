const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  nom_fichier: {
    type: String,
    required: [true, 'Le nom du fichier est requis'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Le type de fichier est requis'],
    enum: ['pdf', 'doc', 'docx', 'txt'],
    lowercase: true
  },
  date_upload: {
    type: Date,
    default: Date.now
  },
  id_utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'ID utilisateur est requis']
  },
  taille_fichier: {
    type: Number,
    required: true
  },
  chemin_fichier: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
