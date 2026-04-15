import { NextResponse } from 'next/server'
import { mcpInitialize, mcpListTools } from '@/lib/utmify-mcp'

export const maxDuration = 20

/**
 * Validates a UTMify MCP URL by running the MCP initialize handshake
 * and listing available tools.
 *
 * Accepts:
 *   - Full MCP URL: "https://mcp.utmify.com.br/mcp/?token=TOKEN"
 *   - Plain token:  "TOKEN"  (we build the URL automatically)
 */
function normalizeMcpUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith('http')) return trimmed
  // Plain token → build standard UTMify MCP URL
  return `https://mcp.utmify.com.br/mcp/?token=${encodeURIComponent(trimmed)}`
}

export async function POST(request: Request) {
  try {
    const { api_key } = await request.json()

    if (!api_key || typeof api_key !== 'string' || api_key.trim().length < 8) {
      return NextResponse.json({ success: false, error: 'Cole a URL MCP ou o token fornecido pela UTMify.' }, { status: 400 })
    }

    const mcpUrl = normalizeMcpUrl(api_key)

    // Step 1: MCP initialize handshake
    let serverInfo: unknown
    try {
      serverInfo = await mcpInitialize(mcpUrl)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const status = (err as { status?: number }).status

      if (status === 401 || status === 403 || msg.includes('401') || msg.includes('403')) {
        return NextResponse.json({
          success: false,
          error: 'Token inválido. Cole a URL MCP completa que a UTMify fornece (começa com https://mcp.utmify.com.br/).',
        })
      }
      return NextResponse.json({
        success: false,
        error: `Não foi possível conectar ao servidor MCP da UTMify: ${msg}`,
      })
    }

    // Step 2: List available tools to confirm connection and discover capabilities
    let tools: { name: string }[] = []
    try {
      tools = await mcpListTools(mcpUrl)
    } catch {
      // tools/list failing is non-fatal — connection is already confirmed by initialize
    }

    return NextResponse.json({
      success: true,
      mcp_url: mcpUrl,
      tools_count: tools.length,
      tools: tools.map(t => t.name),
      server: serverInfo,
    })

  } catch (error: unknown) {
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'))
    return NextResponse.json({
      success: false,
      error: isTimeout ? 'Tempo limite excedido. Verifique sua conexão.' : 'Erro inesperado.',
    })
  }
}
