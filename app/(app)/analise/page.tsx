'use client'

import { useState, useRef } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle2, RotateCcw, Download, BookOpen, Save, GitCompare, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────
type Level   = 'campanha' | 'conjunto' | 'anuncio' | '360'
type Focus   = string
type AType   = 'individual' | 'ab' | 'escala' | 'padroes' | 'veredicto' | '360'
type Stage   = 'teste' | 'pre-escala' | 'escala' | 'todos'
type Period  = '7d' | '14d' | '30d' | 'custom'

const ATYPE_COSTS: Record<AType, number> = {
  individual: 1, ab: 2, escala: 2, padroes: 3, veredicto: 2, '360': 5,
}

// ── Static element DB (mirroring what UTMify would sync) ───────────────────
const ELEM_DB = [
  { id:'e1',  type:'criativo', icon:'C1', name:'C1GBNVS4MA — RETAKE 2',        sub:'Produto GB · Hook: H11-2GBS2JU · Escala ativa',       roas:'2.97×', cpa:'R$21,40' },
  { id:'e2',  type:'criativo', icon:'H4', name:'H4C2.mp4',                       sub:'Maior ICR da operação · 5.1% · Pré-escala',            roas:'2.63×', cpa:'R$18,29' },
  { id:'e3',  type:'criativo', icon:'C2', name:'C2GBFB — Hook 03',               sub:'Fadiga detectada · frequência 2.8×',                   roas:'1.44×', cpa:'R$51,20' },
  { id:'e4',  type:'hook',     icon:'H11',name:'H11-2GBS2JU (hook original)',    sub:'Pergunta direta · 38% hook rate · 8 criativos',        roas:'3.10×', cpa:'R$19,80' },
  { id:'e5',  type:'hook',     icon:'H03',name:'Hook 03 — Prova social numérica',sub:'Descartado · hook rate 12%',                           roas:'1.44×', cpa:'R$51,20' },
  { id:'e6',  type:'funil',    icon:'F',  name:'Funil HOT BR — Checkout V1',     sub:'LP → VSL → Checkout direto · 22 testes',              roas:'2.40×', cpa:'R$23,10' },
  { id:'e7',  type:'checkout', icon:'$',  name:'PV+WPP — Checkout WhatsApp',     sub:'Maior ROAS histórico · volume baixo',                  roas:'7.87×', cpa:'R$10,23' },
  { id:'e8',  type:'checkout', icon:'$',  name:'HOT BR — Checkout V1',           sub:'Principal · recusa 14.8% · em teste V2',               roas:'—',     cpa:'—'       },
  { id:'e9',  type:'criativo', icon:'QZ', name:'Quizz 1 CC',                     sub:'Teste ativo · 4 dias · produto CC',                    roas:'2.10×', cpa:'R$31,50' },
  { id:'e10', type:'criativo', icon:'QZ', name:'Quizz 2 CC',                     sub:'Teste ativo · 4 dias · produto CC',                    roas:'1.88×', cpa:'R$37,20' },
  { id:'e11', type:'funil',    icon:'F2', name:'Funil HOT BR — Checkout V2',     sub:'Em teste · menos fricção · TC1 R$75/dia',              roas:'—',     cpa:'—'       },
  { id:'e12', type:'pagina',   icon:'LP', name:'LP VSL — Versão 2 (60s)',        sub:'Checkout conv. 5.2% · em escala',                      roas:'2.80×', cpa:'R$22,40' },
]

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  criativo: { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Criativo'  },
  hook:     { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Hook'      },
  funil:    { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Funil'     },
  checkout: { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Checkout'  },
  pagina:   { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Página'    },
  vsl:      { bg: 'bg-red-50',    text: 'text-red-600',    label: 'VSL'       },
}

// ── Focus options ──────────────────────────────────────────────────────────
const FOCO_OPTIONS = [
  { id: 'criativo',  label: 'Criativo',           kpis: 'CPA · ROAS · Hook rate · Hold rate · ICR',  icon: 'C', bg: 'bg-green-100',  text: 'text-green-700' },
  { id: 'hook',      label: 'Hook',               kpis: 'Hook rate · CTR · CPM · Hold rate 75%',      icon: 'H', bg: 'bg-purple-100', text: 'text-purple-700' },
  { id: 'funil',     label: 'Funil',              kpis: 'ICR · CON · Checkout conv. · ARPU',          icon: 'F', bg: 'bg-blue-100',   text: 'text-blue-700' },
  { id: 'pagina',    label: 'Página de vendas',   kpis: 'ICR · CON · Taxa recusa · ARPU',             icon: 'P', bg: 'bg-amber-100',  text: 'text-amber-700' },
  { id: 'vsl',       label: 'VSL',                kpis: 'Checkout conv. · ICR · Hold rate · ARPU',    icon: 'V', bg: 'bg-red-100',    text: 'text-red-600' },
  { id: 'checkout',  label: 'Checkout',           kpis: 'Taxa recusa · Chargeback · Pix vs Cartão',   icon: '$', bg: 'bg-green-100',  text: 'text-green-700' },
  { id: 'upsell',    label: 'Upsell / Downsell',  kpis: 'ARPU · Taxa aceitação · Reembolso',          icon: 'U', bg: 'bg-purple-100', text: 'text-purple-700' },
  { id: 'orcamento', label: 'Tipo de orçamento',  kpis: 'CBO vs ABO · Bid cap · Budget diário',       icon: '$', bg: 'bg-amber-100',  text: 'text-amber-700' },
]

const TIPO_OPTIONS = [
  { id: 'individual', label: 'Análise individual',    desc: 'Performance isolada de um elemento — histórico, evolução e diagnóstico completo.', credits: '1–2 créditos' },
  { id: 'ab',         label: 'Teste A/B — Comparativo', desc: 'Comparação direta entre dois elementos do mesmo tipo. Você define A e B.',          credits: '2 créditos' },
  { id: 'escala',     label: 'Análise de escala',     desc: 'O que pode ser escalado, como escalar, qual budget, quais contas priorizar.',        credits: '2 créditos' },
  { id: 'padroes',    label: 'Padrões históricos',    desc: 'O que os elementos vencedores têm em comum. Briefing de produção automático.',       credits: '3 créditos' },
  { id: 'veredicto',  label: 'Veredicto de testes',   desc: 'Para cada teste ativo, tem dados suficientes? Qual variante está na frente?',        credits: '2 créditos' },
  { id: '360',        label: 'Análise 360°',          desc: 'Visão completa da operação — escala, testes, alertas e sugestões integrados.',       credits: '5 créditos' },
]

const NIVEL_OPTIONS = [
  { id: 'campanha',  label: 'Campanha',            desc: 'Visão macro — orçamento, objetivo, ROAS geral' },
  { id: 'conjunto',  label: 'Conjunto de anúncios', desc: 'Audiência, budget por adset, entrega' },
  { id: 'anuncio',   label: 'Anúncio',              desc: 'Criativo, hook, copy, métricas de vídeo' },
  { id: '360',       label: '360° — Todos os níveis', desc: 'Análise completa da estrutura da conta' },
]

const STAGE_OPTIONS = [
  { id: 'teste',      label: 'Teste',         desc: 'Elemento novo sendo validado — volume baixo ainda' },
  { id: 'pre-escala', label: 'Pré-escala',    desc: 'Resultado positivo — aguardando confirmação' },
  { id: 'escala',     label: 'Escala',        desc: 'Estrutura validada e em expansão ativa' },
  { id: 'todos',      label: 'Todos os estágios', desc: 'Sem filtro de etapa' },
]

const PERIOD_OPTIONS = [
  { id: '7d',  label: 'Últimos 7 dias' },
  { id: '14d', label: 'Últimas 2 semanas' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'custom', label: 'Personalizado' },
]

const LEVEL_LABELS: Record<string, string> = { campanha:'Campanha', conjunto:'Conj. de anúncios', anuncio:'Anúncio', '360':'360° — Todos' }
const STAGE_LABELS: Record<string, string> = { teste:'Teste', 'pre-escala':'Pré-escala', escala:'Escala', todos:'Todos os estágios' }
const PERIOD_LABELS: Record<string, string> = { '7d':'7 dias', '14d':'14 dias', '30d':'30 dias', custom:'Personalizado' }
const ATYPE_LABELS: Record<string, string>  = { individual:'Análise individual', ab:'Teste A/B', escala:'Escala', padroes:'Padrões históricos', veredicto:'Veredicto testes', '360':'Análise 360°' }
const FOCUS_LABELS: Record<string, string>  = FOCO_OPTIONS.reduce((acc, o) => ({ ...acc, [o.id]: o.label }), {})

const OUTPUT_TABS = ['Reativar agora', 'Escala horizontal', 'Escala vertical', 'Novos testes', 'O que evitar']
const OUTPUT_TABS_AB = ['Comparativo A/B', 'Veredicto', 'Próximos passos']

// ── Helpers ────────────────────────────────────────────────────────────────
function getPeriodDates(period: Period): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  if (period === '7d')  start.setDate(end.getDate() - 7)
  if (period === '14d') start.setDate(end.getDate() - 14)
  if (period === '30d') start.setDate(end.getDate() - 30)
  return {
    start: start.toISOString().split('T')[0],
    end:   end.toISOString().split('T')[0],
  }
}

// ── Output parser ─────────────────────────────────────────────────────────
type AnalysisCard = { title: string; sub: string; body: string; actions: string[]; badge: string; badgeCls: string }

const TAB_BADGES: Record<string, { badge: string; badgeCls: string }> = {
  'Reativar agora':    { badge: 'Fazer hoje',     badgeCls: 'bg-green-100 text-green-700' },
  'Escala horizontal': { badge: 'Alto potencial', badgeCls: 'bg-blue-100 text-blue-700' },
  'Escala vertical':   { badge: 'Escalar',        badgeCls: 'bg-purple-100 text-purple-700' },
  'Novos testes':      { badge: 'Testar',         badgeCls: 'bg-amber-100 text-amber-700' },
  'O que evitar':      { badge: 'Evitar',         badgeCls: 'bg-red-100 text-red-600' },
  'Comparativo A/B':   { badge: 'Comparativo',    badgeCls: 'bg-blue-100 text-blue-700' },
  'Veredicto':         { badge: 'Veredicto',      badgeCls: 'bg-green-100 text-green-700' },
  'Próximos passos':   { badge: 'Próximo passo',  badgeCls: 'bg-amber-100 text-amber-700' },
}

function parseOutput(raw: string, tabs: string[]): AnalysisCard[][] {
  // Split by ## headings to get sections
  const sectionRegex = /^##\s+(.+)$/gm
  const sections: { name: string; content: string }[] = []

  let lastIndex = 0
  let lastMatch: RegExpExecArray | null = null

  let m: RegExpExecArray | null
  while ((m = sectionRegex.exec(raw)) !== null) {
    if (lastMatch) {
      sections.push({ name: lastMatch[1].trim(), content: raw.slice(lastIndex, m.index).trim() })
    }
    lastMatch = m
    lastIndex = m.index + m[0].length
  }
  if (lastMatch) {
    sections.push({ name: lastMatch[1].trim(), content: raw.slice(lastIndex).trim() })
  }

  // Map each tab to its parsed cards
  return tabs.map(tab => {
    const sec = sections.find(s => s.name.toLowerCase().includes(tab.toLowerCase().slice(0, 8)))
    if (!sec) return []
    return parseSection(sec.content, tab)
  })
}

function parseSection(content: string, tabName: string): AnalysisCard[] {
  const { badge, badgeCls } = TAB_BADGES[tabName] ?? { badge: 'Ação', badgeCls: 'bg-slate-100 text-slate-600' }
  const cards: AnalysisCard[] = []

  // Split into blocks by bold headings (**...**)
  const blocks = content.split(/(?=\*\*[^*]+\*\*)/).filter(b => b.trim())

  for (const block of blocks) {
    const lines = block.split('\n')
    let title = ''
    const bodyLines: string[] = []
    const actions: string[] = []

    for (const line of lines) {
      const stripped = line.trim()
      if (!stripped) continue

      // Title: **something**
      const titleMatch = stripped.match(/^\*\*(.+?)\*\*/)
      if (titleMatch && !title) {
        title = titleMatch[1].trim()
        // Rest of line after the bold
        const rest = stripped.slice(titleMatch[0].length).trim()
        if (rest) bodyLines.push(rest)
        continue
      }

      // Action item: starts with -, →, •, or digit.
      if (/^[-→•]/.test(stripped) || /^\d+\./.test(stripped)) {
        actions.push(stripped.replace(/^[-→•]\s*/, '').replace(/^\d+\.\s*/, ''))
      } else {
        bodyLines.push(stripped)
      }
    }

    if (!title && bodyLines.length > 0) {
      // No bold title — treat first line as title
      title = bodyLines.shift() ?? ''
    }

    if (!title) continue

    // First body line may be a subtitle-ish sentence (short) — use as sub
    let sub = ''
    let body = bodyLines.join(' ').trim()
    if (bodyLines.length > 1 && bodyLines[0].length < 100) {
      sub = bodyLines[0]
      body = bodyLines.slice(1).join(' ').trim()
    }

    cards.push({ title, sub, body, actions, badge, badgeCls })
  }

  return cards
}

// ── Step dot component ─────────────────────────────────────────────────────
function StepDot({ n, current }: { n: number; current: number }) {
  const done   = n < current
  const active = n === current
  return (
    <div className={cn(
      'w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 transition-all',
      active ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.3)]'
             : done   ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
    )}>
      {done ? '✓' : n}
    </div>
  )
}

function StepLine({ done }: { done: boolean }) {
  return <div className={cn('h-px w-10', done ? 'bg-green-300' : 'bg-slate-200')} />
}

// ── Radio row ──────────────────────────────────────────────────────────────
function RadioRow({ selected, onClick, label, desc }: { selected: boolean; onClick: () => void; label: string; desc?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'flex items-start gap-3 w-full text-left p-3 rounded-xl border transition-all',
        selected ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <div className={cn(
        'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
        selected ? 'border-green-600 bg-green-600' : 'border-slate-300'
      )}>
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <div>
        <div className="text-[12.5px] font-medium text-slate-800">{label}</div>
        {desc && <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>}
      </div>
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AnalisePage() {
  const [step, setStep]               = useState(1)
  const [level, setLevel]             = useState<Level | null>(null)
  const [focus, setFocus]             = useState<Focus[]>([])
  const [atype, setAtype]             = useState<AType | null>(null)
  const [stage, setStage]             = useState<Stage>('todos')
  const [period, setPeriod]           = useState<Period>('14d')
  const [abA, setAbA]                 = useState('')
  const [abB, setAbB]                 = useState('')
  const [abVar, setAbVar]             = useState('')
  const [generating, setGenerating]   = useState(false)
  const [output, setOutput]           = useState('')
  const [done, setDone]               = useState(false)
  const [activeTab, setActiveTab]     = useState(0)

  // Element search
  const [elemQuery, setElemQuery]     = useState('')
  const [elemSelected, setElemSelected] = useState<string[]>([])

  const toggleFocus = (f: string) => setFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const elemResults = ELEM_DB.filter(e => {
    if (!elemQuery.trim()) return false
    const q = elemQuery.toLowerCase()
    return e.name.toLowerCase().includes(q) || e.sub.toLowerCase().includes(q) || e.type.includes(q)
  })

  const toggleElem = (id: string) => {
    setElemSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      // auto-add type to focus
      const elem = ELEM_DB.find(e => e.id === id)
      if (elem && !focus.includes(elem.type)) setFocus(f => [...f, elem.type])
      return next
    })
  }

  const getCost = () => {
    const base = atype ? ATYPE_COSTS[atype] : 2
    const extra = focus.length > 2 ? 1 : 0
    return Math.min(base + extra, 5)
  }

  const canProceed = (s: number) => {
    if (s === 1) return !!level
    if (s === 2) return focus.length > 0 || elemSelected.length > 0
    if (s === 3) return !!atype
    return true
  }

  const generateAnalysis = async () => {
    setGenerating(true)
    setOutput('')
    setDone(false)
    setActiveTab(0)

    const { start, end } = getPeriodDates(period)
    const selectedNames = elemSelected.map(id => ELEM_DB.find(e => e.id === id)?.name).filter(Boolean)

    const res = await fetch('/api/analise/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level, focus, atype, stage,
        period_start: start, period_end: end,
        selected_elements: selectedNames,
        ab_a: abA || undefined,
        ab_b: abB || undefined,
        ab_variavel: abVar || undefined,
      }),
    })

    if (!res.body) { setGenerating(false); return }

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { value, done: streamDone } = await reader.read()
      if (streamDone) break
      const chunk = decoder.decode(value)
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') { setDone(true) }
        else { try { const p = JSON.parse(data); if (p.text) setOutput(prev => prev + p.text) } catch {} }
      }
    }
    setGenerating(false)
  }

  const reset = () => {
    setStep(1); setLevel(null); setFocus([]); setAtype(null)
    setStage('todos'); setPeriod('14d'); setOutput(''); setDone(false)
    setElemQuery(''); setElemSelected([])
  }

  const tabs = atype === 'ab' ? OUTPUT_TABS_AB : OUTPUT_TABS

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Nova análise</h1>
              <p className="text-sm text-slate-400 mt-0.5">Configure e gere análises inteligentes de campanha</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Custo estimado:</span>
              <span className="font-bold text-green-600 text-sm">{getCost()} crédito{getCost() !== 1 ? 's' : ''}</span>
              <Link href="/analise/historico" className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
                <BookOpen className="w-3.5 h-3.5" /> Histórico
              </Link>
            </div>
          </div>

          {/* Step track */}
          <div className="flex items-center gap-0 mb-8">
            {[1,2,3,4,5].map((n, i) => (
              <div key={n} className="flex items-center gap-0">
                <button onClick={() => !generating && n < step && setStep(n)}>
                  <StepDot n={n} current={step} />
                </button>
                {i < 4 && <StepLine done={n < step} />}
              </div>
            ))}
          </div>

          {/* ── Step 1 — Nível ── */}
          {step === 1 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                <span className="font-bold text-slate-900">Nível da análise</span>
                <span className="text-[12px] text-slate-400 ml-auto">Em qual nível do Meta Ads você quer focar?</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                {NIVEL_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setLevel(opt.id as Level)}
                    className={cn(
                      'text-left p-4 rounded-xl border-2 transition-all',
                      level === opt.id ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="font-semibold text-[13px] text-slate-900 mb-1">{opt.label}</div>
                    <div className="text-[11px] text-slate-400">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2 — Foco + Element search ── */}
          {step === 2 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                <span className="font-bold text-slate-900">Foco da análise</span>
                <span className="text-[12px] text-slate-400 ml-auto">Quais elementos você quer analisar? (múltipla escolha)</span>
              </div>
              <div className="p-5">
                {/* Focus cards */}
                <div className="grid grid-cols-4 gap-2.5 mb-5">
                  {FOCO_OPTIONS.map(opt => {
                    const sel = focus.includes(opt.id)
                    return (
                      <button key={opt.id} onClick={() => toggleFocus(opt.id)}
                        className={cn(
                          'text-left p-3 rounded-xl border-2 transition-all',
                          sel ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn('w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center', opt.bg, opt.text)}>{opt.icon}</span>
                          <div className={cn('w-4 h-4 rounded border-2 relative transition-all', sel ? 'border-green-600 bg-green-600' : 'border-slate-300 bg-slate-50')}>
                            {sel && <span className="absolute inset-0 flex items-center justify-center text-white text-[10px]">✓</span>}
                          </div>
                        </div>
                        <div className="font-semibold text-[12.5px] text-slate-900 mb-1">{opt.label}</div>
                        <div className="text-[10.5px] text-slate-400 leading-tight">{opt.kpis}</div>
                      </button>
                    )
                  })}
                </div>

                {/* Element search */}
                <div className="border-t border-slate-100 pt-5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Pesquisar elemento específico</div>
                  <p className="text-[11.5px] text-slate-400 mb-3">Digite o nome exato ou parte da nomenclatura — ex: &quot;quizz 1 cc&quot;, &quot;H11-2GBS&quot;</p>
                  <div className={cn(
                    'flex items-center gap-2 bg-slate-50 border rounded-xl px-4 py-3 transition-colors',
                    elemQuery ? 'border-green-300' : 'border-slate-200 focus-within:border-green-300'
                  )}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <input
                      type="text" value={elemQuery}
                      onChange={e => setElemQuery(e.target.value)}
                      placeholder="Buscar por nomenclatura — ex: C1GBNVS4MA, quizz 1 cc, H11..."
                      className="flex-1 bg-transparent text-[13.5px] text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                    {elemQuery && (
                      <button onClick={() => setElemQuery('')} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                    )}
                  </div>

                  {/* Results */}
                  {elemQuery && (
                    <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
                      {elemResults.length === 0 ? (
                        <div className="text-[12.5px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-200">
                          Nenhum elemento encontrado para &quot;{elemQuery}&quot;
                        </div>
                      ) : elemResults.map(e => {
                        const sel = elemSelected.includes(e.id)
                        const tc = TYPE_COLORS[e.type] ?? TYPE_COLORS.criativo
                        return (
                          <button key={e.id} onClick={() => toggleElem(e.id)}
                            className={cn(
                              'flex items-center gap-3 w-full text-left p-3 rounded-xl border-2 transition-all',
                              sel ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                            )}
                          >
                            <div className={cn('w-8 h-8 rounded-lg text-[11px] font-bold flex items-center justify-center flex-shrink-0', tc.bg, tc.text)}>{e.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12.5px] font-medium text-slate-800 truncate">{e.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{e.sub} · ROAS {e.roas} · CPA {e.cpa}</div>
                            </div>
                            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0', tc.bg, tc.text)}>{tc.label}</span>
                            <div className={cn('w-4 h-4 rounded border-2 flex-shrink-0 relative transition-all', sel ? 'border-green-600 bg-green-600' : 'border-slate-300')}>
                              {sel && <span className="absolute inset-0 flex items-center justify-center text-white text-[10px]">✓</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Selected pills */}
                  {elemSelected.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {elemSelected.map(id => {
                        const e = ELEM_DB.find(x => x.id === id)!
                        const tc = TYPE_COLORS[e.type] ?? TYPE_COLORS.criativo
                        return (
                          <div key={id} className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', tc.bg, tc.text)}>{e.icon}</span>
                            <span className="text-[12px] text-green-700 font-medium">{e.name.length > 28 ? e.name.substring(0, 28) + '…' : e.name}</span>
                            <button onClick={() => toggleElem(id)} className="text-green-500 hover:text-green-700 ml-0.5">×</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 — Tipo de análise ── */}
          {step === 3 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                <span className="font-bold text-slate-900">Tipo de análise</span>
                <span className="text-[12px] text-slate-400 ml-auto">Qual o objetivo desta análise?</span>
              </div>
              <div className="p-5 grid grid-cols-3 gap-3">
                {TIPO_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setAtype(opt.id as AType)}
                    className={cn(
                      'text-left p-4 rounded-xl border-2 transition-all',
                      atype === opt.id ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className={cn('font-semibold text-[13px] mb-1', atype === opt.id ? 'text-green-700' : 'text-slate-900')}>{opt.label}</div>
                    <div className="text-[11.5px] text-slate-400 leading-snug mb-2">{opt.desc}</div>
                    <span className="text-[10.5px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{opt.credits}</span>
                  </button>
                ))}
              </div>

              {/* A/B inputs */}
              {atype === 'ab' && (
                <div className="mx-5 mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Defina as variantes do teste</div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1.5">VARIANTE A</label>
                      <input value={abA} onChange={e => setAbA(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-green-400"
                        placeholder="ex: Funil HOT BR — Checkout V1" />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1.5">VARIANTE B</label>
                      <input value={abB} onChange={e => setAbB(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-green-400"
                        placeholder="ex: Funil HOT BR — Checkout V2" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1.5">VARIÁVEL SENDO TESTADA</label>
                    <input value={abVar} onChange={e => setAbVar(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-green-400"
                      placeholder="ex: Tipo de checkout, ângulo do criativo, headline da página..." />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4 — Contexto e período ── */}
          {step === 4 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
                <span className="font-bold text-slate-900">Contexto e período</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-8">
                <div>
                  <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Etapa da campanha</div>
                  <div className="space-y-2">
                    {STAGE_OPTIONS.map(opt => (
                      <RadioRow key={opt.id} selected={stage === opt.id} onClick={() => setStage(opt.id as Stage)} label={opt.label} desc={opt.desc} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Período de análise</div>
                  <div className="space-y-2">
                    {PERIOD_OPTIONS.map(opt => (
                      <RadioRow key={opt.id} selected={period === opt.id} onClick={() => setPeriod(opt.id as Period)} label={opt.label} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5 — Revisão + Output ── */}
          {step === 5 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[11px] font-bold flex items-center justify-center">5</span>
                <span className="font-bold text-slate-900">Revisão e geração</span>
              </div>
              <div className="p-5">

                {/* Review grid */}
                {!output && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Configuração selecionada</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Nível',        value: LEVEL_LABELS[level ?? ''] ?? '—' },
                        { label: 'Foco',         value: focus.map(f => FOCUS_LABELS[f]).join(', ') || '—' },
                        { label: 'Tipo',         value: ATYPE_LABELS[atype ?? ''] ?? '—' },
                        { label: 'Etapa',        value: STAGE_LABELS[stage] ?? '—' },
                        { label: 'Período',      value: PERIOD_LABELS[period] ?? '—' },
                        { label: 'Créditos',     value: `${getCost()} crédito${getCost() !== 1 ? 's' : ''}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white rounded-lg p-3 border border-slate-100">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</div>
                          <div className="text-[12.5px] font-medium text-slate-800">{value}</div>
                        </div>
                      ))}
                      {elemSelected.length > 0 && (
                        <div className="col-span-2 bg-green-50 border border-green-100 rounded-lg p-3">
                          <div className="text-[10px] font-semibold text-green-500 uppercase tracking-wide mb-1">Elementos selecionados ({elemSelected.length})</div>
                          <div className="text-[12px] text-green-700">{elemSelected.map(id => ELEM_DB.find(e => e.id === id)?.name).join(', ')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Output area */}
                {(generating || output) && (
                  <div className="mb-5">
                    {/* Status bar */}
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      {generating
                        ? <><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Claudio analisando...</>
                        : <><div className="w-1.5 h-1.5 rounded-full bg-green-500" />Análise concluída · salva no histórico</>
                      }
                    </div>

                    {/* Loading bar */}
                    {generating && (
                      <div className="h-0.5 rounded-full bg-slate-100 mb-4 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full animate-[loadSlide_1.2s_ease_infinite]" style={{ width: '60%', backgroundImage: 'linear-gradient(90deg, transparent, #16A34A, transparent)', backgroundSize: '200%', animation: 'pulse 1.5s ease infinite' }} />
                      </div>
                    )}

                    {/* Action bar (after done) */}
                    {done && (
                      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <button onClick={reset}
                          className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" /> Gerar nova análise
                        </button>
                        <button className="flex items-center gap-1.5 text-[12px] text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                          <Save className="w-3.5 h-3.5" /> Salvar na Memória
                        </button>
                        <button className="flex items-center gap-1.5 text-[12px] text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                          <GitCompare className="w-3.5 h-3.5" /> Comparar período anterior
                        </button>
                        <button onClick={() => {
                          const blob = new Blob([output], { type: 'text/plain' })
                          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'analise-claudio.txt'; a.click()
                        }} className="flex items-center gap-1.5 text-[12px] text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                          <Download className="w-3.5 h-3.5" /> Exportar análise
                        </button>
                      </div>
                    )}

                    {/* Output tabs */}
                    {done && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {tabs.map((t, i) => (
                          <button key={t} onClick={() => setActiveTab(i)}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-[11.5px] border transition-all',
                              activeTab === i
                                ? 'bg-green-50 border-green-300 text-green-700 font-medium'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            )}
                          >{t}</button>
                        ))}
                      </div>
                    )}

                    {/* Output — streaming: raw text; done: parsed cards */}
                    {generating && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 min-h-40">
                        <div className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {output}
                          <span className="inline-block w-2 h-4 bg-green-600 animate-pulse ml-0.5" />
                        </div>
                      </div>
                    )}

                    {done && (() => {
                      const parsed = parseOutput(output, tabs)
                      const cards  = parsed[activeTab] ?? []
                      return cards.length > 0 ? (
                        <div className="space-y-3">
                          {cards.map((card, i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                              {/* Card header */}
                              <div className="flex items-start justify-between gap-3 p-4 pb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13.5px] font-semibold text-slate-900 leading-snug">{card.title}</div>
                                  {card.sub && <div className="text-[11.5px] text-slate-400 mt-0.5">{card.sub}</div>}
                                </div>
                                <span className={cn('text-[10.5px] font-bold px-2.5 py-1 rounded-full flex-shrink-0', card.badgeCls)}>
                                  {card.badge}
                                </span>
                              </div>

                              {/* Card body */}
                              {card.body && (
                                <div className="px-4 pb-3 text-[12.5px] text-slate-600 leading-relaxed">
                                  {card.body}
                                </div>
                              )}

                              {/* Action list */}
                              {card.actions.length > 0 && (
                                <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                                  {card.actions.map((action, j) => (
                                    <div key={j} className="flex items-start gap-2">
                                      <span className="text-green-500 font-bold mt-0.5 flex-shrink-0 text-[12px]">→</span>
                                      <span className="text-[12.5px] text-slate-700 leading-snug">{action}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Fallback: if parsing yields nothing, show raw
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                          <div className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{output}</div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Generate button / Back */}
                {!generating && !done && (
                  <button onClick={generateAnalysis}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-[13.5px] transition-colors flex items-center justify-center gap-2">
                    Gerar análise · {getCost()} crédito{getCost() !== 1 ? 's' : ''}
                  </button>
                )}

                {generating && (
                  <div className="flex items-center justify-center gap-2 text-slate-500 text-sm py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                    Gerando análise com Claude...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          {!generating && !done && (
            <div className="flex justify-between mt-5">
              <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
                className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              {step < 5 && (
                <button onClick={() => setStep(s => s + 1)} disabled={!canProceed(step)}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl text-[13px] transition-colors">
                  Próximo →
                </button>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
