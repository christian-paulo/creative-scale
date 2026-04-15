'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Check, Loader2, CheckCircle2, X, Plus, Info, AlertTriangle, ChevronRight, Sparkles } from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Contexto da operação', sub: 'Mercado, volume e plataformas' },
  { id: 2, label: 'Fonte de dados', sub: 'UTMify ou plataforma' },
  { id: 3, label: 'Nomenclatura', sub: 'Como você nomeia campanhas' },
  { id: 4, label: 'Identificação', sub: 'Siglas de elementos' },
  { id: 5, label: 'Benchmarks', sub: 'O que é performar bem' },
  { id: 6, label: 'Plano', sub: 'Starter, Pro ou Agency' },
]

const MERCADOS = ['Info-produto', 'Nutraceutico', 'E-commerce', 'SaaS', 'Serviços', 'Outro']
const VOLUMES = [
  'Até R$5k/mês',
  'R$5k – R$20k',
  'R$20k – R$50k',
  'R$50k – R$100k',
  'Acima de R$100k',
]
const PLATAFORMAS = ['META Ads', 'Google Ads', 'TikTok Ads', 'Kwai Ads']

const BLOCKS_CAMPANHA = [
  { id: 'etapa',     label: '[ETAPA]',     color: 'bg-green-100 text-green-700',   desc: 'TC, PE, GB...' },
  { id: 'conta',     label: '[CONTA]',     color: 'bg-blue-100 text-blue-700',     desc: 'BMX04, BM4CA1...' },
  { id: 'audiencia', label: '[AUDIÊNCIA]', color: 'bg-purple-100 text-purple-700', desc: 'TC1, PE1...' },
  { id: 'orcamento', label: '[ORÇAMENTO]', color: 'bg-amber-100 text-amber-700',   desc: 'CBO, ABO...' },
  { id: 'checkout',  label: '[CHECKOUT]',  color: 'bg-red-100 text-red-700',       desc: 'HOT BR, WPP...' },
  { id: 'produto',   label: '[PRODUTO]',   color: 'bg-green-100 text-green-800',   desc: 'GB, CC...' },
]
const BLOCKS_CONJUNTO = [
  { id: 'publico',   label: '[PÚBLICO]',   color: 'bg-purple-100 text-purple-700', desc: 'TC1, BROAD...' },
  { id: 'variacao',  label: '[VARIAÇÃO]',  color: 'bg-slate-100 text-slate-700',   desc: '1-1-1, 1-5-1...' },
  { id: 'lance',     label: '[LANCE]',     color: 'bg-amber-100 text-amber-700',   desc: 'BIDCAP, AUTO...' },
  { id: 'segmento',  label: '[SEGMENTO]',  color: 'bg-blue-100 text-blue-700',     desc: 'HOT, COLD, LAL...' },
]
const BLOCKS_ANUNCIO = [
  { id: 'criativo',  label: '[CRIATIVO]',  color: 'bg-purple-100 text-purple-700', desc: 'C1, H4...' },
  { id: 'hook',      label: '[HOOK]',      color: 'bg-blue-100 text-blue-700',     desc: 'H11, H14...' },
  { id: 'iteracao',  label: '[ITERAÇÃO]',  color: 'bg-slate-100 text-slate-700',   desc: 'RETAKE2, V2...' },
]

const BLOCK_EXAMPLES: Record<string, string> = {
  etapa: '[GB]', conta: '[BMX04]', audiencia: '[TC1]', orcamento: '[CBO]',
  checkout: '[HOT BR]', produto: '[GB]', publico: '[TC1]', variacao: '[1-1-1]',
  lance: '[BIDCAP]', segmento: '[HOT]', criativo: 'C1GBNVS4MA', hook: 'H11-2GBS2JU', iteracao: 'RETAKE2',
}
const BLOCK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  etapa:     { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Etapa' },
  conta:     { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Conta' },
  audiencia: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Audiência' },
  orcamento: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Orçamento' },
  checkout:  { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Checkout' },
  produto:   { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Produto' },
  publico:   { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Público' },
  variacao:  { bg: 'bg-slate-100',  text: 'text-slate-700',  label: 'Variação' },
  lance:     { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Lance' },
  segmento:  { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Segmento' },
  criativo:  { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Criativo' },
  hook:      { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Hook' },
  iteracao:  { bg: 'bg-slate-100',  text: 'text-slate-700',  label: 'Iteração' },
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
        selected
          ? 'bg-green-600 text-white border-green-600'
          : 'bg-white text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-700'
      )}
    >
      {label}
    </button>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-green-50 border border-green-100 rounded-xl p-4 mb-5 text-sm text-slate-600 leading-relaxed">
      <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

function NomBlock({
  block,
  onRemove,
}: {
  block: { id: string; label: string; color: string }
  onRemove: () => void
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold',
        block.color
      )}
    >
      {block.label}
      <button
        type="button"
        onClick={onRemove}
        className="opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

function ParsePreview({
  nomCampanha,
  nomAnuncio,
}: {
  nomCampanha: string[]
  nomAnuncio: string[]
}) {
  const campParts = nomCampanha.map((id) => BLOCK_EXAMPLES[id] || '').filter(Boolean)
  const anunParts = nomAnuncio.map((id) => BLOCK_EXAMPLES[id] || '').filter(Boolean)
  const example =
    campParts.join('') +
    (anunParts.length ? ' → Anúncio: ' + anunParts.join('-') : '')

  const allBlocks = [
    ...nomCampanha.map((id) => ({ id, prefix: '' })),
    ...nomAnuncio.map((id) => ({ id, prefix: 'Anúncio · ' })),
  ]

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
        Preview — como o sistema interpretaria esta nomenclatura
      </p>
      <p className="font-mono text-sm text-slate-600 mb-3 leading-relaxed">
        {example || '[configure os blocos acima]'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {allBlocks.map(({ id, prefix }) => {
          const c = BLOCK_COLORS[id]
          if (!c) return null
          return (
            <span
              key={id}
              className={cn('text-xs px-2 py-1 rounded-lg', c.bg, c.text)}
            >
              {prefix}{c.label}: {BLOCK_EXAMPLES[id]}
            </span>
          )
        })}
        {allBlocks.length === 0 && (
          <span className="text-xs text-slate-400">Configure os blocos para ver o preview</span>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [mercado, setMercado] = useState('')
  const [volume, setVolume] = useState('')
  const [plataformas, setPlataformas] = useState<string[]>([])

  // Step 2
  const [dataSource, setDataSource] = useState<'utmify' | 'platform' | 'manual'>('utmify')
  const [utmifyKey, setUtmifyKey] = useState('')
  const [utmifyToken, setUtmifyToken] = useState('')
  const [utmifyStatus, setUtmifyStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [utmifyCount, setUtmifyCount] = useState(0)
  const [utmifyError, setUtmifyError] = useState('')
  // Manual benchmarks (step 2 if manual)
  const [manualBench, setManualBench] = useState({
    ticket: '', cpa: '', roas: '', icr: '', ctr: '', margem: '',
  })

  // Step 3 — nomenclature builder
  const [nomCampanha, setNomCampanha] = useState(['etapa', 'conta', 'audiencia', 'orcamento', 'checkout'])
  const [nomConjunto, setNomConjunto] = useState<string[]>([])
  const [nomAnuncio, setNomAnuncio] = useState(['criativo', 'hook'])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>('A')

  // Step 4
  const [siglas, setSiglas] = useState({
    criativo: 'C', hook: 'H', funil: 'F', vsl: 'V', upsell: 'U', pagina: 'P',
  })
  const [etapaTeste, setEtapaTeste] = useState('TC, TC1, TESTE')
  const [etapaPre, setEtapaPre] = useState('PE, PE1, PE2')
  const [etapaEscala, setEtapaEscala] = useState('GB, GBW, EC, ONGOING')

  // Step 5
  const [benchmarks, setBenchmarks] = useState({
    ticket_medio: 197, cpa_saudavel: 35, roas_minimo: 2.0, icr_saudavel: 3.5, ctr_saudavel: 1.8,
  })
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(false)

  // Step 6
  const [plano, setPlano] = useState<'starter' | 'pro' | 'agency'>('pro')

  // Success summary
  const [syncCount, setSyncCount] = useState<number | null>(null)

  useEffect(() => {
    async function loadWorkspace() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single()
      if (data) setWorkspaceId(data.id)
    }
    loadWorkspace()
  }, [])

  const togglePlataforma = (p: string) =>
    setPlataformas((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])

  // ── UTMify test ──
  const testUtmify = async () => {
    setUtmifyStatus('testing')
    setUtmifyError('')
    try {
      const res = await fetch('/api/utmify/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: utmifyKey.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setUtmifyStatus('ok')
        setUtmifyCount(data.campaigns_count ?? 0)
        if (data.token) setUtmifyToken(data.token)
      } else {
        setUtmifyStatus('error')
        setUtmifyError(data.error ?? 'API key inválida. Verifique e tente novamente.')
      }
    } catch {
      setUtmifyStatus('error')
      setUtmifyError('Erro de conexão. Verifique sua internet e tente novamente.')
    }
  }

  // ── Nomenclature builder ──
  function toggleBlock(level: 'campanha' | 'conjunto' | 'anuncio', id: string) {
    const setters = { campanha: setNomCampanha, conjunto: setNomConjunto, anuncio: setNomAnuncio }
    const current = { campanha: nomCampanha, conjunto: nomConjunto, anuncio: nomAnuncio }[level]
    const set = setters[level]
    if (current.includes(id)) {
      set(current.filter((x) => x !== id))
    } else {
      set([...current, id])
    }
    setSelectedTemplate(null)
  }

  function applyTemplate(tmpl: 'A' | 'B' | 'custom') {
    setSelectedTemplate(tmpl)
    if (tmpl === 'A') {
      setNomCampanha(['etapa', 'conta', 'audiencia', 'orcamento', 'checkout'])
      setNomConjunto(['publico', 'variacao'])
      setNomAnuncio(['criativo', 'hook'])
    } else if (tmpl === 'B') {
      setNomCampanha(['produto', 'etapa', 'conta', 'checkout'])
      setNomConjunto(['publico', 'lance'])
      setNomAnuncio(['criativo', 'hook', 'iteracao'])
    } else {
      setNomCampanha([])
      setNomConjunto([])
      setNomAnuncio([])
    }
  }

  // ── Save steps ──
  const saveStep1 = async () => {
    if (!workspaceId) return
    await supabase.from('workspaces').update({ mercado, volume_mensal: volume, plataformas }).eq('id', workspaceId)
  }

  const saveStep2 = async () => {
    if (!workspaceId) return
    const tokenToSave = dataSource === 'utmify' ? (utmifyToken || utmifyKey).trim() : null
    await supabase.from('workspaces').update({
      data_source: dataSource,
      utmify_api_key: tokenToSave,
      utmify_connected: utmifyStatus === 'ok',
    }).eq('id', workspaceId)
  }

  const saveStep3 = async () => {
    if (!workspaceId) return
    for (const rule of [
      { level: 'campaign', template: nomCampanha, separator: '-' },
      { level: 'adset',    template: nomConjunto, separator: '-' },
      { level: 'ad',       template: nomAnuncio,  separator: '-' },
    ]) {
      await supabase.from('nomenclature_rules').upsert(
        { workspace_id: workspaceId, ...rule },
        { onConflict: 'workspace_id,level' }
      )
    }
  }

  const saveStep4 = async () => {
    if (!workspaceId) return
    await supabase.from('element_siglas').delete().eq('workspace_id', workspaceId)
    await supabase.from('element_siglas').insert(
      Object.entries(siglas).map(([tipo, sigla]) => ({ workspace_id: workspaceId, tipo, sigla }))
    )
    await supabase.from('stage_identifiers').delete().eq('workspace_id', workspaceId)
    await supabase.from('stage_identifiers').insert([
      { workspace_id: workspaceId, stage: 'teste',     identifiers: etapaTeste.split(',').map((s) => s.trim()).filter(Boolean) },
      { workspace_id: workspaceId, stage: 'pre_escala', identifiers: etapaPre.split(',').map((s) => s.trim()).filter(Boolean) },
      { workspace_id: workspaceId, stage: 'escala',    identifiers: etapaEscala.split(',').map((s) => s.trim()).filter(Boolean) },
    ])
  }

  const saveStep5 = async () => {
    if (!workspaceId) return
    await supabase.from('benchmarks').upsert(
      { workspace_id: workspaceId, ...benchmarks },
      { onConflict: 'workspace_id' }
    )
  }

  const loadBenchmarksFromUtmify = async () => {
    setLoadingBenchmarks(true)
    try {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const res = await fetch(`/api/utmify/metrics?start=${start}&end=${end}&level=campaigns`)
      const data = await res.json()
      if (data?.summary) {
        const s = data.summary
        setBenchmarks((prev) => ({
          ...prev,
          cpa_saudavel: s.cpa ? Math.round(s.cpa * 0.9) : prev.cpa_saudavel,
          roas_minimo: s.roas ? parseFloat((s.roas * 0.7).toFixed(2)) : prev.roas_minimo,
        }))
      }
    } catch {}
    setLoadingBenchmarks(false)
  }

  const finishOnboarding = async () => {
    setSaving(true)
    try {
      await saveStep5()
      if (workspaceId) {
        await supabase.from('workspaces').update({ onboarding_done: true }).eq('id', workspaceId)
        fetch('/api/utmify/sync', { method: 'POST' })
          .then((r) => r.json())
          .then((d) => setSyncCount(d.synced ?? 0))
          .catch(() => setSyncCount(0))
      }
      setDone(true)
    } finally {
      setSaving(false)
    }
  }

  const next = async () => {
    setSaving(true)
    try {
      if (step === 1) await saveStep1()
      if (step === 2) await saveStep2()
      if (step === 3) await saveStep3()
      if (step === 4) await saveStep4()
      if (step === 5) await saveStep5()
      if (step === 6) { await finishOnboarding(); return }
      setStep((s) => Math.min(6, s + 1))
    } catch (err) {
      console.error('Save error:', err)
      if (step < 6) setStep((s) => Math.min(6, s + 1))
    } finally {
      setSaving(false)
    }
  }

  const prev = () => setStep((s) => Math.max(1, s - 1))
  const skip = async () => {
    if (step === 6) {
      // Last step — skip just marks onboarding as done and finishes
      setSaving(true)
      try {
        if (workspaceId) {
          await supabase.from('workspaces').update({ onboarding_done: true }).eq('id', workspaceId)
        }
        setDone(true)
      } finally {
        setSaving(false)
      }
      return
    }
    setStep((s) => Math.min(6, s + 1))
  }

  // ── Success screen ──
  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Tudo configurado.</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            O Claudio já está puxando os dados dos últimos 90 dias via UTMify. Sua Biblioteca vai ser populada automaticamente nos próximos minutos.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: syncCount !== null ? syncCount.toString() : '…', label: 'Elementos identificados' },
              { value: '2', label: 'Análises gratuitas' },
              { value: plano.charAt(0).toUpperCase() + plano.slice(1), label: 'Plano selecionado' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-2xl font-bold text-green-600">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <Button
            onClick={() => { router.push('/dashboard'); router.refresh() }}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base gap-2"
          >
            Acessar o Claudio <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Sidebar ── */}
      <aside className="w-72 min-w-[288px] bg-white border-r border-slate-200 p-8 flex flex-col sticky top-0 h-screen">
        <div className="mb-8">
          <span className="text-2xl font-bold text-green-600">claudio</span>
          <p className="text-xs text-slate-400 mt-1">Configuração inicial</p>
        </div>

        <div className="flex-1 space-y-1">
          {STEPS.map((s, idx) => {
            const isDone = s.id < step
            const isActive = s.id === step
            return (
              <div key={s.id}>
                <button
                  type="button"
                  onClick={() => isDone && setStep(s.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    isActive ? 'bg-green-50' : isDone ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
                    isDone ? 'bg-green-600 text-white' : isActive ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'
                  )}>
                    {isDone ? <Check className="w-3 h-3" /> : s.id}
                  </div>
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-green-700' : isDone ? 'text-slate-500' : 'text-slate-400'
                    )}>{s.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={cn('w-px h-4 ml-6 my-0.5', isDone ? 'bg-green-300' : 'bg-slate-100')} />
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t border-slate-100 mt-4">
          <Progress value={(step / 6) * 100} className="h-1.5 mb-2" />
          <p className="text-xs text-slate-400">Passo {step} de 6</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="flex items-center justify-between px-10 pt-6 pb-0">
          <div className="flex-1" />
          <button
            type="button"
            onClick={skip}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Pular esta etapa
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-10 py-8 overflow-y-auto">
          <div className="max-w-2xl">

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Passo 1 · Contexto da operação</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Bem-vindo ao Claudio.<br />Vamos configurar sua operação.</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">Em 6 passos rápidos, o Claudio vai aprender como sua operação funciona para que todas as análises sejam precisas e contextualizadas.</p>

                <div className="space-y-5">
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="font-semibold text-slate-900 mb-1">Qual é o seu mercado?</p>
                    <p className="text-xs text-slate-500 mb-4">Define os benchmarks padrão e os tipos de análise mais relevantes para você.</p>
                    <div className="flex flex-wrap gap-2">
                      {MERCADOS.map((m) => <Chip key={m} label={m} selected={mercado === m} onClick={() => setMercado(m)} />)}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="font-semibold text-slate-900 mb-1">Volume mensal de investimento em anúncios</p>
                    <p className="text-xs text-slate-500 mb-4">Usado para calibrar alertas e benchmarks de budget.</p>
                    <div className="flex flex-wrap gap-2">
                      {VOLUMES.map((v) => <Chip key={v} label={v} selected={volume === v} onClick={() => setVolume(v)} />)}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="font-semibold text-slate-900 mb-1">Plataformas que você usa</p>
                    <p className="text-xs text-slate-500 mb-4">Múltipla escolha — conectaremos as integrações disponíveis.</p>
                    <div className="flex flex-wrap gap-2">
                      {PLATAFORMAS.map((p) => (
                        <Chip key={p} label={p} selected={plataformas.includes(p)} onClick={() => togglePlataforma(p)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Passo 2 · Fonte de dados</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Como vamos capturar os dados da sua operação?</h2>
                <p className="text-slate-500 mb-8">O Claudio precisa de uma fonte de dados para calcular benchmarks reais e gerar análises precisas.</p>

                <div className="space-y-3 mb-6">
                  {[
                    {
                      id: 'utmify' as const,
                      label: 'UTMify — Recomendado',
                      desc: 'Integração completa com dados de campanha, conversão, receita, ticket e reembolso. Benchmarks calculados automaticamente. Biblioteca populada via sync automático.',
                    },
                    {
                      id: 'platform' as const,
                      label: 'Direto da plataforma (META / Google)',
                      desc: 'Leitura dos dados direto do pixel e da conta de anúncios. Funciona se o evento de Purchase estiver configurado com valor. Benchmarks menos precisos sem tracker externo.',
                    },
                    {
                      id: 'manual' as const,
                      label: 'Configuração manual de benchmarks',
                      desc: 'Você define os benchmarks da operação manualmente. Ideal para quem tem métricas internas muito específicas ou ainda não usa tracker externo.',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDataSource(opt.id)}
                      className={cn(
                        'w-full text-left p-4 rounded-xl border-2 transition-colors flex gap-3',
                        dataSource === opt.id ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                        dataSource === opt.id ? 'border-green-600 bg-green-600' : 'border-slate-300'
                      )}>
                        {dataSource === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{opt.label}</p>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {dataSource === 'utmify' && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="font-semibold text-slate-900 mb-1">Conectar UTMify</p>
                    <p className="text-sm text-slate-500 mb-4">Cole o token de API REST da UTMify. Encontre em: <strong>UTMify → Configurações → API → Chave de API</strong>. Não use a URL MCP do Claude/ChatGPT — esse é um token diferente.</p>
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="Cole aqui o token de API REST da UTMify"
                        value={utmifyKey}
                        onChange={(e) => {
                          setUtmifyKey(e.target.value)
                          if (utmifyStatus !== 'idle') { setUtmifyStatus('idle'); setUtmifyError('') }
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={testUtmify}
                        disabled={!utmifyKey.trim() || utmifyStatus === 'testing'}
                        className="shrink-0"
                      >
                        {utmifyStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Testar conexão'}
                      </Button>
                    </div>
                    {utmifyStatus === 'ok' && (
                      <p className="text-sm text-green-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Conectado com sucesso — {utmifyCount > 0 ? `${utmifyCount.toLocaleString('pt-BR')} campanhas encontradas nos últimos 90 dias` : 'conta verificada'}
                      </p>
                    )}
                    {utmifyStatus === 'testing' && (
                      <p className="text-sm text-slate-400">Verificando conexão com UTMify...</p>
                    )}
                    {utmifyStatus === 'error' && (
                      <p className="text-sm text-red-500 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {utmifyError}
                      </p>
                    )}
                  </div>
                )}

                {dataSource === 'manual' && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="font-semibold text-slate-900 mb-1">Defina os benchmarks da sua operação</p>
                    <p className="text-sm text-slate-500 mb-4">Esses valores são usados como referência para todos os veredictos e alertas.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'ticket', label: 'Ticket médio (R$)', placeholder: '197' },
                        { key: 'cpa', label: 'CPA máximo saudável (R$)', placeholder: '35' },
                        { key: 'roas', label: 'ROAS mínimo (×)', placeholder: '2.0' },
                        { key: 'icr', label: 'ICR saudável (%)', placeholder: '3.5' },
                        { key: 'ctr', label: 'CTR saudável (%)', placeholder: '1.8' },
                        { key: 'margem', label: 'Margem de lucro (%)', placeholder: '38' },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{label}</Label>
                          <Input
                            type="number"
                            placeholder={placeholder}
                            value={manualBench[key as keyof typeof manualBench]}
                            onChange={(e) => setManualBench((p) => ({ ...p, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Passo 3 · Nomenclatura de campanhas</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Como você nomeia suas campanhas?</h2>
                <p className="text-slate-500 mb-6 leading-relaxed">O Claudio usa esse padrão para identificar automaticamente etapa, conta, audiência e outras informações de cada campanha.</p>

                <InfoBox>
                  Configure separadamente para <strong>Campanha</strong>, <strong>Conjunto de anúncios</strong> e <strong>Anúncio</strong>. O identificador de criativo e hook vive <strong>apenas no nível de anúncio</strong>.
                </InfoBox>

                {/* Templates */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                  <p className="font-semibold text-slate-900 mb-1">Começar com um template</p>
                  <p className="text-xs text-slate-500 mb-4">Baseados na metodologia do Claudio. Você pode personalizar depois.</p>
                  <div className="space-y-2">
                    {[
                      {
                        id: 'A',
                        label: 'Template A — Direct Response',
                        camp: '[ETAPA][CONTA][AUDIÊNCIA][ORÇAMENTO][CHECKOUT]',
                        ad: '[CRIATIVO]-[HOOK]',
                      },
                      {
                        id: 'B',
                        label: 'Template B — Produto + Etapa',
                        camp: '[PRODUTO][ETAPA][CONTA][CHECKOUT]',
                        ad: '[CRIATIVO]-[HOOK]-[ITERAÇÃO]',
                      },
                      {
                        id: 'custom',
                        label: 'Configurar do zero',
                        camp: '',
                        ad: '',
                      },
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl.id as 'A' | 'B' | 'custom')}
                        className={cn(
                          'w-full text-left flex gap-3 p-3 rounded-lg border transition-colors',
                          selectedTemplate === tpl.id ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                          selectedTemplate === tpl.id ? 'border-green-600 bg-green-600' : 'border-slate-300'
                        )}>
                          {selectedTemplate === tpl.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{tpl.label}</p>
                          {tpl.camp && (
                            <>
                              <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-1 inline-block">{tpl.camp}</code>
                              <br />
                              <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-1 inline-block">Anúncio: {tpl.ad}</code>
                            </>
                          )}
                          {!tpl.camp && <p className="text-xs text-slate-400 mt-0.5">Monte os blocos do jeito que você já usa hoje.</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Builders */}
                {[
                  { level: 'campanha' as const, label: 'Nível: Campanha', blocks: BLOCKS_CAMPANHA, current: nomCampanha, optional: false },
                  { level: 'conjunto' as const, label: 'Nível: Conjunto de anúncios', blocks: BLOCKS_CONJUNTO, current: nomConjunto, optional: true },
                  { level: 'anuncio' as const, label: 'Nível: Anúncio', blocks: BLOCKS_ANUNCIO, current: nomAnuncio, optional: false },
                ].map(({ level, label, blocks, current, optional }) => (
                  <div key={level} className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                    <p className="font-semibold text-slate-900 mb-0.5">
                      {label}
                      {optional && <span className="text-xs font-normal text-slate-400 ml-2">· opcional</span>}
                      {level === 'anuncio' && <span className="text-xs font-normal text-green-600 ml-2">· onde criativo e hook são identificados</span>}
                    </p>
                    <p className="text-xs text-slate-500 mb-3">
                      {optional ? 'Deixe vazio se não usar nomenclatura estruturada aqui.' : 'Clique para adicionar ou remover blocos.'}
                    </p>

                    {/* Active blocks */}
                    <div className={cn(
                      'min-h-[44px] rounded-lg border-2 border-dashed p-2 flex flex-wrap gap-1.5 items-center mb-3 transition-colors',
                      current.length > 0 ? 'border-slate-200 bg-slate-50' : 'border-slate-100'
                    )}>
                      {current.length === 0 && (
                        <span className="text-xs text-slate-400">
                          {optional ? 'Arraste blocos aqui — ou deixe vazio se não usar...' : 'Clique nos blocos abaixo para adicionar...'}
                        </span>
                      )}
                      {current.map((id) => {
                        const b = blocks.find((x) => x.id === id)
                        if (!b) return null
                        return (
                          <NomBlock key={id} block={b} onRemove={() => toggleBlock(level, id)} />
                        )
                      })}
                    </div>

                    {/* Palette */}
                    <div className="flex flex-wrap gap-1.5">
                      {blocks.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleBlock(level, b.id)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                            current.includes(b.id)
                              ? cn(b.color, 'opacity-30 cursor-not-allowed border-transparent')
                              : cn(b.color, 'border-transparent hover:opacity-80')
                          )}
                          disabled={current.includes(b.id)}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <ParsePreview nomCampanha={nomCampanha} nomAnuncio={nomAnuncio} />
              </div>
            )}

            {/* ── Step 4 ── */}
            {step === 4 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Passo 4 · Identificação de elementos</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Como você identifica cada tipo de elemento na nomenclatura?</h2>
                <p className="text-slate-500 mb-6 leading-relaxed">Define as siglas que o Claudio vai usar para reconhecer automaticamente criativos, hooks, funis e outros elementos dentro dos nomes de anúncio.</p>

                <InfoBox>
                  Exemplo: se você usa <strong>"C1GBNVS4MA"</strong>, a sigla <strong>"C"</strong> identifica o criativo. <strong>"H11"</strong> — a sigla <strong>"H"</strong> identifica o hook. O sistema usa isso para separar automaticamente os elementos no nível de anúncio.
                </InfoBox>

                <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                  <p className="font-semibold text-slate-900 mb-1">Siglas de identificação</p>
                  <p className="text-xs text-slate-500 mb-4">Informe qual sigla/prefixo você usa para cada tipo de elemento. Deixe em branco se não usar.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'criativo', label: 'Criativo' },
                      { key: 'hook', label: 'Hook' },
                      { key: 'funil', label: 'Funil' },
                      { key: 'vsl', label: 'VSL' },
                      { key: 'upsell', label: 'Upsell' },
                      { key: 'pagina', label: 'Página de vendas' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Input
                          value={siglas[key as keyof typeof siglas]}
                          onChange={(e) => setSiglas((p) => ({ ...p, [key]: e.target.value.toUpperCase() }))}
                          className="h-9 w-16 text-center font-mono font-bold text-sm"
                          maxLength={3}
                        />
                        <span className="text-slate-400 text-sm">=</span>
                        <span className="text-sm text-slate-700">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                  <p className="font-semibold text-slate-900 mb-1">Identificadores de etapa de campanha</p>
                  <p className="text-xs text-slate-500 mb-4">Informe como você indica cada etapa na nomenclatura de campanha. Separe múltiplos com vírgula.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Teste de criativo', value: etapaTeste, onChange: setEtapaTeste, placeholder: 'TC, TC1, TESTE' },
                      { label: 'Pré-escala', value: etapaPre, onChange: setEtapaPre, placeholder: 'PE, PE1, PE2' },
                      { label: 'Escala', value: etapaEscala, onChange: setEtapaEscala, placeholder: 'GB, GBW, EC, ONGOING' },
                    ].map(({ label, value, onChange, placeholder }) => (
                      <div key={label}>
                        <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{label}</Label>
                        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="font-mono text-sm" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parse preview with element identification */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Preview — identificação de elementos</p>
                  <p className="font-mono text-sm text-slate-600 mb-3">
                    [GB][BMX04][TC1][CBO][HOT BR] → Anúncio:{' '}
                    <span className="text-purple-600 font-semibold">{siglas.criativo}1</span>GBNVS4MA-
                    <span className="text-blue-600 font-semibold">{siglas.hook}11</span>-2GBS2JU
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700">Etapa: Escala (GB)</span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-blue-100 text-blue-700">Conta: BMX04</span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-purple-100 text-purple-700">Criativo: {siglas.criativo}1GBNVS4MA</span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-blue-100 text-blue-700">Hook: {siglas.hook}11-2GBS2JU</span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-700">Checkout: HOT BR</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5 ── */}
            {step === 5 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Passo 5 · Benchmarks da operação</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {utmifyStatus === 'ok' ? 'Calculamos os benchmarks da sua operação.' : 'Defina os benchmarks da sua operação.'}
                </h2>
                <p className="text-slate-500 mb-6 leading-relaxed">
                  {utmifyStatus === 'ok'
                    ? 'Com base nos dados da UTMify dos últimos 90 dias. Esses valores são usados em todos os veredictos e alertas.'
                    : 'Esses valores são usados como referência para todos os veredictos e alertas do Claudio.'}
                </p>

                {utmifyStatus === 'ok' && (
                  <InfoBox>
                    Médias calculadas com base nas <strong>últimas 8 semanas</strong> de dados aprovados, excluindo semanas com anomalias. Você pode ajustar qualquer valor manualmente.
                  </InfoBox>
                )}

                <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                  <p className="font-semibold text-slate-900 mb-4">Benchmarks da operação</p>

                  {/* Visual display */}
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {[
                      { label: 'Ticket médio', value: `R$${benchmarks.ticket_medio.toLocaleString('pt-BR')}`, sub: 'base para CPA' },
                      { label: 'CPA saudável', value: `≤ R$${benchmarks.cpa_saudavel}`, sub: '18% do ticket' },
                      { label: 'ROAS mínimo', value: `${benchmarks.roas_minimo.toFixed(1)}×`, sub: 'break-even' },
                      { label: 'ICR saudável', value: `≥ ${benchmarks.icr_saudavel}%`, sub: 'checkout/PV' },
                      { label: 'CTR saudável', value: `≥ ${benchmarks.ctr_saudavel}%`, sub: 'cliques/impressões' },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                        <p className="text-lg font-bold text-green-600">{value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-semibold text-slate-700 text-sm">Ajustar manualmente</p>
                      {utmifyStatus === 'ok' && (
                        <Button variant="outline" size="sm" onClick={loadBenchmarksFromUtmify} disabled={loadingBenchmarks} className="gap-1.5 text-xs">
                          {loadingBenchmarks ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Recalcular via UTMify
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'ticket_medio', label: 'Ticket médio (R$)', step: '1' },
                        { key: 'cpa_saudavel', label: 'CPA máximo (R$)', step: '1' },
                        { key: 'roas_minimo', label: 'ROAS mínimo (×)', step: '0.1' },
                        { key: 'icr_saudavel', label: 'ICR saudável (%)', step: '0.1' },
                        { key: 'ctr_saudavel', label: 'CTR saudável (%)', step: '0.1' },
                      ].map(({ key, label, step }) => (
                        <div key={key}>
                          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{label}</Label>
                          <Input
                            type="number"
                            step={step}
                            value={benchmarks[key as keyof typeof benchmarks]}
                            onChange={(e) => setBenchmarks((p) => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                            className="text-center"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-2 text-sm text-slate-600">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span><strong className="text-amber-700">Atenção:</strong> O Claudio recalcula esses benchmarks automaticamente toda semana com base nos dados reais da UTMify. Você pode ajustar manualmente a qualquer momento nas Configurações.</span>
                </div>
              </div>
            )}

            {/* ── Step 6 ── */}
            {step === 6 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Passo 6 · Seu plano</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Escolha o plano ideal para sua operação.</h2>
                <p className="text-slate-500 mb-6">Você pode mudar de plano a qualquer momento. Todos os planos incluem o trial gratuito de 2 análises completas.</p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    {
                      id: 'starter' as const,
                      name: 'Starter',
                      price: 'R$197',
                      features: [
                        '60 créditos de análise/mês',
                        'Até 200 elementos na Biblioteca',
                        '1 usuário · 1 workspace',
                        'Sync UTMify a cada hora',
                        'Histórico de 90 dias',
                      ],
                    },
                    {
                      id: 'pro' as const,
                      name: 'Pro',
                      price: 'R$397',
                      badge: 'Mais popular',
                      features: [
                        '200 créditos de análise/mês',
                        'Até 1.000 elementos',
                        'Até 2 usuários · 1 workspace',
                        'Experimentos ilimitados',
                        'Histórico completo',
                      ],
                    },
                    {
                      id: 'agency' as const,
                      name: 'Agency',
                      price: 'R$897',
                      features: [
                        '600 créditos de análise/mês',
                        'Elementos ilimitados',
                        'Múltiplos usuários',
                        'Workspaces isolados por cliente',
                        'Prioridade no modelo IA',
                      ],
                    },
                  ].map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlano(plan.id)}
                      className={cn(
                        'text-left p-5 rounded-xl border-2 transition-colors relative',
                        plano === plan.id ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      {plan.badge && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">
                          {plan.badge}
                        </span>
                      )}
                      <p className="font-bold text-slate-900 text-base">{plan.name}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 mb-3">
                        {plan.price} <span className="text-sm font-normal text-slate-400">/mês</span>
                      </p>
                      <ul className="space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="text-green-600 font-bold mt-0.5">·</span> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>

                <InfoBox>
                  Você começa com <strong>2 análises gratuitas</strong> independente do plano. Nenhuma cobrança agora — o plano só é ativado após o trial.
                </InfoBox>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-200 bg-white flex items-center justify-between px-10 py-5">
          <Button variant="ghost" onClick={prev} disabled={step === 1} className="text-slate-500">
            ← Voltar
          </Button>
          <span className="text-xs text-slate-400">Você pode ajustar tudo isso depois em Configurações</span>
          <Button
            onClick={next}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white px-8 gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === 6 ? 'Concluir' : 'Continuar'} {!saving && '→'}
          </Button>
        </div>
      </div>
    </div>
  )
}
