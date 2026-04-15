'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { AlertCard } from '@/components/dashboard/AlertCard'
import { MetricsChart } from '@/components/dashboard/MetricsChart'
import { formatCurrency, formatRoas } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import type { DateRange, Alert } from '@/types'

function getDefaultRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 7)
  return { from, to }
}

export default function DashboardPage() {
  const supabase = createClient()
  const [userName, setUserName] = useState<string>('')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange())
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [metrics, setMetrics] = useState<{
    faturamento: number
    gastos: number
    roas: number
    lucro: number
    cpa: number
    margem: number
    vendas: number
    reembolsos: number
  } | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name)
      } else if (user?.email) {
        setUserName(user.email.split('@')[0])
      }
    }
    loadUser()
  }, [])

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const start = dateRange.from.toISOString().split('T')[0]
      const end = dateRange.to.toISOString().split('T')[0]
      const res = await fetch(`/api/utmify/metrics?start=${start}&end=${end}&level=overview`)
      const data = await res.json()
      const s = data.summary ?? {}

      setMetrics({
        faturamento: s.revenue ?? 0,
        gastos: s.spend ?? 0,
        roas: s.roas ?? 0,
        lucro: (s.revenue ?? 0) - (s.spend ?? 0),
        cpa: s.cpa ?? 0,
        margem: s.revenue > 0 ? ((s.revenue - s.spend) / s.revenue) * 100 : 0,
        vendas: s.conversions ?? 0,
        reembolsos: 0,
      })
    } catch (err) {
      console.error('Failed to load metrics:', err)
    }
    setLoading(false)
  }, [dateRange])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  useEffect(() => {
    async function loadAlerts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!workspace) return

      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('resolvido', false)
        .order('created_at', { ascending: false })
        .limit(3)

      setAlerts(data ?? [])
    }
    loadAlerts()
  }, [])

  const dismissAlert = async (id: string) => {
    await supabase.from('alerts').update({ resolvido: true }).eq('id', id)
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const kpis = [
    { label: 'Faturamento Líquido', value: formatCurrency(metrics?.faturamento ?? 0), change: 12.3, highlight: false },
    { label: 'Gastos com Anúncios', value: formatCurrency(metrics?.gastos ?? 0), change: -4.1 },
    { label: 'ROAS', value: formatRoas(metrics?.roas ?? 0), change: 8.7, highlight: metrics ? metrics.roas >= 2 : false },
    { label: 'Lucro', value: formatCurrency(metrics?.lucro ?? 0), change: 15.2, highlight: metrics ? metrics.lucro > 0 : false },
    { label: 'CPA', value: formatCurrency(metrics?.cpa ?? 0), change: -3.4 },
    { label: 'Margem', value: `${(metrics?.margem ?? 0).toFixed(1)}%`, change: 2.1 },
    { label: 'Total de Vendas', value: (metrics?.vendas ?? 0).toString(), change: 9.8 },
    { label: 'Vendas Reembolsadas', value: (metrics?.reembolsos ?? 0).toString() },
  ]

  return (
    <div className="flex flex-col h-full">
      <TopBar
        userName={userName}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={loadMetrics}
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* KPI Grid */}
        <div className="grid grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))
            : kpis.map((kpi) => (
                <KpiCard
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  change={kpi.change}
                  changeLabel="vs período anterior"
                  highlight={kpi.highlight}
                />
              ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Chart */}
          <div className="col-span-2">
            <MetricsChart data={[]} />
          </div>

          {/* Alerts */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Alertas</h3>
            {alerts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                <p className="text-sm text-slate-500">Nenhum alerta ativo.</p>
                <p className="text-xs text-slate-400 mt-1">Sua operação está saudável!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
