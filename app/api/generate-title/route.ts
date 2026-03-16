import { getAllModels } from "@/lib/models"
import { generateText, wrapLanguageModel, extractReasoningMiddleware } from "ai"

export async function POST(req: Request) {
  try {
    const { message, model } = await req.json()

    if (!message || typeof message !== "string") {
      return Response.json({ title: "New Chat" })
    }

    const allModels = await getAllModels()
    const modelConfig = allModels.find((m) => m.id === model)

    if (!modelConfig?.apiSdk) {
      // Fallback: derive title from first meaningful words
      const title = message.slice(0, 60).trim().replace(/\n/g, " ")
      return Response.json({ title: title || "New Chat" })
    }

    const sdkModel = wrapLanguageModel({
      model: modelConfig.apiSdk(undefined),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    })

    const { text } = await generateText({
      model: sdkModel,
      prompt: `Generate a concise title (3-5 words max) for a conversation that starts with this message. Reply with ONLY the title, no quotes, no punctuation, no explanation:\n\n${message.slice(0, 500)}`,
      maxTokens: 15,
      temperature: 0.3,
    })

    const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 60)
    return Response.json({ title: title || "New Chat" })
  } catch (error) {
    console.error("[generate-title] Error:", error)
    return Response.json({ title: "New Chat" })
  }
}
