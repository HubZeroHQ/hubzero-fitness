import { useEffect, useMemo, useState } from 'react'
import { api, programApi, type BodyMetric, type FullLog, type Profile } from '../lib/api'
import { useLogs, useMetrics, useProfiles } from '../lib/data'
import { TYPE_COLOR } from '../lib/program'
import { useProgram } from '../lib/programContext'
import { addDays, currentStreak, fmtDate, fmtKg, isoDate, volumeOf, weekStart } from '../lib/stats'
import { Button, Card, Heading, Stat, font } from '../components/ui'
import Progress from './Progress'

const roleLabel = { coach: 'Coach', moderator: 'Moderator', member: 'Member' } as const
const NUDGE_AFTER_DAYS = 3

const daysBetween = (fromIso: string, to: Date) => {
  const a = new Date(fromIso + 'T00:00:00')
  const b = new Date(to)
  b.setHours(0, 0, 0, 0)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

interface MemberSummary {
  profile: Profile
  today: 'done' | 'started' | 'not-yet'
  last?: FullLog
  daysSince: number | null
  week: number
  last30: number
  streak: number
  weight?: BodyMetric
  weightChange: number | null
  custom: number
  needsNudge: boolean
}

/** The coach's overview: how every member is doing, what needs attention, and the controls to act on it. */
export default function Coach({ onEditProgram }: { onEditProgram: (userId: number) => void }) {
  const { dayByNumber } = useProgram()
  const profiles = useProfiles()
  const [reload, setReload] = useState(0)
  const logs = useLogs(undefined, reload)
  const metrics = useMetrics(undefined, reload)
  const [overrides, setOverrides] = useState<Record<string, number[]>>({})
  const [viewing, setViewing] = useState<{ id: number; name: string } | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    programApi.scope(0).then((s) => setOverrides(s.overrides)).catch(() => {})
  }, [reload])

  const summary = useMemo(() => {
    if (!profiles || !logs || !metrics) return null
    const now = new Date()
    const todayIso = isoDate(now)
    const weekFrom = isoDate(weekStart(now))
    const since30 = isoDate(addDays(now, -30))
    return profiles.map<MemberSummary>((p) => {
      const mine = logs.filter((l) => l.user_id === p.id)
      const done = mine.filter((l) => l.completed)
      const todays = mine.find((l) => l.log_date === todayIso)
      const last = [...done].reverse()[0]
      const daysSince = last ? daysBetween(last.log_date, now) : null
      const weights = metrics.filter((m) => m.user_id === p.id)
      return {
        profile: p,
        today: todays?.completed ? 'done' : todays ? 'started' : 'not-yet',
        last,
        daysSince,
        week: done.filter((l) => l.log_date >= weekFrom).length,
        last30: done.filter((l) => l.log_date >= since30).length,
        streak: currentStreak(mine),
        weight: weights.at(-1),
        weightChange: weights.length >= 2 ? weights.at(-1)!.weight_kg - weights[0].weight_kg : null,
        custom: Object.values(overrides).filter((ids) => ids.includes(p.id)).length,
        needsNudge: daysSince === null || daysSince >= NUDGE_AFTER_DAYS,
      }
    })
  }, [profiles, logs, metrics, overrides])

  if (viewing) {
    return (
      <div>
        <button onClick={() => setViewing(null)} className="text-sm mb-3" style={{ color: '#e63946', fontFamily: font.display, letterSpacing: '0.08em' }}>
          ← BACK TO COACH PANEL
        </button>
        <Progress userId={viewing.id} name={viewing.name} />
      </div>
    )
  }
  if (!summary || !profiles || !logs) return <div style={{ color: '#888899' }}>Loading…</div>

  const nameOf = (id: number) => profiles.find((p) => p.id === id)?.full_name ?? 'Unknown'
  const trainedToday = summary.filter((m) => m.today === 'done').length
  const weekTotal = summary.reduce((n, m) => n + m.week, 0)
  const nudges = summary.filter((m) => m.needsNudge)
  const recent = [...logs].sort((a, b) => (a.log_date < b.log_date ? 1 : a.log_date > b.log_date ? -1 : b.id - a.id)).slice(0, 12)

  async function resetPassword(p: Profile) {
    if (!window.confirm(`Reset ${p.full_name}'s password to the default (hubzero)? They will be signed out everywhere and must choose a new password at their next login.`)) return
    setError('')
    setNotice('')
    try {
      await api.resetPassword(p.id)
      setNotice(`${p.full_name}'s password was reset to "hubzero". They must choose a new one at their next login.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password')
    }
  }

  async function deleteLog(l: FullLog) {
    if (!window.confirm(`Delete ${nameOf(l.user_id)}'s workout on ${fmtDate(l.log_date)} and all of its sets? This cannot be undone.`)) return
    setError('')
    try {
      await api.deleteLog(l.id)
      setReload((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the workout')
    }
  }

  return (
    <div>
      <Heading sub="Everything about the team in one place, with your controls.">Coach Panel</Heading>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Trained today" value={`${trainedToday}/${summary.length}`} color="#10b981" />
        <Stat label="Workouts this week" value={weekTotal} />
        <Stat label="Need a nudge" value={nudges.length} color={nudges.length ? '#e63946' : '#10b981'} />
      </div>

      {nudges.length > 0 && (
        <div className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: '#3a1216', color: '#ff8a93' }}>
          {nudges.map((m) => `${m.profile.full_name.split(' ')[0]} ${m.daysSince === null ? 'has not trained yet' : `has not trained for ${m.daysSince} days`}`).join(' · ')}
        </div>
      )}

      {error && (
        <div className="mt-3 text-sm rounded-lg px-3 py-2" role="alert" style={{ background: '#3a1216', color: '#ff8a93' }}>
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-3 text-sm rounded-lg px-3 py-2" role="status" style={{ background: '#0a2e22', color: '#6ee7b7' }}>
          {notice}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {summary.map((m) => {
          const last = m.last
          const lastTitle = last ? (last.day_title ?? dayByNumber(last.day_number).title) : null
          const lastType = last ? (last.day_type ?? dayByNumber(last.day_number).type) : null
          return (
            <Card key={m.profile.id} data-member={m.profile.full_name}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold uppercase" style={{ fontFamily: font.display, fontSize: 21 }}>
                    {m.profile.full_name}
                  </div>
                  <div className="text-xs" style={{ color: '#888899' }}>
                    {roleLabel[m.profile.role]}
                    {m.custom > 0 && <span style={{ color: '#f59e0b' }}> · {m.custom} custom program day{m.custom === 1 ? '' : 's'}</span>}
                  </div>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider"
                  style={{
                    fontFamily: font.display,
                    background: m.today === 'done' ? '#0a2e22' : m.today === 'started' ? '#33260a' : '#1a1a22',
                    color: m.today === 'done' ? '#10b981' : m.today === 'started' ? '#f59e0b' : '#888899',
                  }}
                >
                  {m.today === 'done' ? 'Trained today' : m.today === 'started' ? 'In progress today' : 'Not yet today'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                <Fact label="Last workout">
                  {last ? (
                    <>
                      <span style={{ color: TYPE_COLOR[lastType!].fg }}>{lastTitle}</span> · {fmtDate(last.log_date)}
                      <div style={{ color: m.needsNudge ? '#ff8a93' : '#888899' }}>{m.daysSince === 0 ? 'today' : `${m.daysSince} day${m.daysSince === 1 ? '' : 's'} ago`}</div>
                    </>
                  ) : (
                    <span style={{ color: '#ff8a93' }}>none yet</span>
                  )}
                </Fact>
                <Fact label="This week / 30 days">
                  {m.week} / {m.last30} workouts
                  <div style={{ color: '#888899' }}>streak {m.streak} day{m.streak === 1 ? '' : 's'}</div>
                </Fact>
                <Fact label="Weight">
                  {m.weight ? (
                    <>
                      {fmtKg(m.weight.weight_kg)} kg <span style={{ color: '#888899' }}>({fmtDate(m.weight.measured_on)})</span>
                      <div style={{ color: '#888899' }}>
                        {m.weightChange !== null && `${m.weightChange > 0 ? '+' : ''}${fmtKg(m.weightChange)} kg since first`}
                        {m.profile.goal_weight_kg ? ` · goal ${fmtKg(m.profile.goal_weight_kg)}` : ''}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: '#888899' }}>no weigh-ins</span>
                  )}
                </Fact>
                <Fact label="Height / goal">
                  {m.profile.height_cm ? `${fmtKg(m.profile.height_cm)} cm` : '–'} / {m.profile.goal_weight_kg ? `${fmtKg(m.profile.goal_weight_kg)} kg` : '–'}
                </Fact>
              </div>

              <div className="flex gap-2 flex-wrap mt-4">
                <Button variant="ghost" onClick={() => setViewing({ id: m.profile.id, name: m.profile.full_name })}>
                  View full progress
                </Button>
                <Button variant="ghost" onClick={() => onEditProgram(m.profile.id)}>
                  Edit their program
                </Button>
                {m.profile.role !== 'coach' && (
                  <Button variant="ghost" onClick={() => resetPassword(m.profile)}>
                    Reset password
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="mt-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
          Recent activity (whole team)
        </div>
        {recent.length === 0 ? (
          <div className="text-sm py-4 text-center" style={{ color: '#888899' }}>
            Nothing logged yet.
          </div>
        ) : (
          <div>
            {recent.map((l) => {
              const title = l.day_title ?? dayByNumber(l.day_number).title
              const type = l.day_type ?? dayByNumber(l.day_number).type
              const ticked = l.set_logs.filter((s) => s.done).length
              return (
                <div key={l.id} className="flex items-center justify-between gap-3 text-sm py-2 flex-wrap" style={{ borderTop: '1px solid #1f1f28' }}>
                  <div>
                    <b>{nameOf(l.user_id)}</b> <span style={{ color: TYPE_COLOR[type].fg }}>{title}</span>{' '}
                    <span style={{ color: '#888899' }}>{fmtDate(l.log_date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ color: l.completed ? '#10b981' : '#888899', fontFamily: font.mono }}>
                      {l.completed ? `${ticked} sets · ${Math.round(volumeOf(l.set_logs)).toLocaleString()} kg` : `unfinished · ${ticked} sets`}
                    </span>
                    <button onClick={() => deleteLog(l)} className="text-xs uppercase tracking-widest" style={{ color: '#e63946', fontFamily: font.display }}>
                      Delete
                    </button>
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

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#888899', fontFamily: font.display }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}
