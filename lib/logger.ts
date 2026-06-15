import pino from "pino"

/**
 * Shared server-side logger.
 *
 * Use this instead of `console.*` in server code (API routes, server-only
 * `lib/` modules). It emits structured JSON in production and pretty,
 * colorised output in development.
 *
 * Idiomatic usage:
 *   logger.info({ chatId }, "chat created")
 *   logger.error({ err }, "failed to create chat")
 *
 * Not intended for the browser — keep it out of client components.
 */
const isDev = process.env.NODE_ENV !== "production"

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
})

export type Logger = typeof logger
