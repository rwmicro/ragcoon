import { NextRequest, NextResponse } from 'next/server'
import { indexFile, indexDirectory, getIndexStats } from '@/lib/rag/indexer'
import path from 'path'

/**
 * POST /api/rag/ingest
 * Index un ou plusieurs fichiers
 *
 * Body:
 * {
 *   "action": "index-file" | "index-directory" | "get-stats",
 *   "path": "/path/to/file/or/directory",
 *   "options": { ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, path: targetPath, options } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'index-file': {
        if (!targetPath) {
          return NextResponse.json(
            { error: 'Missing path parameter' },
            { status: 400 }
          )
        }

        const chunks = await indexFile(
          targetPath,
          options?.chunkingOptions,
          options?.embeddingOptions
        )

        return NextResponse.json({
          success: true,
          chunksIndexed: chunks.length,
          filename: path.basename(targetPath),
        })
      }

      case 'index-directory': {
        if (!targetPath) {
          return NextResponse.json(
            { error: 'Missing path parameter' },
            { status: 400 }
          )
        }

        const totalChunks = await indexDirectory(targetPath, options)

        return NextResponse.json({
          success: true,
          chunksIndexed: totalChunks,
          directory: targetPath,
        })
      }

      case 'get-stats': {
        const stats = await getIndexStats()

        return NextResponse.json({
          success: true,
          stats,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in /api/rag/ingest:', error)

    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rag/ingest
 * Obtient les statistiques d'indexation
 */
export async function GET() {
  try {
    const stats = await getIndexStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Error in GET /api/rag/ingest:', error)

    return NextResponse.json(
      {
        error: 'Failed to get stats',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
