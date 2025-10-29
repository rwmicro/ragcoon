#!/bin/bash

# 🔄 Script de Reset Complet RAG + ChromaDB
# Usage: ./scripts/reset-rag.sh

set -e

echo "🔄 === RESET COMPLET RAG + CHROMADB ==="
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages colorés
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier si on est dans le bon répertoire
if [ ! -f "docker-compose.chromadb.yml" ]; then
    log_error "docker-compose.chromadb.yml non trouvé. Exécutez ce script depuis la racine du projet."
    exit 1
fi

log_info "Étape 1/4: Arrêt de ChromaDB..."
# Arrêter ChromaDB avec suppression des volumes
if docker compose -f docker-compose.chromadb.yml down -v 2>/dev/null; then
    log_success "ChromaDB arrêté et volumes supprimés"
else
    log_warning "ChromaDB n'était pas en cours d'exécution ou erreur lors de l'arrêt"
fi

log_info "Étape 2/4: Nettoyage des données ChromaDB locales..."
# Supprimer le dossier de données ChromaDB s'il existe
if [ -d "chromadb_data" ]; then
    rm -rf chromadb_data
    log_success "Dossier chromadb_data supprimé"
else
    log_info "Aucun dossier chromadb_data trouvé"
fi

log_info "Étape 3/4: Suppression des modèles RAG stockés..."
# Supprimer les fichiers de stockage des modèles RAG
RAG_STORAGE_FILES=(
    "rag-models.json"
    "rag_models.json" 
    ".rag-storage.json"
    "lib/rag/storage/models.json"
    "storage/rag-models.json"
)

for file in "${RAG_STORAGE_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        log_success "Fichier $file supprimé"
    fi
done

# Rechercher et supprimer tous les fichiers de stockage RAG
find . -name "*rag*models*.json" -type f 2>/dev/null | while read -r file; do
    if [[ "$file" != "./node_modules/"* ]]; then
        rm -f "$file"
        log_success "Fichier de stockage RAG supprimé: $file"
    fi
done

log_info "Étape 4/4: Redémarrage de ChromaDB..."
# Redémarrer ChromaDB
if docker compose -f docker-compose.chromadb.yml up -d; then
    log_success "ChromaDB redémarré"
    
    # Attendre que ChromaDB soit prêt
    log_info "Attente du démarrage de ChromaDB..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1 || 
           curl -s http://localhost:8000/heartbeat > /dev/null 2>&1; then
            log_success "ChromaDB est opérationnel !"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_warning "ChromaDB met du temps à démarrer, mais continuez..."
        else
            echo -n "."
            sleep 2
        fi
    done
    echo ""
else
    log_error "Erreur lors du redémarrage de ChromaDB"
    exit 1
fi

echo ""
log_success "=== RESET TERMINÉ AVEC SUCCÈS ==="
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Aller sur http://localhost:3000"
echo "   2. Créer un nouveau modèle RAG"
echo "   3. Spécifier explicitement:"
echo "      - Modèle de base: qwen3:8b"
echo "      - Modèle d'embedding: bge-m3:latest"
echo "   4. Uploader vos documents"
echo ""
echo "🔍 Vérifications rapides :"
echo "   - ChromaDB: http://localhost:8000/api/v1/heartbeat"
echo "   - Interface: http://localhost:3000"
echo ""