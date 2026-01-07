import { NextResponse } from 'next/server'
import { refreshModelsCache, getAllModels } from '@/lib/models'

export async function POST() {
  try {
    console.log('Force refreshing models cache...')

    // Clear the cache
    refreshModelsCache()

    // Force reload all models
    const models = await getAllModels()

    console.log(`Refreshed ${models.length} models`)
    console.log('Models:', models.map(m => `${m.id} (${m.providerId})`).join(', '))

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
    console.error('Error refreshing models:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}