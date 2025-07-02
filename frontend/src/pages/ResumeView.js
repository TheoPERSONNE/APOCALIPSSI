import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const ResumeView = ({ documentId, onNavigate }) => { // ✅ Props au lieu de useParams
    const [resume, setResume] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (documentId) {
            fetchResume();
        }
    }, [documentId]);

    const fetchResume = async () => {
        try {
            setLoading(true);
            const response = await ApiService.getDocumentResume(documentId);
            setResume(response.resume);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Chargement du résumé...</div>;
    if (error) return <div className="error">Erreur: {error}</div>;
    if (!resume) return <div className="no-data">Aucun résumé trouvé</div>;

    return (
        <div className="resume-container">
            {/* Bouton de retour */}
            <button
                onClick={() => onNavigate('convert')}
                className="back-button"
            >
                ← Retour aux documents
            </button>

            <h1>Résumé du Document</h1>

            <div className="document-info">
                <h2>📄 {resume.id_document.nom_fichier}</h2>
                <p>Généré le: {new Date(resume.date_generation).toLocaleDateString()}</p>
            </div>

            <div className="resume-content">
                <h3>📝 Résumé</h3>
                <div className="content">
                    {resume.contenu}
                </div>
            </div>

            {resume.points_cles && resume.points_cles.length > 0 && (
                <div className="key-points">
                    <h3>🔑 Points Clés</h3>
                    <ul>
                        {resume.points_cles.map((point, index) => (
                            <li key={index} className={`importance-${point.importance}`}>
                                {point.texte}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {resume.suggestions && resume.suggestions.length > 0 && (
                <div className="suggestions">
                    <h3>💡 Suggestions</h3>
                    <ul>
                        {resume.suggestions.map((suggestion, index) => (
                            <li key={index} className={`category-${suggestion.categorie}`}>
                                <span className="action">{suggestion.action}</span>
                                <span className="category">{suggestion.categorie}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ResumeView;
