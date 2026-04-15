import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseNomenclature } from '@/lib/nomenclature'
import type { NomenclatureRule, ElementSigla, StageIdentifier } from '@/types'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, utmify_api_key, utmify_connected')
      .eq('user_id', user.id)
      .single()

    if (!workspace?.utmify_api_key || !workspace.utmify_connected) {
      return NextResponse.json({ synced: 0, created: 0, updated: 0, reason: 'UTMify not connected' })
    }

    // Load workspace rules
    const [{ data: rules }, { data: siglas }, { data: stages }] = await Promise.all([
      supabase.from('nomenclature_rules').select('*').eq('workspace_id', workspace.id),
      supabase.from('element_siglas').select('*').eq('workspace_id', workspace.id),
      supabase.from('stage_identifiers').select('*').eq('workspace_id', workspace.id),
    ])

    // Fetch last 90 days of ads
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const res = await fetch(
      `https://api.utmify.com.br/api-credentials/ads/ads?start_date=${start}&end_date=${end}`,
      { headers: { 'x-api-token': workspace.utmify_api_key } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'UTMify API error' }, { status: 502 })
    }

    const raw = await res.json()
    const ads = Array.isArray(raw) ? raw : raw?.data ?? []

    let created = 0
    let updated = 0

    for (const ad of ads) {
      const parsed = parseNomenclature(
        ad.ad_name ?? '',
        ad.campaign_name ?? '',
        (rules as NomenclatureRule[]) ?? [],
        (siglas as ElementSigla[]) ?? [],
        (stages as StageIdentifier[]) ?? []
      )

      const tipo = parsed.criativo
        ? 'criativo'
        : parsed.hook
        ? 'hook'
        : parsed.vsl
        ? 'vsl'
        : 'outro'

      const nome =
        parsed.criativo ?? parsed.hook ?? parsed.vsl ?? ad.ad_name?.substring(0, 60) ?? 'Sem nome'

      // Check if element exists
      const { data: existing } = await supabase
        .from('elements')
        .select('id, vendas_total, gasto_total, receita_total')
        .eq('workspace_id', workspace.id)
        .eq('nome', nome)
        .eq('tipo', tipo)
        .single()

      if (existing) {
        await supabase.from('elements').update({
          vendas_total: (existing.vendas_total ?? 0) + (ad.conversions ?? 0),
          gasto_total: (existing.gasto_total ?? 0) + (ad.spend ?? 0),
          receita_total: (existing.receita_total ?? 0) + (ad.revenue ?? 0),
          roas_historico: ad.roas ?? null,
          cpa_historico: ad.cpa ?? null,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
        updated++
      } else {
        await supabase.from('elements').insert({
          workspace_id: workspace.id,
          nome,
          tipo,
          tags: [parsed.etapa ?? 'sem-etapa'].filter(Boolean),
          status: 'ativo',
          roas_historico: ad.roas ?? null,
          cpa_historico: ad.cpa ?? null,
          vendas_total: ad.conversions ?? 0,
          gasto_total: ad.spend ?? 0,
          receita_total: ad.revenue ?? 0,
          timeline: [],
          metadata: { ad_name: ad.ad_name, campaign_name: ad.campaign_name, parsed },
        })
        created++
      }
    }

    return NextResponse.json({ synced: ads.length, created, updated })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
