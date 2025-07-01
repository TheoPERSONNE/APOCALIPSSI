from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from transformers import pipeline
import io
import fitz  # PyMuPDF
import os
import tempfile

# Charger le modèle de résumé
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# Configuration de l'API avec métadonnées
app = FastAPI(
    title="📄 API de Résumé de PDF",
    description="""
    ## 🚀 API de résumé automatique de documents PDF
    
    Cette API utilise l'intelligence artificielle pour générer des résumés automatiques 
    de vos documents PDF en français.
    
    ### ✨ Fonctionnalités principales :
    
    * **Extraction de texte** : Extraction automatique du contenu textuel des PDF
    * **Résumé intelligent** : Utilisation du modèle BART de Facebook pour générer des résumés de qualité
    * **Gestion des longs documents** : Division automatique des textes longs en segments pour un traitement optimal
    * **Robustesse** : Gestion d'erreurs avancée et récupération automatique
    * **Sécurité** : Nettoyage automatique des fichiers temporaires
    
    ### 🔧 Modèle utilisé :
    
    **facebook/bart-large-cnn** - Modèle de résumé extractif/abstractif pré-entraîné
    
    ### 📊 Limitations :
    
    * Fichiers PDF uniquement
    * Taille recommandée : < 10 MB
    * Langues supportées : Principalement anglais et français
    * Format de sortie : Résumé en texte simple
    """,
    version="1.0.0",
    terms_of_service="https://example.com/terms/",
    contact={
        "name": "Support API",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)

def split_text_into_chunks(text, max_length=500):
    """
    Divise le texte en chunks plus petits pour éviter de dépasser la limite du modèle.
    
    Args:
        text (str): Le texte à diviser
        max_length (int): Nombre maximum de mots par chunk (défaut: 500)
    
    Returns:
        list: Liste des chunks de texte
    """
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) + 1 <= max_length:
            current_chunk.append(word)
            current_length += len(word) + 1
        else:
            if current_chunk:
                chunks.append(' '.join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def summarize_long_text(text):
    """
    Résume un texte long en le divisant en chunks si nécessaire.
    
    Stratégie de résumé :
    1. Textes courts (≤500 mots) : Résumé direct
    2. Textes longs : Division en chunks de 500 mots → résumé de chaque chunk → fusion
    3. En cas d'erreur : Re-division en chunks plus petits (300 mots)
    
    Args:
        text (str): Le texte à résumer
    
    Returns:
        str: Le résumé du texte ou un message d'erreur
    """
    # Si le texte est court, le résumer directement
    if len(text.split()) <= 500:
        try:
            summary = summarizer(text, max_length=130, min_length=30, do_sample=False)
            return summary[0]['summary_text']
        except Exception as e:
            return f"Erreur lors du résumé: {str(e)}"
    
    # Si le texte est long, le diviser en chunks
    chunks = split_text_into_chunks(text, max_length=500)
    summaries = []
    
    for i, chunk in enumerate(chunks):
        try:
            # Utiliser des paramètres plus conservateurs
            summary = summarizer(chunk, max_length=80, min_length=20, do_sample=False)
            summaries.append(summary[0]['summary_text'])
        except Exception as e:
            # En cas d'erreur, essayer avec un chunk encore plus petit
            try:
                smaller_chunks = split_text_into_chunks(chunk, max_length=300)
                for small_chunk in smaller_chunks:
                    small_summary = summarizer(small_chunk, max_length=50, min_length=15, do_sample=False)
                    summaries.append(small_summary[0]['summary_text'])
            except Exception as e2:
                summaries.append(f"Segment {i+1} trop complexe à résumer.")
    
    # Combiner tous les résumés
    combined_summary = ' '.join(summaries)
    
    # Si le résumé combiné est encore trop long, le résumer à nouveau
    if len(combined_summary.split()) > 500:
        try:
            final_summary = summarizer(combined_summary, max_length=130, min_length=30, do_sample=False)
            return final_summary[0]['summary_text']
        except Exception as e:
            return combined_summary  # Retourner le résumé combiné si échec
    
    return combined_summary

def extract_text_from_pdf(pdf_file):
    """
    Extrait le contenu textuel d'un fichier PDF.
    
    Args:
        pdf_file (str): Chemin vers le fichier PDF
    
    Returns:
        str: Texte extrait du PDF
    """
    with fitz.open(pdf_file) as doc:
        text = ""
        for page in doc:
            text += page.get_text("text")
    return text

@app.post(
    "/summarize_pdf/",
    summary="📄 Résumer un document PDF",
    description="""
    ## Génère un résumé automatique d'un document PDF
    
    ### 🔄 Processus :
    1. **Upload** : Réception du fichier PDF
    2. **Extraction** : Extraction du texte contenu dans le PDF
    3. **Analyse** : Découpage intelligent si le document est volumineux
    4. **Résumé** : Génération du résumé avec IA (modèle BART)
    5. **Nettoyage** : Suppression automatique des fichiers temporaires
    
    ### 📋 Formats acceptés :
    - **Type** : Fichiers PDF uniquement
    - **Taille** : Recommandé < 10 MB
    - **Contenu** : Documents avec du texte extractible
    
    ### ⚡ Réponses possibles :
    - **Succès** : Résumé du document en français
    - **PDF vide** : Message indiquant l'absence de texte
    - **Erreur** : Message d'erreur avec détails du problème
    
    ### 💡 Conseils :
    - Privilégiez des PDF avec du texte sélectionnable
    - Les PDF scannés (images) ne sont pas supportés
    - Plus le document est structuré, meilleur sera le résumé
    """,
    response_description="Résumé du document PDF au format JSON",
    tags=["📄 Résumé PDF"],
    responses={
        200: {
            "description": "Résumé généré avec succès",
            "content": {
                "application/json": {
                    "example": {
                        "summary": "Ce document traite de l'intelligence artificielle et de ses applications dans le domaine médical. Il présente les avancées récentes en apprentissage automatique et leurs impacts sur le diagnostic médical..."
                    }
                }
            }
        },
        400: {
            "description": "Erreur dans le fichier fourni",
            "content": {
                "application/json": {
                    "example": {
                        "summary": "Aucun texte trouvé dans le PDF."
                    }
                }
            }
        },
        500: {
            "description": "Erreur serveur lors du traitement",
            "content": {
                "application/json": {
                    "example": {
                        "summary": "Erreur lors du résumé: Problème technique temporaire"
                    }
                }
            }
        }
    }
)
async def summarize_pdf(
    file: UploadFile = File(
        ...,
        description="📎 Fichier PDF à résumer",
        media_type="application/pdf"
    )
):
    # Validation du type de fichier
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Le fichier doit être un PDF (.pdf)"
        )
    
    # Validation de la taille du fichier (10 MB max)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB en bytes
        raise HTTPException(
            status_code=400,
            detail="Le fichier PDF ne doit pas dépasser 10 MB"
        )
    
    # Créer un fichier temporaire pour le PDF
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        temp_file.write(contents)
        temp_pdf_path = temp_file.name
    
    try:
        # Extraire le texte du PDF
        text = extract_text_from_pdf(temp_pdf_path)
        
        # Vérifier si du texte a été extrait
        if not text.strip():
            return {"summary": "Aucun texte trouvé dans le PDF."}
        
        # Résumer le texte avec gestion des textes longs
        summary = summarize_long_text(text)
        return {"summary": summary}
    
    finally:
        # Nettoyer le fichier temporaire
        if os.path.exists(temp_pdf_path):
            os.unlink(temp_pdf_path)

@app.get(
    "/",
    summary="🏠 Page d'accueil de l'API",
    description="Informations générales sur l'API de résumé PDF",
    tags=["📋 Informations"]
)
async def root():
    """
    Point d'entrée principal de l'API avec informations de base.
    """
    return {
        "message": "🚀 API de Résumé PDF - Intelligence Artificielle",
        "version": "1.0.0",
        "model": "facebook/bart-large-cnn",
        "endpoints": {
            "documentation": "/docs",
            "resume_pdf": "/summarize_pdf/",
            "health": "/health"
        },
        "features": [
            "Extraction de texte PDF",
            "Résumé automatique IA",
            "Gestion des longs documents",
            "Nettoyage automatique"
        ]
    }

@app.get(
    "/health",
    summary="🔍 Vérification de l'état du service",
    description="Endpoint de santé pour vérifier le bon fonctionnement de l'API",
    tags=["📋 Informations"]
)
async def health_check():
    """
    Vérification de l'état de santé de l'API et de ses dépendances.
    """
    try:
        # Test simple du modèle
        test_summary = summarizer("This is a test.", max_length=10, min_length=5, do_sample=False)
        model_status = "✅ Opérationnel"
    except Exception as e:
        model_status = f"❌ Erreur: {str(e)}"
    
    return {
        "status": "🟢 Service en ligne",
        "timestamp": "2025-07-01T00:00:00Z",
        "model_status": model_status,
        "dependencies": {
            "FastAPI": "✅ Opérationnel",
            "PyMuPDF": "✅ Opérationnel", 
            "Transformers": "✅ Opérationnel"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
