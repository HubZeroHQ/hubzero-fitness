import { useState } from 'react'
import { WORKOUT_PROGRAM, typeColors } from '../data/workoutProgram'
import type { Exercise } from '../data/workoutProgram'
import ExerciseCard from '../components/ExerciseCard'
import PiPVideoModal from '../components/PiPVideoModal'

const TODAY_DAY_INDEX = 5 // 0-indexed = Day 6 (Legs + Core)
const TODAY_DATE = 'Saturday, 19 September 2026'

export default function WorkoutPage() {
  const [selectedDay, setSelectedDay] = useState(TODAY_DAY_INDEX)
  const [pip, setPip] = useState<Exercise | null>(null)
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({})

  const workout = WORKOUT_PROGRAM[selectedDay]
  const colors = typeColors[workout.type]

  const totalExercises = workout.exercises.length
  const completedCount = Object.values(completedMap).filter(Boolean).length

  const progressPct = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0
  const allDone = totalExercises > 0 && completedCount === totalExercises

  const dayLabels = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']
  const dayTypes = WORKOUT_PROGRAM.map((d) => d.type)

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: '#0a0a0c' }}>
      {/* Day selector strip */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex gap-2 overflow-x-auto"
        style={{ background: '#0d0d12', borderBottom: '1px solid #2a2a35' }}
      >
        {dayLabels.map((label, i) => {
          const t = dayTypes[i]
          const c = typeColors[t]
          const isActive = selectedDay === i
          const isToday = i === TODAY_DAY_INDEX
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all"
              style={{
                background: isActive ? c.dim : '#111116',
                border: `1px solid ${isActive ? c.accent : '#2a2a35'}`,
                minWidth: 52,
              }}
            >
              <span
                className="text-xs font-bold"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', color: isActive ? c.accent : '#888899', letterSpacing: '0.08em' }}
              >
                {label}
              </span>
              {isToday && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#e63946' }} />
              )}
            </button>
          )
        })}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Date + day header */}
        <div className="mb-6">
          <div className="text-xs mb-1 font-medium" style={{ color: '#888899', fontFamily: 'JetBrains Mono, monospace' }}>
            {selectedDay === TODAY_DAY_INDEX ? TODAY_DATE : `Day ${selectedDay + 1}`}
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1
              className="text-4xl font-black leading-none"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5' }}
            >
              {workout.type === 'rest' ? 'REST DAY' : workout.focus.toUpperCase()}
            </h1>
            <span
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{ background: colors.dim, color: colors.accent, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}
            >
              {colors.label}
            </span>
          </div>
          <p className="text-sm mt-2" style={{ color: '#888899' }}>{workout.tagline}</p>
        </div>

        {/* Rest day */}
        {workout.type === 'rest' && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: '#111116', border: '1px solid #2a2a35' }}
          >
            <div className="text-6xl mb-4">💤</div>
            <h2
              className="text-3xl font-black mb-3"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5' }}
            >
              RECOVER • RECHARGE
            </h2>
            <p className="text-sm mb-6" style={{ color: '#888899' }}>
              Your body grows stronger during rest. Don't skip recovery.
            </p>
            <div className="flex flex-col gap-3 text-sm text-left max-w-xs mx-auto">
              {['Light walking / mobility (optional)', 'Good sleep (7–9 hours)', 'Prepare for next week'].map((tip) => (
                <div key={tip} className="flex items-center gap-3">
                  <span style={{ color: '#10b981' }}>✓</span>
                  <span style={{ color: '#c0c0cc' }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {workout.exercises.length > 0 && (
          <div
            className="rounded-xl px-5 py-4 mb-5"
            style={{ background: '#111116', border: '1px solid #2a2a35' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div
                  className="text-xs font-bold tracking-widest mb-0.5"
                  style={{ color: '#888899', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
                >
                  TODAY'S PROGRESS
                </div>
                <div className="text-sm" style={{ color: '#c0c0cc' }}>
                  <span style={{ color: '#f0f0f5', fontWeight: 600 }}>{completedCount}</span> / {totalExercises} exercises completed
                </div>
              </div>
              <div
                className="text-3xl font-black"
                style={{ fontFamily: 'Barlow Condensed, sans-serif', color: allDone ? colors.accent : '#f0f0f5' }}
              >
                {progressPct}%
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#2a2a35' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: allDone ? colors.accent : `linear-gradient(90deg, ${colors.accent}aa, ${colors.accent})` }}
              />
            </div>
            {allDone && (
              <div
                className="mt-3 text-center text-sm font-bold tracking-widest"
                style={{ color: colors.accent, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}
              >
                🎉 WORKOUT COMPLETE — GREAT WORK!
              </div>
            )}
          </div>
        )}

        {/* Exercise list */}
        {workout.exercises.length > 0 && (
          <div className="flex flex-col gap-3">
            {workout.exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                accentColor={colors.accent}
                onOpenTutorial={(e) => setPip(e)}
              />
            ))}
          </div>
        )}

        {/* Finish workout button */}
        {workout.exercises.length > 0 && (
          <div className="mt-6 mb-4">
            <button
              className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90"
              style={{
                background: allDone ? colors.accent : '#1a1a22',
                color: allDone ? '#0a0a0c' : '#888899',
                fontFamily: 'Barlow Condensed, sans-serif',
                letterSpacing: '0.1em',
                border: allDone ? 'none' : `1px solid #2a2a35`,
              }}
            >
              {allDone ? '✓ WORKOUT LOGGED' : 'FINISH WORKOUT'}
            </button>
            {!allDone && (
              <p className="text-center text-xs mt-2" style={{ color: '#444455' }}>
                You can finish even with incomplete exercises
              </p>
            )}
          </div>
        )}
      </div>

      {/* PiP Video */}
      {pip && (
        <PiPVideoModal
          exerciseName={pip.name}
          instructions={pip.instructions ?? 'Focus on form. Control the movement.'}
          onClose={() => setPip(null)}
        />
      )}
    </div>
  )
}
