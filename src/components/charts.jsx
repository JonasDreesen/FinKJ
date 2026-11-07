import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '../lib/format'
import { formatMonthShort } from '../lib/dates'
import { categoryColor } from '../lib/categories'
import { usePrefs } from '../context/PrefsContext'

function ChartTooltip({ active, payload, label, labelFormatter }) {
  const { privacy } = usePrefs()
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2 text-xs shadow-card">
      {label != null && <p className="mb-1 font-semibold capitalize">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.payload?.fill }} />
          <span className="text-muted">{p.name}</span>
          <span className="money ml-auto font-semibold">{privacy ? '•••' : formatMoney(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function DonutChart({ data, size = 180 }) {
  return (
    <div style={{ width: size, height: size }} className="shrink-0">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.id} fill={categoryColor(d.category)} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendChart({ data, series, height = 220 }) {
  const { privacy } = usePrefs()
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} barGap={4} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatMonthShort(d)}
            tick={{ fontSize: 12, fill: 'rgb(var(--muted))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={privacy ? 8 : 52}
            tick={privacy ? false : { fontSize: 11, fill: 'rgb(var(--muted))' }}
            tickFormatter={(v) => formatMoney(v, { compact: true })}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgb(var(--surface-2))' }}
            content={<ChartTooltip labelFormatter={(d) => d.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })} />}
          />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
