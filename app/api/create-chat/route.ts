import { createChatInDb } from "./api"
import { logger } from "@/lib/logger"

export async function POST(request: Request) {
  try {
    const { userId, title, model, isAuthenticated, projectId } =
      await request.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
      })
    }

    const chat = await createChatInDb({
      userId,
      title,
      model,
      isAuthenticated,
      projectId,
    })

    if (!chat) {
      return new Response(
        JSON.stringify({ error: "Failed to create chat." }),
        { status: 503 }
      )
    }

    return new Response(JSON.stringify({ chat }), { status: 200 })
  } catch (err: unknown) {
    logger.error({ err }, "error in create-chat endpoint")

    if (err instanceof Error && err.message === "DAILY_LIMIT_REACHED") {
      return new Response(
        JSON.stringify({ error: err.message, code: "DAILY_LIMIT_REACHED" }),
        { status: 403 }
      )
    }

    return new Response(
      JSON.stringify({
        error: (err as Error).message || "Internal server error",
      }),
      { status: 500 }
    )
  }
}
