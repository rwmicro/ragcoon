import {
  getAllModels,
  refreshModelsCache,
} from "@/lib/models"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    // Only return Ollama models - all are accessible
    const allModels = await getAllModels()
    const models = allModels.map((model) => ({
      ...model,
      accessible: true,
    }))
    
    return new Response(JSON.stringify({ models }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    logger.error({ err: error }, "error fetching models")
    return new Response(JSON.stringify({ error: "Failed to fetch models" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

export async function POST() {
  try {
    refreshModelsCache()
    const models = await getAllModels()

    return NextResponse.json({
      message: "Models cache refreshed",
      models,
      timestamp: new Date().toISOString(),
      count: models.length,
    })
  } catch (error) {
    logger.error({ err: error }, "failed to refresh models")
    return NextResponse.json(
      { error: "Failed to refresh models" },
      { status: 500 }
    )
  }
}
