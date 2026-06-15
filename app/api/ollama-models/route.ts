import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// Get Ollama base URL from environment or use default
const getOllamaBaseURL = () => {
  return (
    process.env.OLLAMA_BASE_URL?.replace(/\/+$/, "") || "http://localhost:11434"
  )
}

export async function GET(request: NextRequest) {
  try {
    const baseURL = getOllamaBaseURL()
    const response = await fetch(`${baseURL}/api/tags`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      logger.warn({ baseURL }, "Ollama not available or no models found")
      return Response.json({ models: [] }, { status: 200 })
    }

    const data = await response.json()
    const models = data.models?.map((model: any) => ({
      name: model.name,
      size: model.size,
      modified_at: model.modified_at,
      family: model.details?.family || 'unknown'
    })) || []

    return Response.json({ models }, { status: 200 })
  } catch (error) {
    logger.warn({ err: error }, "failed to fetch Ollama models")
    return Response.json({ models: [] }, { status: 200 })
  }
}