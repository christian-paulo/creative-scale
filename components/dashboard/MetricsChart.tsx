'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  hora: string
  vendas: number
  receita: number
}

interface MetricsChartProps {
  data: DataPoint[]
}

function generateMockHourlyData(): DataPoint[] {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now)
    h.setHours(h.getHours() - (23 - i))
    const hour = h.getHours()
    // Simulate higher sales during business hours
    const base = hour >= 8 && hour <= 22 ? 3 : 0.5
    return {
      hora: `${hour.toString().padStart(2, '0')}:00`,
      vendas: Math.floor(Math.random() * base * 5 + base),
      receita: Math.floor(Math.random() * base * 800 + base * 200),
    }
  })
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs">
        <p className="font-medium text-slate-700 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-slate-600">
            {p.name === 'vendas' ? `${p.value} vendas` : `R$ ${p.value.toLocaleString('pt-BR')}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function MetricsChart({ data }: MetricsChartProps) {
  const chartData = data.length ? data : generateMockHourlyData()

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Vendas por hora</h3>
          <p className="text-sm text-slate-500">Últimas 24 horas</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis
            dataKey="hora"
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            tickLine={false}
            axisLine={false}
            interval={3}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="vendas"
            stroke="#16A34A"
            strokeWidth={2}
            fill="url(#colorVendas)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
