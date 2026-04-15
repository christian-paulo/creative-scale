'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, formatRoas } from '@/lib/utils'
import { Search, Package } from 'lucide-react'
import Link from 'next/link'
import type { Element } from '@/types'

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  criativo: { bg: 'bg-green-100',  text: 'text-green-700',  icon: 'C' },
  hook:     { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'H' },
  funil:    { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: 'F' },
  vsl:      { bg: 'bg-red-100',    text: 'text-red-600',    icon: 'V' },
  upsell:   { bg: 'bg-green-100',  text: 'text-green-700',  icon: 'U' },
  pagina:   { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: 'P' },
  checkout: { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: '$' },
  outro:    { bg: 'bg-slate-100',  text: 'text-slate-500',  icon: '?' },
}

const STATUS_STAGE: Record<string, { label: string; cls: string; dotCls: string }> = {
  ativo:      { label: 'Escala',    cls: 'bg-green-50 text-green-700',   dotCls: 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' },
  pausado:    { label: 'Pausado',   cls: 'bg-amber-50 text-amber-600',   dotCls: 'bg-amber-400' },
  descartado: { label: 'Descartado', cls: 'bg-slate-100 text-slate-500', dotCls: 'bg-slate-400' },
}

const FILTER_OPTIONS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'criativo',  label: 'Criativos' },
  { id: 'hook',      label: 'Hooks' },
  { id: 'funil',     label: 'Funis' },
  { id: 'vsl',       label: 'VSL' },
  { id: 'checkout',  label: 'Checkouts' },
  { id: 'pagina',    label: 'Páginas' },
  { id: 'descartado',label: 'Descartados' },
]

const SORT_OPTIONS = [
  { id: 'roas',   label: 'Melhor ROAS histórico' },
  { id: 'recent', label: 'Mais recentes' },
  { id: 'vendas', label: 'Mais testes' },
  { id: 'nome',   label: 'Nome A–Z' },
]

function initials(nome: string) {
  const parts = nome.trim().split(/[\s\-–—_]/g).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nome.substring(0, 2).toUpperCase()
}

function ElementCard({ element }: { element: Element }) {
  const tc = TYPE_COLORS[element.tipo] ?? TYPE_COLORS.outro
  const st = STATUS_STAGE[element.status] ?? STATUS_STAGE.pausado
  const roas = element.roas_historico
  const roasColor = roas ? (roas >= 2 ? 'text-green-600' : roas < 1.5 ? 'text-red-500' : 'text-amber-500') : 'text-slate-400'

  return (
    <Link href={`/memoria/${element.id}`}>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-slate-300 hover:-translate-y-0.5 transition-all">
        {/* Top */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0', tc.bg, tc.text)}>
            {initials(element.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold text-slate-900 leading-tight truncate">{element.nome}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">{element.tipo}{element.tags?.length ? ` · ${element.tags[0]}` : ''}</div>
          </div>
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', st.dotCls)} />
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { label: 'ROAS hist.', value: roas ? `${roas.toFixed(2)}×` : '—', color: roasColor },
            { label: 'CPA médio',  value: element.cpa_historico ? formatCurrency(element.cpa_historico) : '—', color: 'text-slate-600' },
            { label: 'Volume',     value: element.vendas_total ? `${element.vendas_total} vendas` : '—', color: 'text-slate-600' },
          ].map(k => (
            <div key={k.label} className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="text-[9.5px] text-slate-400 uppercase tracking-wide mb-1">{k.label}</div>
              <div className={cn('text-[13px] font-bold', k.color)}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full', st.cls)}>{st.label}</span>
          <span className="text-[10.5px] text-slate-400">{element.timeline?.length ?? 0} eventos registrados</span>
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
      const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single()
      if (!workspace) return

      let query = supabase.from('elements').select('*').eq('workspace_id', workspace.id)

      if (filter === 'descartado') query = query.eq('status', 'descartado')
      else if (filter !== 'todos') query = query.eq('tipo', filter)
      if (search) query = query.ilike('nome', `%${search}%`)

      if (sort === 'roas')   query = query.order('roas_historico', { ascending: false, nullsFirst: false })
      if (sort === 'recent') query = query.order('created_at', { ascending: false })
      if (sort === 'vendas') query = query.order('vendas_total', { ascending: false, nullsFirst: false })
      if (sort === 'nome')   query = query.order('nome', { ascending: true })

      const { data } = await query.limit(50)
      setElements(data ?? [])
      setLoading(false)
    }
    load()
  }, [filter, search, sort])

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-5 overflow-y-auto">

        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-4 py-3 mb-4 focus-within:border-green-400 transition-colors">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar criativo, hook, funil, VSL, checkout..."
            className="flex-1 text-[13.5px] text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {FILTER_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setFilter(opt.id)}
              className={cn(
                'px-3 py-1 rounded-full text-[11.5px] border transition-all',
                filter === opt.id
                  ? 'bg-green-50 border-green-300 text-green-700 font-medium'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              )}
            >{opt.label}</button>
          ))}
        </div>

        {/* Sort row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11.5px] text-slate-400">{elements.length} elemento{elements.length !== 1 ? 's' : ''}</span>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-[11.5px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-500 outline-none cursor-pointer">
            {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : elements.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum elemento encontrado.</p>
            <p className="text-xs text-slate-400 mt-1">
              Conecte a UTMify e sincronize para popular a memória automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {elements.map(el => <ElementCard key={el.id} element={el} />)}
          </div>
        )}
      </main>
    </div>
  )
}
