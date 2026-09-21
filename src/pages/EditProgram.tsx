import { useState } from 'react'
import { programApi, type ExerciseInput } from '../lib/api'
import { DAY_TYPES, TYPE_COLOR, type DayType, type Exercise, type ProgramDay } from '../lib/program'
import { useProgram } from '../lib/programContext'
import { Button, Card, Field, Heading, font, inputStyle } from '../components/ui'

const small = { ...inputStyle, padding: '8px 10px', fontSize: 14 }

export default function EditProgram() {
  const { days, dayByNumber, replaceDay } = useProgram()
  const [dayNo, setDayNo] = useState(1)
  const [error, setError] = useState('')
  const day = dayByNumber(dayNo)
  const colors = TYPE_COLOR[day.type]

  // Run an API call that returns the updated day; show any error.
  async function run(fn: () => Promise<ProgramDay>): Promise<boolean> {
    setError('')
    try {
      replaceDay(await fn())
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      return false
    }
  }

  return (
    <div>
      <Heading sub="Changes apply to everyone straight away. Past workouts and records are never touched.">Edit Program</Heading>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {days.map((d) => (
          <button
            key={d.day}
            onClick={() => {
              setDayNo(d.day)
              setError('')
            }}
            className="px-3 h-10 rounded-lg text-sm font-bold"
            style={{
              fontFamily: font.display,
              fontSize: 16,
              background: d.day === dayNo ? TYPE_COLOR[d.type].fg : '#111116',
              color: d.day === dayNo ? '#fff' : '#c0c0cc',
              border: `1px solid ${d.day === dayNo ? TYPE_COLOR[d.type].fg : '#2a2a35'}`,
            }}
          >
            Day {d.day}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 text-sm rounded-lg px-3 py-2" style={{ background: '#3a1216', color: '#ff8a93' }}>
          {error}
        </div>
      )}

      <DayHeader key={`h${day.day}-${day.type}-${day.title}-${day.muscles}-${day.focus}-${day.note}`} day={day} onSave={(d) => run(() => programApi.saveDay(day.day, d))} />

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
            key={`${e.id}-${e.name}-${e.sets}-${e.repsMin}-${e.repsMax}-${e.timed}`}
            index={i + 1}
            exercise={e}
            color={colors.fg}
            first={i === 0}
            last={i === day.exercises.length - 1}
            onSave={(patch) => run(() => programApi.updateExercise(e.id, patch))}
            onMove={(dir) => run(() => programApi.moveExercise(e.id, dir))}
            onDelete={() => {
              if (window.confirm(`Remove "${e.name}" from Day ${day.day}? Past logs of it are kept.`)) run(() => programApi.deleteExercise(e.id))
            }}
          />
        ))}
      </div>

      <AddExercise key={`a${day.day}`} onAdd={(e) => run(() => programApi.addExercise(day.day, e))} />
    </div>
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
