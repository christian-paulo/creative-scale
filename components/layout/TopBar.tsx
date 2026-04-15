'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, RefreshCw, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { DateRange } from '@/types'

interface TopBarProps {
  userName?: string
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange) => void
  onRefresh?: () => void
  showDatePicker?: boolean
}

const PRESETS = [
  {
    label: 'Hoje',
    getDates: () => ({ from: new Date(), to: new Date() }),
  },
  {
    label: 'Últimos 7 dias',
    getDates: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 7)
      return { from, to }
    },
  },
  {
    label: 'Últimas 2 semanas',
    getDates: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 14)
      return { from, to }
    },
  },
  {
    label: 'Últimos 30 dias',
    getDates: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 30)
      return { from, to }
    },
  },
  {
    label: 'Este mês',
    getDates: () => {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from, to: now }
    },
  },
]

export function TopBar({
  userName,
  dateRange,
  onDateRangeChange,
  onRefresh,
  showDatePicker = true,
}: TopBarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const dateLabel = dateRange
    ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} — ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
    : 'Selecionar período'

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {showDatePicker && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span>{dateLabel}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 z-50">
                {PRESETS.map((preset) => (
                  <DropdownMenuItem
                    key={preset.label}
                    onClick={() => onDateRangeChange?.(preset.getDates())}
                  >
                    {preset.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {userName && (
          <span className="text-sm text-slate-600">
            Olá, <span className="font-medium text-slate-900">{userName}</span>
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2 text-slate-500 hover:text-slate-900"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
