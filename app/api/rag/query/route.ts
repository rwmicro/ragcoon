import { NextRequest, NextResponse } from 'next/server'
import { generateRAGResponse, streamRAGResponse } from '@/lib/rag/retriever'

/**
 * POST /api/rag/query
 * Interroge le système RAG
 *
 * Body:
 * {
 *   "query": "Ma question",
 *   "model": "llama3.1:latest",
 *   "topK": 5,
 *   "temperature": 0.7,
 *   "stream": false,
 *   "systemPrompt": "..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, model, topK, temperature, stream, systemPrompt } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter' },
        { status: 400 }
      )
    }

    const options = {
      model: model || 'llama3.1:latest',
      topK: topK || 5,
      temperature: temperature !== undefined ? temperature : 0.7,
      systemPrompt,
    }

    // Si streaming est demandé
    if (stream) {
      const encoder = new TextEncoder()

      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            const generator = streamRAGResponse(query, options)

            let fullResponse: any = null

            for await (const chunk of generator) {
              // Envoyer le chunk de texte
              const data = JSON.stringify({ type: 'text', content: chunk })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }

            // Récupérer la réponse complète (retournée par le generator)
            const result = await generator.next()
            fullResponse = result.value

            if (fullResponse && fullResponse.sources) {
              // Envoyer les sources à la fin
              const sourcesData = JSON.stringify({
                type: 'sources',
                sources: fullResponse.sources,
              })
              controller.enqueue(encoder.encode(`data: ${sourcesData}\n\n`))
            }

            // Envoyer le signal de fin
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            console.error('Error in stream:', error)
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : String(error),
            })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
            controller.close()
          }
        },
      })

      return new NextResponse(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Mode non-streaming
    const response = await generateRAGResponse(query, options)

    return NextResponse.json({
      success: true,
      ...response,
    })
  } catch (error) {
    console.error('Error in /api/rag/query:', error)

    return NextResponse.json(
      {
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
