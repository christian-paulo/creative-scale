import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { api_key } = await request.json()

    if (!api_key) {
      return NextResponse.json({ success: false, error: 'API key obrigatória' }, { status: 400 })
    }

    const res = await fetch(
      'https://api.utmify.com.br/api-credentials/dashboard/overview',
      {
        headers: { 'x-api-token': api_key },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'API key inválida' })
    }

    const data = await res.json()

    // Try to count campaigns
    const campaignsRes = await fetch(
      'https://api.utmify.com.br/api-credentials/ads/campaigns',
      { headers: { 'x-api-token': api_key } }
    )
    let campaigns_count = 0
    if (campaignsRes.ok) {
      const campaignsData = await campaignsRes.json()
      campaigns_count = Array.isArray(campaignsData)
        ? campaignsData.length
        : campaignsData?.data?.length ?? 0
    }

    return NextResponse.json({ success: true, campaigns_count, overview: data })
  } catch (error) {
    console.error('UTMify test error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao conectar com UTMify' })
  }
}
