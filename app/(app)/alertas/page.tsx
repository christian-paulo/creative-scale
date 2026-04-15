'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Bell, CheckCircle2 } from 'lucide-react'
import type { Alert } from '@/types'

const SEVERITY_CLS: Record<string, { dot: string; bg: string; text: string }> = {
  high:   { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700' },
  medium: { dot: 'bg-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  low:    { dot: 'bg-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700' },
}

const TIPO_LABELS: Record<string, string> = {
  sem_venda:       'Sem vendas',
  queda_roas:      'Queda de ROAS',
  frequencia_alta: 'Frequência alta',
  outro:           'Alerta',
}

export default function AlertasPage() {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', user.id).single()
      if (!workspace) return

      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('resolvido', false)
        .order('created_at', { ascending: false })

      setAlerts(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function resolve(id: string) {
    await supabase.from('alerts').update({ resolvido: true }).eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const high   = alerts.filter(a => a.severity === 'high')
  const medium = alerts.filter(a => a.severity === 'medium')
  const low    = alerts.filter(a => a.severity === 'low')

  return (
    <div className="flex flex-col h-full">
      <TopBar showDatePicker={false} />

      <main className="flex-1 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[17px] font-bold text-slate-900">Alertas ativos</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {loading ? '…' : `${high.length} urgentes · ${alerts.length} no total`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum alerta ativo.</p>
            <p className="text-xs text-slate-400 mt-1">Os alertas são gerados automaticamente a partir dos dados UTMify.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => {
              const s = SEVERITY_CLS[alert.severity] ?? SEVERITY_CLS.low
              return (
                <div key={alert.id} className={cn('flex items-start gap-3 p-4 rounded-xl border border-transparent', s.bg)}>
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', s.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-[12.5px] font-semibold', s.text)}>
                      {TIPO_LABELS[alert.tipo] ?? alert.tipo}
                      {alert.campanha_nome && <span className="font-normal opacity-70"> · {alert.campanha_nome}</span>}
                    </div>
                    <div className="text-[12px] text-slate-600 mt-0.5">{alert.titulo}</div>
                    {alert.descricao && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{alert.descricao}</div>
                    )}
                  </div>
                  <button
                    onClick={() => resolve(alert.id)}
                    className="flex-shrink-0 p-1 text-slate-400 hover:text-green-600 transition-colors"
                    title="Marcar como resolvido"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
