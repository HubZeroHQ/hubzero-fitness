import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, api, isRejected, type SetLog } from '../lib/api'
import { useAuth } from '../lib/auth'
import { TIPS, TYPE_COLOR, defaultDayFor, type Exercise, type ProgramDay } from '../lib/program'
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
const emptyCell: Cell = { weight: '', reps: '', done: false }

/** What someone did for one exercise the last time they trained it. */
interface LastTime {
  date: string
  sets: { n: number; weight: number | null; reps: number | null }[]
}

type SyncStatus = 'idle' | 'saving' | 'saved' | 'retry' | 'rejected'

// ---- unsaved work is kept on the phone until the server has it -------------------------------------------------
interface Draft {
  dayNumber: number
  cells: Cells
  notes: string
  cardio: string
  duration: string
  completed: boolean
}
const draftKey = (userId: number, date: string) => `hz-draft-v1:${userId}:${date}`
function readDraft(userId: number, date: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, date))
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}
function writeDraft(userId: number, date: string, draft: Draft) {
  try {
    localStorage.setItem(draftKey(userId, date), JSON.stringify(draft))
  } catch {
    /* private mode / storage full: the in-memory copy and the server still work */
  }
}
function clearDraft(userId: number, date: string) {
  try {
    localStorage.removeItem(draftKey(userId, date))
  } catch {
    /* ignore */
  }
}

function buildSets(day: ProgramDay, cells: Cells): SetLog[] {
  const sets: SetLog[] = []
  for (const e of day.exercises) {
    for (let n = 1; n <= e.sets; n++) {
      const c = cells[cellKey(e.key, n)]
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
  return sets
}

/** Keep the phone's screen on while a workout is open, so it does not lock between sets. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let stopped = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        /* refused (battery saver, background tab): nothing to do */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !stopped) void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])
}

/** Today's date as YYYY-MM-DD, kept current: a phone left open overnight must start a new day, not keep logging into yesterday. */
function useDateString() {
  const [date, setDate] = useState(() => isoDate(new Date()))
  useEffect(() => {
    const check = () => setDate(isoDate(new Date()))
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    const timer = window.setInterval(check, 30_000)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
      window.clearInterval(timer)
    }
  }, [])
  return date
}

export default function Today() {
  const dateStr = useDateString()
  // A new date remounts the screen, which saves anything unsaved from the old day first (see the unmount effect below).
  return <TodayForDate key={dateStr} dateStr={dateStr} />
}

function TodayForDate({ dateStr }: { dateStr: string }) {
  const { profile } = useAuth()
  const { days, dayByNumber } = useProgram()
  const userId = profile!.id
  const date = useMemo(() => new Date(dateStr + 'T00:00:00'), [dateStr])

  const [dayNumber, setDayNumber] = useState(defaultDayFor(date))
  const [cells, setCells] = useState<Cells>({})
  const [completed, setCompleted] = useState(false)
  const [last, setLast] = useState<Record<string, LastTime>>({})
  const [notes, setNotes] = useState('')
  const [cardio, setCardio] = useState('')
  const [duration, setDuration] = useState('')
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [rejection, setRejection] = useState('')
  const [loaded, setLoaded] = useState(false)

  const day = dayByNumber(dayNumber)
  const colors = TYPE_COLOR[day.type]

  // ---- saving: one request at a time, retried until the server has it --------------------------------------------
  const stateRef = useRef({ cells, dayNumber, notes, cardio, duration })
  stateRef.current = { cells, dayNumber, notes, cardio, duration }
  const completedRef = useRef(false) // the intended "finished" state, updated the instant Finish is tapped
  const version = useRef(0) // bumped on every change, so a save knows whether newer changes arrived while it was in flight
  const dirty = useRef(false) // changes exist that the server has not confirmed
  const inflight = useRef(false)
  const serverHasLog = useRef(false)
  const initialSync = useRef(false)
  const alive = useRef(true)
  const timer = useRef<number | undefined>(undefined)
  const retryTimer = useRef<number | undefined>(undefined)
  const retryDelay = useRef(4000)

  const flush = async () => {
    if (inflight.current) return // the running save re-checks the version and sends the newer state when it finishes
    inflight.current = true
    window.clearTimeout(retryTimer.current)
    if (alive.current) setStatus('saving')
    try {
      let sent: number
      do {
        sent = version.current
        const s = stateRef.current
        await api.saveLog(dateStr, {
          day_number: s.dayNumber,
          completed: completedRef.current,
          notes: s.notes || null,
          cardio_min: s.cardio ? Number(s.cardio) : null,
          duration_min: s.duration ? Number(s.duration) : null,
          sets: buildSets(dayByNumber(s.dayNumber), s.cells),
        })
        serverHasLog.current = true
      } while (sent !== version.current)
      dirty.current = false
      clearDraft(userId, dateStr)
      retryDelay.current = 4000
      if (alive.current) setStatus('saved')
    } catch (err) {
      if (isRejected(err)) {
        // The server refused this data (not a connection problem): say why, keep it on the phone, and do not loop.
        if (alive.current) {
          setRejection(err instanceof ApiError ? err.message : 'The server refused the save.')
          setStatus('rejected')
        }
      } else if (alive.current) {
        // Offline or the server is busy: keep everything, tell the person, and try again soon.
        setStatus('retry')
        retryTimer.current = window.setTimeout(() => void flushRef.current(), retryDelay.current)
        retryDelay.current = Math.min(retryDelay.current * 2, 30_000)
      }
    } finally {
      inflight.current = false
    }
  }
  const flushRef = useRef(flush)
  flushRef.current = flush

  const snapshot = (): Draft => ({ ...stateRef.current, completed: completedRef.current })

  // ---- load today's workout (and any unsaved draft) and the last time each exercise was trained -----------------
  useEffect(() => {
    let active = true
    ;(async () => {
      const all = await api.logs(userId).catch(() => [])
      const existing = all.find((l) => l.log_date === dateStr)

      const restored: Cells = {}
      for (const s of existing?.set_logs ?? []) {
        restored[cellKey(s.exercise_key, s.set_number)] = { weight: s.weight_kg?.toString() ?? '', reps: s.reps?.toString() ?? '', done: s.done }
      }

      // Newest first: the first date seen for an exercise is the last time it was trained.
      const lastMap: Record<string, LastTime> = {}
      for (const wl of [...all].reverse()) {
        if (wl.log_date >= dateStr) continue
        const byKey = new Map<string, LastTime['sets']>()
        for (const s of wl.set_logs) {
          if (!s.done || lastMap[s.exercise_key]) continue
          byKey.set(s.exercise_key, [...(byKey.get(s.exercise_key) ?? []), { n: s.set_number, weight: s.weight_kg, reps: s.reps }])
        }
        for (const [key, sets] of byKey) lastMap[key] = { date: wl.log_date, sets: sets.sort((a, b) => a.n - b.n) }
      }

      if (!active) return
      const draft = readDraft(userId, dateStr)
      if (draft) {
        // Work that was never confirmed by the server (closed the tab, lost signal): put it back and send it now.
        setDayNumber(draft.dayNumber)
        setCells(draft.cells)
        setNotes(draft.notes)
        setCardio(draft.cardio)
        setDuration(draft.duration)
        setCompleted(draft.completed)
        completedRef.current = draft.completed
        dirty.current = true
        initialSync.current = true
      } else if (existing) {
        setDayNumber(existing.day_number)
        setNotes(existing.notes ?? '')
        setCardio(existing.cardio_min?.toString() ?? '')
        setDuration(existing.duration_min?.toString() ?? '')
        setCompleted(existing.completed)
        completedRef.current = existing.completed
        setCells(restored)
      }
      serverHasLog.current = !!existing
      setLast(lastMap)
      setLoaded(true)
    })()
    return () => {
      active = false
    }
  }, [userId, dateStr])

  // Send a restored draft as soon as the screen is ready.
  useEffect(() => {
    if (loaded && initialSync.current) {
      initialSync.current = false
      void flushRef.current()
    }
  }, [loaded])

  const hasContent = Object.values(cells).some((c) => c.weight || c.reps || c.done) || !!notes || !!cardio || !!duration

  // Autosave shortly after any change. Merely browsing the days does not create an empty workout.
  const first = useRef(true)
  useEffect(() => {
    if (!loaded) return
    if (first.current) {
      first.current = false
      return
    }
    if (!serverHasLog.current && !hasContent) return
    version.current += 1
    dirty.current = true
    writeDraft(userId, dateStr, snapshot())
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flushRef.current(), 700)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, notes, cardio, duration, dayNumber, loaded])

  // Leaving the screen (another tab, a new day) must not lose what was typed in the last moment.
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      window.clearTimeout(timer.current)
      window.clearTimeout(retryTimer.current)
      if (dirty.current) void flushRef.current()
    }
  }, [])

  // Back online, or the phone is picked up again: send anything still waiting. Warn before closing with unsent work.
  useEffect(() => {
    const sync = () => {
      if (dirty.current) void flushRef.current()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('online', sync)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('beforeunload', warn)
    }
  }, [])

  useWakeLock(loaded && day.type !== 'rest' && !completed)

  const update = (exKey: string, n: number, patch: Partial<Cell>) =>
    setCells((prev) => {
      const k = cellKey(exKey, n)
      return { ...prev, [k]: { ...(prev[k] ?? emptyCell), ...patch } }
    })

  /** Fill the empty sets of one exercise from the last time (optionally a little heavier). Typed sets are never overwritten. */
  const fillFromLast = (e: Exercise, extraKg: number) => {
    const prev = last[e.key]
    if (!prev || prev.sets.length === 0) return
    setCells((cur) => {
      const next = { ...cur }
      for (let n = 1; n <= e.sets; n++) {
        const k = cellKey(e.key, n)
        const c = cur[k] ?? emptyCell
        if (c.weight || c.reps || c.done) continue
        const src = prev.sets.find((s) => s.n === n) ?? prev.sets[prev.sets.length - 1]
        next[k] = { weight: src.weight != null ? String(Math.round((src.weight + extraKg) * 100) / 100) : '', reps: src.reps != null ? String(src.reps) : '', done: false }
      }
      return next
    })
  }

  const setDone = (value: boolean) => {
    completedRef.current = value
    setCompleted(value)
    version.current += 1
    dirty.current = true
    writeDraft(userId, dateStr, snapshot())
    window.clearTimeout(timer.current)
    void flushRef.current()
  }

  const totalSets = day.exercises.reduce((n, e) => n + e.sets, 0)
  const doneSets = day.exercises.reduce((n, e) => n + Array.from({ length: e.sets }, (_, i) => cells[cellKey(e.key, i + 1)]?.done ?? false).filter(Boolean).length, 0)
  const pct = totalSets ? Math.round((doneSets / totalSets) * 100) : 0
  const hasData = Object.values(cells).some((c) => c.weight || c.reps || c.done)

  if (!loaded) return <div style={{ color: '#888899' }}>Loading…</div>

  const saveText =
    status === 'saving'
      ? 'Saving…'
      : status === 'saved'
        ? '✓ Saved'
        : status === 'retry'
          ? 'Not saved yet · will retry (your sets are kept on this phone)'
          : status === 'rejected'
            ? `Couldn't save: ${rejection}`
            : ''

  return (
    <div>
      {day.type !== 'rest' && (
        // Stays on screen while scrolling through the exercises, so progress and save state are always visible.
        <div
          className="sticky top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 pb-2"
          style={{ paddingTop: 'max(8px, env(safe-area-inset-top))', background: 'rgba(10,10,12,0.94)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1f1f28' }}
        >
          <div className="flex justify-between items-baseline gap-3 text-sm mb-1.5">
            <span className="font-semibold" style={{ color: '#f0f0f5' }}>
              {doneSets} / {totalSets} sets done
            </span>
            <span className="text-right text-xs" style={{ color: status === 'retry' ? '#f59e0b' : status === 'rejected' ? '#ff8a93' : '#888899' }} aria-live="polite">
              {saveText}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a1a22' }}>
            <div className="h-full transition-all" style={{ width: `${pct}%`, background: colors.fg }} />
          </div>
        </div>
      )}

      <div className="text-xs uppercase tracking-[0.25em] mt-4" style={{ color: '#888899', fontFamily: font.display }}>
        {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <div className="mt-1">
        <Heading sub={`${day.muscles} · ${day.focus}`}>
          <span style={{ color: colors.fg }}>Day {day.day}</span> {day.title}
        </Heading>
      </div>

      <div className="grid gap-1.5 mb-5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((p) => (
          <button
            key={p.day}
            onClick={() => setDayNumber(p.day)}
            disabled={hasData && p.day !== dayNumber}
            title={hasData ? 'The day is locked once you log a set' : `Day ${p.day} ${p.title}`}
            className="rounded-lg text-lg font-bold disabled:opacity-30"
            style={{
              minHeight: 48,
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
            <input type="number" inputMode="numeric" min="0" max="1000" placeholder="Walk / mobility (min)" value={cardio} onChange={(e) => setCardio(e.target.value)} style={inputStyle} />
            <input placeholder="Notes (sleep, soreness…)" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
          </div>
          {saveText && (
            <div className="mt-2 text-xs" style={{ color: status === 'retry' ? '#f59e0b' : '#888899' }} aria-live="polite">
              {saveText}
            </div>
          )}
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {day.exercises.map((e, i) => (
              <ExerciseCard key={e.key} index={i + 1} exercise={e} color={colors.fg} cells={cells} last={last[e.key]} onChange={update} onFill={fillFromLast} locked={completed} />
            ))}
          </div>

          <Card className="mt-5">
            <div className="grid sm:grid-cols-3 gap-3">
              <input type="number" inputMode="numeric" min="0" max="1000" placeholder="Workout length (min)" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} />
              <input type="number" inputMode="numeric" min="0" max="1000" placeholder="Cardio (min)" value={cardio} onChange={(e) => setCardio(e.target.value)} style={inputStyle} />
              <input placeholder="Notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
            </div>
            <div className="text-xs mt-2" style={{ color: '#888899' }}>
              Cardio tip: {TIPS.cardio}
            </div>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {completed ? (
                <>
                  <span className="font-bold uppercase" style={{ color: '#10b981', fontFamily: font.display, fontSize: 20 }}>
                    ✓ Workout complete
                  </span>
                  <Button variant="ghost" onClick={() => setDone(false)}>
                    Edit again
                  </Button>
                </>
              ) : (
                <Button wide onClick={() => setDone(true)} disabled={doneSets === 0}>
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

const lastSummary = (last: LastTime) => last.sets.map((s) => `${s.weight != null ? fmtKg(s.weight) : '–'}×${s.reps ?? '–'}`).join(' · ')

function ExerciseCard({
  index,
  exercise: e,
  color,
  cells,
  last,
  onChange,
  onFill,
  locked,
}: {
  index: number
  exercise: Exercise
  color: string
  cells: Cells
  last?: LastTime
  onChange: (exKey: string, n: number, patch: Partial<Cell>) => void
  onFill: (e: Exercise, extraKg: number) => void
  locked: boolean
}) {
  const target = e.timed ? `${e.sets} × ${e.repsMin}–${e.repsMax} sec` : `${e.sets} × ${e.repsMin}–${e.repsMax}`
  const allDone = Array.from({ length: e.sets }, (_, i) => cells[cellKey(e.key, i + 1)]?.done).every(Boolean)
  const lastWeight = last?.sets.find((s) => s.weight != null)?.weight ?? null
  const rowGrid = { display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) minmax(0,1fr) 48px', columnGap: 8, alignItems: 'center' } as const
  const numberInput = { ...inputStyle, minHeight: 52, fontSize: 18, textAlign: 'center', fontFamily: font.mono, padding: '0 8px' } as const

  return (
    <Card style={{ borderColor: allDone ? '#10b98155' : '#2a2a35' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold uppercase leading-tight" style={{ fontFamily: font.display, fontSize: 22 }}>
            <span style={{ color }}>{index}.</span> {e.name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#888899' }}>
            Target {target}
          </div>
          {last && (
            <div className="text-xs mt-0.5" style={{ color: '#888899' }}>
              Last time ({fmtDate(last.date)}): <span style={{ fontFamily: font.mono, color: '#c0c0cc' }}>{lastSummary(last)}</span>
            </div>
          )}
        </div>
        {allDone && (
          <span className="text-xl" style={{ color: '#10b981' }} aria-label="all sets done">
            ✓
          </span>
        )}
      </div>

      {last && !locked && (
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => onFill(e, 0)}
            className="rounded-lg text-sm font-semibold"
            style={{ minHeight: 44, padding: '0 14px', border: '1px solid #2a2a35', background: '#0a0a0c', color: '#c0c0cc' }}
          >
            Same as last time
          </button>
          {lastWeight != null && !e.timed && (
            <button
              onClick={() => onFill(e, 2.5)}
              className="rounded-lg text-sm font-semibold"
              style={{ minHeight: 44, padding: '0 14px', border: '1px solid #2a2a35', background: '#0a0a0c', color: '#c0c0cc' }}
            >
              +2.5 kg
            </button>
          )}
        </div>
      )}

      <div className="mt-3">
        <div className="text-[11px] uppercase tracking-widest mb-1" style={{ ...rowGrid, color: '#888899', fontFamily: font.display }}>
          <span>Set</span>
          <span className="text-center">kg</span>
          <span className="text-center">{e.timed ? 'seconds' : 'reps'}</span>
          <span className="text-center">Done</span>
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: e.sets }, (_, i) => i + 1).map((n) => {
            const c = cells[cellKey(e.key, n)] ?? emptyCell
            const prevSet = last?.sets.find((s) => s.n === n)
            return (
              <div key={n} style={rowGrid}>
                <span className="text-sm" style={{ color: '#888899', fontFamily: font.mono }}>
                  {n}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  max="1000"
                  enterKeyHint="next"
                  placeholder={prevSet?.weight != null ? fmtKg(prevSet.weight) : 'kg'}
                  value={c.weight}
                  disabled={locked}
                  onFocus={(ev) => ev.currentTarget.select()}
                  onChange={(ev) => onChange(e.key, n, { weight: ev.target.value })}
                  style={numberInput}
                  aria-label={`Set ${n} weight in kg`}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="10000"
                  enterKeyHint="done"
                  placeholder={e.timed ? 'sec' : `${e.repsMin}–${e.repsMax}`}
                  value={c.reps}
                  disabled={locked}
                  onFocus={(ev) => ev.currentTarget.select()}
                  onChange={(ev) => onChange(e.key, n, { reps: ev.target.value })}
                  style={numberInput}
                  aria-label={`Set ${n} ${e.timed ? 'seconds' : 'reps'}`}
                />
                <label className="hz-tick-area">
                  <input
                    type="checkbox"
                    className="hz-checkbox"
                    checked={c.done}
                    disabled={locked}
                    onChange={(ev) => onChange(e.key, n, { done: ev.target.checked })}
                    aria-label={`Set ${n} done`}
                  />
                </label>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
