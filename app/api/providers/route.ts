import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json()

    // Only Ollama is supported - no API keys needed
    if (provider === "ollama") {
      return NextResponse.json({
        hasUserKey: false,
        provider,
      })
    }

    // All other providers are not supported
    return NextResponse.json(
      { error: `Provider ${provider} is not supported. Only Ollama models are available.` },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error checking provider:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
