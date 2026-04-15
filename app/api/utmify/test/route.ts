import { NextResponse } from 'next/server'

export const maxDuration = 15

export async function POST(request: Request) {
  try {
    const { api_key } = await request.json()

    if (!api_key || typeof api_key !== 'string' || api_key.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'API key inválida' }, { status: 400 })
    }

    const key = api_key.trim()

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

    return NextResponse.json({ success: true, campaigns_count, overview: data })
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
