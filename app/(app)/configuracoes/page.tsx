'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, X, AlertTriangle } from 'lucide-react'

const TABS = [
  { id: 'conexao',      label: 'Fonte de dados' },
  { id: 'benchmarks',   label: 'Benchmarks' },
  { id: 'identificacao',label: 'Identificação' },
  { id: 'operacao',     label: 'Operação' },
]

const MERCADOS = ['Info-produto', 'Nutraceutico', 'E-commerce', 'SaaS', 'Serviços', 'Outro']
const VOLUMES = ['Até R$5k/mês', 'R$5k – R$20k', 'R$20k – R$50k', 'R$50k – R$100k', 'Acima de R$100k']
const PLATAFORMAS = ['META Ads', 'Google Ads', 'TikTok Ads', 'Kwai Ads']

function extractToken(input: string): string {
  if (input.startsWith('http')) {
    try { return new URL(input).searchParams.get('token') ?? '' } catch { return '' }
  }
  return input
}

export default function ConfiguracoesPage() {
  const supabase = createClient()
  const [tab, setTab] = useState('conexao')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  // Conexão
  const [utmifyKey, setUtmifyKey] = useState('')
  const [utmifyStatus, setUtmifyStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [utmifyError, setUtmifyError] = useState('')
  const [utmifyCount, setUtmifyCount] = useState(0)
  const [dataSource, setDataSource] = useState<'utmify' | 'platform' | 'manual'>('utmify')

  // Benchmarks
  const [bm, setBm] = useState({
    ticket_medio: 197, cpa_saudavel: 35, roas_minimo: 2.0, icr_saudavel: 3.5, ctr_saudavel: 1.8,
  })

  // Identificação
  const [siglas, setSiglas] = useState({
    criativo: 'C', hook: 'H', funil: 'F', vsl: 'V', upsell: 'U', pagina: 'P',
  })
  const [etapaTeste, setEtapaTeste] = useState('TC, TC1, TESTE')
  const [etapaPre, setEtapaPre] = useState('PE, PE1, PE2')
  const [etapaEscala, setEtapaEscala] = useState('GB, GBW, EC, ONGOING')

  // Operação
  const [mercado, setMercado] = useState('')
  const [volume, setVolume] = useState('')
  const [plataformas, setPlataformas] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: ws } = await supabase
        .from('workspaces')
        .select('id, utmify_api_key, utmify_connected, data_source, mercado, volume_mensal, plataformas')
        .eq('user_id', user.id)
        .single()
      if (!ws) return

      setWorkspaceId(ws.id)
      if (ws.utmify_api_key) { setUtmifyKey(ws.utmify_api_key); setUtmifyStatus(ws.utmify_connected ? 'ok' : 'idle') }
      if (ws.data_source) setDataSource(ws.data_source)
      if (ws.mercado) setMercado(ws.mercado)
      if (ws.volume_mensal) setVolume(ws.volume_mensal)
      if (ws.plataformas?.length) setPlataformas(ws.plataformas)

      // Benchmarks
      const { data: bmData } = await supabase.from('benchmarks').select('*').eq('workspace_id', ws.id).single()
      if (bmData) {
        setBm({
          ticket_medio:  bmData.ticket_medio  ?? 197,
          cpa_saudavel:  bmData.cpa_saudavel  ?? 35,
          roas_minimo:   bmData.roas_minimo   ?? 2.0,
          icr_saudavel:  bmData.icr_saudavel  ?? 3.5,
          ctr_saudavel:  bmData.ctr_saudavel  ?? 1.8,
        })
      }

      // Siglas
      const { data: siglasData } = await supabase.from('element_siglas').select('tipo, sigla').eq('workspace_id', ws.id)
      if (siglasData?.length) {
        const map: Record<string, string> = {}
        siglasData.forEach(({ tipo, sigla }) => { map[tipo] = sigla })
        setSiglas(prev => ({ ...prev, ...map }))
      }

      // Stage identifiers
      const { data: stageData } = await supabase.from('stage_identifiers').select('stage, identifiers').eq('workspace_id', ws.id)
      if (stageData?.length) {
        stageData.forEach(({ stage, identifiers }) => {
          const joined = Array.isArray(identifiers) ? identifiers.join(', ') : identifiers
          if (stage === 'teste')      setEtapaTeste(joined)
          if (stage === 'pre_escala') setEtapaPre(joined)
          if (stage === 'escala')     setEtapaEscala(joined)
        })
      }
    }
    load()
  }, [])

  const showSaved = (label = 'Salvo') => {
    setSaved(label)
    setTimeout(() => setSaved(''), 2500)
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
      } else {
        setUtmifyStatus('error')
        setUtmifyError(data.error ?? 'Erro ao conectar.')
      }
    } catch {
      setUtmifyStatus('error')
      setUtmifyError('Erro de conexão.')
    }
  }

  const saveConexao = async () => {
    if (!workspaceId) return
    setSaving(true)
    try {
      const token = extractToken(utmifyKey.trim())
      await supabase.from('workspaces').update({
        data_source: dataSource,
        utmify_api_key: dataSource === 'utmify' ? (token || utmifyKey.trim()) : null,
        utmify_connected: utmifyStatus === 'ok',
      }).eq('id', workspaceId)
      showSaved('Conexão salva')
    } finally {
      setSaving(false)
    }
  }

  const saveBenchmarks = async () => {
    if (!workspaceId) return
    setSaving(true)
    try {
      await supabase.from('benchmarks').upsert(
        { workspace_id: workspaceId, ...bm },
        { onConflict: 'workspace_id' }
      )
      showSaved('Benchmarks salvos')
    } finally {
      setSaving(false)
    }
  }

  const saveIdentificacao = async () => {
    if (!workspaceId) return
    setSaving(true)
    try {
      await supabase.from('element_siglas').delete().eq('workspace_id', workspaceId)
      await supabase.from('element_siglas').insert(
        Object.entries(siglas).map(([tipo, sigla]) => ({ workspace_id: workspaceId, tipo, sigla }))
      )
      await supabase.from('stage_identifiers').delete().eq('workspace_id', workspaceId)
      await supabase.from('stage_identifiers').insert([
        { workspace_id: workspaceId, stage: 'teste',      identifiers: etapaTeste.split(',').map(s => s.trim()).filter(Boolean) },
        { workspace_id: workspaceId, stage: 'pre_escala', identifiers: etapaPre.split(',').map(s => s.trim()).filter(Boolean) },
        { workspace_id: workspaceId, stage: 'escala',     identifiers: etapaEscala.split(',').map(s => s.trim()).filter(Boolean) },
      ])
      showSaved('Identificação salva')
    } finally {
      setSaving(false)
    }
  }

  const saveOperacao = async () => {
    if (!workspaceId) return
    setSaving(true)
    try {
      await supabase.from('workspaces').update({ mercado, volume_mensal: volume, plataformas }).eq('id', workspaceId)
      showSaved('Operação salva')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-green-400 bg-white transition-colors'
  const labelCls = 'block text-[11.5px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide'

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[17px] font-bold text-slate-900">Configurações</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">Ajuste sua operação a qualquer momento</p>
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> {saved}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-[12.5px] font-medium transition-all',
                tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >{t.label}</button>
          ))}
        </div>

        <div className="max-w-2xl space-y-5">

          {/* ── CONEXÃO ── */}
          {tab === 'conexao' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 mb-1">Fonte de dados</h2>
                <p className="text-[12px] text-slate-400">De onde o Claudio vai buscar os dados da sua operação.</p>
              </div>

              {/* Source options */}
              <div className="space-y-2">
                {[
                  { id: 'utmify',   title: 'UTMify — Recomendado', desc: 'Integração completa com dados de campanha, conversão, receita, ticket e reembolso.' },
                  { id: 'platform', title: 'Direto da plataforma (META / Google)', desc: 'Leitura dos dados direto do pixel e da conta de anúncios. Benchmarks menos precisos.' },
                  { id: 'manual',   title: 'Configuração manual de benchmarks', desc: 'Você define os benchmarks manualmente. Ideal para métricas internas específicas.' },
                ].map(opt => (
                  <label key={opt.id} className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors',
                    dataSource === opt.id ? 'border-green-400 bg-green-50/50' : 'border-slate-200 hover:border-slate-300'
                  )}>
                    <input type="radio" name="source" value={opt.id} checked={dataSource === opt.id}
                      onChange={() => setDataSource(opt.id as typeof dataSource)}
                      className="mt-0.5 accent-green-600" />
                    <div>
                      <div className="text-[13px] font-semibold text-slate-800">{opt.title}</div>
                      <div className="text-[12px] text-slate-500 mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* UTMify key */}
              {dataSource === 'utmify' && (
                <div>
                  <label className={labelCls}>Token ou URL MCP da UTMify</label>
                  <p className="text-[11.5px] text-slate-400 mb-2">
                    Encontre em: UTMify → Configurações → Integrações → API
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={utmifyKey}
                      onChange={e => { setUtmifyKey(e.target.value); setUtmifyStatus('idle') }}
                      placeholder="https://mcp.utmify.com.br/mcp/?token=... ou o token diretamente"
                      className={cn(inputCls, 'flex-1')}
                    />
                    <button
                      onClick={testUtmify}
                      disabled={!utmifyKey.trim() || utmifyStatus === 'testing'}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[12.5px] font-medium rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {utmifyStatus === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Testar conexão
                    </button>
                  </div>

                  {utmifyStatus === 'ok' && (
                    <div className="flex items-center gap-2 mt-2 text-[12px] text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Conectado — {utmifyCount} campanha{utmifyCount !== 1 ? 's' : ''} encontrada{utmifyCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {utmifyStatus === 'error' && (
                    <div className="flex items-center gap-2 mt-2 text-[12px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      <X className="w-3.5 h-3.5 flex-shrink-0" /> {utmifyError}
                    </div>
                  )}
                </div>
              )}

              <button onClick={saveConexao} disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-[12.5px] font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar configuração
              </button>
            </div>
          )}

          {/* ── BENCHMARKS ── */}
          {tab === 'benchmarks' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 mb-1">Benchmarks da operação</h2>
                <p className="text-[12px] text-slate-400">Usados para calibrar alertas e qualificar resultados nas análises de IA.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'ticket_medio',  label: 'Ticket médio (R$)',    step: 1 },
                  { key: 'cpa_saudavel',  label: 'CPA saudável (R$)',    step: 1 },
                  { key: 'roas_minimo',   label: 'ROAS mínimo (×)',       step: 0.1 },
                  { key: 'icr_saudavel',  label: 'ICR saudável (%)',      step: 0.1 },
                  { key: 'ctr_saudavel',  label: 'CTR saudável (%)',      step: 0.1 },
                ].map(({ key, label, step }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input
                      type="number"
                      step={step}
                      value={bm[key as keyof typeof bm]}
                      onChange={e => setBm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Ticket médio',  value: `R$${bm.ticket_medio.toLocaleString('pt-BR')}` },
                  { label: 'CPA saudável',  value: `≤ R$${bm.cpa_saudavel}` },
                  { label: 'ROAS mínimo',   value: `${bm.roas_minimo.toFixed(1)}×` },
                  { label: 'ICR saudável',  value: `≥ ${bm.icr_saudavel}%` },
                  { label: 'CTR saudável',  value: `≥ ${bm.ctr_saudavel}%` },
                ].map(k => (
                  <div key={k.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="text-[9.5px] text-slate-400 uppercase tracking-wide mb-1">{k.label}</div>
                    <div className="text-[14px] font-bold text-slate-800">{k.value}</div>
                  </div>
                ))}
              </div>

              <button onClick={saveBenchmarks} disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-[12.5px] font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar benchmarks
              </button>
            </div>
          )}

          {/* ── IDENTIFICAÇÃO ── */}
          {tab === 'identificacao' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-1">Siglas de elementos</h2>
                  <p className="text-[12px] text-slate-400">Como o Claudio identifica cada tipo de elemento dentro dos nomes de anúncio.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(siglas).map(([tipo, sigla]) => (
                    <div key={tipo}>
                      <label className={labelCls}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</label>
                      <input
                        type="text"
                        value={sigla}
                        onChange={e => setSiglas(prev => ({ ...prev, [tipo]: e.target.value.toUpperCase() }))}
                        className={inputCls}
                        maxLength={4}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-[14px] font-semibold text-slate-900 mb-1">Identificadores de etapa</h2>
                  <p className="text-[12px] text-slate-400">Como você indica cada etapa no nome das campanhas. Separe múltiplos com vírgula.</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Teste (TC)',       value: etapaTeste,   set: setEtapaTeste },
                    { label: 'Pré-escala (PE)',  value: etapaPre,     set: setEtapaPre },
                    { label: 'Escala (GB/EC)',   value: etapaEscala,  set: setEtapaEscala },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <label className={labelCls}>{label}</label>
                      <input type="text" value={value} onChange={e => set(e.target.value)} className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={saveIdentificacao} disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-[12.5px] font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar identificação
              </button>
            </div>
          )}

          {/* ── OPERAÇÃO ── */}
          {tab === 'operacao' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900 mb-1">Contexto da operação</h2>
                <p className="text-[12px] text-slate-400">Usado para contextualizar as análises e benchmarks do seu mercado.</p>
              </div>

              <div>
                <label className={labelCls}>Mercado</label>
                <div className="flex flex-wrap gap-2">
                  {MERCADOS.map(m => (
                    <button key={m} onClick={() => setMercado(m)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all',
                        mercado === m
                          ? 'bg-green-50 border-green-400 text-green-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      )}>{m}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Volume mensal de investimento</label>
                <div className="flex flex-wrap gap-2">
                  {VOLUMES.map(v => (
                    <button key={v} onClick={() => setVolume(v)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all',
                        volume === v
                          ? 'bg-green-50 border-green-400 text-green-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      )}>{v}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Plataformas de anúncio</label>
                <div className="flex flex-wrap gap-2">
                  {PLATAFORMAS.map(p => (
                    <button key={p}
                      onClick={() => setPlataformas(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                      className={cn(
                        'px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all',
                        plataformas.includes(p)
                          ? 'bg-green-50 border-green-400 text-green-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      )}>{p}</button>
                  ))}
                </div>
              </div>

              <button onClick={saveOperacao} disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-[12.5px] font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar operação
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
