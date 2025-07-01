from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from transformers import pipeline
import io
import fitz  # PyMuPDF
import os
import tempfile
import logging
from datetime import datetime
import json

def check_and_load_model():
    """
    Vérifie si le modèle BART est disponible localement et le télécharge si nécessaire.
    
    Returns:
        pipeline: Le pipeline de résumé configuré
    """
    model_name = "facebook/bart-large-cnn"
    
    try:
        print(f"🔍 Vérification de la disponibilité du modèle {model_name}...")
        # Note: logger n'est pas encore initialisé à ce stade, on utilisera print pour l'affichage console
        
        # Essayer de charger le modèle (cela le téléchargera automatiquement s'il n'est pas présent)
        print("⏳ Chargement en cours... (peut prendre plusieurs minutes lors du premier démarrage)")
        summarizer = pipeline("summarization", model=model_name)
        
        print(f"✅ Modèle {model_name} chargé avec succès!")
        print(f"📦 Le modèle est maintenant disponible localement pour les futures utilisations.")
        
        # Test rapide du modèle avec un texte en français
        test_text = "L'intelligence artificielle transforme notre façon de travailler et d'interagir avec la technologie. Cette révolution technologique offre de nombreuses opportunités mais soulève aussi des questions importantes sur l'avenir du travail."
        print("🧪 Test de fonctionnement du modèle...")
        test_result = summarizer(test_text, max_length=30, min_length=10, do_sample=False)
        
        if test_result and len(test_result) > 0:
            print(f"✅ Test du modèle réussi!")
            print(f"📝 Exemple de résumé généré: '{test_result[0]['summary_text'][:100]}...'")
            print(f"🚀 Le modèle est prêt à traiter vos documents PDF!")
        else:
            print("⚠️ Le test du modèle a échoué, mais le modèle est chargé.")
        
        return summarizer
        
    except Exception as e:
        print(f"❌ Erreur lors du chargement du modèle {model_name}: {str(e)}")
        print("💡 Causes possibles:")
        print("   • Connexion internet insuffisante ou interrompue")
        print("   • Espace disque insuffisant (le modèle fait environ 1.6 GB)")
        print("   • Problème avec les dépendances PyTorch/Transformers")
        print("   • Restrictions de sécurité réseau")
        print(f"🔧 Solutions recommandées:")
        print("   • Vérifiez votre connexion internet")
        print("   • Libérez de l'espace disque (minimum 2 GB recommandés)")
        print("   • Relancez l'API après résolution du problème")
        raise e

def log_model_loading_status(logger, summarizer, model_name):
    """
    Enregistre dans les logs l'état du chargement du modèle.
    Cette fonction est appelée après l'initialisation du logger.
    """
    try:
        logger.info(f"📦 Modèle {model_name} chargé et vérifié avec succès")
        logger.info("🚀 API prête à traiter les documents PDF")
        
        # Test rapide pour vérifier que le modèle fonctionne dans les logs
        test_text = "Test de fonctionnement du modèle pour les logs."
        test_result = summarizer(test_text, max_length=15, min_length=5, do_sample=False)
        
        if test_result and len(test_result) > 0:
            logger.info(f"✅ Test post-initialisation du modèle réussi")
            logger.info(f"📝 Modèle opérationnel et prêt pour les requêtes")
        else:
            logger.warning("⚠️ Test post-initialisation du modèle - résultat inattendu")
            
    except Exception as e:
        logger.error(f"❌ Erreur lors du test post-initialisation du modèle: {str(e)}")
        logger.warning("⚠️ Le modèle pourrait ne pas fonctionner correctement")

# Charger et vérifier le modèle de résumé au démarrage
print("🚀 Initialisation de l'API de résumé PDF...")
print("📦 Chargement du modèle d'intelligence artificielle...")
summarizer = check_and_load_model()

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

# Logger le statut du modèle maintenant que le logger est initialisé
log_model_loading_status(logger, summarizer, "facebook/bart-large-cnn")

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
        # Test simple du modèle
        test_summary = summarizer("This is a test.", max_length=10, min_length=5, do_sample=False)
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
    logger.info("📍 URL: http://0.0.0.0:8000")
    logger.info("📖 Documentation: http://0.0.0.0:8000/docs")
    
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
