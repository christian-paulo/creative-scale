import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mcpInitialize, mcpNotifyInitialized, mcpCallTool, mcpListTools, parseToolText } from '@/lib/utmify-mcp'

export const maxDuration = 30

// ─── MCP tool name patterns UTMify may use ─────────────────────────────────
const CAMPAIGN_TOOL_PATTERNS = ['get_campaigns', 'campaigns', 'list_campaigns', 'ads_campaigns', 'get_ads_campaigns']
const OVERVIEW_TOOL_PATTERNS = ['get_overview', 'overview', 'dashboard', 'get_dashboard', 'summary']

function findTool(tools: string[], patterns: string[]): string | null {
  for (const p of patterns) {
    const found = tools.find(t => t.toLowerCase().includes(p.toLowerCase()))
    if (found) return found
  }
  return null
}

function normalizeMcpUrl(key: string): string {
  if (key.startsWith('http')) return key
  return `https://mcp.utmify.com.br/mcp/?token=${encodeURIComponent(key)}`
}

// ─── Fetch via MCP ──────────────────────────────────────────────────────────
async function fetchViaMcp(mcpUrl: string, start: string, end: string) {
  // Initialize session
  await mcpInitialize(mcpUrl)
  await mcpNotifyInitialized(mcpUrl)

  // Discover tools
  const tools = await mcpListTools(mcpUrl)
  const toolNames = tools.map(t => t.name)

  const dateArgs = { start_date: start, end_date: end, period_start: start, period_end: end }

  // Try campaigns tool
  const campaignTool = findTool(toolNames, CAMPAIGN_TOOL_PATTERNS)
  if (campaignTool) {
    const result = await mcpCallTool(mcpUrl, campaignTool, dateArgs)
    const data = parseToolText(result)
    return normalizeCampaignData(data)
  }

  // Fallback: try overview tool
  const overviewTool = findTool(toolNames, OVERVIEW_TOOL_PATTERNS)
  if (overviewTool) {
    const result = await mcpCallTool(mcpUrl, overviewTool, dateArgs)
    const data = parseToolText(result)
    return normalizeOverviewData(data)
  }

  // Last resort: call first available tool with date args
  if (toolNames.length > 0) {
    const result = await mcpCallTool(mcpUrl, toolNames[0], dateArgs)
    const data = parseToolText(result)
    return normalizeCampaignData(data)
  }

  throw new Error('No usable tools found on UTMify MCP server')
}

function normalizeCampaignData(data: unknown) {
  const items = Array.isArray(data) ? data : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.campaigns ?? []
  const arr = Array.isArray(items) ? items : []

  const summary = arr.reduce(
    (acc: Record<string, number>, item: unknown) => {
      const i = item as Record<string, number>
      acc.spend      += i.spend ?? i.cost ?? i.investment ?? 0
      acc.revenue    += i.revenue ?? i.receita ?? 0
      acc.conversions += i.conversions ?? i.sales ?? i.vendas ?? 0
      acc.clicks     += i.clicks ?? 0
      acc.impressions += i.impressions ?? 0
      return acc
    },
    { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0 }
  )

  summary.roas = summary.spend > 0 ? summary.revenue / summary.spend : 0
  summary.cpa  = summary.conversions > 0 ? summary.spend / summary.conversions : 0
  summary.ctr  = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0

  return { items: arr, summary, level: 'campaigns' }
}

function normalizeOverviewData(data: unknown) {
  const d = data as Record<string, number>
  const summary = {
    spend:       d?.spend ?? d?.investment ?? d?.cost ?? 0,
    revenue:     d?.revenue ?? d?.receita ?? 0,
    conversions: d?.conversions ?? d?.sales ?? d?.vendas ?? 0,
    clicks:      d?.clicks ?? 0,
    impressions: d?.impressions ?? 0,
    roas:        d?.roas ?? 0,
    cpa:         d?.cpa ?? 0,
    ctr:         d?.ctr ?? 0,
  }
  if (!summary.roas && summary.spend > 0) summary.roas = summary.revenue / summary.spend
  if (!summary.cpa && summary.conversions > 0) summary.cpa = summary.spend / summary.conversions
  return { items: [], summary, level: 'overview' }
}

// ─── Fallback REST API ──────────────────────────────────────────────────────
async function fetchViaRest(apiKey: string, level: string, start: string, end: string) {
  const pathMap: Record<string, string> = {
    campaigns: '/ads/campaigns',
    adsets:    '/ads/adsets',
    ads:       '/ads/ads',
    overview:  '/dashboard/overview',
  }
  const path = pathMap[level] ?? '/ads/campaigns'
  const url  = `https://api.utmify.com.br/api-credentials${path}?start_date=${start}&end_date=${end}`

  const res = await fetch(url, {
    headers: { 'x-api-token': apiKey },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`REST API ${res.status}`)
  return res.json()
}

// ─── Main handler ───────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const end   = searchParams.get('end')   || new Date().toISOString().split('T')[0]
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

    // Fetch — prefer MCP, fall back to REST
    const storedKey = workspace.utmify_api_key
    const isMcpUrl  = storedKey.startsWith('http')
    let normalized: unknown

    if (isMcpUrl) {
      normalized = await fetchViaMcp(storedKey, start, end)
    } else {
      const mcpUrl = normalizeMcpUrl(storedKey)
      try {
        normalized = await fetchViaMcp(mcpUrl, start, end)
      } catch {
        // MCP failed with plain token → try REST
        const raw = await fetchViaRest(storedKey, level, start, end)
        normalized = normalizeCampaignData(raw)
      }
    }

    // Cache for 1 hour
    await supabase.from('utmify_cache').upsert(
      {
        workspace_id: workspace.id,
        cache_key:    cacheKey,
        data:         normalized,
        expires_at:   new Date(Date.now() + 3600000).toISOString(),
      },
      { onConflict: 'workspace_id,cache_key' }
    )

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Metrics error:', error)
    return NextResponse.json({ error: 'Erro ao buscar métricas' }, { status: 500 })
  }
}

function getMockData(level: string) {
  return {
    items: [],
    summary: { spend: 12400, revenue: 48320, roas: 3.9, cpa: 42, conversions: 295, clicks: 4820, impressions: 142000, ctr: 3.4 },
    level,
    mock: true,
  }
}
