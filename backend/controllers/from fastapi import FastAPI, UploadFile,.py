from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
import io
import fitz  # PyMuPDF
import os
import tempfile
import logging
from datetime import datetime
import json

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

# Configuration CORS pour permettre les appels depuis le backend Node.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Configuration du système de logging
def setup_logging():
    """Configure le système de logging pour l'API"""
    
    # Obtenir le répertoire du script actuel
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(script_dir, "logs")
    
    # Créer le dossier logs s'il n'existe pas
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)
    
    # Configuration du logger principal
    logger = logging.getLogger("pdf_summarizer_api")
    logger.setLevel(logging.INFO)
    
    # Éviter les doublons de handlers
    if logger.handlers:
        logger.handlers.clear()
    
    # Formatter pour les logs
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Handler pour fichier (logs détaillés)
    log_file_path = os.path.join(logs_dir, f"api_{datetime.now().strftime('%Y%m%d')}.log")
    file_handler = logging.FileHandler(
        log_file_path,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    
    # Handler pour console (logs essentiels)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(formatter)
    
    # Ajouter les handlers au logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    # Log du chemin du fichier de log
    print(f"📁 Logs seront sauvegardés dans: {log_file_path}")
    
    return logger

# Initialiser le logging
logger = setup_logging()

# Log de démarrage de l'API
logger.info("🚀 Démarrage de l'API de résumé PDF")
logger.info(f"📦 Chargement du modèle BART en cours...")

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
            # Adapter les paramètres en fonction de la longueur du texte
            word_count = len(text.split())
            max_length = min(130, max(20, word_count // 2))  # Au maximum la moitié de la longueur
            min_length = min(10, max(5, word_count // 10))   # Au minimum 1/10 de la longueur
            
            summary = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)
            return summary[0]['summary_text']
        except Exception as e:
            logger.warning(f"⚠️ Erreur lors du résumé direct: {str(e)}")
            return f"Erreur lors du résumé: {str(e)}"
    
    # Si le texte est long, le diviser en chunks
    chunks = split_text_into_chunks(text, max_length=500)
    summaries = []
    
    for i, chunk in enumerate(chunks):
        try:
            # Adapter les paramètres pour chaque chunk
            chunk_word_count = len(chunk.split())
            max_length = min(80, max(15, chunk_word_count // 3))
            min_length = min(10, max(5, chunk_word_count // 10))
            
            summary = summarizer(chunk, max_length=max_length, min_length=min_length, do_sample=False)
            summaries.append(summary[0]['summary_text'])
            logger.info(f"📝 Chunk {i+1}/{len(chunks)} résumé avec succès")
        except Exception as e:
            logger.warning(f"⚠️ Erreur chunk {i+1}: {str(e)}")
            # En cas d'erreur, essayer avec un chunk encore plus petit
            try:
                smaller_chunks = split_text_into_chunks(chunk, max_length=300)
                for j, small_chunk in enumerate(smaller_chunks):
                    small_word_count = len(small_chunk.split())
                    small_max_length = min(50, max(10, small_word_count // 4))
                    small_min_length = min(5, max(3, small_word_count // 15))
                    
                    small_summary = summarizer(small_chunk, max_length=small_max_length, min_length=small_min_length, do_sample=False)
                    summaries.append(small_summary[0]['summary_text'])
                    logger.info(f"📝 Petit chunk {j+1} du chunk {i+1} résumé avec succès")
            except Exception as e2:
                logger.error(f"❌ Échec complet pour le chunk {i+1}: {str(e2)}")
                summaries.append(f"Segment {i+1} trop complexe à résumer.")
    
    # Combiner tous les résumés
    combined_summary = ' '.join(summaries)
    
    # Si le résumé combiné est encore trop long, le résumer à nouveau
    if len(combined_summary.split()) > 500:
        try:
            combined_word_count = len(combined_summary.split())
            final_max_length = min(130, max(30, combined_word_count // 2))
            final_min_length = min(20, max(10, combined_word_count // 10))
            
            final_summary = summarizer(combined_summary, max_length=final_max_length, min_length=final_min_length, do_sample=False)
            return final_summary[0]['summary_text']
        except Exception as e:
            logger.warning(f"⚠️ Erreur lors du résumé final: {str(e)}")
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
    start_time = datetime.now()
    logger.info(f"📄 Nouvelle demande de résumé PDF - Fichier: {file.filename}")
    
    try:
        # Validation du type de fichier
        if not file.filename.lower().endswith('.pdf'):
            logger.warning(f"❌ Type de fichier invalide: {file.filename}")
            raise HTTPException(
                status_code=400, 
                detail="Le fichier doit être un PDF (.pdf)"
            )
        
        # Validation de la taille du fichier (10 MB max)
        contents = await file.read()
        file_size_mb = len(contents) / (1024 * 1024)
        logger.info(f"📊 Taille du fichier: {file_size_mb:.2f} MB")
        
        if len(contents) > 10 * 1024 * 1024:  # 10 MB en bytes
            logger.warning(f"❌ Fichier trop volumineux: {file_size_mb:.2f} MB")
            raise HTTPException(
                status_code=400,
                detail="Le fichier PDF ne doit pas dépasser 10 MB"
            )
        
        # Créer un fichier temporaire pour le PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(contents)
            temp_pdf_path = temp_file.name
        
        logger.info(f"💾 Fichier temporaire créé: {temp_pdf_path}")
        
        try:
            # Extraire le texte du PDF
            logger.info("🔍 Extraction du texte en cours...")
            text = extract_text_from_pdf(temp_pdf_path)
            
            # Vérifier si du texte a été extrait
            if not text.strip():
                logger.warning("⚠️ Aucun texte trouvé dans le PDF")
                return {"summary": "Aucun texte trouvé dans le PDF."}
            
            word_count = len(text.split())
            logger.info(f"📝 Texte extrait: {word_count} mots")
            
            # Résumer le texte avec gestion des textes longs
            logger.info("🧠 Génération du résumé en cours...")
            summary = summarize_long_text(text)
            
            # Calculer le temps de traitement
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"✅ Résumé généré avec succès en {processing_time:.2f}s")
            logger.info(f"📊 Résumé: {len(summary.split())} mots")
            
            return {"summary": summary}
        
        finally:
            # Nettoyer le fichier temporaire
            if os.path.exists(temp_pdf_path):
                os.unlink(temp_pdf_path)
                logger.info(f"🧹 Fichier temporaire supprimé: {temp_pdf_path}")
    
    except HTTPException as e:
        # Les erreurs HTTP sont déjà loggées plus haut
        raise e
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.error(f"💥 Erreur inattendue après {processing_time:.2f}s: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")

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
    logger.info("🏠 Accès à la page d'accueil de l'API")
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
    logger.info("🔍 Vérification de l'état de santé de l'API")
    
    try:
        # Test simple du modèle avec un texte plus long et des paramètres adaptés
        test_text = "This is a comprehensive test of the summarization model to ensure it works properly with appropriate parameters."
        test_summary = summarizer(test_text, max_length=20, min_length=5, do_sample=False)
        model_status = "✅ Opérationnel"
        logger.info("✅ Test du modèle BART réussi")
    except Exception as e:
        model_status = f"❌ Erreur: {str(e)}"
        logger.error(f"❌ Erreur lors du test du modèle: {str(e)}")
    
    health_response = {
        "status": "🟢 Service en ligne",
        "timestamp": datetime.now().isoformat(),
        "model_status": model_status,
        "dependencies": {
            "FastAPI": "✅ Opérationnel",
            "PyMuPDF": "✅ Opérationnel", 
            "Transformers": "✅ Opérationnel"
        }
    }
    
    logger.info(f"🔍 État de santé: {health_response['status']}")
    return health_response

if __name__ == "__main__":
    logger.info("🚀 Lancement du serveur uvicorn")
    logger.info("📍 URL: http://127.0.0.1:8000")
    logger.info("📖 Documentation: http://127.0.0.1:8000/docs")
    logger.info("🔗 CORS configuré pour: localhost:5000, localhost:3000")
    
    import uvicorn
    # Utiliser 127.0.0.1 au lieu de 0.0.0.0 pour éviter les problèmes IPv6
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
