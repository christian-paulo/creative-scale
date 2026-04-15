import { NextResponse } from 'next/server'

export const maxDuration = 15

function extractToken(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith('http')) {
    try {
      const url = new URL(trimmed)
      // Try ?token= param first
      const tokenParam = url.searchParams.get('token')
      if (tokenParam) return tokenParam.trim()
      // Try /token/ path segment
      const parts = url.pathname.split('/').filter(Boolean)
      const tokenIdx = parts.findIndex(p => p === 'token')
      if (tokenIdx !== -1 && parts[tokenIdx + 1]) return parts[tokenIdx + 1].trim()
    } catch {
      // fall through
    }
  }
  return trimmed
}

const today = () => new Date().toISOString().split('T')[0]
const weekAgo = () => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

// Endpoints to try in order — some plans may not have access to all
const ENDPOINTS = [
  `https://api.utmify.com.br/api-credentials/orders?start_date=${weekAgo()}&end_date=${today()}`,
  `https://api.utmify.com.br/api-credentials/ads/campaigns?start_date=${weekAgo()}&end_date=${today()}`,
  `https://api.utmify.com.br/api-credentials/dashboard/overview?start_date=${weekAgo()}&end_date=${today()}`,
  `https://api.utmify.com.br/api-credentials/dashboard/overview`,
]

export async function POST(request: Request) {
  try {
    const { api_key } = await request.json()

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json({ success: false, error: 'API key obrigatória' }, { status: 400 })
    }

    const key = extractToken(api_key)

    if (!key || key.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Token inválido. Cole a URL MCP completa ou o token direto.',
      }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    let lastStatus = 0
    let lastBody = ''

    try {
      for (const url of ENDPOINTS) {
        let res: Response
        try {
          res = await fetch(url, {
            headers: {
              'x-api-token': key,
              'Accept': 'application/json',
            },
            signal: controller.signal,
          })
        } catch {
          continue
        }

        lastStatus = res.status

        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          const items = Array.isArray(data) ? data : (data?.data ?? data?.orders ?? [])
          const count = Array.isArray(items) ? items.length : 0
          return NextResponse.json({ success: true, campaigns_count: count, token: key })
        }

        // Read body for debugging — don't expose to user but use for better messages
        try { lastBody = await res.text() } catch { lastBody = '' }

        // 401/403 means auth failure — token is wrong, no point trying other endpoints
        if (res.status === 401 || res.status === 403) break
        // 404 means endpoint not found — try next
        if (res.status === 404) continue
      }
    } finally {
      clearTimeout(timeoutId)
    }

    // Build helpful error based on what we got
    if (lastStatus === 401 || lastStatus === 403) {
      return NextResponse.json({
        success: false,
        error:
          'Token rejeitado pela UTMify. Certifique-se de copiar o token de API REST ' +
          '(UTMify → Configurações → API → Chave de API), não a URL MCP do Claude/ChatGPT.',
      })
    }

    if (lastStatus === 404) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum endpoint UTMify respondeu. Tente copiar apenas o token, sem a URL completa.',
      })
    }

    return NextResponse.json({
      success: false,
      error: `UTMify retornou status ${lastStatus}. Tente novamente ou contate o suporte.`,
    })

  } catch (error: unknown) {
    const isTimeout =
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('abort'))

    return NextResponse.json({
      success: false,
      error: isTimeout
        ? 'Tempo limite excedido. Verifique sua conexão.'
        : 'Erro inesperado ao conectar com UTMify.',
    })
  }
}
