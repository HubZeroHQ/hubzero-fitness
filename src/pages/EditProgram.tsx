import { useCallback, useEffect, useState } from 'react'
import { programApi, type ApplyRequest, type ExerciseInput, type Profile, type ProgramScope } from '../lib/api'
import { useProfiles } from '../lib/data'
import { DAY_TYPES, TYPE_COLOR, type DayType, type Exercise, type ProgramDay } from '../lib/program'
import { useProgram } from '../lib/programContext'
import { Button, Card, Field, Heading, font, inputStyle } from '../components/ui'

const small = { ...inputStyle, padding: '8px 10px', fontSize: 14 }
const firstName = (p: Pick<Profile, 'full_name'>) => p.full_name.split(' ')[0]

/**
 * The coach's program editor. "Scope" says whose program is being edited:
 * 0 = the team default (everyone who has no personal version of a day), or one person's own program.
 */
export default function EditProgram({ initialScope = 0 }: { initialScope?: number }) {
  const { reload: reloadMine } = useProgram()
  const profiles = useProfiles()
  const [scope, setScope] = useState(initialScope)
  const [data, setData] = useState<ProgramScope | null>(null)
  const [dayNo, setDayNo] = useState(1)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async (owner: number) => setData(await programApi.scope(owner)), [])
  useEffect(() => {
    setData(null)
    refresh(scope).catch((err) => setError(err instanceof Error ? err.message : 'Could not load the program'))
  }, [scope, refresh])

  /** Run a change, then reload this screen and the coach's own copy of the program. */
  async function run(fn: () => Promise<unknown>, okMessage = ''): Promise<boolean> {
    setError('')
    setNotice('')
    try {
      await fn()
      await refresh(scope)
      await reloadMine()
      if (okMessage) setNotice(okMessage)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      return false
    }
  }

  if (!data || !profiles) return <div style={{ color: '#888899' }}>{error || 'Loading…'}</div>

  const person = profiles.find((p) => p.id === scope)
  const scopeName = scope === 0 ? 'Everyone' : firstName(person ?? { full_name: 'this person' })
  const day = data.days.find((d) => d.day === dayNo)!
  const colors = TYPE_COLOR[day.type]
  const inherited = scope !== 0 && !day.custom
  const customCount = (id: number) => Object.values(data.overrides).filter((ids) => ids.includes(id)).length
  const whoHasOwn = (data.overrides[String(dayNo)] ?? []).map((id) => profiles.find((p) => p.id === id)).filter((p): p is Profile => !!p)

  return (
    <div>
      <Heading sub="Change the team's program, or give any one person their own version. Past workouts and records are never touched.">Edit Program</Heading>

      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#888899', fontFamily: font.display }}>
        Whose program?
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        <ScopeChip active={scope === 0} onClick={() => setScope(0)}>
          Everyone (team default)
        </ScopeChip>
        {profiles.map((p) => (
          <ScopeChip key={p.id} active={scope === p.id} onClick={() => setScope(p.id)}>
            {firstName(p)}
            {customCount(p.id) > 0 && <span style={{ color: '#f59e0b' }}> · {customCount(p.id)} custom</span>}
          </ScopeChip>
        ))}
      </div>

      <div className="mb-4 text-sm rounded-lg px-3 py-2" style={{ background: '#15151b', border: '1px solid #2a2a35', color: '#c0c0cc' }}>
        {scope === 0
          ? "You're editing the team default. It applies to everyone who has no personal version of that day."
          : `You're editing ${scopeName}'s program. Days they follow from the team are read-only until you customise them, so nothing you do here changes anyone else.`}
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {data.days.map((d) => {
          const marked = scope === 0 ? (data.overrides[String(d.day)] ?? []).length > 0 : d.custom
          return (
            <button
              key={d.day}
              onClick={() => {
                setDayNo(d.day)
                setError('')
                setNotice('')
              }}
              className="px-3 h-10 rounded-lg text-sm font-bold"
              style={{
                fontFamily: font.display,
                fontSize: 16,
                background: d.day === dayNo ? TYPE_COLOR[d.type].fg : '#111116',
                color: d.day === dayNo ? '#fff' : '#c0c0cc',
                border: `1px solid ${d.day === dayNo ? TYPE_COLOR[d.type].fg : '#2a2a35'}`,
              }}
              title={marked ? (scope === 0 ? 'Some people have their own version of this day' : 'Customised for this person') : undefined}
            >
              Day {d.day}
              {marked && <span style={{ color: d.day === dayNo ? '#fff' : '#f59e0b' }}> ●</span>}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-3 text-sm rounded-lg px-3 py-2" role="alert" style={{ background: '#3a1216', color: '#ff8a93' }}>
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-3 text-sm rounded-lg px-3 py-2" role="status" style={{ background: '#0a2e22', color: '#6ee7b7' }}>
          {notice}
        </div>
      )}

      {scope === 0 && whoHasOwn.length > 0 && (
        <div className="mb-3 text-sm" style={{ color: '#f59e0b' }}>
          Day {dayNo} has its own version for: {whoHasOwn.map(firstName).join(', ')}. They will not see changes made to the team default.
        </div>
      )}

      {inherited ? (
        <Card>
          <div className="font-bold uppercase" style={{ fontFamily: font.display, fontSize: 20, color: colors.fg }}>
            Day {day.day} {day.title}
          </div>
          <div className="text-sm mt-1" style={{ color: '#c0c0cc' }}>
            {scopeName} follows the team program for this day.
          </div>
          <ol className="mt-3 space-y-1 text-sm list-decimal pl-5" style={{ color: '#888899' }}>
            {day.exercises.map((e) => (
              <li key={e.id}>
                {e.name} <span style={{ fontFamily: font.mono }}>{e.sets} × {e.repsMin}–{e.repsMax}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <Button onClick={() => run(() => programApi.customize(day.day, scope), `${scopeName} now has their own Day ${day.day}. Edit it below.`)}>
              Customise Day {day.day} for {scopeName}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <DayHeader
            key={`h${scope}-${day.id}-${day.type}-${day.title}-${day.muscles}-${day.focus}-${day.note}`}
            day={day}
            onSave={(d) => run(() => programApi.saveDay(day.day, scope, d))}
          />

          <div className="mt-4 space-y-3">
            {day.exercises.length === 0 && (
              <Card>
                <div className="text-sm" style={{ color: '#888899' }}>
                  {day.type === 'rest' ? 'This is a rest day. Add exercises only if you change the day type.' : 'No exercises yet. Add the first one below.'}
                </div>
              </Card>
            )}
            {day.exercises.map((e, i) => (
              <ExerciseRow
                key={`${scope}-${e.id}-${e.name}-${e.sets}-${e.repsMin}-${e.repsMax}-${e.timed}`}
                index={i + 1}
                exercise={e}
                color={colors.fg}
                first={i === 0}
                last={i === day.exercises.length - 1}
                onSave={(patch) => run(() => programApi.updateExercise(e.id, patch))}
                onMove={(dir) => run(() => programApi.moveExercise(e.id, dir))}
                onDelete={() => {
                  if (window.confirm(`Remove "${e.name}" from Day ${day.day} (${scopeName})? Past logs of it are kept.`)) run(() => programApi.deleteExercise(e.id))
                }}
              />
            ))}
          </div>

          <AddExercise key={`a${scope}-${day.day}`} onAdd={(e) => run(() => programApi.addExercise(day.day, scope, e))} />

          {scope !== 0 && (
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Take ${scopeName} back to the team's Day ${day.day}? Their personal version of this day will be deleted.`)) {
                    run(() => programApi.resetDay(day.day, scope), `${scopeName} follows the team's Day ${day.day} again.`)
                  }
                }}
              >
                Reset {scopeName} to the team version of Day {day.day}
              </Button>
            </div>
          )}
        </>
      )}

      <ApplyPanel
        key={`p${scope}-${dayNo}`}
        scope={scope}
        scopeName={scopeName}
        dayNo={dayNo}
        people={profiles}
        onApply={(req, message) => run(() => programApi.apply(req), message)}
      />
    </div>
  )
}

function ScopeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="px-3 h-10 rounded-full text-sm font-semibold"
      style={{
        fontFamily: font.display,
        fontSize: 16,
        letterSpacing: '0.03em',
        background: active ? '#e63946' : '#111116',
        color: active ? '#fff' : '#c0c0cc',
        border: `1px solid ${active ? '#e63946' : '#2a2a35'}`,
      }}
    >
      {children}
    </button>
  )
}

/** Copy what you are looking at to other people (or everyone) in one go. */
function ApplyPanel({
  scope,
  scopeName,
  dayNo,
  people,
  onApply,
}: {
  scope: number
  scopeName: string
  dayNo: number
  people: Profile[]
  onApply: (req: ApplyRequest, message: string) => Promise<boolean>
}) {
  const [range, setRange] = useState<'day' | 'all'>('day')
  const [everyone, setEveryone] = useState(false)
  const [picked, setPicked] = useState<number[]>([])
  const others = people.filter((p) => p.id !== scope)
  const chosen = everyone ? [] : picked.filter((id) => others.some((p) => p.id === id))
  const what = range === 'day' ? `Day ${dayNo}` : 'the whole program (all 7 days)'
  const sourceLabel = scope === 0 ? "the team's version" : `${scopeName}'s version`
  const who = everyone ? 'everyone at once' : others.filter((p) => chosen.includes(p.id)).map(firstName).join(', ')

  const toggle = (id: number) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  async function apply() {
    const sentence = everyone
      ? `Apply ${what} (${sourceLabel}) to everyone at once?\n\nIt becomes the team default and anyone's personal version of ${range === 'day' ? 'that day' : 'those days'} is deleted.`
      : `Apply ${what} (${sourceLabel}) to ${who}?\n\nThis replaces their current version of ${range === 'day' ? 'that day' : 'those days'}.`
    if (!window.confirm(sentence)) return
    const ok = await onApply({ from: scope, days: range === 'day' ? [dayNo] : 'all', targets: chosen, everyone }, `Applied ${what} to ${who}.`)
    if (ok) {
      setPicked([])
      setEveryone(false)
    }
  }

  return (
    <Card className="mt-6" style={{ borderColor: '#3a3a48' }}>
      <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888899', fontFamily: font.display }}>
        Apply this to other people
      </div>
      <div className="text-sm mb-3" style={{ color: '#c0c0cc' }}>
        Copy {sourceLabel} to one or more people, or to everyone at once.
      </div>

      <div className="flex gap-4 flex-wrap mb-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="range" checked={range === 'day'} onChange={() => setRange('day')} /> Day {dayNo} only
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="range" checked={range === 'all'} onChange={() => setRange('all')} /> Whole program (all 7 days)
        </label>
      </div>

      <div className="flex gap-2 flex-wrap mb-2">
        {others.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2 px-3 h-10 rounded-lg text-sm"
            style={{ background: '#0a0a0c', border: '1px solid #2a2a35', opacity: everyone ? 0.5 : 1 }}
          >
            <input type="checkbox" checked={everyone || picked.includes(p.id)} disabled={everyone} onChange={() => toggle(p.id)} aria-label={firstName(p)} />
            {firstName(p)}
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} />
        <b>Everyone at once</b>
        <span style={{ color: '#888899' }}>
          {scope === 0
            ? '(everyone follows the team version; personal versions of these days are removed)'
            : '(becomes the team default for all members; personal versions of these days are removed)'}
        </span>
      </label>

      <Button disabled={!everyone && chosen.length === 0} onClick={apply}>
        Apply
      </Button>
    </Card>
  )
}

function DayHeader({ day, onSave }: { day: ProgramDay; onSave: (d: Pick<ProgramDay, 'type' | 'title' | 'muscles' | 'focus' | 'note'>) => Promise<boolean> }) {
  const [type, setType] = useState<DayType>(day.type)
  const [title, setTitle] = useState(day.title)
  const [muscles, setMuscles] = useState(day.muscles)
  const [focus, setFocus] = useState(day.focus)
  const [note, setNote] = useState(day.note)
  const dirty = type !== day.type || title !== day.title || muscles !== day.muscles || focus !== day.focus || note !== day.note

  return (
    <Card>
      <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
        Day {day.day} details
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Type (sets the colour)">
          <select value={type} onChange={(e) => setType(e.target.value as DayType)} style={inputStyle}>
            {DAY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Muscles">
          <input value={muscles} maxLength={80} onChange={(e) => setMuscles(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Focus">
          <input value={focus} maxLength={80} onChange={(e) => setFocus(e.target.value)} style={inputStyle} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Note shown to members">
            <input value={note} maxLength={160} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>
      <div className="mt-3">
        <Button disabled={!dirty || !title.trim()} onClick={() => onSave({ type, title, muscles, focus, note })}>
          Save day
        </Button>
      </div>
    </Card>
  )
}

function ExerciseRow({
  index,
  exercise: e,
  color,
  first,
  last,
  onSave,
  onMove,
  onDelete,
}: {
  index: number
  exercise: Exercise
  color: string
  first: boolean
  last: boolean
  onSave: (patch: Partial<ExerciseInput>) => Promise<boolean>
  onMove: (dir: 'up' | 'down') => void
  onDelete: () => void
}) {
  const [name, setName] = useState(e.name)
  const [sets, setSets] = useState(String(e.sets))
  const [min, setMin] = useState(String(e.repsMin))
  const [max, setMax] = useState(String(e.repsMax))
  const [timed, setTimed] = useState(e.timed)
  const dirty = name !== e.name || sets !== String(e.sets) || min !== String(e.repsMin) || max !== String(e.repsMax) || timed !== e.timed

  return (
    <Card>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-6 font-bold" style={{ color, fontFamily: font.display, fontSize: 20 }}>
          {index}.
        </span>
        <input value={name} maxLength={80} onChange={(ev) => setName(ev.target.value)} style={{ ...small, flex: '1 1 200px', minWidth: 0 }} aria-label="Exercise name" />
        <input type="number" min={1} max={10} value={sets} onChange={(ev) => setSets(ev.target.value)} style={{ ...small, width: 64 }} aria-label="Sets" title="Sets" />
        <span style={{ color: '#888899' }}>×</span>
        <input type="number" min={1} value={min} onChange={(ev) => setMin(ev.target.value)} style={{ ...small, width: 72 }} aria-label="Min reps" title={timed ? 'Min seconds' : 'Min reps'} />
        <span style={{ color: '#888899' }}>–</span>
        <input type="number" min={1} value={max} onChange={(ev) => setMax(ev.target.value)} style={{ ...small, width: 72 }} aria-label="Max reps" title={timed ? 'Max seconds' : 'Max reps'} />
        <label className="flex items-center gap-1.5 text-xs" style={{ color: '#888899' }}>
          <input type="checkbox" checked={timed} onChange={(ev) => setTimed(ev.target.checked)} />
          seconds
        </label>
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Button disabled={!dirty || !name.trim()} onClick={() => onSave({ name, sets: Number(sets), repsMin: Number(min), repsMax: Number(max), timed })}>
          Save
        </Button>
        <Button variant="ghost" disabled={first} onClick={() => onMove('up')}>
          ↑
        </Button>
        <Button variant="ghost" disabled={last} onClick={() => onMove('down')}>
          ↓
        </Button>
        <span className="flex-1" />
        <Button variant="ghost" onClick={onDelete}>
          Remove
        </Button>
      </div>
    </Card>
  )
}

function AddExercise({ onAdd }: { onAdd: (e: ExerciseInput) => Promise<boolean> }) {
  const [name, setName] = useState('')
  const [sets, setSets] = useState('3')
  const [min, setMin] = useState('8')
  const [max, setMax] = useState('12')
  const [timed, setTimed] = useState(false)

  async function add() {
    const ok = await onAdd({ name, sets: Number(sets), repsMin: Number(min), repsMax: Number(max), timed })
    if (ok) setName('')
  }

  return (
    <Card className="mt-4" style={{ borderStyle: 'dashed' }}>
      <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888899', fontFamily: font.display }}>
        Add an exercise to the end of this day
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input placeholder="Exercise name" value={name} maxLength={80} onChange={(ev) => setName(ev.target.value)} style={{ ...small, flex: '1 1 200px', minWidth: 0 }} />
        <input type="number" min={1} max={10} value={sets} onChange={(ev) => setSets(ev.target.value)} style={{ ...small, width: 64 }} aria-label="Sets" />
        <span style={{ color: '#888899' }}>×</span>
        <input type="number" min={1} value={min} onChange={(ev) => setMin(ev.target.value)} style={{ ...small, width: 72 }} aria-label="Min reps" />
        <span style={{ color: '#888899' }}>–</span>
        <input type="number" min={1} value={max} onChange={(ev) => setMax(ev.target.value)} style={{ ...small, width: 72 }} aria-label="Max reps" />
        <label className="flex items-center gap-1.5 text-xs" style={{ color: '#888899' }}>
          <input type="checkbox" checked={timed} onChange={(ev) => setTimed(ev.target.checked)} />
          seconds
        </label>
        <Button disabled={!name.trim()} onClick={add}>
          Add
        </Button>
      </div>
    </Card>
  )
}
