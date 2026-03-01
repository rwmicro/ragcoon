import { experimental_createMCPClient } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
import { readMCPConfig } from "./config"

let cachedTools: Record<string, unknown> | null = null
let cacheExpiresAt = 0
const CACHE_TTL_MS = 60_000

export function invalidateMCPToolsCache() {
  cachedTools = null
  cacheExpiresAt = 0
}

export async function getMCPTools(): Promise<Record<string, unknown>> {
  if (cachedTools && Date.now() < cacheExpiresAt) {
    return cachedTools
  }

  const config = readMCPConfig()
  const enabledServers = Object.entries(config.servers).filter(
    ([, s]) => s.enabled !== false
  )

  if (enabledServers.length === 0) {
    cachedTools = {}
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
    return cachedTools
  }

  const allTools: Record<string, unknown> = {}
  const clients: Awaited<ReturnType<typeof experimental_createMCPClient>>[] = []

  await Promise.all(
    enabledServers.map(async ([name, serverConfig]) => {
      try {
        const client = await experimental_createMCPClient({
          transport: new Experimental_StdioMCPTransport({
            command: serverConfig.command,
            args: serverConfig.args ?? [],
            env: serverConfig.env,
          }),
        })

        clients.push(client)
        const tools = await client.tools()
        Object.assign(allTools, tools)
      } catch (error) {
        console.warn(`[MCP] Failed to connect to server "${name}":`, error)
      }
    })
  )

  // Close all clients after collecting their tools
  await Promise.all(
    clients.map(client =>
      (client as any).close?.().catch((err: unknown) =>
        console.warn('[MCP] Error closing client:', err)
      )
    )
  )

  cachedTools = allTools
  cacheExpiresAt = Date.now() + CACHE_TTL_MS
  return allTools
}
