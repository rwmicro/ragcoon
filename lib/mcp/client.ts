import { experimental_createMCPClient } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
import { readMCPConfig, type MCPServerConfig } from "./config"

let cachedTools: Record<string, unknown> | null = null
let cacheExpiresAt = 0
const CACHE_TTL_MS = 60_000

export function invalidateMCPToolsCache() {
  cachedTools = null
  cacheExpiresAt = 0
}

async function createTransport(serverConfig: MCPServerConfig) {
  const transportType = serverConfig.transport ?? "stdio"

  if (transportType === "stdio") {
    if (!serverConfig.command) throw new Error("stdio transport requires a command")
    return new Experimental_StdioMCPTransport({
      command: serverConfig.command,
      args: serverConfig.args ?? [],
      env: serverConfig.env,
    })
  }

  if (!serverConfig.url) throw new Error(`${transportType} transport requires a url`)
  const url = new URL(serverConfig.url)
  const requestInit: RequestInit | undefined = serverConfig.headers
    ? { headers: serverConfig.headers }
    : undefined

  if (transportType === "http") {
    const { StreamableHTTPClientTransport } = await import(
      "@modelcontextprotocol/sdk/client/streamableHttp.js"
    )
    return new StreamableHTTPClientTransport(url, requestInit ? { requestInit } : undefined)
  }

  if (transportType === "sse") {
    const { SSEClientTransport } = await import(
      "@modelcontextprotocol/sdk/client/sse.js"
    )
    return new SSEClientTransport(url, requestInit ? { requestInit } : undefined)
  }

  throw new Error(`Unsupported MCP transport: ${transportType}`)
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
        const transport = await createTransport(serverConfig)
        const client = await experimental_createMCPClient({ transport })
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
