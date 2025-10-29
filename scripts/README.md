# 🔄 Scripts de Reset RAG

Ces scripts permettent de nettoyer complètement votre environnement RAG et ChromaDB.

## 📝 Scripts Disponibles

### 1. Reset Bash (Simple)
```bash
./scripts/reset-rag.sh
# ou
npm run rag:reset
```

**Avantages :**
- Simple et rapide
- Fonctionne même si Node.js a des problèmes
- Logs colorés et clairs

### 2. Reset Node.js (Avancé)
```bash
node scripts/reset-rag.js
# ou  
npm run rag:reset-full
```

**Avantages :**
- Recherche automatique des fichiers RAG
- Vérifications post-reset
- Gestion d'erreurs plus robuste

## 🎯 Ce que font ces scripts

### ✅ Nettoyage ChromaDB
1. Arrêt du container ChromaDB
2. Suppression des volumes Docker
3. Suppression du dossier `chromadb_data/`
4. Redémarrage de ChromaDB propre

### ✅ Nettoyage Modèles RAG
1. Suppression des fichiers de stockage :
   - `rag-models.json`
   - `rag_models.json`
   - `.rag-storage.json`
   - `lib/rag/storage/models.json`
   - Tous les fichiers `*rag*models*.json`

### ✅ Reset Registre
1. Notification du registre RAG en mémoire
2. Vérifications de santé des services

## 🚨 Quand utiliser ces scripts

### Utilisez le reset quand :
- ❌ Vos recherches RAG retournent 0 résultats
- ❌ Vous voyez "No embedding function configuration found"
- ❌ Vous avez changé de modèle d'embedding 
- ❌ ChromaDB est "unhealthy"
- ❌ Vous voulez repartir de zéro

### ⚠️ ATTENTION
Ces scripts suppriment **TOUS** vos modèles RAG existants !
Vous devrez recréer vos modèles et re-uploader vos documents.

## 📋 Après le Reset

1. **Vérifiez les services :**
   ```bash
   # ChromaDB
   curl http://localhost:8000/api/v1/heartbeat
   
   # Interface
   curl http://localhost:3000/api/rag/models
   ```

2. **Créez un nouveau modèle RAG :**
   - Allez sur http://localhost:3000
   - Créez un nouveau modèle RAG
   - **Spécifiez explicitement :**
     - Modèle de base : `qwen3:8b`
     - Modèle d'embedding : `bge-m3:latest`
   - Uploadez vos documents

3. **Testez la recherche :**
   ```bash
   curl -X POST http://localhost:3000/api/rag/debug-search \
     -H "Content-Type: application/json" \
     -d '{"modelName": "votre-nouveau-modele", "query": "test"}'
   ```

## 🔧 Dépannage

### ChromaDB ne démarre pas
```bash
# Vérifier les ports
lsof -i :8000

# Nettoyer Docker
docker system prune -f

# Redémarrer
npm run chromadb:start
```

### Script de permission refusée
```bash
chmod +x scripts/reset-rag.sh
chmod +x scripts/reset-rag.js
```

### Docker compose non trouvé
Le script essaie automatiquement :
- `docker compose` (nouvelle version)
- `docker-compose` (ancienne version)

## 📊 Exemple d'Exécution

```bash
$ npm run rag:reset

🔄 === RESET COMPLET RAG + CHROMADB ===

ℹ️  Étape 1/4: Arrêt de ChromaDB...
✅ ChromaDB arrêté et volumes supprimés
ℹ️  Étape 2/4: Nettoyage des données ChromaDB locales...
✅ Dossier chromadb_data supprimé
ℹ️  Étape 3/4: Suppression des modèles RAG stockés...
✅ Fichier rag-models.json supprimé
ℹ️  Étape 4/4: Redémarrage de ChromaDB...
✅ ChromaDB redémarré
ℹ️  Attente du démarrage de ChromaDB...
✅ ChromaDB est opérationnel !

✅ === RESET TERMINÉ AVEC SUCCÈS ===

📋 Prochaines étapes :
   1. Aller sur http://localhost:3000
   2. Créer un nouveau modèle RAG
   3. Spécifier explicitement:
      - Modèle de base: qwen3:8b
      - Modèle d'embedding: bge-m3:latest
   4. Uploader vos documents
```

## 🎯 Scripts Complémentaires

```bash
# Seulement ChromaDB
npm run chromadb:reset

# Logs ChromaDB
npm run chromadb:logs

# Redémarrer ChromaDB
npm run chromadb:stop && npm run chromadb:start
```