'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Bell,
  Sparkles,
  History,
  FlaskConical,
  Database,
  BookMarked,
  Clock,
  Settings,
} from 'lucide-react'

const PLAN_CREDITS: Record<string, number> = {
  starter: 20,
  pro:     60,
  scale:   200,
}

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badgeKey?: 'alerts'
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Visão geral',
    items: [
      { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/alertas',    label: 'Alertas',      icon: Bell, badgeKey: 'alerts' },
    ],
  },
  {
    label: 'Análise IA',
    items: [
      { href: '/analise',            label: 'Nova análise', icon: Sparkles },
      { href: '/analise/historico',  label: 'Histórico',    icon: History },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { href: '/experimentos', label: 'Experimentos', icon: FlaskConical },
      { href: '/memoria',      label: 'Memória',      icon: Database },
      { href: '/biblioteca',   label: 'Biblioteca',   icon: BookMarked },
      { href: '/analise/historico', label: 'Histórico', icon: Clock },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  const [alertCount, setAlertCount] = useState(0)
  const [creditsUsed, setCreditsUsed] = useState(0)
  const [planMax, setPlanMax] = useState(60)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id, plano')
        .eq('user_id', user.id)
        .single()
      if (!ws) return

      setPlanMax(PLAN_CREDITS[ws.plano] ?? 60)

      // Alert count
      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ws.id)
        .eq('resolvido', false)
      setAlertCount(count ?? 0)

      // Credits used (sum from analyses)
      const { data: analyses } = await supabase
        .from('analyses')
        .select('creditos_usados')
        .eq('workspace_id', ws.id)
      const used = (analyses ?? []).reduce((sum, a) => sum + (a.creditos_usados ?? 0), 0)
      setCreditsUsed(used)
    }
    load()
  }, [])

  const creditsPct = Math.min(100, Math.round((creditsUsed / planMax) * 100))

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="text-[18px] font-bold text-green-600 tracking-tight leading-none">claudio</div>
        <div className="text-[10.5px] text-slate-400 mt-1">Inteligência de campanha 360</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="text-[9.5px] font-semibold uppercase tracking-widest text-slate-400 px-2 mb-1.5">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, badgeKey }) => {
                const isActive = pathname === href || (href !== '/analise' && pathname.startsWith(href + '/'))
                const badge = badgeKey === 'alerts' ? alertCount : 0
                return (
                  <Link
                    key={`${section.label}-${href}`}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors',
                      isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', isActive ? 'text-green-600' : 'text-slate-400')} />
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Credits bar */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-slate-400">Créditos</span>
          <span className="text-[12px] font-medium text-slate-700">{creditsUsed} / {planMax}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', creditsPct > 85 ? 'bg-red-400' : 'bg-green-400')}
            style={{ width: `${creditsPct || 4}%` }}
          />
        </div>
      </div>
    </aside>
  )
}
