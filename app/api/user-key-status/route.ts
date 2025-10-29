import { NextResponse } from "next/server"

// Stub route for user key status - returns that no external API keys are configured
// This is appropriate for local-only deployments using Ollama
export async function GET() {
  try {
    // Return that no external providers have API keys configured
    // This matches the local-only nature of the current setup
    const providerStatus = {
      openrouter: false,
      openai: false,
      mistral: false,
      google: false,
      perplexity: false,
      xai: false,
      anthropic: false,
    }

    return NextResponse.json(providerStatus)
  } catch (err) {
    console.error("Key status error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}