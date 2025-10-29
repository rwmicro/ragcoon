# RAG System Documentation

## Architecture

```
┌─────────────┐
│  Documents  │
│  (.md .pdf) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Chunking   │  ← Split into ~500 word chunks
└──────┬──────┘    with 100 word overlap
       │
       ▼
┌─────────────┐
│  Embeddings │  ← Create vectors via Ollama
└──────┬──────┘    (nomic-embed-text)
       │
       ▼
┌─────────────┐
│  ChromaDB   │  ← Store vectors + metadata
└─────────────┘

Query Flow:
┌─────────────┐
│   Question  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Embedding  │  ← Convert to vector
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Search     │  ← Cosine similarity
│  (Top-K)    │    in ChromaDB
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Prompt     │  ← Build context
│  Builder    │    with sources
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Ollama    │  ← Generate answer
│    (LLM)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Answer    │
│  + Sources  │
└─────────────┘
```

## Modules

### `types.ts`
TypeScript interfaces pour tout le système RAG.

**Key Types:**
- `DocumentChunk` : Un fragment de document avec embedding
- `DocumentMetadata` : Métadonnées (source, titre, page, etc.)
- `QueryResult` : Résultat de recherche avec score
- `RAGResponse` : Réponse complète (answer + sources)

### `chunking.ts`
Découpage intelligent des documents en morceaux.

**Functions:**
- `chunkText()` : Divise le texte en chunks avec overlap
- `extractMarkdownTitle()` : Extrait le titre d'un Markdown
- `cleanMarkdownContent()` : Nettoie le Markdown pour l'indexation

**Algorithm:**
1. Nettoie le texte (normalise espaces, newlines)
2. Divise en mots
3. Crée des chunks de N mots avec M mots de chevauchement
4. Ignore les chunks trop petits (sauf le dernier)

### `embeddings.ts`
Création d'embeddings via Ollama.

**Functions:**
- `createEmbedding()` : Crée un embedding pour un texte
- `createEmbeddings()` : Batch embeddings (séquentiel pour l'instant)
- `cosineSimilarity()` : Calcule la similarité entre deux vecteurs

**Ollama API:**
```
POST /api/embed
{
  "model": "nomic-embed-text",
  "input": "text to embed"
}
```

### `vectorstore.ts`
Interface avec ChromaDB.

**Functions:**
- `getChromaClient()` : Singleton client ChromaDB
- `getOrCreateCollection()` : Obtient/crée la collection
- `addChunks()` : Ajoute des chunks à la collection
- `queryChunks()` : Recherche par similarité
- `deleteChunksByFilename()` : Supprime les chunks d'un fichier
- `deleteCollection()` : Reset complet

**Collection:**
- Name: `ragcoon_documents`
- Distance: Cosine
- Includes: IDs, embeddings, documents, metadatas

### `indexer.ts`
Pipeline d'indexation complet.

**Functions:**
- `indexFile()` : Index un fichier (MD ou PDF)
- `indexDirectory()` : Index récursif d'un dossier
- `getIndexStats()` : Statistiques d'indexation

**Pipeline:**
1. Parse le fichier (Markdown ou PDF)
2. Extrait le titre (MD uniquement)
3. Nettoie le contenu
4. Chunking
5. Création des embeddings
6. Suppression des anciens chunks du même fichier
7. Ajout des nouveaux chunks à ChromaDB

### `retriever.ts`
Recherche et génération RAG.

**Functions:**
- `retrieveRelevantChunks()` : Recherche les chunks pertinents
- `formatSourcesForPrompt()` : Formate les sources pour le prompt
- `buildRAGPrompt()` : Construit le prompt complet
- `generateRAGResponse()` : Génération complète (non-streaming)
- `streamRAGResponse()` : Génération en streaming

**RAG Flow:**
1. Embedding de la question
2. Recherche top-K chunks
3. Construction du prompt avec contexte
4. Appel à Ollama pour génération
5. Retour réponse + sources

## API Routes

### `POST /api/rag/ingest`
Indexe des documents.

**Actions:**
- `index-file` : Index un fichier
- `index-directory` : Index un dossier
- `get-stats` : Statistiques

**Example:**
```json
{
  "action": "index-directory",
  "path": "./data",
  "options": {
    "chunkingOptions": {
      "chunkSize": 500,
      "overlap": 100
    },
    "embeddingOptions": {
      "model": "nomic-embed-text"
    }
  }
}
```

### `GET /api/rag/ingest`
Obtient les statistiques d'indexation.

### `POST /api/rag/query`
Interroge le système RAG.

**Example:**
```json
{
  "query": "How do I install Ollama?",
  "model": "llama3.1:latest",
  "topK": 5,
  "temperature": 0.7,
  "stream": false
}
```

**Response:**
```json
{
  "success": true,
  "answer": "To install Ollama...",
  "sources": [...],
  "query": "How do I install Ollama?"
}
```

## CLI Script

### `scripts/index-documents.ts`
Script d'indexation en ligne de commande.

**Usage:**
```bash
npm run index                   # Index ./data
npm run index ./docs           # Index specific folder
npm run index ./file.pdf       # Index specific file
npm run index:stats            # Show stats
npm run index -- --reset       # Reset (with FORCE_RESET=1)
```

**Options:**
- `--chunk-size N` : Taille des chunks (défaut: 500)
- `--overlap N` : Chevauchement (défaut: 100)
- `--model NAME` : Modèle d'embeddings
- `--help` : Aide
- `--stats` : Statistiques
- `--reset` : Suppression totale

## Configuration

### Environment Variables

```bash
# Ollama endpoint
OLLAMA_BASE_URL=http://localhost:11434

# ChromaDB endpoint
CHROMA_URL=http://localhost:8000

# Disable Ollama integration
DISABLE_OLLAMA=false
```

### Default Parameters

```typescript
// Chunking
const DEFAULT_CHUNK_SIZE = 500       // words
const DEFAULT_OVERLAP = 100          // words
const DEFAULT_MIN_CHUNK_SIZE = 50    // words

// Embeddings
const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text'

// Retrieval
const DEFAULT_TOP_K = 5
const DEFAULT_TEMPERATURE = 0.7

// Generation
const DEFAULT_GENERATION_MODEL = 'llama3.1:latest'
```

## Performance

### Indexing Speed
- **Markdown** : ~50 chunks/minute (dépend du modèle d'embeddings)
- **PDF** : ~30 chunks/minute (parsing + embeddings)

**Bottlenecks:**
- Création des embeddings (appels Ollama séquentiels)
- Parsing PDF pour les gros fichiers

### Query Speed
- **Search** : <100ms (ChromaDB très rapide)
- **Generation** : 1-5s selon le modèle et la longueur

**Tips:**
- Utilisez un modèle léger pour plus de rapidité (phi3, mistral:7b)
- Réduisez topK pour moins de contexte
- GPU accélère grandement Ollama

## Testing

### Manual Tests

```bash
# 1. Start ChromaDB
npm run rag:start

# 2. Index test documents
npm run index ./data

# 3. Check stats
npm run index:stats

# 4. Test query (via curl)
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?", "model": "llama3.1:latest"}'

# 5. Test via UI
# Navigate to http://localhost:3000/rag
```

### Unit Tests (TODO)

Would be great to add:
- `chunking.test.ts` : Test chunk boundaries
- `embeddings.test.ts` : Mock Ollama responses
- `vectorstore.test.ts` : In-memory ChromaDB
- `retriever.test.ts` : End-to-end RAG flow

## Troubleshooting

### "Collection does not exist"
→ Normal on first run. Will be created automatically.

### "No embedding returned from Ollama"
→ Check Ollama is running and model is installed
```bash
ollama list
ollama pull nomic-embed-text
```

### Empty or bad chunks
→ Check PDF quality (not scanned images)
→ Try different chunk sizes

### Irrelevant results
→ Increase topK
→ Check document quality
→ Re-index with better chunking params

## Future Improvements

- [ ] Batch embeddings API call
- [ ] Parallel PDF processing
- [ ] Hybrid search (keyword + semantic)
- [ ] Query expansion/rewriting
- [ ] Re-ranking of results
- [ ] Metadata filtering (by date, type, etc.)
- [ ] Multi-query retrieval
- [ ] Document summarization
- [ ] Automatic tagging
- [ ] Web UI for index management

## References

- [RAG Paper](https://arxiv.org/abs/2005.11401)
- [ChromaDB Docs](https://docs.trychroma.com/)
- [Ollama Docs](https://ollama.com/docs)
- [Embedding Models](https://ollama.com/blog/embedding-models)
