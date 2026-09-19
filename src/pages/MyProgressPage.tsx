import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from 'recharts'
import { WEEKLY_COMPLETION, MONTHLY_VOLUME, EXERCISE_HISTORY, WORKOUT_HISTORY_CALENDAR } from '../data/sampleData'

type Tab = 'overview' | 'exercises' | 'history'

const WEEKLY_STATS = [
  { label: 'Completion', value: '91%', sub: 'this week', color: '#10b981' },
  { label: 'Exercises', value: '34', sub: 'completed', color: '#3b82f6' },
  { label: 'Sets Logged', value: '102', sub: 'total sets', color: '#f59e0b' },
  { label: 'Streak', value: '5', sub: 'days', color: '#e63946' },
]

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#f0f0f5' }}>
      <div style={{ color: '#888899' }}>{label}</div>
      <div className="font-bold" style={{ color: '#10b981' }}>{payload[0].value}%</div>
    </div>
  )
}

const CustomTooltipLine = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#f0f0f5' }}>
      <div style={{ color: '#888899' }}>{label}</div>
      <div className="font-bold" style={{ color: '#3b82f6' }}>{payload[0].value.toLocaleString()} kg</div>
    </div>
  )
}

export default function MyProgressPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedExercise, setSelectedExercise] = useState('d6e1')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'exercises', label: 'Exercises' },
    { id: 'history', label: 'History' },
  ]

  const exHistory = EXERCISE_HISTORY[selectedExercise as keyof typeof EXERCISE_HISTORY]

  const calcVolume = (sets: { w: number; r: number }[]) =>
    sets.reduce((sum, s) => sum + s.w * s.r, 0)

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: '#0a0a0c' }}>
      {/* Page header */}
      <div className="px-4 pt-6 pb-4 md:px-8">
        <div className="flex items-center gap-3 mb-1">
          <h1
            className="text-3xl font-black"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.04em' }}
          >
            MY PROGRESS
          </h1>
          <span
            className="text-xs px-2 py-1 rounded font-bold"
            style={{ background: '#1a1a22', color: '#888899', fontFamily: 'Barlow Condensed, sans-serif', border: '1px solid #2a2a35' }}
          >
            🔒 PRIVATE
          </span>
        </div>
        <p className="text-sm" style={{ color: '#888899' }}>Only you can see this data</p>
      </div>

      {/* Tab bar */}
      <div className="px-4 md:px-8 mb-6">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#111116', border: '1px solid #2a2a35', width: 'fit-content' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-all"
              style={{
                background: tab === t.id ? '#1a1a22' : 'transparent',
                color: tab === t.id ? '#f0f0f5' : '#888899',
                fontFamily: 'Barlow Condensed, sans-serif',
                letterSpacing: '0.05em',
              }}
            >
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-4xl">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {WEEKLY_STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl px-4 py-4"
                  style={{ background: '#111116', border: '1px solid #2a2a35' }}
                >
                  <div
                    className="text-3xl font-black leading-none mb-1"
                    style={{ fontFamily: 'Barlow Condensed, sans-serif', color: s.color }}
                  >
                    {s.value}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>{s.label}</div>
                  <div className="text-xs" style={{ color: '#888899' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Weekly completion chart */}
            <div className="rounded-xl p-5" style={{ background: '#111116', border: '1px solid #2a2a35' }}>
              <div className="mb-4">
                <div className="text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.08em' }}>
                  WEEKLY WORKOUT COMPLETION
                </div>
                <div className="text-xs" style={{ color: '#888899' }}>Sep 14 – Sep 20, 2026</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={WEEKLY_COMPLETION} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#1a1a22" />
                  <XAxis dataKey="day" tick={{ fill: '#888899', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#888899', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltipBar />} cursor={{ fill: '#1a1a22' }} />
                  <Bar dataKey="pct" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly volume chart */}
            <div className="rounded-xl p-5" style={{ background: '#111116', border: '1px solid #2a2a35' }}>
              <div className="mb-4">
                <div className="text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.08em' }}>
                  MONTHLY TRAINING VOLUME
                </div>
                <div className="text-xs" style={{ color: '#888899' }}>Total kg lifted per week</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={MONTHLY_VOLUME}>
                  <CartesianGrid stroke="#1a1a22" />
                  <XAxis dataKey="week" tick={{ fill: '#888899', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#888899', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip content={<CustomTooltipLine />} />
                  <Line type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <span style={{ color: '#888899' }}>W1 → W4</span>
                <span style={{ color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>+26.2% volume increase</span>
              </div>
            </div>
          </div>
        )}

        {/* EXERCISES TAB */}
        {tab === 'exercises' && (
          <div className="flex flex-col gap-5">
            {/* Exercise picker */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(EXERCISE_HISTORY).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedExercise(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: selectedExercise === key ? '#10b981' : '#111116',
                    color: selectedExercise === key ? '#0a0a0c' : '#888899',
                    border: `1px solid ${selectedExercise === key ? '#10b981' : '#2a2a35'}`,
                    fontFamily: 'Barlow Condensed, sans-serif',
                    letterSpacing: '0.06em',
                  }}
                >
                  {val.name.toUpperCase()}
                </button>
              ))}
            </div>

            {exHistory && (
              <div className="flex flex-col gap-4">
                {exHistory.weeks.map((wk, wi) => {
                  const vol = calcVolume(wk.sets)
                  const prevVol = wi > 0 ? calcVolume(exHistory.weeks[wi - 1].sets) : null
                  const change = prevVol ? ((vol - prevVol) / prevVol * 100).toFixed(1) : null

                  return (
                    <div
                      key={wk.week}
                      className="rounded-xl p-5"
                      style={{ background: '#111116', border: '1px solid #2a2a35' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.06em' }}>
                          {wk.week.toUpperCase()}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span style={{ color: '#888899', fontFamily: 'JetBrains Mono, monospace' }}>
                            Vol: <strong style={{ color: '#c0c0cc' }}>{vol.toLocaleString()} kg</strong>
                          </span>
                          {change && (
                            <span
                              className="font-bold px-2 py-0.5 rounded"
                              style={{
                                background: Number(change) >= 0 ? '#0a2e22' : '#3a1216',
                                color: Number(change) >= 0 ? '#10b981' : '#e63946',
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              {Number(change) >= 0 ? '+' : ''}{change}%
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div
                          className="grid text-xs font-semibold mb-1"
                          style={{ gridTemplateColumns: '32px 1fr 1fr 1fr', color: '#444455', fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          <span>SET</span>
                          <span>WEIGHT</span>
                          <span>REPS</span>
                          <span>VOL</span>
                        </div>
                        {wk.sets.map((s, si) => (
                          <div
                            key={si}
                            className="grid items-center text-sm py-1.5 px-2 rounded"
                            style={{ gridTemplateColumns: '32px 1fr 1fr 1fr', background: '#1a1a22' }}
                          >
                            <span style={{ color: '#444455', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{si + 1}</span>
                            <span style={{ color: '#f0f0f5', fontFamily: 'JetBrains Mono, monospace' }}>{s.w} kg</span>
                            <span style={{ color: '#f0f0f5', fontFamily: 'JetBrains Mono, monospace' }}>{s.r} reps</span>
                            <span style={{ color: '#888899', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{s.w * s.r} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div>
            <div className="mb-4">
              <div className="text-sm font-bold mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.08em' }}>
                SEPTEMBER 2026
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {WORKOUT_HISTORY_CALENDAR.map((entry) => {
                const isRest = entry.day === 7
                const isComplete = !isRest && entry.completed === entry.total && entry.total > 0
                const inProgress = !isRest && entry.completed > 0 && entry.completed < entry.total

                const typeMap: Record<number, string> = { 1: '#e63946', 2: '#3b82f6', 3: '#10b981', 4: '#e63946', 5: '#3b82f6', 6: '#10b981', 7: '#6b7280' }
                const color = typeMap[entry.day] ?? '#888899'

                return (
                  <div
                    key={entry.date}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer transition-all hover:brightness-110"
                    style={{ background: entry.isToday ? '#1a1a22' : '#111116', border: `1px solid ${entry.isToday ? color + '60' : '#2a2a35'}` }}
                  >
                    <div className="w-12 text-center flex-shrink-0">
                      <div className="text-lg font-black leading-none" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: entry.isToday ? color : '#f0f0f5' }}>
                        {entry.date.split('-')[2]}
                      </div>
                      <div className="text-xs" style={{ color: '#888899', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(entry.date).toLocaleDateString('en', { weekday: 'short' }).toUpperCase()}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.04em' }}>
                          {entry.label.toUpperCase()}
                        </span>
                        {entry.isToday && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: color + '20', color: color, fontFamily: 'Barlow Condensed, sans-serif' }}>
                            TODAY
                          </span>
                        )}
                      </div>
                      {!isRest && (
                        <div className="text-xs mt-0.5" style={{ color: '#888899', fontFamily: 'JetBrains Mono, monospace' }}>
                          {entry.isToday ? 'In progress' : `${entry.completed}/${entry.total} exercises`}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {isRest && <span className="text-lg">💤</span>}
                      {isComplete && <span className="text-lg" style={{ color: '#10b981' }}>✓</span>}
                      {inProgress && (
                        <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: '#f59e0b20', color: '#f59e0b', fontFamily: 'Barlow Condensed, sans-serif' }}>
                          {Math.round((entry.completed / entry.total) * 100)}%
                        </span>
                      )}
                      {entry.isToday && <span style={{ color: '#888899' }}>→</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
