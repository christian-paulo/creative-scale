'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  FlaskConical,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analise', label: 'Análise IA', icon: Sparkles },
  { href: '/memoria', label: 'Memória', icon: BookOpen },
  { href: '/experimentos', label: 'Experimentos', icon: FlaskConical },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <span className="text-xl font-bold text-green-600 tracking-tight">claudio</span>
        <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-green-50 text-green-700 border-r-2 border-green-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-green-600' : 'text-slate-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-green-700">C</span>
          </div>
          <span className="text-xs text-slate-500">Pro</span>
        </div>
      </div>
    </aside>
  )
}
