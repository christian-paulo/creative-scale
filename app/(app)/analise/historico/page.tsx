'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, BookOpen } from 'lucide-react'
import type { Analysis } from '@/types'

const FILTER_OPTIONS = [
  { id: 'todos', label: 'Todos' },
  { id: 'criativo', label: 'Criativos' },
  { id: 'hook', label: 'Hooks' },
  { id: 'funil', label: 'Funis' },
  { id: 'checkout', label: 'Checkouts' },
  { id: 'ab', label: 'Testes A/B' },
  { id: 'campanha', label: 'Campanhas' },
]

const TIPO_COLORS: Record<string, string> = {
  individual: 'bg-blue-100 text-blue-700',
  ab: 'bg-purple-100 text-purple-700',
  escala: 'bg-green-100 text-green-700',
  padroes: 'bg-amber-100 text-amber-700',
  veredicto: 'bg-red-100 text-red-700',
  '360': 'bg-slate-100 text-slate-700',
}

export default function HistoricoPage() {
  const supabase = createClient()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [selected, setSelected] = useState<Analysis | null>(null)

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

      let query = supabase
        .from('analyses')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'todos') {
        query = query.contains('foco', [filter])
      }

      const { data } = await query
      setAnalyses(data ?? [])
      setLoading(false)
    }
    load()
  }, [filter])

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {selected ? (
            <div>
              <Button variant="ghost" className="mb-4 gap-2" onClick={() => setSelected(null)}>
                <ArrowLeft className="w-4 h-4" /> Histórico
              </Button>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selected.titulo}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={cn('text-xs', TIPO_COLORS[selected.tipo])}>
                        {selected.tipo}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDate(selected.created_at)} · {selected.periodo_inicio} → {selected.periodo_fim}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const blob = new Blob([selected.conteudo], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'analise.txt'
                    a.click()
                  }}>
                    Exportar
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                  {selected.conteudo}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Histórico de análises</h1>
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-6 flex-wrap">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setFilter(opt.id)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      filter === opt.id
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : analyses.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma análise encontrada.</p>
                  <p className="text-sm text-slate-400 mt-1">Gere sua primeira análise na seção Análise IA.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analyses.map((analysis) => (
                    <button
                      key={analysis.id}
                      onClick={() => setSelected(analysis)}
                      className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{analysis.titulo}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className={cn('text-xs', TIPO_COLORS[analysis.tipo])}>
                              {analysis.tipo}
                            </Badge>
                            {analysis.foco.slice(0, 3).map((f) => (
                              <Badge key={f} variant="secondary" className="text-xs">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-xs text-slate-400">{formatDate(analysis.created_at)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {analysis.periodo_inicio} → {analysis.periodo_fim}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
