import { cn } from '@/lib/utils'
import { AlertTriangle, TrendingDown, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Alert } from '@/types'

interface AlertCardProps {
  alert: Alert
  onDismiss?: (id: string) => void
}

const SEVERITY_STYLES = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-amber-200 bg-amber-50',
  low: 'border-blue-200 bg-blue-50',
}

const SEVERITY_ICON_STYLES = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
}

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex items-start gap-3',
        SEVERITY_STYLES[alert.severity]
      )}
    >
      <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', SEVERITY_ICON_STYLES[alert.severity])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{alert.titulo}</p>
        <p className="text-xs text-slate-600 mt-0.5">{alert.descricao}</p>
        {alert.campanha_nome && (
          <Button variant="link" className="text-xs h-auto p-0 mt-1 text-slate-600 gap-1">
            <Eye className="w-3 h-3" /> Ver campanha: {alert.campanha_nome}
          </Button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-slate-400 hover:text-slate-600 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
