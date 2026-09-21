import { e1rm } from './health'
import { addDays, isoDate, weekStart } from './stats'
import type { FullLog } from './api'

/**
 * "Who improved the most" is measured against each person's OWN previous week, never against each other's
 * absolute numbers. For every exercise someone trained in two consecutive weeks we compare the best estimated
 * one-rep max (Epley) of the week with the week before, as a percentage; the score is the average of those
 * percentages. A beginner adding 2 kg and an advanced lifter adding 10 kg can therefore score the same, and how
 * heavy anyone lifts or how often they train does not matter.
 */

/** A single exercise's week-on-week change is capped so one typo (e.g. 500 kg instead of 50 kg) cannot dominate. */
export const CLAMP_PERCENT = 50

export interface ExerciseChange {
  key: string
  name: string
  /** Best estimated 1RM of the previous week, kg. */
  before: number
  /** Best estimated 1RM of this week, kg. */
  after: number
  /** Change in percent, clamped to ±CLAMP_PERCENT. */
  percent: number
}

export interface WeekImprovement {
  /** Monday of the week, YYYY-MM-DD. */
  week: string
  /** Average change across the compared exercises in percent, or null when there is nothing to compare. */
  score: number | null
  compared: ExerciseChange[]
}

/** Monday (YYYY-MM-DD) of the week a date falls in. Weeks run Monday to Sunday. */
export const weekKey = (iso: string): string => isoDate(weekStart(new Date(iso + 'T00:00:00')))

/** The last n weeks (Monday dates) ending with the week that contains `now`, oldest first. */
export function lastWeeks(now: Date, n: number): string[] {
  const current = weekStart(now)
  return Array.from({ length: n }, (_, i) => isoDate(addDays(current, -7 * (n - 1 - i))))
}

const previousWeek = (week: string): string => isoDate(addDays(new Date(week + 'T00:00:00'), -7))

type Best = Map<string, { name: string; e1rm: number }>

/** Best estimated 1RM per exercise for each week, from one person's logs (ticked sets with a weight and reps only). */
export function bestByWeek(logs: FullLog[]): Map<string, Best> {
  const weeks = new Map<string, Best>()
  for (const log of logs) {
    const week = weekKey(log.log_date)
    for (const s of log.set_logs) {
      if (!s.done || !s.weight_kg || s.weight_kg <= 0 || !s.reps || s.reps <= 0) continue
      const est = e1rm(s.weight_kg, s.reps)
      const best = weeks.get(week) ?? new Map()
      const cur = best.get(s.exercise_key)
      if (!cur || est > cur.e1rm) best.set(s.exercise_key, { name: s.exercise_name, e1rm: est })
      weeks.set(week, best)
    }
  }
  return weeks
}

/** How much one person improved in `week` compared with the week before. Pass only that person's logs. */
export function improvement(logs: FullLog[], week: string, precomputed?: Map<string, Best>): WeekImprovement {
  const byWeek = precomputed ?? bestByWeek(logs)
  const now = byWeek.get(week)
  const before = byWeek.get(previousWeek(week))
  const compared: ExerciseChange[] = []
  if (now && before) {
    for (const [key, cur] of now) {
      const prev = before.get(key)
      if (!prev) continue
      const raw = ((cur.e1rm - prev.e1rm) / prev.e1rm) * 100
      compared.push({ key, name: cur.name, before: prev.e1rm, after: cur.e1rm, percent: Math.max(-CLAMP_PERCENT, Math.min(CLAMP_PERCENT, raw)) })
    }
  }
  compared.sort((a, b) => b.percent - a.percent)
  const score = compared.length ? compared.reduce((sum, c) => sum + c.percent, 0) / compared.length : null
  return { week, score, compared }
}

/** The improvement for each of the given weeks (oldest first). */
export function improvementSeries(logs: FullLog[], weeks: string[]): WeekImprovement[] {
  const byWeek = bestByWeek(logs)
  return weeks.map((w) => improvement(logs, w, byWeek))
}
