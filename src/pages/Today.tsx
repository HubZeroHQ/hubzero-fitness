import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type SetLog, type WorkoutLog } from '../lib/api'
import { useAuth } from '../lib/auth'
import { TIPS, TYPE_COLOR, defaultDayFor, type Exercise } from '../lib/program'
import { useProgram } from '../lib/programContext'
import { fmtDate, fmtKg, isoDate } from '../lib/stats'
import { Button, Card, Heading, font, inputStyle } from '../components/ui'

interface Cell {
  weight: string
  reps: string
  done: boolean
}
type Cells = Record<string, Cell>
const cellKey = (exKey: string, n: number) => `${exKey}:${n}`

interface Last {
  date: string
  weight: number | null
  reps: number | null
}

export default function Today() {
  const { profile } = useAuth()
  const { days, dayByNumber } = useProgram()
  const userId = profile!.id
  const today = useMemo(() => new Date(), [])
  const dateStr = isoDate(today)

  const [dayNumber, setDayNumber] = useState(defaultDayFor(today))
  const [cells, setCells] = useState<Cells>({})
  const [log, setLog] = useState<WorkoutLog | null>(null)
  const [last, setLast] = useState<Record<string, Last>>({})
  const [notes, setNotes] = useState('')
  const [cardio, setCardio] = useState('')
  const [duration, setDuration] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [loaded, setLoaded] = useState(false)

  const day = dayByNumber(dayNumber)
  const colors = TYPE_COLOR[day.type]
  const completed = log?.completed ?? false

  // Load today's log (if any) and the most recent performance per exercise.
  useEffect(() => {
    let active = true
    ;(async () => {
      const all = await api.logs(userId).catch(() => [])
      const existing = all.find((l) => l.log_date === dateStr)

      const restored: Cells = {}
      for (const s of existing?.set_logs ?? []) {
        restored[cellKey(s.exercise_key, s.set_number)] = {
          weight: s.weight_kg?.toString() ?? '',
          reps: s.reps?.toString() ?? '',
          done: s.done,
        }
      }

      // Newest first: the first date seen per exercise is its latest; within that date keep the heaviest set.
      const lastMap: Record<string, Last> = {}
      for (const wl of [...all].reverse()) {
        if (wl.log_date >= dateStr) continue
        for (const s of wl.set_logs) {
          if (!s.done) continue
          const prev = lastMap[s.exercise_key]
          if (!prev || (prev.date === wl.log_date && (s.weight_kg ?? 0) > (prev.weight ?? 0))) {
            lastMap[s.exercise_key] = { date: wl.log_date, weight: s.weight_kg, reps: s.reps }
          }
        }
      }

      if (!active) return
      if (existing) {
        setLog(existing)
        setDayNumber(existing.day_number)
        setNotes(existing.notes ?? '')
        setCardio(existing.cardio_min?.toString() ?? '')
        setDuration(existing.duration_min?.toString() ?? '')
      }
      setCells(restored)
      setLast(lastMap)
      setLoaded(true)
    })()
    return () => {
      active = false
    }
  }, [userId, dateStr])

  const stateRef = useRef({ cells, dayNumber, notes, cardio, duration, log })
  stateRef.current = { cells, dayNumber, notes, cardio, duration, log }

  const persist = useCallback(
    async (finish?: boolean) => {
      const s = stateRef.current
      const d = dayByNumber(s.dayNumber)
      setStatus('saving')
      const sets: SetLog[] = []
      for (const e of d.exercises) {
        for (let n = 1; n <= e.sets; n++) {
          const c = s.cells[cellKey(e.key, n)]
          if (!c || (!c.weight && !c.reps && !c.done)) continue
          sets.push({
            exercise_key: e.key,
            exercise_name: e.name,
            set_number: n,
            weight_kg: c.weight ? Number(c.weight) : null,
            reps: c.reps ? Number(c.reps) : null,
            done: c.done,
          })
        }
      }
      try {
        const saved = await api.saveLog(dateStr, {
          day_number: s.dayNumber,
          completed: finish ?? s.log?.completed ?? false,
          notes: s.notes || null,
          cardio_min: s.cardio ? Number(s.cardio) : null,
          duration_min: s.duration ? Number(s.duration) : null,
          sets,
        })
        setLog(saved)
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    },
    [dateStr],
  )

  // Autosave shortly after any change.
  const first = useRef(true)
  useEffect(() => {
    if (!loaded) return
    if (first.current) {
      first.current = false
      return
    }
    if (day.type === 'rest' && !cardio && !notes) return
    const t = setTimeout(() => persist(), 700)
    return () => clearTimeout(t)
  }, [cells, notes, cardio, duration, dayNumber, loaded, persist, day.type])

  const update = (exKey: string, n: number, patch: Partial<Cell>) =>
    setCells((prev) => {
      const k = cellKey(exKey, n)
      const base: Cell = prev[k] ?? { weight: '', reps: '', done: false }
      return { ...prev, [k]: { ...base, ...patch } }
    })

  const totalSets = day.exercises.reduce((n, e) => n + e.sets, 0)
  const doneSets = day.exercises.reduce(
    (n, e) => n + Array.from({ length: e.sets }, (_, i) => cells[cellKey(e.key, i + 1)]?.done ?? false).filter(Boolean).length,
    0,
  )
  const pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0
  const hasData = Object.values(cells).some((c) => c.weight || c.reps || c.done)

  async function finish() {
    await persist(true)
  }
  async function reopen() {
    await persist(false)
  }

  if (!loaded) return <div style={{ color: '#888899' }}>Loading…</div>

  return (
    <div>
      <div className="text-xs uppercase tracking-[0.25em]" style={{ color: '#888899', fontFamily: font.display }}>
        {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <div className="flex items-end justify-between gap-3 flex-wrap mt-1 mb-4">
        <Heading sub={`${day.muscles} · ${day.focus}`}>
          <span style={{ color: colors.fg }}>Day {day.day}</span> {day.title}
        </Heading>
        <div className="flex gap-1 mb-4">
          {days.map((p) => (
            <button
              key={p.day}
              onClick={() => setDayNumber(p.day)}
              disabled={hasData && p.day !== dayNumber}
              title={hasData ? 'Day is locked once you log a set' : `Day ${p.day} ${p.title}`}
              className="w-9 h-9 rounded-lg text-sm font-bold disabled:opacity-30"
              style={{
                fontFamily: font.display,
                background: p.day === dayNumber ? TYPE_COLOR[p.type].fg : '#111116',
                color: p.day === dayNumber ? '#fff' : '#c0c0cc',
                border: `1px solid ${p.day === dayNumber ? TYPE_COLOR[p.type].fg : '#2a2a35'}`,
              }}
            >
              {p.day}
            </button>
          ))}
        </div>
      </div>

      {day.type === 'rest' ? (
        <Card>
          <div className="text-xl font-bold uppercase" style={{ fontFamily: font.display, color: colors.fg }}>
            Recover · Recharge · Come back stronger
          </div>
          <ul className="mt-3 space-y-1 text-sm" style={{ color: '#c0c0cc' }}>
            <li>✓ Light walking / mobility (optional)</li>
            <li>✓ Good sleep (7–9 hours)</li>
            <li>✓ Prepare for next week</li>
          </ul>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <input type="number" inputMode="numeric" placeholder="Walk / mobility (min)" value={cardio} onChange={(e) => setCardio(e.target.value)} style={inputStyle} />
            <input placeholder="Notes (sleep, soreness…)" value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: '#888899' }}>
              <span>
                {doneSets} / {totalSets} sets done
              </span>
              <span>
                {status === 'saving' && 'Saving…'}
                {status === 'saved' && '✓ Saved'}
                {status === 'error' && <span style={{ color: '#e63946' }}>Couldn't save — check connection</span>}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a1a22' }}>
              <div className="h-full transition-all" style={{ width: `${pct}%`, background: colors.fg }} />
            </div>
          </div>

          <div className="space-y-3">
            {day.exercises.map((e, i) => (
              <ExerciseCard key={e.key} index={i + 1} exercise={e} color={colors.fg} cells={cells} last={last[e.key]} onChange={update} locked={completed} />
            ))}
          </div>

          <Card className="mt-5">
            <div className="grid sm:grid-cols-3 gap-3">
              <input type="number" inputMode="numeric" placeholder="Workout length (min)" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} />
              <input type="number" inputMode="numeric" placeholder="Cardio (min)" value={cardio} onChange={(e) => setCardio(e.target.value)} style={inputStyle} />
              <input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
            </div>
            <div className="text-xs mt-2" style={{ color: '#888899' }}>
              Cardio tip: {TIPS.cardio}
            </div>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {completed ? (
                <>
                  <span className="font-bold uppercase" style={{ color: '#10b981', fontFamily: font.display, fontSize: 18 }}>
                    ✓ Workout complete
                  </span>
                  <Button variant="ghost" onClick={reopen}>
                    Edit again
                  </Button>
                </>
              ) : (
                <Button onClick={finish} disabled={doneSets === 0}>
                  Finish workout
                </Button>
              )}
              {!completed && doneSets === 0 && (
                <span className="text-xs" style={{ color: '#888899' }}>
                  Tick at least one set to finish.
                </span>
              )}
            </div>
          </Card>
        </>
      )}

      <div className="mt-5 text-xs" style={{ color: '#888899' }}>
        Progressive overload: {TIPS.overload}
      </div>
    </div>
  )
}

function ExerciseCard({
  index,
  exercise: e,
  color,
  cells,
  last,
  onChange,
  locked,
}: {
  index: number
  exercise: Exercise
  color: string
  cells: Cells
  last?: Last
  onChange: (exKey: string, n: number, patch: Partial<Cell>) => void
  locked: boolean
}) {
  const target = e.timed ? `${e.sets} × ${e.repsMin}–${e.repsMax} sec` : `${e.sets} × ${e.repsMin}–${e.repsMax}`
  const allDone = Array.from({ length: e.sets }, (_, i) => cells[cellKey(e.key, i + 1)]?.done).every(Boolean)
  return (
    <Card style={{ borderColor: allDone ? '#10b98155' : '#2a2a35' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold uppercase" style={{ fontFamily: font.display, fontSize: 20 }}>
            <span style={{ color }}>{index}.</span> {e.name}
          </div>
          <div className="text-xs" style={{ color: '#888899' }}>
            Target {target}
            {last && (
              <>
                {' · '}last ({fmtDate(last.date)}): {last.weight != null ? `${fmtKg(last.weight)} kg` : '–'} × {last.reps ?? '–'}
              </>
            )}
          </div>
        </div>
        {allDone && <span style={{ color: '#10b981' }}>✓</span>}
      </div>

      <div className="mt-3 space-y-2">
        {Array.from({ length: e.sets }, (_, i) => i + 1).map((n) => {
          const c = cells[cellKey(e.key, n)] ?? { weight: '', reps: '', done: false }
          return (
            <div key={n} className="flex items-center gap-2">
              <span className="w-6 text-sm" style={{ color: '#888899', fontFamily: font.mono }}>
                {n}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder={last?.weight != null ? fmtKg(last.weight) : 'kg'}
                value={c.weight}
                disabled={locked}
                onChange={(ev) => onChange(e.key, n, { weight: ev.target.value })}
                style={{ ...inputStyle, fontFamily: font.mono }}
                aria-label={`Set ${n} weight in kg`}
              />
              <span className="text-xs whitespace-nowrap" style={{ color: '#888899' }}>
                kg ×
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder={e.timed ? 'sec' : `${e.repsMin}–${e.repsMax}`}
                value={c.reps}
                disabled={locked}
                onChange={(ev) => onChange(e.key, n, { reps: ev.target.value })}
                style={{ ...inputStyle, fontFamily: font.mono }}
                aria-label={`Set ${n} ${e.timed ? 'seconds' : 'reps'}`}
              />
              <input
                type="checkbox"
                className="hz-checkbox"
                checked={c.done}
                disabled={locked}
                onChange={(ev) => onChange(e.key, n, { done: ev.target.checked })}
                aria-label={`Set ${n} done`}
              />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
