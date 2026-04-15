'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, formatRoas } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, TrendingUp, Package } from 'lucide-react'
import type { Element } from '@/types'

const TIPO_COLORS: Record<string, string> = {
  criativo: 'bg-blue-100 text-blue-700',
  hook: 'bg-amber-100 text-amber-700',
  funil: 'bg-purple-100 text-purple-700',
  vsl: 'bg-red-100 text-red-700',
  upsell: 'bg-green-100 text-green-700',
  pagina: 'bg-cyan-100 text-cyan-700',
  outro: 'bg-slate-100 text-slate-700',
}

export default function ElementProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [element, setElement] = useState<Element | null>(null)
  const [related, setRelated] = useState<Element[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('elements')
        .select('*')
        .eq('id', id as string)
        .single()

      setElement(data)

      if (data) {
        const { data: rel } = await supabase
          .from('elements')
          .select('*')
          .eq('workspace_id', data.workspace_id)
          .eq('tipo', data.tipo)
          .neq('id', data.id)
          .limit(4)

        setRelated(rel ?? [])
      }

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar showDatePicker={false} />
        <main className="flex-1 p-6 flex items-center justify-center">
          <p className="text-slate-400">Carregando...</p>
        </main>
      </div>
    )
  }

  if (!element) {
    return (
      <div className="flex flex-col h-full">
        <TopBar showDatePicker={false} />
        <main className="flex-1 p-6 flex items-center justify-center">
          <p className="text-slate-500">Elemento não encontrado.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" className="mb-4 gap-2" onClick={() => router.push('/memoria')}>
            <ArrowLeft className="w-4 h-4" /> Memória
          </Button>

          {/* Header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold', TIPO_COLORS[element.tipo])}>
                {element.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">{element.nome}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className={cn('capitalize', TIPO_COLORS[element.tipo])}>{element.tipo}</Badge>
                  {element.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wide">ROAS histórico</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {element.roas_historico ? formatRoas(element.roas_historico) : '—'}
                </p>
              </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100">
              {[
                { label: 'CPA', value: element.cpa_historico ? formatCurrency(element.cpa_historico) : '—' },
                { label: 'Vendas', value: element.vendas_total?.toString() ?? '—' },
                { label: 'Gasto total', value: element.gasto_total ? formatCurrency(element.gasto_total) : '—' },
                { label: 'Receita', value: element.receita_total ? formatCurrency(element.receita_total) : '—' },
                { label: 'Status', value: element.status },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1 capitalize">{value}</p>
                </div>
              ))}
            </div>

            {element.melhor_combinacao && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
                  Melhor combinação identificada
                </p>
                <p className="text-sm text-green-800">{element.melhor_combinacao}</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="timeline">
            <TabsList className="mb-4">
              <TabsTrigger value="timeline">Linha do tempo</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="relacionados">Relacionados</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              {!element.timeline?.length ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Nenhum evento registrado ainda.</p>
                  <p className="text-sm text-slate-400 mt-1">Os eventos aparecem conforme o elemento é analisado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {element.timeline.map((event) => (
                    <div key={event.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{event.titulo}</p>
                          <p className="text-sm text-slate-600 mt-1">{event.descricao}</p>
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0 ml-4">{event.data}</span>
                      </div>
                      {event.licoes?.length > 0 && (
                        <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                          <p className="text-xs font-medium text-amber-700 mb-1">Lições</p>
                          <ul className="text-xs text-amber-800 space-y-0.5">
                            {event.licoes.map((l, i) => (
                              <li key={i}>• {l}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm text-slate-500">
                  Insights são gerados automaticamente quando você executa análises IA que incluem este elemento.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="relacionados">
              {related.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Nenhum elemento relacionado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {related.map((el) => (
                    <button
                      key={el.id}
                      onClick={() => router.push(`/memoria/${el.id}`)}
                      className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <p className="font-medium text-slate-900">{el.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn('text-xs capitalize', TIPO_COLORS[el.tipo])}>{el.tipo}</Badge>
                        <span className="text-sm font-semibold text-green-600">
                          {el.roas_historico ? formatRoas(el.roas_historico) : '—'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
