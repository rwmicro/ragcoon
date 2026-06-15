import { NextResponse } from 'next/server'
import { refreshModelsCache, getAllModels } from '@/lib/models'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    logger.debug('force refreshing models cache')

    // Clear the cache
    refreshModelsCache()

    // Force reload all models
    const models = await getAllModels()

    logger.debug({ count: models.length }, 'refreshed models')

    return NextResponse.json({
      success: true,
      message: `Successfully refreshed ${models.length} models`,
      modelCount: models.length,
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        providerId: m.providerId
      }))
    })

  } catch (error) {
    logger.error({ err: error }, 'error refreshing models')

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}