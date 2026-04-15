'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Megaphone,
  Layers,
  Image as ImageIcon,
  Globe,
  Sparkles,
  Video,
  MousePointerClick,
  ShoppingCart,
  ArrowUpRight,
  DollarSign,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Download,
  BookOpen,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

type Level = 'campanha' | 'conjunto' | 'anuncio' | '360'
type Focus = string
type AType = 'individual' | 'ab' | 'escala' | 'padroes' | 'veredicto' | '360'
type Stage = 'teste' | 'pre_escala' | 'escala' | 'todos'

const NIVEL_OPTIONS = [
  { id: 'campanha', label: 'Campanha', icon: Megaphone, desc: 'Análise no nível de campanhas' },
  { id: 'conjunto', label: 'Conjunto de Anúncios', icon: Layers, desc: 'Análise de conjuntos' },
  { id: 'anuncio', label: 'Anúncio', icon: ImageIcon, desc: 'Análise individual de anúncios' },
  { id: '360', label: '360° — Todos os níveis', icon: Globe, desc: 'Visão completa da operação' },
]

const FOCO_OPTIONS = [
  { id: 'criativo', label: 'Criativo', icon: ImageIcon },
  { id: 'hook', label: 'Hook', icon: Zap },
  { id: 'funil', label: 'Funil', icon: Layers },
  { id: 'pagina_de_vendas', label: 'Página de vendas', icon: MousePointerClick },
  { id: 'vsl', label: 'VSL', icon: Video },
  { id: 'checkout', label: 'Checkout', icon: ShoppingCart },
  { id: 'upsell', label: 'Upsell', icon: ArrowUpRight },
  { id: 'orcamento', label: 'Orçamento', icon: DollarSign },
]

const TIPO_OPTIONS = [
  { id: 'individual', label: 'Individual', desc: 'Análise de um elemento específico' },
  { id: 'ab', label: 'Teste A/B', desc: 'Comparar variantes' },
  { id: 'escala', label: 'Escala', desc: 'Oportunidades de escalada' },
  { id: 'padroes', label: 'Padrões', desc: 'Padrões recorrentes' },
  { id: 'veredicto', label: 'Veredicto', desc: 'Decisão sobre continuar ou pausar' },
  { id: '360', label: '360°', desc: 'Análise completa' },
]

const STAGE_OPTIONS = [
  { id: 'teste', label: 'Teste' },
  { id: 'pre_escala', label: 'Pré-escala' },
  { id: 'escala', label: 'Escala' },
  { id: 'todos', label: 'Todos' },
]

const PERIOD_OPTIONS = [
  { id: '7', label: '7 dias' },
  { id: '14', label: '14 dias' },
  { id: '30', label: '30 dias' },
]

function StepCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-colors',
        selected
          ? 'border-green-600 bg-green-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      {children}
    </button>
  )
}

export default function AnalisePage() {
  const [step, setStep] = useState(1)
  const [level, setLevel] = useState<Level | null>(null)
  const [focus, setFocus] = useState<Focus[]>([])
  const [atype, setAtype] = useState<AType | null>(null)
  const [stage, setStage] = useState<Stage>('todos')
  const [periodDays, setPeriodDays] = useState('30')
  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState('')
  const [done, setDone] = useState(false)

  const toggleFocus = (f: string) => {
    setFocus((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))
  }

  const getPeriodDates = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - parseInt(periodDays))
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }

  const generateAnalysis = async () => {
    setGenerating(true)
    setOutput('')
    setDone(false)

    const { start, end } = getPeriodDates()

    const res = await fetch('/api/analise/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        focus,
        atype,
        stage,
        period_start: start,
        period_end: end,
        selected_elements: [],
      }),
    })

    if (!res.body) {
      setGenerating(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { value, done: streamDone } = await reader.read()
      if (streamDone) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            setDone(true)
          } else {
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) setOutput((prev) => prev + parsed.text)
            } catch {}
          }
        }
      }
    }

    setGenerating(false)
  }

  const STEPS = ['Nível', 'Foco', 'Tipo', 'Contexto', 'Gerar']

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Análise IA</h1>
              <p className="text-sm text-slate-500 mt-1">Configure e gere análises inteligentes com Claude</p>
            </div>
            <Link href="/analise/historico">
              <Button variant="outline" size="sm" className="gap-2">
                <BookOpen className="w-4 h-4" /> Histórico
              </Button>
            </Link>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <button
                  onClick={() => !generating && i + 1 < step && setStep(i + 1)}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    step === i + 1 ? 'font-semibold text-green-700' : i + 1 < step ? 'text-slate-500 hover:text-slate-700 cursor-pointer' : 'text-slate-300'
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold',
                      step === i + 1
                        ? 'bg-green-600 text-white'
                        : i + 1 < step
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-300'
                    )}
                  >
                    {i + 1 < step ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-200" />}
              </div>
            ))}
          </div>

          {/* Step 1 — Nível */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Qual nível deseja analisar?</h2>
              <div className="grid grid-cols-2 gap-3">
                {NIVEL_OPTIONS.map((opt) => (
                  <StepCard key={opt.id} selected={level === opt.id} onClick={() => setLevel(opt.id as Level)}>
                    <div className="flex items-start gap-3">
                      <opt.icon className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900">{opt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  </StepCard>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Foco */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Qual o foco da análise?</h2>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {FOCO_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleFocus(opt.id)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-center transition-colors',
                      focus.includes(opt.id)
                        ? 'border-green-600 bg-green-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <opt.icon className={cn('w-5 h-5 mx-auto mb-2', focus.includes(opt.id) ? 'text-green-600' : 'text-slate-400')} />
                    <p className="text-xs font-medium text-slate-700">{opt.label}</p>
                  </button>
                ))}
              </div>
              {focus.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {focus.map((f) => (
                    <Badge key={f} variant="secondary" className="bg-green-100 text-green-700 cursor-pointer" onClick={() => toggleFocus(f)}>
                      {FOCO_OPTIONS.find((o) => o.id === f)?.label} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Tipo */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Tipo de análise</h2>
              <div className="grid grid-cols-2 gap-3">
                {TIPO_OPTIONS.map((opt) => (
                  <StepCard key={opt.id} selected={atype === opt.id} onClick={() => setAtype(opt.id as AType)}>
                    <p className="font-medium text-slate-900">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </StepCard>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Contexto */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Etapa da campanha</h2>
                <div className="flex gap-2">
                  {STAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setStage(opt.id as Stage)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                        stage === opt.id
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Período de análise</h2>
                <div className="flex gap-2">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPeriodDays(opt.id)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                        periodDays === opt.id
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Gerar */}
          {step === 5 && (
            <div>
              {!generating && !output && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">Revisão</h2>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { label: 'Nível', value: NIVEL_OPTIONS.find((o) => o.id === level)?.label ?? '-' },
                      { label: 'Foco', value: focus.map((f) => FOCO_OPTIONS.find((o) => o.id === f)?.label).join(', ') || '-' },
                      { label: 'Tipo', value: TIPO_OPTIONS.find((o) => o.id === atype)?.label ?? '-' },
                      { label: 'Etapa', value: STAGE_OPTIONS.find((o) => o.id === stage)?.label ?? '-' },
                      { label: 'Período', value: `${periodDays} dias` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                        <p className="text-sm font-medium text-slate-900 mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={generateAnalysis}
                    className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 h-12 text-base"
                  >
                    <Sparkles className="w-5 h-5" /> Gerar análise
                  </Button>
                </div>
              )}

              {(generating || output) && (
                <div>
                  {generating && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                      <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                      Gerando análise com Claude...
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-slate-200 p-6 min-h-64">
                    <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                      {output}
                      {generating && <span className="inline-block w-2 h-4 bg-green-600 animate-pulse ml-0.5" />}
                    </div>
                  </div>

                  {done && (
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => { setOutput(''); setDone(false); setStep(1) }}
                      >
                        <RotateCcw className="w-4 h-4" /> Nova análise
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          const blob = new Blob([output], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = 'analise-claudio.txt'
                          a.click()
                        }}
                      >
                        <Download className="w-4 h-4" /> Exportar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          {!generating && !done && (
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
                ← Voltar
              </Button>
              {step < 5 && (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={
                    (step === 1 && !level) ||
                    (step === 2 && focus.length === 0) ||
                    (step === 3 && !atype)
                  }
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Continuar →
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
