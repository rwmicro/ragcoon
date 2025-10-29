import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { indexFile } from '@/lib/rag/indexer'

/**
 * POST /api/rag/upload
 * Upload et index des fichiers pour le RAG
 */
export async function POST(request: NextRequest) {
  console.log('[RAG Upload] Starting upload request...')

  try {
    const formData = await request.formData()

    const files = formData.getAll('files') as File[]
    const llmModel = formData.get('llmModel') as string
    const embeddingModel = formData.get('embeddingModel') as string
    const customPrompt = formData.get('customPrompt') as string

    console.log('[RAG Upload] Received:', {
      fileCount: files.length,
      llmModel,
      embeddingModel,
      hasCustomPrompt: !!customPrompt,
    })

    if (!files || files.length === 0) {
      console.error('[RAG Upload] No files uploaded')
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      )
    }

    if (!embeddingModel) {
      console.error('[RAG Upload] Missing embedding model')
      return NextResponse.json(
        { error: 'Missing embedding model' },
        { status: 400 }
      )
    }

    // Créer le dossier d'upload s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'data', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    let totalChunks = 0
    const processedFiles: string[] = []

    // Traiter chaque fichier
    for (const file of files) {
      // Vérifier le type de fichier
      const filename = file.name
      const ext = path.extname(filename).toLowerCase()

      if (!['.md', '.pdf', '.txt'].includes(ext)) {
        console.warn(`Skipping unsupported file: ${filename}`)
        continue
      }

      try {
        // Sauvegarder le fichier
        console.log(`[RAG Upload] Processing ${filename}...`)
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const filePath = path.join(uploadDir, filename)
        await writeFile(filePath, buffer)

        console.log(`[RAG Upload] Saved file: ${filename}`)

        // Indexer le fichier
        console.log(`[RAG Upload] Starting indexation for ${filename}...`)
        const chunks = await indexFile(
          filePath,
          {
            chunkSize: 500,
            overlap: 100,
            minChunkSize: 50,
          },
          {
            model: embeddingModel,
          }
        )

        totalChunks += chunks.length
        processedFiles.push(filename)

        console.log(`[RAG Upload] ✓ Indexed ${filename}: ${chunks.length} chunks`)
      } catch (error) {
        console.error(`[RAG Upload] ✗ Error processing file ${filename}:`, error)
        // Stocker l'erreur pour la retourner
        if (error instanceof Error) {
          console.error(`[RAG Upload] Error details: ${error.message}`)
          console.error(`[RAG Upload] Stack: ${error.stack}`)
        }
        // Continuer avec les autres fichiers
      }
    }

    if (processedFiles.length === 0) {
      console.error('[RAG Upload] No files were processed successfully')
      return NextResponse.json(
        { error: 'No files were processed successfully. Check server logs for details.' },
        { status: 500 }
      )
    }

    console.log('[RAG Upload] ✓ Success! Processed:', {
      filesProcessed: processedFiles.length,
      totalChunks,
      files: processedFiles,
    })

    // Sauvegarder les métadonnées du RAG (model, prompt, etc.)
    // TODO: Implémenter la sauvegarde des configurations RAG si besoin

    return NextResponse.json({
      success: true,
      filesProcessed: processedFiles.length,
      totalChunks,
      files: processedFiles,
      config: {
        llmModel,
        embeddingModel,
        customPrompt: customPrompt || null,
      },
    })
  } catch (error) {
    console.error('[RAG Upload] Critical error:', error)

    if (error instanceof Error) {
      console.error('[RAG Upload] Error message:', error.message)
      console.error('[RAG Upload] Error stack:', error.stack)
    }

    return NextResponse.json(
      {
        error: 'Failed to upload and index files',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
