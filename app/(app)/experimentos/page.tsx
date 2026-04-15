'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, formatRoas } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { FlaskConical, Plus, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import type { Experiment } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  monitoring: 'bg-blue-100 text-blue-700',
  concluded: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  monitoring: 'Monitorando',
  concluded: 'Concluído',
}

const METRICA_LABELS: Record<string, string> = {
  cpa: 'CPA',
  roas: 'ROAS',
  hook_rate: 'Hook rate',
  icr: 'ICR',
  conv_checkout: 'Conv. checkout',
  arpu: 'ARPU',
}

function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const leading = experiment.variantes?.reduce<string | null>((acc, v) => {
    const score = experiment.metrica_decisao === 'roas'
      ? (v.metricas.roas ?? 0)
      : -(v.metricas.cpa ?? Infinity)
    const current = acc
      ? experiment.variantes.find((x) => x.letra === acc)
      : null
    const currentScore = current
      ? experiment.metrica_decisao === 'roas'
        ? (current.metricas.roas ?? 0)
        : -(current.metricas.cpa ?? Infinity)
      : -Infinity
    return score > currentScore ? v.letra : acc
  }, null)

  const totalVendas = experiment.variantes?.reduce(
    (acc, v) => acc + (v.metricas.vendas ?? 0), 0
  ) ?? 0

  const progress = Math.min(100, (totalVendas / experiment.vendas_minimas) * 100)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">{experiment.nome}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{experiment.objetivo}</p>
        </div>
        <Badge className={cn('text-xs', STATUS_COLORS[experiment.status])}>
          {STATUS_LABELS[experiment.status]}
        </Badge>
      </div>

      {/* Variants */}
      {experiment.variantes?.length > 0 && (
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${experiment.variantes.length}, 1fr)` }}>
          {experiment.variantes.map((v) => (
            <div
              key={v.letra}
              className={cn(
                'p-3 rounded-lg border text-center relative',
                leading === v.letra
                  ? 'border-green-300 bg-green-50'
                  : 'border-slate-100 bg-slate-50'
              )}
            >
              {leading === v.letra && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                  na frente
                </span>
              )}
              <p className="text-xs font-bold text-slate-500 mb-1">Variante {v.letra}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{v.nome}</p>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                {v.metricas.roas !== undefined && (
                  <p>ROAS: <span className="font-medium text-slate-700">{formatRoas(v.metricas.roas)}</span></p>
                )}
                {v.metricas.cpa !== undefined && (
                  <p>CPA: <span className="font-medium text-slate-700">{formatCurrency(v.metricas.cpa)}</span></p>
                )}
                {v.metricas.vendas !== undefined && (
                  <p>{v.metricas.vendas} vendas</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Volume mínimo: {totalVendas}/{experiment.vendas_minimas} vendas</span>
          <span>Métrica: {METRICA_LABELS[experiment.metrica_decisao] ?? experiment.metrica_decisao}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {experiment.veredicto && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
          <p className="text-xs font-medium text-green-700 mb-0.5">Veredicto</p>
          <p className="text-sm text-green-800">{experiment.veredicto}</p>
        </div>
      )}
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

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Experimentos</h1>
            <p className="text-sm text-slate-500 mt-1">Testes monitorados com veredicto automático</p>
          </div>
          <Link href="/experimentos/novo">
            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Novo experimento
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : experiments.length === 0 ? (
          <div className="text-center py-16">
            <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum experimento criado ainda.</p>
            <p className="text-sm text-slate-400 mt-1">Crie seu primeiro teste A/B e monitore os resultados.</p>
            <Link href="/experimentos/novo">
              <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Criar experimento
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {experiments.map((exp) => (
              <ExperimentCard key={exp.id} experiment={exp} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
