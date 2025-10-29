import fs from 'fs'
import path from 'path'
import { DocumentChunk, ChunkingOptions, EmbeddingOptions } from './types'
import {
  chunkText,
  extractMarkdownTitle,
  cleanMarkdownContent,
} from './chunking'
import { createEmbedding } from './embeddings'
import { addChunks, deleteChunksByFilename } from './vectorstore'

/**
 * Lit et parse un fichier PDF
 * Uses dynamic import to avoid webpack issues with pdf-parse
 */
async function parsePDF(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid webpack bundling issues
    const pdfParse = (await import('pdf-parse')).default
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    return data.text
  } catch (error) {
    console.error(`Error parsing PDF ${filePath}:`, error)
    throw error
  }
}

/**
 * Lit un fichier Markdown
 */
function parseMarkdown(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    console.error(`Error reading Markdown ${filePath}:`, error)
    throw error
  }
}

/**
 * Index un seul fichier
 */
export async function indexFile(
  filePath: string,
  chunkingOptions?: ChunkingOptions,
  embeddingOptions?: EmbeddingOptions
): Promise<DocumentChunk[]> {
  const filename = path.basename(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const fileType = ext === '.pdf' ? 'pdf' : 'md'

  console.log(`Indexing ${filename}...`)

  // Lire le contenu du fichier
  let content: string
  if (fileType === 'pdf') {
    content = await parsePDF(filePath)
  } else {
    content = parseMarkdown(filePath)
  }

  // Extraire le titre si Markdown
  let title: string | undefined
  if (fileType === 'md') {
    title = extractMarkdownTitle(content)
    content = cleanMarkdownContent(content)
  }

  // Créer les chunks
  const chunks = chunkText(
    content,
    {
      source: filePath,
      filename,
      fileType,
      title,
    },
    chunkingOptions
  )

  console.log(`  Created ${chunks.length} chunks`)

  // Créer les embeddings pour chaque chunk
  console.log(`  Creating embeddings...`)
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    try {
      chunk.embedding = await createEmbedding(chunk.content, embeddingOptions)

      // Afficher la progression
      if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
        console.log(`    Progress: ${i + 1}/${chunks.length}`)
      }
    } catch (error) {
      console.error(`  Error creating embedding for chunk ${i}:`, error)
      throw error
    }
  }

  // Supprimer les anciens chunks de ce fichier s'ils existent
  try {
    await deleteChunksByFilename(filename)
  } catch (error) {
    // Ignorer si la collection n'existe pas encore
  }

  // Ajouter les nouveaux chunks à ChromaDB
  await addChunks(chunks)

  console.log(`  ✓ Successfully indexed ${filename}`)

  return chunks
}

/**
 * Index tous les fichiers d'un dossier
 */
export async function indexDirectory(
  dirPath: string,
  options?: {
    chunkingOptions?: ChunkingOptions
    embeddingOptions?: EmbeddingOptions
    recursive?: boolean
  }
): Promise<number> {
  const { chunkingOptions, embeddingOptions, recursive = false } = options || {}

  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`)
  }

  const files = fs.readdirSync(dirPath)
  let totalChunks = 0

  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory() && recursive) {
      // Indexer récursivement les sous-dossiers
      totalChunks += await indexDirectory(filePath, options)
    } else if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase()

      // Ne traiter que les fichiers .md et .pdf
      if (ext === '.md' || ext === '.pdf') {
        try {
          const chunks = await indexFile(
            filePath,
            chunkingOptions,
            embeddingOptions
          )
          totalChunks += chunks.length
        } catch (error) {
          console.error(`Failed to index ${file}:`, error)
          // Continuer avec les autres fichiers
        }
      }
    }
  }

  return totalChunks
}

/**
 * Obtient les statistiques d'indexation
 */
export async function getIndexStats(): Promise<{
  totalChunks: number
  files: Array<{ filename: string; chunkCount: number }>
}> {
  const { getOrCreateCollection } = await import('./vectorstore')
  const collection = await getOrCreateCollection()

  try {
    const results = await collection.get()

    const fileMap = new Map<string, number>()

    if (results.metadatas) {
      for (const metadata of results.metadatas) {
        if (metadata && typeof metadata === 'object' && 'filename' in metadata) {
          const filename = metadata.filename as string
          fileMap.set(filename, (fileMap.get(filename) || 0) + 1)
        }
      }
    }

    const files = Array.from(fileMap.entries()).map(([filename, chunkCount]) => ({
      filename,
      chunkCount,
    }))

    return {
      totalChunks: results.ids?.length || 0,
      files,
    }
  } catch (error) {
    console.error('Error getting index stats:', error)
    return {
      totalChunks: 0,
      files: [],
    }
  }
}
