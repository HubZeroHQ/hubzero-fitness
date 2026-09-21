export type DayType = 'push' | 'pull' | 'legs' | 'rest'

export interface Exercise {
  id: number
  key: string
  name: string
  sets: number
  repsMin: number
  repsMax: number
  timed: boolean
}

export interface ProgramDay {
  day: number
  type: DayType
  title: string
  muscles: string
  focus: string
  note: string
  exercises: Exercise[]
}

export const DAY_TYPES: { value: DayType; label: string }[] = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'legs', label: 'Legs' },
  { value: 'rest', label: 'Rest' },
]

export const TYPE_COLOR: Record<DayType, { fg: string; bg: string }> = {
  push: { fg: '#e63946', bg: '#3a1216' },
  pull: { fg: '#3b82f6', bg: '#0f2040' },
  legs: { fg: '#10b981', bg: '#0a2e22' },
  rest: { fg: '#f59e0b', bg: '#33260a' },
}

/** Default schedule: Monday = Day 1 … Saturday = Day 6, Sunday = Day 7 (rest). Members can override on the page. */
export function defaultDayFor(date: Date): number {
  const dow = date.getDay() // 0 = Sunday
  return dow === 0 ? 7 : dow
}

export const TIPS = {
  cardio: '15–20 minutes cycling after lifting (3–6 days/week) at moderate intensity.',
  core: '2–4 times per week, no need to train core daily.',
  overload: 'When you can do the top end of the rep range with good form, increase the weight slightly.',
  reps: 'Compounds: 5–10 reps · Hypertrophy: 8–15 reps · Isolation: 10–20 reps · 1–3 reps in reserve (RIR).',
}
