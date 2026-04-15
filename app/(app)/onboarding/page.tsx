'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { NOMENCLATURE_TEMPLATES, CAMPAIGN_BLOCKS, ADSET_BLOCKS, AD_BLOCKS } from '@/lib/nomenclature'
import { Check, Loader2, CheckCircle2 } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Contexto' },
  { id: 2, label: 'Dados' },
  { id: 3, label: 'Nomenclatura' },
  { id: 4, label: 'Elementos' },
  { id: 5, label: 'Benchmarks' },
  { id: 6, label: 'Plano' },
]

const MERCADOS = ['Info-produto', 'Nutraceutico', 'E-commerce', 'SaaS', 'Serviços']
const VOLUMES = ['Até R$5k/mês', 'R$5k–20k/mês', 'R$20k–100k/mês', 'R$100k–500k/mês', 'Acima de R$500k/mês']
const PLATAFORMAS = ['META', 'Google', 'TikTok', 'Kwai']

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
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

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [mercado, setMercado] = useState('')
  const [volume, setVolume] = useState('')
  const [plataformas, setPlataformas] = useState<string[]>([])

  // Step 2
  const [dataSource, setDataSource] = useState<'utmify' | 'platform' | 'manual'>('utmify')
  const [utmifyKey, setUtmifyKey] = useState('')
  const [utmifyToken, setUtmifyToken] = useState('') // token limpo extraído da URL ou direto
  const [utmifyStatus, setUtmifyStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [utmifyCount, setUtmifyCount] = useState(0)
  const [utmifyError, setUtmifyError] = useState('')

  // Step 3
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [campaignTemplate, setCampaignTemplate] = useState<string[]>(['etapa', 'conta', 'audiencia', 'checkout'])
  const [adsetTemplate, setAdsetTemplate] = useState<string[]>(['publico', 'variacao'])
  const [adTemplate, setAdTemplate] = useState<string[]>(['criativo', 'hook'])

  // Step 4
  const [siglas, setSiglas] = useState({
    criativo: 'C',
    hook: 'H',
    vsl: 'V',
    funil: 'F',
    upsell: 'U',
    pagina: 'P',
  })
  const [stagesTeste, setStagesTeste] = useState('TC,TC1,TC2')
  const [stagesPreEscala, setStagesPreEscala] = useState('PE,PE1')
  const [stagesEscala, setStagesEscala] = useState('GB,GBW,EC')

  // Step 5
  const [benchmarks, setBenchmarks] = useState({
    ticket_medio: 297,
    cpa_saudavel: 53,
    roas_minimo: 1.5,
    icr_saudavel: 50,
    ctr_saudavel: 1.5,
  })
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(false)

  useEffect(() => {
    async function loadWorkspace() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (data) setWorkspaceId(data.id)
    }
    loadWorkspace()
  }, [])

  const togglePlataforma = (p: string) => {
    setPlataformas((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

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
        // Save the clean token (extracted from URL if needed)
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

  const applyTemplate = (templateId: string) => {
    const tpl = NOMENCLATURE_TEMPLATES.find((t) => t.id === templateId)
    if (!tpl) return
    setSelectedTemplate(templateId)
    setCampaignTemplate(tpl.campanha)
    setAdsetTemplate(tpl.conjunto)
    setAdTemplate(tpl.anuncio)
  }

  const saveStep1 = async () => {
    if (!workspaceId) return
    await supabase.from('workspaces').update({ mercado, volume_mensal: volume, plataformas }).eq('id', workspaceId)
  }

  const saveStep2 = async () => {
    if (!workspaceId) return
    // Save the clean token (not the full MCP URL)
    const tokenToSave = dataSource === 'utmify'
      ? (utmifyToken || utmifyKey).trim()
      : null
    await supabase.from('workspaces').update({
      data_source: dataSource,
      utmify_api_key: tokenToSave,
      utmify_connected: utmifyStatus === 'ok',
    }).eq('id', workspaceId)
  }

  const saveStep3 = async () => {
    if (!workspaceId) return
    const levels = [
      { level: 'campaign', template: campaignTemplate, separator: '-' },
      { level: 'adset', template: adsetTemplate, separator: '-' },
      { level: 'ad', template: adTemplate, separator: '-' },
    ]
    // Upsert nomenclature rules
    for (const rule of levels) {
      await supabase.from('nomenclature_rules').upsert(
        { workspace_id: workspaceId, ...rule },
        { onConflict: 'workspace_id,level' }
      )
    }
  }

  const saveStep4 = async () => {
    if (!workspaceId) return
    // Save siglas
    const siglaEntries = Object.entries(siglas).map(([tipo, sigla]) => ({
      workspace_id: workspaceId,
      tipo,
      sigla,
    }))
    await supabase.from('element_siglas').delete().eq('workspace_id', workspaceId)
    await supabase.from('element_siglas').insert(siglaEntries)

    // Save stages
    const stageEntries = [
      { workspace_id: workspaceId, stage: 'teste', identifiers: stagesTeste.split(',').map((s) => s.trim()) },
      { workspace_id: workspaceId, stage: 'pre_escala', identifiers: stagesPreEscala.split(',').map((s) => s.trim()) },
      { workspace_id: workspaceId, stage: 'escala', identifiers: stagesEscala.split(',').map((s) => s.trim()) },
    ]
    await supabase.from('stage_identifiers').delete().eq('workspace_id', workspaceId)
    await supabase.from('stage_identifiers').insert(stageEntries)
  }

  const saveStep5 = async () => {
    if (!workspaceId) return
    await supabase.from('benchmarks').upsert(
      { workspace_id: workspaceId, ...benchmarks },
      { onConflict: 'workspace_id' }
    )
  }

  const loadBenchmarksFromUtmify = async () => {
    if (!workspaceId) return
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
    await saveStep5()
    if (workspaceId) {
      await supabase.from('workspaces').update({ onboarding_done: true }).eq('id', workspaceId)
      // Sync UTMify in background
      fetch('/api/utmify/sync', { method: 'POST' }).catch(() => {})
    }
    router.push('/dashboard')
    router.refresh()
  }

  const next = async () => {
    setSaving(true)
    try {
      if (step === 1) await saveStep1()
      if (step === 2) await saveStep2()
      if (step === 3) await saveStep3()
      if (step === 4) await saveStep4()
      if (step === 5) await saveStep5()
      setStep((s) => Math.min(6, s + 1))
    } catch (err) {
      console.error('Save error:', err)
      // Don't block navigation on non-critical save errors
      setStep((s) => Math.min(6, s + 1))
    } finally {
      setSaving(false)
    }
  }

  const prev = () => setStep((s) => Math.max(1, s - 1))

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar progress */}
      <div className="w-64 bg-white border-r border-slate-200 p-8 flex flex-col">
        <div className="mb-8">
          <span className="text-2xl font-bold text-green-600">claudio</span>
          <p className="text-xs text-slate-500 mt-1">Configuração inicial</p>
        </div>
        <div className="space-y-1">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                s.id === step
                  ? 'bg-green-50 text-green-700 font-medium'
                  : s.id < step
                  ? 'text-slate-500'
                  : 'text-slate-400'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  s.id < step
                    ? 'bg-green-600 text-white'
                    : s.id === step
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                )}
              >
                {s.id < step ? <Check className="w-3 h-3" /> : s.id}
              </div>
              {s.label}
            </div>
          ))}
        </div>
        <div className="mt-auto">
          <Progress value={(step / 6) * 100} className="h-1.5" />
          <p className="text-xs text-slate-400 mt-2">Passo {step} de 6</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-12 overflow-y-auto">
          <div className="max-w-2xl">
            {/* Step 1 */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Contexto da operação</h2>
                <p className="text-slate-500 mb-8">Nos conte sobre o seu negócio para personalizarmos a experiência.</p>

                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-3 block">Mercado</Label>
                    <div className="flex flex-wrap gap-2">
                      {MERCADOS.map((m) => (
                        <Chip key={m} label={m} selected={mercado === m} onClick={() => setMercado(m)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-3 block">Volume mensal de investimento</Label>
                    <div className="flex flex-wrap gap-2">
                      {VOLUMES.map((v) => (
                        <Chip key={v} label={v} selected={volume === v} onClick={() => setVolume(v)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-3 block">Plataformas (pode selecionar várias)</Label>
                    <div className="flex flex-wrap gap-2">
                      {PLATAFORMAS.map((p) => (
                        <Chip key={p} label={p} selected={plataformas.includes(p)} onClick={() => togglePlataforma(p)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Fonte de dados</h2>
                <p className="text-slate-500 mb-8">Como você quer trazer os dados das campanhas?</p>

                <div className="space-y-3 mb-6">
                  {[
                    { id: 'utmify', label: 'UTMify', desc: 'Recomendado — integração automática com suas campanhas', badge: 'Recomendado' },
                    { id: 'platform', label: 'Plataforma direta', desc: 'Conectar via Meta Ads, Google Ads, etc.' },
                    { id: 'manual', label: 'Manual', desc: 'Inserir dados manualmente' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDataSource(opt.id as typeof dataSource)}
                      className={cn(
                        'w-full text-left p-4 rounded-xl border-2 transition-colors',
                        dataSource === opt.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{opt.label}</span>
                        {opt.badge && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {dataSource === 'utmify' && (
                  <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Label className="text-sm font-medium text-slate-700">Token da UTMify</Label>
                    <p className="text-xs text-slate-500">Cole a URL MCP completa ou apenas o token</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://mcp.utmify.com.br/mcp/?token=... ou o token diretamente"
                        value={utmifyKey}
                        onChange={(e) => {
                          setUtmifyKey(e.target.value)
                          if (utmifyStatus !== 'idle') {
                            setUtmifyStatus('idle')
                            setUtmifyError('')
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={testUtmify}
                        disabled={!utmifyKey || utmifyStatus === 'testing'}
                      >
                        {utmifyStatus === 'testing' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Testar'
                        )}
                      </Button>
                    </div>
                    {utmifyStatus === 'ok' && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Conectado!{utmifyCount > 0 ? ` ${utmifyCount} campanhas encontradas.` : ' Conta verificada com sucesso.'}
                      </p>
                    )}
                    {utmifyStatus === 'error' && (
                      <p className="text-sm text-red-500">{utmifyError || 'API key inválida. Verifique e tente novamente.'}</p>
                    )}
                    {utmifyStatus === 'testing' && (
                      <p className="text-sm text-slate-500">Verificando conexão com UTMify...</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Nomenclatura</h2>
                <p className="text-slate-500 mb-8">Como suas campanhas são nomeadas?</p>

                <div className="mb-6">
                  <Label className="text-sm font-medium text-slate-700 mb-3 block">Templates prontos</Label>
                  <div className="space-y-2">
                    {NOMENCLATURE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl.id)}
                        className={cn(
                          'w-full text-left p-4 rounded-xl border-2 transition-colors',
                          selectedTemplate === tpl.id
                            ? 'border-green-600 bg-green-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                      >
                        <span className="font-medium text-slate-900">{tpl.nome}</span>
                        <p className="text-xs text-slate-500 mt-1">
                          Campanha: [{tpl.campanha.join('][')}] · Anúncio: [{tpl.anuncio.join('][')}]
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                      Estrutura da Campanha
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {campaignTemplate.map((block, i) => (
                        <span key={i} className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-mono">
                          [{block}]
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block">
                      Estrutura do Anúncio
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {adTemplate.map((block, i) => (
                        <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-mono">
                          [{block}]
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Identificação de elementos</h2>
                <p className="text-slate-500 mb-8">Configure as siglas usadas nos nomes de anúncios.</p>

                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-4 block">Siglas de elementos</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(siglas).map(([tipo, sigla]) => (
                        <div key={tipo} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                          <span className="text-sm text-slate-600 w-20 capitalize">{tipo}</span>
                          <span className="text-slate-400">=</span>
                          <Input
                            value={sigla}
                            onChange={(e) =>
                              setSiglas((prev) => ({ ...prev, [tipo]: e.target.value.toUpperCase() }))
                            }
                            className="h-8 w-20 text-center font-mono text-sm"
                            maxLength={3}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-4 block">Identificadores de etapa</Label>
                    <div className="space-y-3">
                      {[
                        { label: 'Teste', value: stagesTeste, onChange: setStagesTeste, color: 'amber' },
                        { label: 'Pré-escala', value: stagesPreEscala, onChange: setStagesPreEscala, color: 'blue' },
                        { label: 'Escala', value: stagesEscala, onChange: setStagesEscala, color: 'green' },
                      ].map(({ label, value, onChange }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 w-24">{label}</span>
                          <Input
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder="TC,TC1,TC2"
                            className="flex-1 font-mono text-sm"
                          />
                          <span className="text-xs text-slate-400">separados por vírgula</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5 */}
            {step === 5 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Benchmarks</h2>
                <p className="text-slate-500 mb-8">Defina as métricas saudáveis para sua operação.</p>

                {utmifyStatus === 'ok' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadBenchmarksFromUtmify}
                    disabled={loadingBenchmarks}
                    className="mb-6 gap-2"
                  >
                    {loadingBenchmarks ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Calcular automaticamente via UTMify (últimos 90 dias)
                  </Button>
                )}

                <div className="space-y-4">
                  {[
                    { key: 'ticket_medio', label: 'Ticket médio (R$)', type: 'number', prefix: 'R$' },
                    { key: 'cpa_saudavel', label: 'CPA saudável (R$)', type: 'number', prefix: 'R$' },
                    { key: 'roas_minimo', label: 'ROAS mínimo (break-even)', type: 'number', suffix: '×' },
                    { key: 'icr_saudavel', label: 'ICR saudável (%)', type: 'number', suffix: '%' },
                    { key: 'ctr_saudavel', label: 'CTR saudável (%)', type: 'number', suffix: '%' },
                  ].map(({ key, label, suffix, prefix }) => (
                    <div key={key} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <Label className="text-sm font-medium text-slate-700">{label}</Label>
                        {key === 'cpa_saudavel' && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Recomendado: {Math.round((benchmarks.ticket_medio * 0.18))} (18% do ticket)
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {prefix && <span className="text-sm text-slate-500">{prefix}</span>}
                        <Input
                          type="number"
                          value={benchmarks[key as keyof typeof benchmarks]}
                          onChange={(e) =>
                            setBenchmarks((prev) => ({
                              ...prev,
                              [key]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-24 text-center"
                          step={key === 'roas_minimo' || key === 'icr_saudavel' || key === 'ctr_saudavel' ? '0.1' : '1'}
                        />
                        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6 */}
            {step === 6 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Escolha seu plano</h2>
                <p className="text-slate-500 mb-8">Acesso completo a todas as funcionalidades do Claudio.</p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { nome: 'Starter', preco: 'R$197', features: ['1 workspace', '50 análises/mês', 'Dashboard básico'] },
                    { nome: 'Pro', preco: 'R$397', features: ['3 workspaces', 'Análises ilimitadas', 'Todos os módulos', 'IA avançada'], highlight: true },
                    { nome: 'Agency', preco: 'R$897', features: ['10 workspaces', 'Análises ilimitadas', 'Relatórios white-label', 'Suporte prioritário'] },
                  ].map((plan) => (
                    <div
                      key={plan.nome}
                      className={cn(
                        'p-5 rounded-xl border-2 flex flex-col',
                        plan.highlight
                          ? 'border-green-600 bg-green-50 relative'
                          : 'border-slate-200 bg-white'
                      )}
                    >
                      {plan.highlight && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                          Seu plano atual
                        </span>
                      )}
                      <p className="font-semibold text-slate-900">{plan.nome}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{plan.preco}<span className="text-sm font-normal text-slate-500">/mês</span></p>
                      <ul className="mt-3 space-y-1 flex-1">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-slate-600 flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-600 flex-shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-green-800 font-medium">
                    Tudo pronto! Seu workspace está configurado e você tem acesso Pro completo durante o período de teste.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div className="h-20 border-t border-slate-200 bg-white flex items-center justify-between px-12">
          <Button variant="ghost" onClick={prev} disabled={step === 1}>
            ← Voltar
          </Button>
          {step < 6 ? (
            <Button
              onClick={next}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Continuar →
            </Button>
          ) : (
            <Button
              onClick={finishOnboarding}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Concluir e acessar dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
