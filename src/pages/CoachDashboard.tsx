import { useState } from 'react'
import { WORKOUT_PROGRAM, typeColors } from '../data/workoutProgram'
import type { WorkoutDay, Exercise } from '../data/workoutProgram'

export default function CoachDashboard() {
  const [days, setDays] = useState<WorkoutDay[]>(WORKOUT_PROGRAM.map((d) => ({ ...d, exercises: [...d.exercises] })))
  const [selectedDay, setSelectedDay] = useState(0)
  const [saved, setSaved] = useState(false)

  const day = days[selectedDay]
  const colors = typeColors[day.type]

  function updateExercise(ei: number, field: keyof Exercise, value: string | number) {
    setDays((prev) => {
      const next = [...prev]
      const dayClone = { ...next[selectedDay], exercises: [...next[selectedDay].exercises] }
      dayClone.exercises[ei] = { ...dayClone.exercises[ei], [field]: value }
      next[selectedDay] = dayClone
      return next
    })
    setSaved(false)
  }

  function removeExercise(ei: number) {
    setDays((prev) => {
      const next = [...prev]
      const dayClone = { ...next[selectedDay], exercises: [...next[selectedDay].exercises] }
      dayClone.exercises.splice(ei, 1)
      next[selectedDay] = dayClone
      return next
    })
    setSaved(false)
  }

  function addExercise() {
    const newEx: Exercise = {
      id: `new_${Date.now()}`,
      name: 'New Exercise',
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      instructions: '',
    }
    setDays((prev) => {
      const next = [...prev]
      const dayClone = { ...next[selectedDay], exercises: [...next[selectedDay].exercises, newEx] }
      next[selectedDay] = dayClone
      return next
    })
    setSaved(false)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: '#0a0a0c' }}>
      <div className="px-4 pt-6 pb-4 md:px-8">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1
            className="text-3xl font-black"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.04em' }}
          >
            COACH DASHBOARD
          </h1>
          <span
            className="text-xs px-2 py-1 rounded font-bold"
            style={{ background: '#0f204040', color: '#3b82f6', border: '1px solid #3b82f630', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}
          >
            🎯 COACH
          </span>
        </div>
        <p className="text-sm" style={{ color: '#888899' }}>Edit workout routines, tutorials, and exercise instructions</p>
      </div>

      <div className="px-4 md:px-8 max-w-4xl">
        {/* Day selector */}
        <div className="flex gap-2 flex-wrap mb-5">
          {days.map((d, i) => {
            const c = typeColors[d.type]
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: selectedDay === i ? c.dim : '#111116',
                  color: selectedDay === i ? c.accent : '#888899',
                  border: `1px solid ${selectedDay === i ? c.accent : '#2a2a35'}`,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  letterSpacing: '0.06em',
                }}
              >
                DAY {i + 1}
              </button>
            )
          })}
        </div>

        {/* Day editor */}
        <div className="rounded-2xl overflow-hidden mb-5" style={{ background: '#111116', border: '1px solid #2a2a35' }}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: colors.dim, borderBottom: `1px solid ${colors.accent}30` }}>
            <div>
              <div
                className="text-xl font-black"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', color: colors.accent, letterSpacing: '0.06em' }}
              >
                {day.label.toUpperCase()}
              </div>
              <div className="text-sm" style={{ color: '#888899' }}>{day.focus}</div>
            </div>
            <span
              className="text-xs px-2 py-1 rounded font-bold"
              style={{ background: colors.accent + '20', color: colors.accent, fontFamily: 'Barlow Condensed, sans-serif', border: `1px solid ${colors.accent}40` }}
            >
              {day.exercises.length} EXERCISES
            </span>
          </div>

          {/* Exercises */}
          <div className="divide-y" style={{ borderColor: '#1a1a22' }}>
            {day.exercises.map((ex, ei) => (
              <div key={ex.id} className="px-5 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className="text-sm font-bold w-6 flex-shrink-0 mt-1"
                    style={{ color: '#444455', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {ei + 1}
                  </span>
                  <div className="flex-1 grid gap-3">
                    {/* Exercise name */}
                    <input
                      type="text"
                      value={ex.name}
                      onChange={(e) => updateExercise(ei, 'name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm font-semibold"
                      style={{
                        background: '#1a1a22',
                        border: '1px solid #2a2a35',
                        color: '#f0f0f5',
                        fontFamily: 'Barlow Condensed, sans-serif',
                        letterSpacing: '0.04em',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = colors.accent)}
                      onBlur={(e) => (e.target.style.borderColor = '#2a2a35')}
                    />

                    {/* Sets + Reps */}
                    <div className="flex gap-3 items-center flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#888899', fontFamily: 'Barlow Condensed, sans-serif' }}>SETS</span>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => updateExercise(ei, 'sets', Number(e.target.value))}
                          className="w-14 px-2 py-1.5 rounded text-sm text-center"
                          style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#f0f0f5', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#888899', fontFamily: 'Barlow Condensed, sans-serif' }}>REPS</span>
                        <input
                          type="number"
                          value={ex.repsMin}
                          onChange={(e) => updateExercise(ei, 'repsMin', Number(e.target.value))}
                          className="w-14 px-2 py-1.5 rounded text-sm text-center"
                          style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#f0f0f5', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }}
                        />
                        <span className="text-xs" style={{ color: '#888899' }}>–</span>
                        <input
                          type="number"
                          value={ex.repsMax}
                          onChange={(e) => updateExercise(ei, 'repsMax', Number(e.target.value))}
                          className="w-14 px-2 py-1.5 rounded text-sm text-center"
                          style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#f0f0f5', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }}
                        />
                      </div>
                    </div>

                    {/* Tutorial URL */}
                    <div>
                      <span className="text-xs mb-1 block" style={{ color: '#888899', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}>
                        TUTORIAL VIDEO URL
                      </span>
                      <input
                        type="text"
                        placeholder="https://youtube.com/..."
                        className="w-full px-3 py-2 rounded text-xs"
                        style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#888899', fontFamily: 'JetBrains Mono, monospace', outline: 'none' }}
                        onFocus={(e) => (e.target.style.borderColor = colors.accent)}
                        onBlur={(e) => (e.target.style.borderColor = '#2a2a35')}
                      />
                    </div>

                    {/* Instructions */}
                    <div>
                      <span className="text-xs mb-1 block" style={{ color: '#888899', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}>
                        COACHING NOTES
                      </span>
                      <textarea
                        value={ex.instructions ?? ''}
                        onChange={(e) => updateExercise(ei, 'instructions', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded text-xs resize-none"
                        style={{ background: '#1a1a22', border: '1px solid #2a2a35', color: '#c0c0cc', fontFamily: 'Inter, sans-serif', outline: 'none' }}
                        onFocus={(e) => (e.target.style.borderColor = colors.accent)}
                        onBlur={(e) => (e.target.style.borderColor = '#2a2a35')}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => removeExercise(ei)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-red-900/20"
                    style={{ color: '#444455' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add exercise */}
          <div className="px-5 py-4" style={{ borderTop: '1px solid #2a2a35' }}>
            <button
              onClick={addExercise}
              className="flex items-center gap-2 text-sm font-bold transition-colors"
              style={{ color: colors.accent, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}
            >
              <span className="w-7 h-7 rounded-full border flex items-center justify-center text-base" style={{ borderColor: colors.accent + '60' }}>+</span>
              ADD EXERCISE
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90"
          style={{
            background: saved ? '#10b981' : `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}cc 100%)`,
            color: saved ? '#0a0a0c' : '#fff',
            fontFamily: 'Barlow Condensed, sans-serif',
            letterSpacing: '0.1em',
          }}
        >
          {saved ? '✓ WORKOUT SAVED' : 'SAVE WORKOUT'}
        </button>

        {/* Team adherence */}
        <div className="mt-6 rounded-2xl p-5" style={{ background: '#111116', border: '1px solid #2a2a35' }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.08em' }}>
            TEAM WORKOUT ADHERENCE — TODAY
          </div>
          <div className="flex flex-col gap-3">
            {[
              { name: 'Aryan S.', pct: 71, color: '#10b981' },
              { name: 'Priya M.', pct: 57, color: '#3b82f6' },
              { name: 'Rahul K.', pct: 43, color: '#f59e0b' },
              { name: 'Sneha T.', pct: 100, color: '#a855f7' },
              { name: 'Dev P.', pct: 14, color: '#ec4899' },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <div className="w-20 text-xs" style={{ color: '#c0c0cc' }}>{m.name}</div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#2a2a35' }}>
                  <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                </div>
                <div className="w-10 text-right text-xs font-bold" style={{ color: m.color, fontFamily: 'JetBrains Mono, monospace' }}>
                  {m.pct}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
