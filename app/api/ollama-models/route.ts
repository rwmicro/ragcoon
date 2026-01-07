import { NextRequest } from 'next/server'

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
      console.warn(`Ollama not available at ${baseURL} or no models found`)
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
    console.warn("Failed to fetch Ollama models:", error)
    return Response.json({ models: [] }, { status: 200 })
  }
}