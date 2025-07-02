// components/UploadContent/UploadContent.js
import React, { useState, useRef } from 'react';
import ApiService from '../../services/api';
import './UploadContent.css';

const UploadContent = ({ onNavigate, onUploadSuccess }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [resume, setResume] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log('🔍 File selected:', file.name);
        setSelectedFile(file);
        setMessage('');
        setResume(null); // Reset résumé précédent
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setMessage('Veuillez sélectionner un fichier');
            return;
        }

        setUploading(true);
        setMessage('');

        try {
            // 1. UPLOAD du fichier
            console.log('📤 Upload du fichier...');
            const formData = new FormData();
            formData.append('document', selectedFile);

            const uploadResponse = await ApiService.uploadDocument(formData);
            console.log('✅ Fichier uploadé:', uploadResponse.document.id);

            // 2. GÉNÉRATION du résumé
            console.log('🤖 Génération du résumé...');
            setMessage('Fichier uploadé ! Génération du résumé en cours...');

            const resumeResponse = await ApiService.generateResume(uploadResponse.document.id);
            console.log('✅ Résumé généré:', resumeResponse.resume);

            setResume(resumeResponse.resume);
            setMessage('Document analysé et résumé généré avec succès !');

            if (onUploadSuccess) {
                onUploadSuccess(uploadResponse.document);
            }

        } catch (error) {
            console.error('❌ Erreur:', error);
            setMessage(`Erreur: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="upload-content">
            <div className="upload-container">
                <h2>📤 Télécharger un Document</h2>

                <div className="upload-zone">
                    <div className="file-input-container">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="file-input"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="file-label">
                            {selectedFile ? selectedFile.name : '📁 Choisir un fichier'}
                        </label>
                    </div>

                    {selectedFile && (
                        <div className="file-info">
                            <p><strong>Fichier:</strong> {selectedFile.name}</p>
                            <p><strong>Taille:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="upload-btn"
                    >
                        {uploading ? (
                            <>
                                <span className="spinner">⏳</span>
                                Traitement en cours...
                            </>
                        ) : (
                            'Analyser le document'
                        )}
                    </button>

                    {message && (
                        <div className={`message ${message.includes('Erreur') ? 'error' : 'success'}`}>
                            {message}
                        </div>
                    )}
                </div>

                {/* AFFICHAGE DU RÉSUMÉ */}
                {resume && (
                    <div className="resume-display">
                        <h3>📋 Résumé généré</h3>
                        <div className="resume-content">
                            <div className="resume-text">
                                <h4>Contenu:</h4>
                                <p>{resume.contenu}</p>
                            </div>

                            {resume.points_cles && resume.points_cles.length > 0 && (
                                <div className="key-points">
                                    <h4>🔑 Points clés:</h4>
                                    <ul>
                                        {resume.points_cles.map((point, index) => (
                                            <li key={index}>{point.texte}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {resume.suggestions && resume.suggestions.length > 0 && (
                                <div className="suggestions">
                                    <h4>💡 Suggestions:</h4>
                                    <ul>
                                        {resume.suggestions.map((suggestion, index) => (
                                            <li key={index} className={`suggestion-${suggestion.categorie}`}>
                                                {suggestion.action}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="navigation-buttons">
                    <button onClick={() => onNavigate('convert')} className="back-btn">
                        ← Retour
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadContent;
