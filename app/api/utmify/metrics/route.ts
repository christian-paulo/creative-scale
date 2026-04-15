import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') || ''
    const end = searchParams.get('end') || ''
    const level = searchParams.get('level') || 'campaigns'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, utmify_api_key, utmify_connected')
      .eq('user_id', user.id)
      .single()

    if (!workspace?.utmify_api_key || !workspace.utmify_connected) {
      // Return mock data for non-UTMify users
      return NextResponse.json(getMockData(level))
    }

    const cacheKey = `${level}-${start}-${end}`
    // Check cache
    const { data: cached } = await supabase
      .from('utmify_cache')
      .select('data, expires_at')
      .eq('workspace_id', workspace.id)
      .eq('cache_key', cacheKey)
      .single()

    if (cached && new Date(cached.expires_at) > new Date()) {
      return NextResponse.json(cached.data)
    }

    // Fetch from UTMify
    const pathMap: Record<string, string> = {
      campaigns: '/ads/campaigns',
      adsets: '/ads/adsets',
      ads: '/ads/ads',
      overview: '/dashboard/overview',
    }

    const path = pathMap[level] ?? '/dashboard/overview'
    const url = `https://api.utmify.com.br/api-credentials${path}?start_date=${start}&end_date=${end}`

    const res = await fetch(url, {
      headers: { 'x-api-token': workspace.utmify_api_key },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'UTMify API error' }, { status: 502 })
    }

    const rawData = await res.json()
    const normalized = normalizeData(rawData, level)

    // Cache for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await supabase.from('utmify_cache').upsert(
      {
        workspace_id: workspace.id,
        cache_key: cacheKey,
        data: normalized,
        expires_at: expiresAt,
      },
      { onConflict: 'workspace_id,cache_key' }
    )

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Metrics error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function normalizeData(data: unknown, level: string) {
  const items = Array.isArray(data) ? data : (data as Record<string, unknown>)?.data ?? []
  const arr = Array.isArray(items) ? items : []

  const summary = arr.reduce(
    (acc: Record<string, number>, item: unknown) => {
      const i = item as Record<string, number>
      acc.spend += i.spend ?? 0
      acc.revenue += i.revenue ?? 0
      acc.conversions += i.conversions ?? 0
      acc.clicks += i.clicks ?? 0
      acc.impressions += i.impressions ?? 0
      return acc
    },
    { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0 }
  )

  summary.roas = summary.spend > 0 ? summary.revenue / summary.spend : 0
  summary.cpa = summary.conversions > 0 ? summary.spend / summary.conversions : 0
  summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0

  return { items: arr, summary, level }
}

function getMockData(level: string) {
  return {
    items: [],
    summary: {
      spend: 12400,
      revenue: 48320,
      roas: 3.9,
      cpa: 42,
      conversions: 295,
      clicks: 4820,
      impressions: 142000,
      ctr: 3.4,
    },
    level,
    mock: true,
  }
}
