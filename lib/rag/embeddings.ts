import { EmbeddingOptions } from './types'

/**
 * Crée des embeddings via l'API Ollama
 */
export async function createEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[]> {
  const {
    model = 'nomic-embed-text',
    endpoint = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  } = options

  try {
    const response = await fetch(`${endpoint}/api/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama embedding failed: ${response.status} - ${error}`)
    }

    const data = await response.json()

    // L'API Ollama retourne soit { embedding: [...] } soit { embeddings: [[...]] }
    if (data.embedding) {
      return data.embedding
    } else if (data.embeddings && data.embeddings[0]) {
      return data.embeddings[0]
    }

    throw new Error('No embedding returned from Ollama')
  } catch (error) {
    console.error('Error creating embedding:', error)
    throw error
  }
}

/**
 * Crée des embeddings pour plusieurs textes en batch
 */
export async function createEmbeddings(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<number[][]> {
  // Pour l'instant, on fait des appels séquentiels
  // TODO: implémenter un vrai batching si Ollama le supporte
  const embeddings: number[][] = []

  for (const text of texts) {
    const embedding = await createEmbedding(text, options)
    embeddings.push(embedding)
  }

  return embeddings
}

/**
 * Calcule la similarité cosinus entre deux vecteurs
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}
