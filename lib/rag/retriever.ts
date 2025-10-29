import { QueryResult, RAGResponse } from './types'
import { createEmbedding } from './embeddings'
import { queryChunks } from './vectorstore'

/**
 * Recherche les documents pertinents pour une question
 */
export async function retrieveRelevantChunks(
  query: string,
  limit: number = 5
): Promise<QueryResult[]> {
  // Créer l'embedding de la question
  const queryEmbedding = await createEmbedding(query)

  // Rechercher les chunks similaires
  const results = await queryChunks(queryEmbedding, limit)

  return results
}

/**
 * Formate les sources pour le prompt
 */
export function formatSourcesForPrompt(results: QueryResult[]): string {
  if (results.length === 0) {
    return 'Aucun document pertinent trouvé.'
  }

  let formatted = 'Documents pertinents :\n\n'

  results.forEach((result, index) => {
    const { chunk } = result
    const { filename, title, chunkIndex, pageNumber } = chunk.metadata

    formatted += `[Document ${index + 1}]\n`
    formatted += `Source: ${filename}`

    if (title) {
      formatted += ` - ${title}`
    }

    if (pageNumber && pageNumber > 0) {
      formatted += ` (page ${pageNumber})`
    }

    formatted += `\nExtrait:\n${chunk.content}\n\n`
  })

  return formatted
}

/**
 * Construit le prompt RAG complet
 */
export function buildRAGPrompt(
  query: string,
  sources: QueryResult[],
  systemPrompt?: string
): string {
  const defaultSystemPrompt = `Tu es un assistant IA expert qui répond aux questions en utilisant uniquement les informations des documents fournis.

Instructions importantes:
- Base tes réponses UNIQUEMENT sur les documents fournis ci-dessous
- Si l'information n'est pas dans les documents, dis-le clairement
- Cite les sources en mentionnant le numéro du document [Document X]
- Sois précis et factuel
- Si plusieurs documents traitent du sujet, synthétise les informations`

  const sourcesText = formatSourcesForPrompt(sources)

  return `${systemPrompt || defaultSystemPrompt}

${sourcesText}

Question: ${query}

Réponds à la question en te basant sur les documents ci-dessus. N'hésite pas à citer les sources [Document X].`
}

/**
 * Génère une réponse RAG complète en appelant Ollama
 */
export async function generateRAGResponse(
  query: string,
  options?: {
    model?: string
    topK?: number
    temperature?: number
    systemPrompt?: string
  }
): Promise<RAGResponse> {
  const {
    model = 'llama3.1:latest',
    topK = 5,
    temperature = 0.7,
    systemPrompt,
  } = options || {}

  // Récupérer les chunks pertinents
  const sources = await retrieveRelevantChunks(query, topK)

  if (sources.length === 0) {
    return {
      answer:
        "Désolé, je n'ai trouvé aucun document pertinent pour répondre à votre question. Veuillez vous assurer que les documents ont été indexés.",
      sources: [],
      query,
    }
  }

  // Construire le prompt
  const prompt = buildRAGPrompt(query, sources, systemPrompt)

  // Appeler Ollama pour générer la réponse
  try {
    const ollamaEndpoint =
      process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

    const response = await fetch(`${ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      answer: data.response || "Désolé, je n'ai pas pu générer de réponse.",
      sources,
      query,
    }
  } catch (error) {
    console.error('Error generating RAG response:', error)
    throw error
  }
}

/**
 * Génère une réponse RAG en streaming
 */
export async function* streamRAGResponse(
  query: string,
  options?: {
    model?: string
    topK?: number
    temperature?: number
    systemPrompt?: string
  }
): AsyncGenerator<string, RAGResponse, unknown> {
  const {
    model = 'llama3.1:latest',
    topK = 5,
    temperature = 0.7,
    systemPrompt,
  } = options || {}

  // Récupérer les chunks pertinents
  const sources = await retrieveRelevantChunks(query, topK)

  if (sources.length === 0) {
    const noResultsResponse: RAGResponse = {
      answer:
        "Désolé, je n'ai trouvé aucun document pertinent pour répondre à votre question.",
      sources: [],
      query,
    }
    yield noResultsResponse.answer
    return noResultsResponse
  }

  // Construire le prompt
  const prompt = buildRAGPrompt(query, sources, systemPrompt)

  // Appeler Ollama en streaming
  const ollamaEndpoint = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

  const response = await fetch(`${ollamaEndpoint}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      options: {
        temperature,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`)
  }

  let fullAnswer = ''

  // Lire le stream
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((line) => line.trim())

      for (const line of lines) {
        try {
          const data = JSON.parse(line)

          if (data.response) {
            fullAnswer += data.response
            yield data.response
          }
        } catch (e) {
          // Ignorer les lignes mal formées
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return {
    answer: fullAnswer,
    sources,
    query,
  }
}
