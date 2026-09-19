import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TEAM_MEMBERS, generateTeamProgressData } from '../data/sampleData'

type Range = '7' | '30' | '90' | 'all'

const RANGES: { id: Range; label: string; days: number }[] = [
  { id: '7', label: '7 Days', days: 7 },
  { id: '30', label: '30 Days', days: 19 }, // only 19 days of data so far
  { id: '90', label: '3 Months', days: 19 },
  { id: 'all', label: 'All Time', days: 19 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-4 py-3 text-xs" style={{ background: '#1a1a22', border: '1px solid #2a2a35' }}>
      <div className="mb-2 font-bold" style={{ color: '#888899', fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: '#c0c0cc' }}>{p.name}</span>
          <span className="ml-auto font-bold" style={{ color: p.color, fontFamily: 'JetBrains Mono, monospace' }}>
            {p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TeamProgressPage() {
  const [range, setRange] = useState<Range>('7')
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const rangeConfig = RANGES.find((r) => r.id === range)!
  const data = generateTeamProgressData(Math.min(rangeConfig.days, 19))

  const teamStats = TEAM_MEMBERS.map((m) => ({
    ...m,
    latest: (data[data.length - 1]?.[m.id] as number) ?? 0,
    change: ((data[data.length - 1]?.[m.id] as number) ?? 0) - ((data[0]?.[m.id] as number) ?? 0),
  })).sort((a, b) => b.latest - a.latest)

  function toggleMember(id: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: '#0a0a0c' }}>
      <div className="px-4 pt-6 pb-4 md:px-8">
        <h1
          className="text-3xl font-black mb-1"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.04em' }}
        >
          TEAM PROGRESS
        </h1>
        <p className="text-sm" style={{ color: '#888899' }}>
          Normalized progress scores — no personal weights or reps shown
        </p>
      </div>

      <div className="px-4 md:px-8 max-w-4xl">
        {/* Privacy notice */}
        <div
          className="rounded-xl px-4 py-3 mb-5 flex items-start gap-3"
          style={{ background: '#111116', border: '1px solid #2a2a35' }}
        >
          <span className="text-lg">🔒</span>
          <div className="text-xs leading-relaxed" style={{ color: '#888899' }}>
            Progress scores reflect <strong style={{ color: '#c0c0cc' }}>workout consistency, training intensity, and progressive overload</strong>.
            No member's exact weights, reps, or personal data is shown here.
          </div>
        </div>

        {/* Range filter */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: range === r.id ? '#e63946' : '#111116',
                color: range === r.id ? '#fff' : '#888899',
                border: `1px solid ${range === r.id ? '#e63946' : '#2a2a35'}`,
                fontFamily: 'Barlow Condensed, sans-serif',
                letterSpacing: '0.06em',
              }}
            >
              {r.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl p-5 mb-5" style={{ background: '#111116', border: '1px solid #2a2a35' }}>
          <div className="mb-4">
            <div className="text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.08em' }}>
              NORMALIZED PROGRESS SCORE
            </div>
            <div className="text-xs" style={{ color: '#888899' }}>Click member names below to show/hide lines</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#888899', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(data.length / 5)}
              />
              <YAxis
                tick={{ fill: '#888899', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                domain={[20, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              {TEAM_MEMBERS.map((m) => (
                <Line
                  key={m.id}
                  type="monotone"
                  dataKey={m.id}
                  name={m.name}
                  stroke={m.color}
                  strokeWidth={hidden.has(m.id) ? 0 : 2}
                  dot={false}
                  hide={hidden.has(m.id)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / member cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teamStats.map((m) => {
            const isHidden = hidden.has(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggleMember(m.id)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
                style={{
                  background: isHidden ? '#0d0d12' : '#111116',
                  border: `1px solid ${isHidden ? '#1a1a22' : m.color + '40'}`,
                  opacity: isHidden ? 0.5 : 1,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: m.color }}
                />
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: m.color + '22', color: m.color, fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>{m.name}</div>
                  <div className="text-xs flex items-center gap-2">
                    <span style={{ color: '#888899' }}>Score: </span>
                    <span style={{ color: m.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{m.latest}</span>
                    <span
                      className="font-bold"
                      style={{ color: m.change >= 0 ? '#10b981' : '#e63946', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}
                    >
                      {m.change >= 0 ? '+' : ''}{m.change} pts
                    </span>
                  </div>
                </div>
                <div
                  className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: m.role === 'admin' ? '#3a121640' : m.role === 'coach' ? '#0f204040' : '#1a1a22', color: m.role === 'admin' ? '#e63946' : m.role === 'coach' ? '#3b82f6' : '#888899', fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  {m.role.toUpperCase()}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
