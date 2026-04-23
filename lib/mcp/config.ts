import fs from "fs"
import path from "path"

const CONFIG_PATH = path.join(process.cwd(), "mcp-servers.json")

export type MCPTransportType = "stdio" | "http" | "sse"

export type MCPServerConfig = {
  transport?: MCPTransportType  // default: "stdio" for backward compatibility
  // stdio transport fields
  command?: string
  args?: string[]
  env?: Record<string, string>
  // http / sse transport fields
  url?: string
  headers?: Record<string, string>
  enabled?: boolean
}

export type MCPConfig = {
  servers: Record<string, MCPServerConfig>
}

export function readMCPConfig(): MCPConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8")
    return JSON.parse(raw) as MCPConfig
  } catch {
    return { servers: {} }
  }
}

export function writeMCPConfig(config: MCPConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}
