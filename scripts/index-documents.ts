#!/usr/bin/env ts-node

/**
 * Script d'indexation des documents
 *
 * Usage:
 *   npm run index                    - Index tous les fichiers du dossier ./data
 *   npm run index ./my-folder        - Index un dossier spécifique
 *   npm run index ./doc.pdf          - Index un fichier spécifique
 *   npm run index --stats            - Affiche les statistiques
 *   npm run index --help             - Affiche l'aide
 */

import path from 'path'
import { indexFile, indexDirectory, getIndexStats } from '../lib/rag/indexer'
import { deleteCollection } from '../lib/rag/vectorstore'

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data')

async function main() {
  const args = process.argv.slice(2)

  // Aide
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📚 RAGCoon Document Indexer

Usage:
  npm run index                     Index tous les fichiers du dossier ./data
  npm run index <path>              Index un dossier ou fichier spécifique
  npm run index --stats             Affiche les statistiques d'indexation
  npm run index --reset             Supprime tous les documents indexés
  npm run index --help              Affiche cette aide

Options de chunking:
  --chunk-size <number>    Taille des chunks en mots (défaut: 500)
  --overlap <number>       Chevauchement en mots (défaut: 100)

Options d'embedding:
  --model <name>           Modèle Ollama pour embeddings (défaut: nomic-embed-text)

Exemples:
  npm run index
  npm run index ./docs
  npm run index ./guide.pdf
  npm run index --chunk-size 300 --overlap 50
  npm run index --model mxbai-embed-large
    `)
    return
  }

  // Stats
  if (args.includes('--stats')) {
    console.log('📊 Statistiques d\'indexation\n')
    const stats = await getIndexStats()

    console.log(`Total de chunks: ${stats.totalChunks}`)
    console.log(`Fichiers indexés: ${stats.files.length}\n`)

    if (stats.files.length > 0) {
      console.log('Détails par fichier:')
      stats.files.forEach((file) => {
        console.log(`  - ${file.filename}: ${file.chunkCount} chunks`)
      })
    }

    return
  }

  // Reset
  if (args.includes('--reset')) {
    console.log('🗑️  Suppression de tous les documents indexés...')
    const confirm = process.env.FORCE_RESET || false

    if (!confirm) {
      console.log(
        '\n⚠️  Attention: cette action est irréversible!'
      )
      console.log('Pour confirmer, exécutez: FORCE_RESET=1 npm run index --reset')
      return
    }

    await deleteCollection()
    console.log('✓ Collection supprimée avec succès')
    return
  }

  // Parser les options
  const getOption = (name: string): string | undefined => {
    const index = args.indexOf(name)
    if (index !== -1 && args[index + 1]) {
      return args[index + 1]
    }
    return undefined
  }

  const chunkSize = parseInt(getOption('--chunk-size') || '500')
  const overlap = parseInt(getOption('--overlap') || '100')
  const embeddingModel = getOption('--model') || 'nomic-embed-text'

  const chunkingOptions = {
    chunkSize,
    overlap,
    minChunkSize: 50,
  }

  const embeddingOptions = {
    model: embeddingModel,
  }

  // Déterminer le chemin à indexer
  const targetPath =
    args.find((arg) => !arg.startsWith('--')) || DEFAULT_DATA_DIR

  console.log('🚀 RAGCoon Document Indexer')
  console.log(`📁 Cible: ${targetPath}`)
  console.log(`⚙️  Options:`)
  console.log(`   - Chunk size: ${chunkSize} mots`)
  console.log(`   - Overlap: ${overlap} mots`)
  console.log(`   - Embedding model: ${embeddingModel}\n`)

  const startTime = Date.now()

  try {
    const fs = await import('fs')
    const stat = fs.statSync(targetPath)

    if (stat.isDirectory()) {
      console.log('📂 Indexation du dossier...\n')
      const totalChunks = await indexDirectory(targetPath, {
        chunkingOptions,
        embeddingOptions,
        recursive: true,
      })

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`\n✅ Indexation terminée!`)
      console.log(`   - ${totalChunks} chunks créés`)
      console.log(`   - Durée: ${duration}s`)
    } else if (stat.isFile()) {
      console.log('📄 Indexation du fichier...\n')
      const chunks = await indexFile(
        targetPath,
        chunkingOptions,
        embeddingOptions
      )

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`\n✅ Indexation terminée!`)
      console.log(`   - ${chunks.length} chunks créés`)
      console.log(`   - Durée: ${duration}s`)
    }

    // Afficher les stats finales
    console.log('\n📊 Statistiques globales:')
    const stats = await getIndexStats()
    console.log(`   - Total chunks: ${stats.totalChunks}`)
    console.log(`   - Fichiers: ${stats.files.length}`)
  } catch (error) {
    console.error('\n❌ Erreur:', error)
    process.exit(1)
  }
}

main()
