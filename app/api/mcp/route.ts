import { readMCPConfig, writeMCPConfig, type MCPServerConfig } from "@/lib/mcp/config"
import { invalidateMCPToolsCache } from "@/lib/mcp/client"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const config = readMCPConfig()
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name: string; server: MCPServerConfig }
  const { name, server } = body

  const transportType = server?.transport ?? "stdio"
  const isStdio = transportType === "stdio"
  const isRemote = transportType === "http" || transportType === "sse"

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  if (isStdio && !server?.command) {
    return NextResponse.json({ error: "stdio transport requires server.command" }, { status: 400 })
  }
  if (isRemote && !server?.url) {
    return NextResponse.json({ error: `${transportType} transport requires server.url` }, { status: 400 })
  }

  const config = readMCPConfig()
  config.servers[name] = server
  writeMCPConfig(config)
  invalidateMCPToolsCache()

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { name } = await req.json() as { name: string }

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const config = readMCPConfig()
  delete config.servers[name]
  writeMCPConfig(config)
  invalidateMCPToolsCache()

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { name, enabled } = await req.json() as { name: string; enabled: boolean }

  if (!name || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "name and enabled are required" }, { status: 400 })
  }

  const config = readMCPConfig()
  if (!config.servers[name]) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 })
  }

  config.servers[name].enabled = enabled
  writeMCPConfig(config)
  invalidateMCPToolsCache()

  return NextResponse.json({ ok: true })
}
