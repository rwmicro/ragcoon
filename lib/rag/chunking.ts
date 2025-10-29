import { DocumentChunk, DocumentMetadata, ChunkingOptions } from './types'

/**
 * Divise un texte en chunks avec chevauchement
 */
export function chunkText(
  text: string,
  metadata: Omit<DocumentMetadata, 'chunkIndex' | 'totalChunks' | 'createdAt'>,
  options: ChunkingOptions = { chunkSize: 500, overlap: 100, minChunkSize: 50 }
): DocumentChunk[] {
  const { chunkSize, overlap, minChunkSize = 50 } = options

  // Nettoyer le texte
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleanedText) {
    return []
  }

  // Diviser en mots
  const words = cleanedText.split(/\s+/)

  if (words.length <= chunkSize) {
    // Si le texte est plus petit qu'un chunk, retourner tel quel
    return [
      {
        id: `${metadata.filename}-0`,
        content: cleanedText,
        metadata: {
          ...metadata,
          chunkIndex: 0,
          totalChunks: 1,
          createdAt: new Date().toISOString(),
        },
      },
    ]
  }

  const chunks: DocumentChunk[] = []
  let chunkIndex = 0

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize)
    const chunkContent = chunkWords.join(' ').trim()

    // Ignorer les chunks trop petits sauf si c'est le dernier
    if (chunkContent.split(/\s+/).length < minChunkSize && i + chunkSize < words.length) {
      continue
    }

    chunks.push({
      id: `${metadata.filename}-${chunkIndex}`,
      content: chunkContent,
      metadata: {
        ...metadata,
        chunkIndex,
        totalChunks: 0, // sera mis à jour après
        createdAt: new Date().toISOString(),
      },
    })

    chunkIndex++
  }

  // Mettre à jour le nombre total de chunks
  const totalChunks = chunks.length
  chunks.forEach((chunk) => {
    chunk.metadata.totalChunks = totalChunks
  })

  return chunks
}

/**
 * Extrait le titre d'un document Markdown
 */
export function extractMarkdownTitle(content: string): string | undefined {
  // Chercher le premier header H1
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match) {
    return h1Match[1].trim()
  }

  // Chercher le premier header H2 si pas de H1
  const h2Match = content.match(/^##\s+(.+)$/m)
  if (h2Match) {
    return h2Match[1].trim()
  }

  return undefined
}

/**
 * Nettoie le contenu Markdown pour l'indexation
 */
export function cleanMarkdownContent(content: string): string {
  return content
    // Supprimer les images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Supprimer les liens mais garder le texte
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Supprimer les code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Supprimer les inline code
    .replace(/`([^`]+)`/g, '$1')
    // Nettoyer les headers
    .replace(/^#{1,6}\s+/gm, '')
    // Normaliser les espaces
    .replace(/\s+/g, ' ')
    .trim()
}
