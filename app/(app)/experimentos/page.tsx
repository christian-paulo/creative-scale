'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, formatRoas } from '@/lib/utils'
import { FlaskConical, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Experiment, ExperimentVariant } from '@/types'

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  criativo: { bg: 'bg-green-100',  text: 'text-green-700',  icon: 'C' },
  hook:     { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'H' },
  vsl:      { bg: 'bg-red-100',    text: 'text-red-600',    icon: 'V' },
  pagina:   { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: 'P' },
  checkout: { bg: 'bg-green-100',  text: 'text-green-700',  icon: '$' },
  oferta:   { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: '★' },
  funil:    { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: 'F' },
  outro:    { bg: 'bg-slate-100',  text: 'text-slate-500',  icon: '?' },
}

const VARIANT_COLORS = [
  { bg: 'bg-green-100',  text: 'text-green-700' },
  { bg: 'bg-blue-100',   text: 'text-blue-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-amber-100',  text: 'text-amber-700' },
  { bg: 'bg-red-100',    text: 'text-red-600' },
  { bg: 'bg-slate-100',  text: 'text-slate-500' },
]

const STATUS_LABELS: Record<string, string> = {
  pending:    'Aguardando publicação',
  monitoring: 'Monitorando',
  concluded:  'Concluído',
}

const STATUS_CLS: Record<string, string> = {
  pending:    'bg-slate-100 text-slate-500',
  monitoring: 'bg-blue-50 text-blue-600',
  concluded:  'bg-green-50 text-green-700',
}

const METRICA_LABELS: Record<string, string> = {
  cpa:            'CPA',
  roas:           'ROAS',
  hook_rate:      'Hook rate',
  icr:            'ICR',
  conv_checkout:  'Conv. checkout',
  arpu:           'ARPU',
}

const TIPO_LABELS: Record<string, string> = {
  criativo: 'Criativo',
  hook:     'Hook',
  vsl:      'VSL',
  pagina:   'Página de vendas',
  checkout: 'Checkout',
  oferta:   'Oferta / Copy',
  funil:    'Funil completo',
  outro:    'Outro',
}

function getLeading(exp: Experiment): string | null {
  if (!exp.variantes?.length) return null
  return exp.variantes.reduce<{ letra: string; score: number } | null>((best, v) => {
    const score = exp.metrica_decisao === 'roas'
      ? (v.metricas.roas ?? 0)
      : -(v.metricas.cpa ?? Infinity)
    if (!best || score > best.score) return { letra: v.letra, score }
    return best
  }, null)?.letra ?? null
}

function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const tc = TYPE_COLORS[experiment.tipo] ?? TYPE_COLORS.outro
  const leading = getLeading(experiment)

  const totalVendas = experiment.variantes?.reduce((acc, v) => acc + (v.metricas.vendas ?? 0), 0) ?? 0
  const progress = Math.min(100, Math.round((totalVendas / (experiment.vendas_minimas * (experiment.variantes?.length || 1))) * 100))

  const isMonitoring = experiment.status === 'monitoring'
  const isConcluded  = experiment.status === 'concluded'

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Top */}
      <div className="flex items-start gap-3 p-4">
        {/* Type icon */}
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0', tc.bg, tc.text)}>
          {tc.icon}
        </div>

        {/* Name + tags */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-slate-900 leading-tight truncate">{experiment.nome}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">{experiment.objetivo}</div>

          {/* Tag row */}
          <div className="flex flex-wrap gap-1 mt-2">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', tc.bg, tc.text)}>
              {TIPO_LABELS[experiment.tipo] ?? experiment.tipo}
            </span>
            {(experiment.produto || experiment.etapa) && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {[experiment.produto, experiment.etapa?.toUpperCase()].filter(Boolean).join(' · ')}
              </span>
            )}
            {experiment.variantes?.length > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {experiment.variantes.length} elementos
              </span>
            )}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              Métrica: {METRICA_LABELS[experiment.metrica_decisao] ?? experiment.metrica_decisao}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={cn('text-[10.5px] font-semibold px-2.5 py-1 rounded-full', STATUS_CLS[experiment.status])}>
            {STATUS_LABELS[experiment.status]}
          </span>
        </div>
      </div>

      {/* Variants */}
      {experiment.variantes?.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {experiment.variantes.map((v, i) => {
            const vc = VARIANT_COLORS[i] ?? VARIANT_COLORS[0]
            const isLeading = v.letra === leading && isMonitoring
            const isWinner  = v.letra === leading && isConcluded

            return (
              <div key={v.letra} className={cn('flex items-center gap-3 px-4 py-2.5', isLeading && 'bg-green-50/50')}>
                {/* Letter badge */}
                <div className={cn('w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0', vc.bg, vc.text)}>
                  {v.letra}
                </div>

                {/* Name + UTMify tag */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800 truncate">{v.nome}</div>
                  {v.tag_nomenclatura && (
                    <div className="text-[10.5px] text-slate-400 truncate">[{v.tag_nomenclatura}]</div>
                  )}
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className={cn('text-[12.5px] font-bold', v.metricas.cpa ? (isLeading ? 'text-green-600' : 'text-slate-800') : 'text-slate-300')}>
                      {v.metricas.cpa ? formatCurrency(v.metricas.cpa) : '—'}
                    </div>
                    <div className="text-[9.5px] text-slate-400 uppercase tracking-wide">CPA</div>
                  </div>
                  <div className="text-right">
                    <div className={cn('text-[12.5px] font-bold', v.metricas.roas ? 'text-slate-700' : 'text-slate-300')}>
                      {v.metricas.roas ? `${v.metricas.roas.toFixed(2)}×` : '—'}
                    </div>
                    <div className="text-[9.5px] text-slate-400 uppercase tracking-wide">ROAS</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12.5px] font-bold text-slate-700">{v.metricas.vendas ?? 0}</div>
                    <div className="text-[9.5px] text-slate-400 uppercase tracking-wide">vendas</div>
                  </div>
                </div>

                {/* Leading / winner pill */}
                {isLeading && (
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                    na frente
                  </span>
                )}
                {isWinner && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">
                    vencedor
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Verdict */}
      {experiment.veredicto && (
        <div className="mx-4 mb-3 mt-0 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-start gap-2">
            <span className="text-[14px]">🏆</span>
            <p className="text-[12px] text-blue-800 leading-relaxed">{experiment.veredicto}</p>
          </div>
        </div>
      )}

      {/* Progress bar (monitoring only) */}
      {isMonitoring && !experiment.veredicto && (
        <div className="px-4 pb-3">
          <div className="flex justify-between text-[10.5px] text-slate-400 mb-1.5">
            <span>Progresso do volume mínimo</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
        <span className="text-[10.5px] text-slate-400 truncate flex-1 min-w-0 mr-4">
          Variável isolada: <strong className="text-slate-600 font-medium">
            {experiment.variavel_isolada?.length > 60
              ? experiment.variavel_isolada.substring(0, 60) + '…'
              : experiment.variavel_isolada || '—'}
          </strong>
        </span>
        <span className="text-[10.5px] text-slate-400 flex-shrink-0">
          Min. {experiment.vendas_minimas} vendas · R${experiment.budget_por_elemento}/dia
        </span>
      </div>
    </div>
  )
}

export default function ExperimentosPage() {
  const supabase = createClient()
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!workspace) return

      const { data } = await supabase
        .from('experiments')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })

      setExperiments(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[17px] font-bold text-slate-900">Experimentos</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">Testes monitorados com veredicto automático via UTMify</p>
          </div>
          <Link href="/experimentos/novo">
            <button className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-[12.5px] font-semibold px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Novo experimento
            </button>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : experiments.length === 0 ? (
          <div className="text-center py-16">
            <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum experimento criado ainda.</p>
            <p className="text-xs text-slate-400 mt-1">Crie seu primeiro teste A/B e monitore os resultados.</p>
            <Link href="/experimentos/novo">
              <button className="mt-4 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-[12.5px] font-semibold px-4 py-2 rounded-xl transition-colors mx-auto">
                <Plus className="w-3.5 h-3.5" />
                Criar experimento
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {experiments.map((exp) => (
              <ExperimentCard key={exp.id} experiment={exp} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
