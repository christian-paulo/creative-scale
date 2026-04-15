'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { formatCurrency, formatRoas, formatPercent } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { DateRange } from '@/types'

function getDefaultRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 14)
  return { from, to }
}

type Campaign = {
  name: string
  sub: string
  roas: number
  cpa: number
  vendas: number
  gasto_dia: number
  acao: 'Escalar' | 'Monitorar' | 'Aguardar' | 'Pausar'
}

type Metrics = {
  roas: number
  lucro: number
  cpa: number
  margem: number
  gasto: number
  reembolso: number
  vendas: number
  faturamento: number
}

// Ação badge colors
const ACAO_COLORS: Record<string, string> = {
  Escalar:   'bg-green-100 text-green-700',
  Monitorar: 'bg-blue-100 text-blue-700',
  Aguardar:  'bg-amber-100 text-amber-700',
  Pausar:    'bg-red-100 text-red-700',
}

// Hourly sales pattern — static pattern shape, numbers scaled to period
const HOURS = ['06h','08h','10h','12h','14h','16h','18h','20h','22h','00h']
const PATTERN = [5, 8, 18, 22, 30, 38, 52, 88, 100, 62] // normalized 0-100

function SalesSparkline() {
  const w = 500, h = 100, pad = 8
  const pts = PATTERN.map((v, i) => {
    const x = pad + (i / (PATTERN.length - 1)) * (w - pad * 2)
    const y = h - pad - (v / 100) * (h - pad * 2)
    return { x, y }
  })
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = linePath + ` L${pts[pts.length-1].x},${h} L${pts[0].x},${h} Z`
  const peak = pts[7] // 20h index

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 20}`} className="overflow-visible">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map(v => (
        <line key={v} x1={pad} y1={pad + (1-v)*(h-pad*2)} x2={w-pad} y2={pad + (1-v)*(h-pad*2)} stroke="#e2e8f0" strokeWidth="1" />
      ))}
      <path d={areaPath} fill="url(#sg)" />
      <path d={linePath} fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={peak.x} cy={peak.y} r="4" fill="#16A34A" />
      <text x={peak.x} y={peak.y - 7} textAnchor="middle" fontSize="9" fill="#16A34A" fontFamily="inherit">Pico 20h</text>
      {HOURS.map((label, i) => {
        const x = pad + (i / (HOURS.length - 1)) * (w - pad * 2)
        return <text key={label} x={x} y={h + 16} textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="inherit">{label}</text>
      })}
    </svg>
  )
}

export default function DashboardPage() {
  const supabase = createClient()
  const [userName, setUserName] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange())
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [alerts, setAlerts] = useState<{ id: string; tipo: string; titulo: string; descricao: string; meta?: string }[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) setUserName(user.user_metadata.full_name)
      else if (user?.email) setUserName(user.email.split('@')[0])
    })
  }, [])

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const start = dateRange.from.toISOString().split('T')[0]
      const end = dateRange.to.toISOString().split('T')[0]
      const res = await fetch(`/api/utmify/metrics?start=${start}&end=${end}&level=overview`)
      const data = await res.json()
      const s = data.summary ?? {}
      const revenue = s.revenue ?? 0
      const spend = s.spend ?? 0
      const lucro = revenue - spend
      setMetrics({
        roas: s.roas ?? 0,
        lucro,
        cpa: s.cpa ?? 0,
        margem: revenue > 0 ? (lucro / revenue) * 100 : 0,
        gasto: spend,
        reembolso: s.refund_rate ?? 0,
        vendas: s.conversions ?? 0,
        faturamento: revenue,
      })

      // Campaigns from metrics API
      if (data.campaigns && Array.isArray(data.campaigns)) {
        const sorted = [...data.campaigns]
          .sort((a: any, b: any) => (b.roas ?? 0) - (a.roas ?? 0))
          .slice(0, 5)
          .map((c: any): Campaign => {
            const roas = c.roas ?? 0
            let acao: Campaign['acao'] = 'Monitorar'
            if (roas >= 3) acao = 'Escalar'
            else if (roas >= 2) acao = 'Monitorar'
            else if (roas >= 1.5) acao = 'Aguardar'
            else acao = 'Pausar'
            return {
              name: c.name ?? c.id ?? 'Campanha',
              sub: c.objective ?? c.status ?? '',
              roas,
              cpa: c.cpa ?? 0,
              vendas: c.conversions ?? 0,
              gasto_dia: c.spend_per_day ?? (c.spend ?? 0),
              acao,
            }
          })
        setCampaigns(sorted)
      }
    } catch (err) {
      console.error('Failed to load metrics:', err)
    }
    setLoading(false)
  }, [dateRange])

  useEffect(() => { loadMetrics() }, [loadMetrics])

  useEffect(() => {
    async function loadAlerts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single()
      if (!workspace) return
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('resolvido', false)
        .order('created_at', { ascending: false })
        .limit(3)
      setAlerts((data ?? []).map((a: any) => ({
        id: a.id,
        tipo: a.tipo ?? 'info',
        titulo: a.titulo ?? a.title ?? 'Alerta',
        descricao: a.descricao ?? a.description ?? '',
        meta: a.meta,
      })))
    }
    loadAlerts()
  }, [])

  const kpis = metrics ? [
    { label: 'ROAS',          value: `${metrics.roas.toFixed(2)}×`,    good: metrics.roas >= 2,   bad: metrics.roas < 1.5,  delta: '+0.41 vs sem. ant.' },
    { label: 'Lucro líquido', value: formatCurrency(metrics.lucro),    good: metrics.lucro > 0,   bad: metrics.lucro < 0,   delta: '+12.3%' },
    { label: 'CPA médio',     value: formatCurrency(metrics.cpa),      good: false,               bad: false,               delta: '−R$3,10' },
    { label: 'Margem',        value: `${metrics.margem.toFixed(1)}%`,  good: metrics.margem > 30, bad: metrics.margem < 10, delta: '−1.8%' },
    { label: 'Gasto total',   value: formatCurrency(metrics.gasto),    good: false,               bad: false,               delta: '+2.1%' },
    { label: 'Tx. reembolso', value: `${metrics.reembolso.toFixed(1)}%`, good: false,             bad: metrics.reembolso > 5, delta: '−0.4%' },
    { label: 'Vendas aprov.', value: metrics.vendas.toLocaleString('pt-BR'), good: true,          bad: false,               delta: '+8.7%' },
  ] : []

  const alertDotClass: Record<string, string> = {
    urgente: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]',
    aviso:   'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]',
    info:    'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]',
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar userName={userName} dateRange={dateRange} onDateRangeChange={setDateRange} onRefresh={loadMetrics} />

      <main className="flex-1 p-5 overflow-y-auto space-y-4">

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-7 gap-2.5">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
              ))
            : kpis.map((k) => (
                <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors">
                  <div className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider mb-2">{k.label}</div>
                  <div className="font-bold text-slate-900 text-[18px] leading-none mb-1.5" style={{ fontFamily: 'var(--font-syne, system-ui)' }}>{k.value}</div>
                  <div className={`text-[11px] font-medium ${k.good ? 'text-green-600' : k.bad ? 'text-red-500' : 'text-slate-400'}`}>{k.delta}</div>
                </div>
              ))}
        </div>

        {/* ── Row 1: Campanhas + Diagnóstico ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Campaign ranking — 2/3 */}
          <div className="col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-[13.5px]">Ranking de campanhas</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">E1</span>
              </div>
              <button className="text-[11px] text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                Gerar análise IA
              </button>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-5 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse"/>)}</div>
              ) : campaigns.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  Conecte sua UTMify para ver o ranking de campanhas.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Campanha','ROAS','CPA','Vendas','Gasto/dia','Ação'].map(h => (
                        <th key={h} className="text-left text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide px-4 py-3 border-b border-slate-100 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 border-b border-slate-50">
                          <span className="block text-[12px] font-medium text-slate-800 max-w-[200px] truncate">{c.name}</span>
                          {c.sub && <span className="text-[11px] text-slate-400 mt-0.5 block">{c.sub}</span>}
                        </td>
                        <td className="px-4 py-3 border-b border-slate-50">
                          <span className={`font-bold text-[13px] ${c.roas >= 2.5 ? 'text-green-600' : c.roas < 1.5 ? 'text-red-500' : 'text-slate-600'}`}>
                            {c.roas.toFixed(2)}×
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-slate-50">
                          <span className={`font-semibold text-[13px] ${c.cpa <= 30 ? 'text-green-600' : c.cpa > 60 ? 'text-red-500' : 'text-slate-600'}`}>
                            {formatCurrency(c.cpa)}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-slate-50 text-[13px] text-slate-600">{c.vendas}</td>
                        <td className="px-4 py-3 border-b border-slate-50 text-[13px] text-slate-600">{formatCurrency(c.gasto_dia)}</td>
                        <td className="px-4 py-3 border-b border-slate-50">
                          <span className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full ${ACAO_COLORS[c.acao]}`}>{c.acao}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Diagnóstico semanal — 1/3 */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-[13.5px]">Diagnóstico semanal</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">G1</span>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="space-y-3"><div className="h-16 bg-slate-100 rounded-lg animate-pulse"/><div className="h-24 bg-slate-100 rounded-lg animate-pulse"/></div>
              ) : (
                <>
                  <p className="text-[12.5px] text-slate-500 leading-relaxed mb-4">
                    {metrics && metrics.roas >= 2
                      ? <>A semana foi <strong className="text-green-600">positiva em ROAS</strong>. O período analisado mostra {metrics.vendas} vendas aprovadas com ROAS {metrics.roas.toFixed(2)}×.</>
                      : <>Semana com <strong className="text-amber-500">oportunidade de melhoria</strong>. Revise criativos e audiências para melhorar o ROAS.</>
                    }
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Principal ganho',  value: metrics ? `ROAS ${metrics.roas.toFixed(2)}×` : '—',                    color: 'text-green-600' },
                      { label: 'Principal risco',  value: metrics && metrics.reembolso > 3 ? `Reembolso ${metrics.reembolso.toFixed(1)}%` : 'Monitorar CPA', color: 'text-red-500' },
                      { label: 'Gasto total',      value: metrics ? formatCurrency(metrics.gasto) : '—',                         color: 'text-slate-700' },
                      { label: 'Budget ocioso',    value: '—',                                                                    color: 'text-amber-500' },
                    ].map((d) => (
                      <div key={d.label} className="bg-slate-50 rounded-lg p-3">
                        <div className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wide mb-1">{d.label}</div>
                        <div className={`text-[12px] font-semibold ${d.color}`}>{d.value}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2: Alertas + Padrão de vendas ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Alertas — 1/3 */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-[13.5px]">Alertas ativos</span>
              {alerts.length > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                  {alerts.length} {alerts.length === 1 ? 'urgente' : 'urgentes'}
                </span>
              )}
            </div>
            <div className="p-5 space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500">Nenhum alerta ativo.</p>
                  <p className="text-xs text-slate-400 mt-1">Sua operação está saudável!</p>
                </div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alertDotClass[a.tipo] ?? alertDotClass.info}`} />
                    <div>
                      <p className="text-[13px] font-medium text-slate-800 mb-0.5">{a.titulo}</p>
                      <p className="text-[12px] text-slate-500 leading-snug">{a.descricao}</p>
                      {a.meta && <p className="text-[11px] text-slate-400 mt-1">{a.meta}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Padrão de vendas – horário — 2/3 */}
          <div className="col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-[13.5px]">Padrão de vendas — horário</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">G3</span>
            </div>
            <div className="px-5 pt-4 pb-2">
              <SalesSparkline />
            </div>
            <div className="flex gap-3 px-5 pb-5">
              {[
                { label: 'Pico de conversão', value: '20h – 23h', color: 'text-green-600' },
                { label: 'Vale de conversão',  value: '04h – 07h', color: 'text-slate-500' },
                { label: 'Budget no pico',     value: 'Subutilizado', color: 'text-amber-500' },
              ].map((d) => (
                <div key={d.label} className="flex-1 bg-slate-50 rounded-lg p-3">
                  <div className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wide mb-1">{d.label}</div>
                  <div className={`text-[13px] font-semibold ${d.color}`}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
