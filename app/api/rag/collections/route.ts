import { NextRequest, NextResponse } from 'next/server'

/**
 * RAG Collections API
 *
 * Note: RAG collections are now managed by the Python backend.
 * This endpoint is kept for backward compatibility but returns empty collections.
 *
 * To use RAG with the new system:
 * 1. Use the Python backend API directly (backend/main.py)
 * 2. Upload documents via /ingest/file endpoint
 * 3. Query via /query or /query/stream endpoints
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[RAG Collections API] GET request - proxying to Python backend')

    // Proxy to Python backend
    const pythonBackendUrl = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://127.0.0.1:8001'
    const response = await fetch(`${pythonBackendUrl}/collections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('[RAG Collections API] Backend error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch collections from backend', details: error.message || error.detail },
        { status: response.status }
      )
    }

    const collections = await response.json()
    console.log(`[RAG Collections API] Successfully fetched ${collections.length} collections`)

    return NextResponse.json({ collections })
  } catch (error) {
    console.error('[RAG Collections API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collections', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, embedding_model, llm_model, reranker_model } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      )
    }

    console.log('[RAG Collections API] POST request to create collection:', name)

    // Proxy to Python backend
    const pythonBackendUrl = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://127.0.0.1:8001'
    const response = await fetch(`${pythonBackendUrl}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        embedding_model,
        llm_model,
        reranker_model,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      return NextResponse.json(
        { error: 'Failed to create collection', details: error.message || error.detail },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log('[RAG Collections API] Successfully created collection:', name)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[RAG Collections API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create collection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      )
    }

    console.log('[RAG Collections API] DELETE request for:', name)

    // Proxy to Python backend
    const pythonBackendUrl = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://127.0.0.1:8001'
    const response = await fetch(`${pythonBackendUrl}/collections/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      return NextResponse.json(
        { error: 'Failed to delete collection', details: error.message || error.detail },
        { status: response.status }
      )
    }

    const result = await response.json()

    // Dispatch event to refresh models list on the client
    console.log('[RAG Collections API] Successfully deleted collection:', name)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[RAG Collections API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete collection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
