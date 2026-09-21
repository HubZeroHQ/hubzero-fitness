import { e1rm } from './health'
import type { SetLog, WorkoutLog } from './api'

export const isoDate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const addDays = (d: Date, n: number): Date => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

/** Monday of the week containing d. */
export const weekStart = (d: Date): Date => {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  const dow = c.getDay()
  c.setDate(c.getDate() - (dow === 0 ? 6 : dow - 1))
  return c
}

export const volumeOf = (sets: SetLog[]): number =>
  sets.reduce((sum, s) => (s.done && s.weight_kg && s.reps ? sum + s.weight_kg * s.reps : sum), 0)

/** Consecutive days with a completed workout, counting back from today (today may still be pending). Rest days are not penalised: gaps of up to 1 day keep the streak. */
export function currentStreak(logs: WorkoutLog[], today = new Date()): number {
  const done = new Set(logs.filter((l) => l.completed).map((l) => l.log_date))
  let streak = 0
  let cursor = new Date(today)
  cursor.setHours(0, 0, 0, 0)
  if (!done.has(isoDate(cursor))) cursor = addDays(cursor, -1)
  let misses = 0
  for (let i = 0; i < 400; i++) {
    if (done.has(isoDate(cursor))) {
      streak++
      misses = 0
    } else {
      misses++
      if (misses > 1) break
    }
    cursor = addDays(cursor, -1)
  }
  return streak
}

export interface Pr {
  exercise_key: string
  exercise_name: string
  weight_kg: number
  reps: number
  est1rm: number
  date: string
}

/** Best set per exercise, ranked by estimated 1RM. */
export function personalRecords(sets: (SetLog & { log_date: string })[]): Pr[] {
  const best = new Map<string, Pr>()
  for (const s of sets) {
    if (!s.done || !s.weight_kg || !s.reps) continue
    const est = e1rm(s.weight_kg, s.reps)
    const cur = best.get(s.exercise_key)
    if (!cur || est > cur.est1rm) {
      best.set(s.exercise_key, {
        exercise_key: s.exercise_key,
        exercise_name: s.exercise_name,
        weight_kg: s.weight_kg,
        reps: s.reps,
        est1rm: est,
        date: s.log_date,
      })
    }
  }
  return [...best.values()].sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))
}

export const fmtKg = (n: number): string => (Math.round(n * 10) / 10).toString()
export const fmtDate = (iso: string): string =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
