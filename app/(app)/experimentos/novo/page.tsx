'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'

const TIPOS = [
  'Criativo', 'Hook', 'VSL', 'Página', 'Checkout', 'Oferta', 'Funil', 'Outro',
]

const METRICAS = [
  { id: 'cpa', label: 'CPA' },
  { id: 'roas', label: 'ROAS' },
  { id: 'hook_rate', label: 'Hook rate' },
  { id: 'icr', label: 'ICR' },
  { id: 'conv_checkout', label: 'Conv. checkout' },
  { id: 'arpu', label: 'ARPU' },
]

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F']
const LETRA_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-purple-100 text-purple-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-red-100 text-red-700',
  E: 'bg-green-100 text-green-700',
  F: 'bg-cyan-100 text-cyan-700',
}

interface Variant {
  letra: string
  nome: string
  tag_nomenclatura: string
}

export default function NovoExperimentoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [tipo, setTipo] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [variantes, setVariantes] = useState<Variant[]>([
    { letra: 'A', nome: '', tag_nomenclatura: '' },
    { letra: 'B', nome: '', tag_nomenclatura: '' },
  ])
  const [variavelIsolada, setVariavelIsolada] = useState('')
  const [metrica, setMetrica] = useState('cpa')
  const [vendasMin, setVendasMin] = useState(30)
  const [budget, setBudget] = useState(100)
  const [prazo, setPrazo] = useState(14)
  const [produto, setProduto] = useState('')
  const [etapa, setEtapa] = useState('TC')
  const [contexto, setContexto] = useState('')

  const addVariant = () => {
    if (variantes.length >= 6) return
    const nextLetra = LETRAS[variantes.length]
    setVariantes((prev) => [...prev, { letra: nextLetra, nome: '', tag_nomenclatura: '' }])
  }

  const removeVariant = (letra: string) => {
    if (variantes.length <= 2) return
    setVariantes((prev) => prev.filter((v) => v.letra !== letra))
  }

  const updateVariant = (letra: string, field: keyof Variant, value: string) => {
    setVariantes((prev) => prev.map((v) => (v.letra === letra ? { ...v, [field]: value } : v)))
  }

  const canSubmit = () =>
    tipo &&
    objetivo.trim() &&
    variantes.filter((v) => v.nome.trim()).length >= 2 &&
    variavelIsolada.trim()

  const estimatedDays = () => {
    const daysNeeded = Math.ceil(vendasMin / ((budget / 50) * variantes.length))
    return Math.min(daysNeeded, prazo)
  }

  const handleSave = async () => {
    if (!canSubmit()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!workspace) return

    const { error } = await supabase.from('experiments').insert({
      workspace_id: workspace.id,
      nome: `${tipo} — ${objetivo.substring(0, 40)}`,
      tipo: tipo.toLowerCase(),
      objetivo,
      variavel_isolada: variavelIsolada,
      metrica_decisao: metrica,
      vendas_minimas: vendasMin,
      budget_por_elemento: budget,
      prazo_maximo: prazo,
      produto: produto || null,
      etapa: etapa || null,
      contexto: contexto || null,
      status: 'pending',
      variantes: variantes.filter((v) => v.nome.trim()).map((v) => ({
        ...v,
        metricas: {},
      })),
    })

    if (!error) {
      router.push('/experimentos')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" className="mb-4 gap-2" onClick={() => router.push('/experimentos')}>
            <ArrowLeft className="w-4 h-4" /> Experimentos
          </Button>

          <h1 className="text-2xl font-bold text-slate-900 mb-6">Novo experimento</h1>

          <div className="space-y-6">
            {/* Tipo */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-3 block">Tipo de teste</Label>
              <div className="grid grid-cols-4 gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipo(t)}
                    className={cn(
                      'py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors',
                      tipo === t
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Objetivo */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Objetivo do teste</Label>
              <Input
                placeholder="Ex: Descobrir qual hook gera mais conversões"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
              />
            </div>

            {/* Variants */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-3 block">
                Elementos testados
              </Label>
              <div className="space-y-2">
                {variantes.map((v) => (
                  <div key={v.letra} className="flex items-center gap-2">
                    <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0', LETRA_COLORS[v.letra])}>
                      {v.letra}
                    </span>
                    <Input
                      placeholder="Nome do elemento"
                      value={v.nome}
                      onChange={(e) => updateVariant(v.letra, 'nome', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Tag (nomenclatura)"
                      value={v.tag_nomenclatura}
                      onChange={(e) => updateVariant(v.letra, 'tag_nomenclatura', e.target.value)}
                      className="w-36 font-mono text-sm"
                    />
                    {variantes.length > 2 && (
                      <button onClick={() => removeVariant(v.letra)} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {variantes.length < 6 && (
                <button onClick={addVariant} className="mt-2 flex items-center gap-1 text-sm text-green-600 hover:text-green-700">
                  <Plus className="w-4 h-4" /> Adicionar variante
                </button>
              )}
            </div>

            {/* Variável isolada */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">O que muda entre os elementos?</Label>
              <Input
                placeholder="Ex: Apenas o hook de abertura dos 3 primeiros segundos"
                value={variavelIsolada}
                onChange={(e) => setVariavelIsolada(e.target.value)}
              />
            </div>

            {/* Métrica de decisão */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-3 block">Métrica de decisão</Label>
              <div className="flex flex-wrap gap-2">
                {METRICAS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMetrica(m.id)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                      metrica === m.id
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-green-400'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Configurações */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Vendas mínimas</Label>
                <Input
                  type="number"
                  value={vendasMin}
                  onChange={(e) => setVendasMin(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Budget/elemento (R$/dia)</Label>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Prazo máximo (dias)</Label>
                <Input
                  type="number"
                  value={prazo}
                  onChange={(e) => setPrazo(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                Estimativa: ~{estimatedDays()} dias para conclusão com R${budget}/dia por elemento.
              </p>
            </div>

            {/* Produto e Etapa */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Produto</Label>
                <Input
                  placeholder="Nome do produto"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Etapa</Label>
                <Input
                  placeholder="TC, PE, EC..."
                  value={etapa}
                  onChange={(e) => setEtapa(e.target.value)}
                />
              </div>
            </div>

            {/* Contexto */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Contexto de produção <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <textarea
                placeholder="Informações adicionais sobre como os elementos foram produzidos..."
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => router.push('/experimentos')}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSubmit() || saving}
                className="bg-green-600 hover:bg-green-700 text-white gap-2 flex-1"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar experimento
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
