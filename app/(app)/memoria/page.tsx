'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, formatRoas } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Image, Zap, Layers, Video, ShoppingCart, MousePointerClick, Package } from 'lucide-react'
import Link from 'next/link'
import type { Element } from '@/types'

const TIPO_ICONS: Record<string, React.ElementType> = {
  criativo: Image,
  hook: Zap,
  funil: Layers,
  vsl: Video,
  upsell: ShoppingCart,
  pagina: MousePointerClick,
  outro: Package,
}

const TIPO_COLORS: Record<string, string> = {
  criativo: 'bg-blue-100 text-blue-700',
  hook: 'bg-amber-100 text-amber-700',
  funil: 'bg-purple-100 text-purple-700',
  vsl: 'bg-red-100 text-red-700',
  upsell: 'bg-green-100 text-green-700',
  pagina: 'bg-cyan-100 text-cyan-700',
  outro: 'bg-slate-100 text-slate-700',
}

const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  pausado: 'bg-amber-100 text-amber-700',
  descartado: 'bg-red-100 text-red-700',
}

const FILTER_OPTIONS = [
  { id: 'todos', label: 'Todos' },
  { id: 'criativo', label: 'Criativos' },
  { id: 'hook', label: 'Hooks' },
  { id: 'funil', label: 'Funis' },
  { id: 'vsl', label: 'VSL' },
  { id: 'upsell', label: 'Checkouts' },
  { id: 'pagina', label: 'Páginas' },
  { id: 'descartado', label: 'Descartados' },
]

const SORT_OPTIONS = [
  { id: 'roas', label: 'ROAS histórico' },
  { id: 'recent', label: 'Mais recentes' },
  { id: 'vendas', label: 'Mais vendas' },
]

function ElementCard({ element }: { element: Element }) {
  const Icon = TIPO_ICONS[element.tipo] ?? Package
  const isDescartado = element.status === 'descartado'

  return (
    <Link href={`/memoria/${element.id}`}>
      <div className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer',
        isDescartado && 'opacity-60'
      )}>
        <div className="flex items-start gap-3 mb-4">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', TIPO_COLORS[element.tipo])}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{element.nome}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn('text-xs capitalize', TIPO_COLORS[element.tipo])}>
                {element.tipo}
              </Badge>
              <Badge className={cn('text-xs capitalize', STATUS_COLORS[element.status])}>
                {element.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">ROAS</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              {element.roas_historico ? formatRoas(element.roas_historico) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">CPA</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              {element.cpa_historico ? formatCurrency(element.cpa_historico) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Vendas</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              {element.vendas_total ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function MemoriaPage() {
  const supabase = createClient()
  const [elements, setElements] = useState<Element[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [sort, setSort] = useState('roas')

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
        .from('elements')
        .select('*')
        .eq('workspace_id', workspace.id)

      if (filter === 'descartado') {
        query = query.eq('status', 'descartado')
      } else if (filter !== 'todos') {
        query = query.eq('tipo', filter)
      }

      if (search) {
        query = query.ilike('nome', `%${search}%`)
      }

      if (sort === 'roas') {
        query = query.order('roas_historico', { ascending: false, nullsFirst: false })
      } else if (sort === 'recent') {
        query = query.order('created_at', { ascending: false })
      } else if (sort === 'vendas') {
        query = query.order('vendas_total', { ascending: false, nullsFirst: false })
      }

      const { data } = await query.limit(50)
      setElements(data ?? [])
      setLoading(false)
    }
    load()
  }, [filter, search, sort])

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Memória</h1>
          <p className="text-sm text-slate-500 mt-1">Biblioteca de elementos e histórico de performance</p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-600 bg-white"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
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
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : elements.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum elemento encontrado.</p>
            <p className="text-sm text-slate-400 mt-1">
              Conecte a UTMify e sincronize para popular a memória automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {elements.map((element) => (
              <ElementCard key={element.id} element={element} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
