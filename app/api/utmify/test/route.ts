import { NextResponse } from 'next/server'

export const maxDuration = 15

/**
 * Accepts either:
 *   - A plain token:  "BdNc4uBkEUUyVma1QSaDD2a3hmx4Ew6"
 *   - An MCP URL:    "https://mcp.utmify.com.br/mcp/?token=BdNc4uBkEUUyVma1QSaDD2a3hmx4Ew6"
 */
function extractToken(input: string): string {
  if (input.startsWith('http')) {
    try {
      const url = new URL(input)
      return url.searchParams.get('token') ?? ''
    } catch {
      return ''
    }
  }
  return input
}

export async function POST(request: Request) {
  try {
    const { api_key } = await request.json()

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json({ success: false, error: 'API key obrigatória' }, { status: 400 })
    }

    // Accept both plain token and full MCP URL formats:
    // https://mcp.utmify.com.br/mcp/?token=TOKEN
    const key = extractToken(api_key.trim())

    if (!key || key.length < 8) {
      return NextResponse.json({ success: false, error: 'Token inválido. Cole a URL MCP ou o token diretamente.' }, { status: 400 })
    }

    // Single request with hard timeout — avoids freeze
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let res: Response
    try {
      res = await fetch(
        'https://api.utmify.com.br/api-credentials/dashboard/overview',
        {
          headers: {
            'x-api-token': key,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: res.status === 401 || res.status === 403
          ? 'API key inválida ou sem permissão'
          : `UTMify retornou erro ${res.status}`,
      })
    }

    const data = await res.json()

    // Extract campaigns count from overview if available — no second request
    const campaigns_count =
      data?.campaigns_count ??
      data?.total_campaigns ??
      data?.data?.length ??
      data?.campaigns?.length ??
      0

    // Return the clean token so the frontend saves just the token, not the full URL
    return NextResponse.json({ success: true, campaigns_count, overview: data, token: key })
  } catch (error: unknown) {
    console.error('UTMify test error:', error)

    const isTimeout =
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('abort'))

    return NextResponse.json({
      success: false,
      error: isTimeout
        ? 'Tempo limite excedido. Verifique sua conexão e tente novamente.'
        : 'Erro ao conectar com UTMify. Verifique a API key.',
    })
  }
}
