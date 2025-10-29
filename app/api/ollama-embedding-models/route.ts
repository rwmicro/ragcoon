import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    
    // Fetch all available models from Ollama
    const response = await fetch(`${ollamaUrl}/api/tags`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }
    
    const data = await response.json()
    const allModels = data.models || []
    
    // Filter for common embedding models
    const embeddingModels = allModels.filter((model: any) => {
      const name = model.name.toLowerCase()
      return (
        name.includes('embed') ||
        name.includes('sentence') ||
        name.includes('nomic') ||
        name.includes('bge') ||
        name.includes('all-minilm') ||
        name.includes('mxbai-embed')
      )
    })
    
    // Add common embedding models that might not be installed yet
    const commonEmbeddingModels = [
      { name: 'nomic-embed-text', installed: false, recommended: true },
      { name: 'all-minilm:l6-v2', installed: false, recommended: true },
      { name: 'bge-small:en-v1.5', installed: false, recommended: false },
      { name: 'mxbai-embed-large', installed: false, recommended: false }
    ]
    
    // Mark installed models
    const installedNames = new Set(allModels.map((model: any) => model.name))
    commonEmbeddingModels.forEach(model => {
      if (installedNames.has(model.name)) {
        model.installed = true
      }
    })
    
    // Add installed embedding models that aren't in the common list
    const installedEmbedding = embeddingModels
      .filter((model: any) => !commonEmbeddingModels.some(common => common.name === model.name))
      .map((model: any) => ({
        name: model.name,
        installed: true,
        recommended: false
      }))
    
    const allEmbeddingModels = [...commonEmbeddingModels, ...installedEmbedding]
    
    return NextResponse.json({
      success: true,
      models: allEmbeddingModels,
      total: allEmbeddingModels.length
    })
    
  } catch (error) {
    console.error('Error fetching Ollama embedding models:', error)
    
    // Return fallback list if Ollama is not available
    const fallbackModels = [
      { name: 'nomic-embed-text', installed: false, recommended: true },
      { name: 'all-minilm:l6-v2', installed: false, recommended: true },
      { name: 'bge-small:en-v1.5', installed: false, recommended: false }
    ]
    
    return NextResponse.json({
      success: false,
      error: 'Ollama not available',
      models: fallbackModels,
      total: fallbackModels.length
    })
  }
}