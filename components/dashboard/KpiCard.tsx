import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  change?: number
  changeLabel?: string
  highlight?: boolean
}

export function KpiCard({ label, value, change, changeLabel, highlight }: KpiCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow',
        highlight && 'border-green-200 bg-green-50'
      )}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={cn('text-3xl font-bold', highlight ? 'text-green-700' : 'text-slate-900')}>
        {value}
      </p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
          ) : isNegative ? (
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              isPositive ? 'text-green-600' : isNegative ? 'text-red-500' : 'text-slate-400'
            )}
          >
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
          {changeLabel && <span className="text-xs text-slate-400">{changeLabel}</span>}
        </div>
      )}
    </div>
  )
}
