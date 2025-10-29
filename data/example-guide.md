# Guide d'utilisation de RAGCoon

## Introduction

RAGCoon est un système de chat intelligent qui utilise la technique RAG (Retrieval-Augmented Generation) pour répondre à vos questions en se basant sur vos propres documents.

## Qu'est-ce que le RAG ?

Le RAG combine deux approches puissantes :

1. **Retrieval (Récupération)** : Le système recherche les informations pertinentes dans votre base de documents
2. **Augmented Generation (Génération Augmentée)** : Un modèle d'IA utilise ces informations pour générer une réponse précise et contextualisée

### Avantages du RAG

- **Réponses basées sur vos données** : L'IA utilise uniquement vos documents, pas de données génériques
- **Citations sources** : Chaque réponse indique d'où viennent les informations
- **Mise à jour facile** : Ajoutez de nouveaux documents et réindexez
- **Confidentialité** : Tout fonctionne en local, vos données restent chez vous

## Installation

### Prérequis

Avant de commencer, assurez-vous d'avoir :
- Node.js 18 ou supérieur
- Docker (pour ChromaDB)
- Ollama installé et configuré

### Étapes d'installation

1. Clonez le repository
2. Installez les dépendances avec `npm install`
3. Démarrez ChromaDB avec `npm run rag:start`
4. Installez un modèle Ollama avec `ollama pull llama3.1:latest`
5. Installez le modèle d'embeddings avec `ollama pull nomic-embed-text`

## Utilisation

### Indexer vos documents

Placez vos fichiers Markdown et PDF dans le dossier `data/`, puis exécutez :

```bash
npm run index
```

Le système va :
1. Lire tous vos fichiers
2. Les découper en chunks intelligents
3. Créer des embeddings (représentations vectorielles)
4. Les stocker dans ChromaDB

### Poser des questions

Accédez à l'interface web sur `http://localhost:3000/rag` et posez vos questions !

Le système va automatiquement :
1. Trouver les passages pertinents dans vos documents
2. Les utiliser comme contexte pour générer une réponse
3. Citer les sources utilisées

## Bonnes pratiques

### Pour de meilleurs résultats

1. **Documents bien structurés** : Utilisez des titres et sous-titres clairs
2. **Information complète** : Assurez-vous que vos documents contiennent les réponses
3. **Questions précises** : Plus votre question est claire, meilleure sera la réponse
4. **Réindexation régulière** : Réindexez après avoir ajouté de nouveaux documents

### Optimisation

- Ajustez la taille des chunks selon la complexité de vos documents
- Testez différents modèles pour trouver le meilleur équilibre vitesse/qualité
- Utilisez le paramètre `topK` pour contrôler le nombre de sources consultées

## Dépannage

### Le système ne trouve pas d'informations

- Vérifiez que vos documents sont bien indexés avec `npm run index:stats`
- Assurez-vous que ChromaDB est en cours d'exécution
- Réindexez vos documents si nécessaire

### Les réponses sont imprécises

- Augmentez le nombre de chunks récupérés (topK)
- Vérifiez que vos documents contiennent bien l'information recherchée
- Essayez de reformuler votre question

### Erreurs d'embedding

- Vérifiez qu'Ollama fonctionne : `ollama list`
- Installez le modèle d'embeddings : `ollama pull nomic-embed-text`
- Redémarrez Ollama si nécessaire

## Architecture technique

### Stack technologique

- **Frontend** : Next.js 15, React 19, TypeScript
- **Backend** : Next.js API Routes
- **Vector Store** : ChromaDB
- **LLM** : Ollama (local)
- **Embeddings** : Ollama Embeddings API

### Flux de données

1. **Indexation** : Documents → Chunking → Embeddings → ChromaDB
2. **Query** : Question → Embedding → Similarité → Top-K chunks
3. **Génération** : Chunks + Question → Prompt → LLM → Réponse

### Sécurité

Toutes les données restent en local :
- Les documents ne quittent jamais votre machine
- Les embeddings sont stockés localement dans ChromaDB
- Les modèles Ollama tournent en local

## Conclusion

RAGCoon vous permet de créer votre propre assistant IA personnalisé, alimenté par vos documents et fonctionnant entièrement en local. Profitez de la puissance de l'IA tout en gardant le contrôle total de vos données !

Pour plus d'informations, consultez le fichier RAG_SETUP.md.
