import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { level, focus, atype, period_start, period_end, stage, selected_elements } = body

    // Load workspace, benchmarks, nomenclatures
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, mercado')
      .eq('user_id', user.id)
      .single()

    if (!workspace) return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 })

    const [{ data: benchmarks }, { data: rules }, { data: elements }] = await Promise.all([
      supabase.from('benchmarks').select('*').eq('workspace_id', workspace.id).single(),
      supabase.from('nomenclature_rules').select('*').eq('workspace_id', workspace.id),
      supabase
        .from('elements')
        .select('nome, tipo, roas_historico, cpa_historico, vendas_total, status')
        .eq('workspace_id', workspace.id)
        .in('id', selected_elements?.length ? selected_elements : [''])
        .limit(20),
    ])

    // Fetch UTMify data for context
    let utmifyContext = ''
    try {
      const metricsRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/utmify/metrics?start=${period_start}&end=${period_end}&level=${level === 'campanha' ? 'campaigns' : level === 'conjunto' ? 'adsets' : 'ads'}`,
        { headers: { Cookie: request.headers.get('cookie') ?? '' } }
      )
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        const s = metricsData.summary
        utmifyContext = `
DADOS DO PERÍODO (${period_start} a ${period_end}):
- Faturamento: R$${s.revenue?.toFixed(2) ?? 'N/A'}
- Gastos: R$${s.spend?.toFixed(2) ?? 'N/A'}
- ROAS: ${s.roas?.toFixed(2) ?? 'N/A'}×
- CPA: R$${s.cpa?.toFixed(2) ?? 'N/A'}
- Vendas: ${s.conversions ?? 'N/A'}
- CTR: ${s.ctr?.toFixed(2) ?? 'N/A'}%
`
      }
    } catch {}

    const benchmarkStr = benchmarks
      ? `
BENCHMARKS DESTA OPERAÇÃO:
- Ticket médio: R$${benchmarks.ticket_medio}
- CPA saudável: ≤ R$${benchmarks.cpa_saudavel} (${Math.round((benchmarks.cpa_saudavel / benchmarks.ticket_medio) * 100)}% do ticket)
- ROAS mínimo: ${benchmarks.roas_minimo}× (break-even)
- ICR saudável: ≥ ${benchmarks.icr_saudavel}%
- CTR saudável: ≥ ${benchmarks.ctr_saudavel}%`
      : ''

    const elementsStr = elements?.length
      ? `
ELEMENTOS ANALISADOS:
${elements.map((e) => `- ${e.nome} (${e.tipo}): ROAS ${e.roas_historico ?? 'N/A'}, CPA R$${e.cpa_historico ?? 'N/A'}, ${e.vendas_total ?? 0} vendas`).join('\n')}`
      : ''

    const systemPrompt = `Você é o Claudio, um analista especializado em campanhas de direct response para o mercado brasileiro.

${benchmarkStr}

${utmifyContext}

${elementsStr}

Nível de análise: ${level}
Foco: ${Array.isArray(focus) ? focus.join(', ') : focus}
Tipo: ${atype}
Etapa: ${stage}
Período: ${period_start} a ${period_end}

Analise os dados acima e gere recomendações práticas e específicas.
Organize a resposta nas seguintes seções:

## Reativar agora
Elementos/campanhas que merecem reativação imediata e por quê.

## Escala horizontal
O que ampliar para outros públicos/canais.

## Escala vertical
O que aumentar em budget e critérios.

## Novos testes
Hipóteses prioritárias para testar.

## O que evitar
Padrões negativos identificados.

Cada recomendação deve ter: título em negrito, explicação baseada nos dados e ações específicas com nomenclaturas reais quando disponíveis.
Seja direto, prático e baseado em dados. Evite jargões e generalizações.`

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Gere uma análise ${atype} focada em ${Array.isArray(focus) ? focus.join(' e ') : focus} para o nível de ${level}.`,
        },
      ],
      system: systemPrompt,
    })

    // Collect full response to save
    let fullContent = ''

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullContent += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }

        // Save analysis
        try {
          await supabase.from('analyses').insert({
            workspace_id: workspace.id,
            titulo: `Análise ${atype} — ${Array.isArray(focus) ? focus.join(', ') : focus}`,
            nivel: level,
            foco: Array.isArray(focus) ? focus : [focus],
            tipo: atype,
            stage,
            periodo_inicio: period_start,
            periodo_fim: period_end,
            elementos_selecionados: selected_elements ?? [],
            conteudo: fullContent,
            creditos_usados: Math.ceil(fullContent.length / 4),
          })
        } catch (err) {
          console.error('Failed to save analysis:', err)
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Análise error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
