import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts'
import { useAuth } from '../lib/auth'
import { useLogs } from '../lib/data'
import { addDays, currentStreak, fmtDate, fmtKg, isoDate, personalRecords, volumeOf, weekStart } from '../lib/stats'
import { TYPE_COLOR } from '../lib/program'
import { useProgram } from '../lib/programContext'
import { Card, Heading, Stat, chartColors, font, inputStyle, tooltipStyle } from '../components/ui'

export default function Progress({ userId, name }: { userId?: number; name?: string }) {
  const { profile } = useAuth()
  const { dayByNumber } = useProgram()
  const uid = userId ?? profile!.id
  const logs = useLogs(uid)
  const [exercise, setExercise] = useState('')

  const data = useMemo(() => {
    if (!logs) return null
    const done = logs.filter((l) => l.completed)
    const allSets = logs.flatMap((l) => l.set_logs.map((s) => ({ ...s, log_date: l.log_date })))
    const prs = personalRecords(allSets)
    const ws = weekStart(new Date())
    const thisWeek = done.filter((l) => l.log_date >= isoDate(ws)).length
    const volumeSeries = done.map((l) => ({ date: fmtDate(l.log_date), volume: Math.round(volumeOf(l.set_logs)) }))
    return { done, prs, thisWeek, volumeSeries, streak: currentStreak(logs), totalVolume: done.reduce((n, l) => n + volumeOf(l.set_logs), 0), allSets }
  }, [logs])

  if (!data || !logs) return <div style={{ color: '#888899' }}>Loading…</div>

  const selected = exercise || data.prs[0]?.exercise_key || ''
  const exerciseSeries = logs
    .map((l) => {
      const best = l.set_logs.filter((s) => s.exercise_key === selected && s.done && s.weight_kg).sort((a, b) => (b.weight_kg ?? 0) - (a.weight_kg ?? 0))[0]
      return best ? { date: fmtDate(l.log_date), weight: best.weight_kg, reps: best.reps } : null
    })
    .filter(Boolean) as { date: string; weight: number; reps: number | null }[]

  // 8-week consistency grid: rows Mon..Sun, columns oldest → newest week.
  const start = addDays(weekStart(new Date()), -7 * 7)
  const byDate = new Map(logs.map((l) => [l.log_date, l]))
  const weeks = Array.from({ length: 8 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  const todayIso = isoDate(new Date())

  return (
    <div>
      <Heading sub={name ? `Viewing ${name}` : 'Every workout you finish is saved here.'}>{name ? `${name.split(' ')[0]}'s Progress` : 'My Progress'}</Heading>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Workouts done" value={data.done.length} color="#10b981" />
        <Stat label="This week" value={`${data.thisWeek}/6`} />
        <Stat label="Streak" value={data.streak} unit="days" color="#f59e0b" />
        <Stat
          label="Total volume"
          value={data.totalVolume >= 1000 ? (data.totalVolume / 1000).toFixed(1) : Math.round(data.totalVolume).toLocaleString()}
          unit={data.totalVolume >= 1000 ? 'tonnes' : 'kg'}
          color="#3b82f6"
        />
      </div>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
          Last 8 weeks
        </div>
        <div className="flex gap-1.5 justify-center overflow-x-auto">
          {weeks.map((wk, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {wk.map((d) => {
                const iso = isoDate(d)
                const l = byDate.get(iso)
                const t = l ? TYPE_COLOR[dayByNumber(l.day_number).type] : null
                return (
                  <div
                    key={iso}
                    title={`${fmtDate(iso)}${l ? ` · Day ${l.day_number}${l.completed ? ' ✓' : ' (unfinished)'}` : ''}`}
                    className="w-6 h-6 md:w-7 md:h-7 rounded"
                    style={{
                      background: l?.completed ? t!.fg : l ? t!.bg : '#15151b',
                      border: iso === todayIso ? '1px solid #f0f0f5' : '1px solid #1f1f28',
                      opacity: d > new Date() ? 0.35 : 1,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex gap-4 justify-center mt-3 text-xs" style={{ color: '#888899' }}>
          {(['push', 'pull', 'legs'] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: TYPE_COLOR[t].fg }} /> {t}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Card>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
            Volume per workout (kg)
          </div>
          {data.volumeSeries.length < 2 ? (
            <Empty>Finish two workouts to see the trend.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.volumeSeries}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={chartColors.axis} fontSize={11} />
                <YAxis stroke={chartColors.axis} fontSize={11} width={45} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="volume" fill={chartColors.red} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
              Best set over time (kg)
            </div>
            <select value={selected} onChange={(e) => setExercise(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 8px', fontSize: 13 }}>
              {data.prs.map((p) => (
                <option key={p.exercise_key} value={p.exercise_key}>
                  {p.exercise_name}
                </option>
              ))}
            </select>
          </div>
          {exerciseSeries.length < 2 ? (
            <Empty>Log this exercise in two workouts to see a line.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={exerciseSeries}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="date" stroke={chartColors.axis} fontSize={11} />
                <YAxis stroke={chartColors.axis} fontSize={11} width={40} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="weight" stroke={chartColors.green} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
          Personal records
        </div>
        {data.prs.length === 0 ? (
          <Empty>No records yet. Log a set with weight and reps and tick it.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: '#888899', textAlign: 'left' }}>
                  <th className="py-1 font-normal">Exercise</th>
                  <th className="font-normal">Best set</th>
                  <th className="font-normal">Est. 1RM</th>
                  <th className="font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.prs.map((p) => (
                  <tr key={p.exercise_key} style={{ borderTop: '1px solid #1f1f28' }}>
                    <td className="py-2">{p.exercise_name}</td>
                    <td style={{ fontFamily: font.mono }}>
                      {fmtKg(p.weight_kg)} kg × {p.reps}
                    </td>
                    <td style={{ fontFamily: font.mono, color: '#f59e0b' }}>{fmtKg(p.est1rm)} kg</td>
                    <td style={{ color: '#888899' }}>{fmtDate(p.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
          History
        </div>
        {logs.length === 0 ? (
          <Empty>Nothing logged yet.</Empty>
        ) : (
          <div className="space-y-2">
            {[...logs].reverse().slice(0, 30).map((l) => {
              const d = dayByNumber(l.day_number)
              return (
                <div key={l.id} className="flex items-center justify-between text-sm py-1.5" style={{ borderTop: '1px solid #1f1f28' }}>
                  <div>
                    <span style={{ color: TYPE_COLOR[d.type].fg, fontFamily: font.display, fontSize: 16 }}>
                      Day {d.day} {d.title}
                    </span>
                    <span className="ml-2" style={{ color: '#888899' }}>
                      {fmtDate(l.log_date)}
                    </span>
                  </div>
                  <div style={{ color: l.completed ? '#10b981' : '#888899', fontFamily: font.mono }}>
                    {l.completed ? `${Math.round(volumeOf(l.set_logs)).toLocaleString()} kg` : 'unfinished'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function Empty({ children }: { children: string }) {
  return (
    <div className="text-sm py-6 text-center" style={{ color: '#888899' }}>
      {children}
    </div>
  )
}
