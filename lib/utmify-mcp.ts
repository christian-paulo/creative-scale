/**
 * Minimal MCP client for UTMify's MCP server.
 * Protocol: Streamable HTTP (JSON-RPC 2.0 over POST).
 * Spec: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http
 */

export type McpTool = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export type McpCallResult = {
  content: Array<{ type: string; text?: string }>
  isError?: boolean
}

let _id = 1
function nextId() { return _id++ }

async function mcpPost(url: string, body: object, timeoutMs = 15000): Promise<unknown> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw Object.assign(new Error(`MCP HTTP ${res.status}`), { status: res.status })
    }

    const ct = res.headers.get('content-type') ?? ''

    // SSE streaming response — collect all data: lines and parse the last result
    if (ct.includes('text/event-stream')) {
      const text = await res.text()
      const lines = text.split('\n').filter(l => l.startsWith('data:'))
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const json = JSON.parse(lines[i].slice(5).trim())
          if (json?.result !== undefined || json?.error !== undefined) return json
        } catch { /* skip */ }
      }
      throw new Error('Empty SSE stream')
    }

    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

/** Send MCP initialize handshake. Returns server info. */
export async function mcpInitialize(mcpUrl: string) {
  const resp = await mcpPost(mcpUrl, {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'claudio', version: '1.0.0' },
    },
  }) as { result?: { serverInfo?: unknown }; error?: { message: string } }

  if (resp?.error) throw new Error(resp.error.message ?? 'MCP initialize failed')
  return resp?.result
}

/** Send initialized notification (required after initialize). */
export async function mcpNotifyInitialized(mcpUrl: string) {
  // Fire-and-forget — some servers don't respond to notifications
  fetch(mcpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  }).catch(() => {})
}

/** List available tools on the MCP server. */
export async function mcpListTools(mcpUrl: string): Promise<McpTool[]> {
  const resp = await mcpPost(mcpUrl, {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'tools/list',
  }) as { result?: { tools?: McpTool[] }; error?: { message: string } }

  if (resp?.error) throw new Error(resp.error.message ?? 'tools/list failed')
  return resp?.result?.tools ?? []
}

/** Call a tool and return its result content. */
export async function mcpCallTool(
  mcpUrl: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<McpCallResult> {
  const resp = await mcpPost(mcpUrl, {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'tools/call',
    params: { name: toolName, arguments: args },
  }) as { result?: McpCallResult; error?: { message: string } }

  if (resp?.error) throw new Error(resp.error.message ?? `tool ${toolName} failed`)
  return resp?.result ?? { content: [] }
}

/** Parse text content from a tool result as JSON, or return raw string. */
export function parseToolText(result: McpCallResult): unknown {
  const text = result.content.find(c => c.type === 'text')?.text ?? ''
  try { return JSON.parse(text) } catch { return text }
}

/**
 * Full connect-and-call sequence:
 * initialize → notifications/initialized → tools/call
 */
export async function mcpFetch(
  mcpUrl: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  await mcpInitialize(mcpUrl)
  await mcpNotifyInitialized(mcpUrl)
  const result = await mcpCallTool(mcpUrl, toolName, args)
  return parseToolText(result)
}
