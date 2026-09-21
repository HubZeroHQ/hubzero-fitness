import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLogs, useProfiles } from '../lib/data'
import { currentStreak, fmtDate, fmtKg, isoDate, addDays, personalRecords, volumeOf } from '../lib/stats'
import { TYPE_COLOR, dayByNumber } from '../lib/program'
import { Card, Heading, chartColors, font, inputStyle, tooltipStyle } from '../components/ui'
import Progress from './Progress'

const roleLabel = { coach: 'Coach', moderator: 'Moderator', member: 'Member' } as const

export default function Team() {
  const profiles = useProfiles()
  const logs = useLogs()
  const [exercise, setExercise] = useState('')
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null)

  const rows = useMemo(() => {
    if (!profiles || !logs) return null
    const since = isoDate(addDays(new Date(), -30))
    return profiles
      .map((p) => {
        const mine = logs.filter((l) => l.user_id === p.id)
        const recent = mine.filter((l) => l.completed && l.log_date >= since)
        const sets = mine.flatMap((l) => l.set_logs.map((s) => ({ ...s, log_date: l.log_date })))
        const lastLog = [...mine].reverse().find((l) => l.completed)
        return {
          profile: p,
          total: mine.filter((l) => l.completed).length,
          last30: recent.length,
          volume30: recent.reduce((n, l) => n + volumeOf(l.set_logs), 0),
          streak: currentStreak(mine),
          prs: personalRecords(sets),
          lastLog,
        }
      })
      .sort((a, b) => b.last30 - a.last30 || b.volume30 - a.volume30)
  }, [profiles, logs])

  if (viewing) {
    return (
      <div>
        <button onClick={() => setViewing(null)} className="text-sm mb-3" style={{ color: '#e63946', fontFamily: font.display, letterSpacing: '0.08em' }}>
          ← BACK TO TEAM
        </button>
        <Progress userId={viewing.id} name={viewing.name} />
      </div>
    )
  }
  if (!rows) return <div style={{ color: '#888899' }}>Loading…</div>

  const exercises = new Map<string, string>()
  rows.forEach((r) => r.prs.forEach((p) => exercises.set(p.exercise_key, p.exercise_name)))
  const selected = exercise || [...exercises.keys()][0] || ''
  const chart = rows
    .map((r) => ({ name: r.profile.full_name.split(' ')[0], weight: r.prs.find((p) => p.exercise_key === selected)?.weight_kg ?? 0 }))
    .filter((r) => r.weight > 0)

  return (
    <div>
      <Heading sub="Last 30 days. Everyone on the team can see everyone's numbers.">Team</Heading>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <Card key={r.profile.id}>
            <button className="w-full text-left" onClick={() => setViewing({ id: r.profile.id, name: r.profile.full_name })}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
                    style={{ background: i === 0 && r.last30 > 0 ? '#f59e0b' : '#1a1a22', color: i === 0 && r.last30 > 0 ? '#0a0a0c' : '#c0c0cc', fontFamily: font.display, fontSize: 18 }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-bold uppercase" style={{ fontFamily: font.display, fontSize: 19 }}>
                      {r.profile.full_name}
                    </div>
                    <div className="text-xs" style={{ color: '#888899' }}>
                      {roleLabel[r.profile.role]}
                      {r.lastLog && (
                        <>
                          {' · last: '}
                          <span style={{ color: TYPE_COLOR[dayByNumber(r.lastLog.day_number).type].fg }}>{dayByNumber(r.lastLog.day_number).title}</span> on {fmtDate(r.lastLog.log_date)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-5 text-center">
                  <Mini label="Workouts" value={r.last30} />
                  <Mini label="Streak" value={r.streak} />
                  <Mini label="Volume" value={`${(r.volume30 / 1000).toFixed(1)}t`} />
                </div>
              </div>
            </button>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="text-xs uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
            Heaviest set by exercise (kg)
          </div>
          <select value={selected} onChange={(e) => setExercise(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '6px 8px', fontSize: 13 }}>
            {[...exercises].map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {chart.length === 0 ? (
          <div className="text-sm py-6 text-center" style={{ color: '#888899' }}>
            No sets logged yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chart}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="name" stroke={chartColors.axis} fontSize={12} />
              <YAxis stroke={chartColors.axis} fontSize={11} width={40} />
              <Tooltip {...tooltipStyle} formatter={(v) => `${fmtKg(Number(v))} kg`} />
              <Bar dataKey="weight" fill={chartColors.blue} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-2xl font-bold" style={{ fontFamily: font.display }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: '#888899', fontFamily: font.display }}>
        {label}
      </div>
    </div>
  )
}
