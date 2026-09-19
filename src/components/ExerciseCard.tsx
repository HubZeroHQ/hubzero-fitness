import { useState } from 'react'
import type { Exercise } from '../data/workoutProgram'

interface SetRow {
  weight: string
  reps: string
}

interface ExerciseCardProps {
  exercise: Exercise
  accentColor: string
  onOpenTutorial: (exercise: Exercise) => void
}

function initSets(exercise: Exercise): SetRow[] {
  return Array.from({ length: exercise.sets }, () => ({ weight: '', reps: '' }))
}

export default function ExerciseCard({ exercise, accentColor, onOpenTutorial }: ExerciseCardProps) {
  const [completed, setCompleted] = useState(false)
  const [sets, setSets] = useState<SetRow[]>(() => initSets(exercise))
  const [expanded, setExpanded] = useState(false)

  const loggedSets = sets.filter((s) => s.weight !== '' || s.reps !== '').length
  const hasAnyInput = loggedSets > 0

  const status: 'not-started' | 'in-progress' | 'completed' = completed
    ? 'completed'
    : hasAnyInput
    ? 'in-progress'
    : 'not-started'

  function updateSet(i: number, field: 'weight' | 'reps', val: string) {
    setSets((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: val }
      return next
    })
  }

  function addSet() {
    setSets((prev) => [...prev, { weight: '', reps: '' }])
  }

  const targetLabel = exercise.isTime
    ? `${exercise.sets} × ${exercise.repsMin}–${exercise.repsMax} ${exercise.unit ?? 'sec'}`
    : `${exercise.sets} × ${exercise.repsMin}–${exercise.repsMax}${exercise.unit ? ' ' + exercise.unit : ''}`

  const statusIndicator = {
    'not-started': { color: '#2a2a35', label: '' },
    'in-progress': { color: '#f59e0b', label: 'IN PROGRESS' },
    completed: { color: accentColor, label: 'DONE' },
  }[status]

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: '#111116',
        border: `1px solid ${completed ? accentColor + '40' : '#2a2a35'}`,
        opacity: completed ? 0.85 : 1,
      }}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 px-4 py-4">
        {/* Checkbox — ONLY this toggles completion */}
        <input
          type="checkbox"
          className="hz-checkbox mt-0.5"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          aria-label={`Mark ${exercise.name} as completed`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {/* Exercise name — clicking opens tutorial, NOT checkbox */}
            <button
              onClick={() => onOpenTutorial(exercise)}
              className="text-left group"
            >
              <span
                className="font-semibold text-sm leading-snug transition-colors group-hover:opacity-80"
                style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  letterSpacing: '0.05em',
                  fontSize: '1rem',
                  color: completed ? '#888899' : '#f0f0f5',
                  textDecoration: completed ? 'line-through' : 'none',
                }}
              >
                {exercise.name}
              </span>
              <span
                className="ml-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: accentColor }}
              >
                ▶ Tutorial
              </span>
            </button>

            {/* Status badge */}
            {status !== 'not-started' && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                style={{
                  background: statusIndicator.color + '22',
                  color: statusIndicator.color,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  letterSpacing: '0.08em',
                }}
              >
                {statusIndicator.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: '#888899', fontFamily: 'JetBrains Mono, monospace' }}>
              {targetLabel}
            </span>
            {completed && (
              <span className="text-xs" style={{ color: '#888899' }}>
                {sets.length}/{exercise.sets} sets logged
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded transition-colors"
          style={{ color: '#888899', background: expanded ? '#1a1a22' : 'transparent' }}
        >
          <span className="text-xs">{expanded ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Expanded set tracking */}
      {expanded && (
        <div style={{ borderTop: '1px solid #2a2a35' }}>
          {/* Table header */}
          <div
            className="grid px-4 py-2 text-xs font-semibold"
            style={{ gridTemplateColumns: '32px 1fr 1fr', color: '#888899', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', background: '#0d0d12' }}
          >
            <span>SET</span>
            <span>{exercise.isTime ? 'DURATION' : 'WEIGHT (kg)'}</span>
            <span>{exercise.isTime ? 'STATUS' : 'REPS'}</span>
          </div>

          {/* Set rows */}
          <div className="divide-y" style={{ borderColor: '#1a1a22' }}>
            {sets.map((set, i) => (
              <div
                key={i}
                className="grid items-center px-4 py-2.5 gap-2"
                style={{ gridTemplateColumns: '32px 1fr 1fr' }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: set.weight || set.reps ? accentColor : '#444455' }}
                >
                  {i + 1}
                </span>
                <input
                  type="number"
                  value={set.weight}
                  onChange={(e) => updateSet(i, 'weight', e.target.value)}
                  placeholder={exercise.isTime ? '30' : '—'}
                  className="w-full px-3 py-1.5 rounded text-sm text-center"
                  style={{
                    background: '#1a1a22',
                    border: '1px solid #2a2a35',
                    color: '#f0f0f5',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = accentColor)}
                  onBlur={(e) => (e.target.style.borderColor = '#2a2a35')}
                />
                <input
                  type="number"
                  value={set.reps}
                  onChange={(e) => updateSet(i, 'reps', e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-1.5 rounded text-sm text-center"
                  style={{
                    background: '#1a1a22',
                    border: '1px solid #2a2a35',
                    color: '#f0f0f5',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = accentColor)}
                  onBlur={(e) => (e.target.style.borderColor = '#2a2a35')}
                />
              </div>
            ))}
          </div>

          {/* Add set */}
          <div className="px-4 py-3" style={{ background: '#0d0d12' }}>
            <button
              onClick={addSet}
              className="text-xs font-semibold px-4 py-1.5 rounded transition-colors"
              style={{ background: '#1a1a22', color: accentColor, border: `1px solid ${accentColor}30` }}
            >
              + Add Set
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
