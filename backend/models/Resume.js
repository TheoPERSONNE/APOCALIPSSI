const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'L\'action est requise'],
    trim: true
  },
  categorie: {
    type: String,
    required: [true, 'La catégorie est requise'],
    enum: ['urgent', 'important', 'normal', 'information']
  }
});

const pointCleSchema = new mongoose.Schema({
  texte: {
    type: String,
    required: [true, 'Le texte du point clé est requis'],
    trim: true
  },
  importance: {
    type: Number,
    required: [true, 'L\'importance est requise'],
    min: 1,
    max: 5
  }
});

const resumeSchema = new mongoose.Schema({
  contenu: {
    type: String,
    required: [true, 'Le contenu du résumé est requis']
  },
  date_generation: {
    type: Date,
    default: Date.now
  },
  id_document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: [true, 'L\'ID du document est requis']
  },
  suggestions: [suggestionSchema],
  points_cles: [pointCleSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Resume', resumeSchema);
