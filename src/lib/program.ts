export type DayType = 'push' | 'pull' | 'legs' | 'rest'

export interface Exercise {
  key: string
  name: string
  sets: number
  repsMin: number
  repsMax: number
  timed?: boolean
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

const ex = (
  key: string,
  name: string,
  sets: number,
  repsMin: number,
  repsMax: number,
  timed = false,
): Exercise => ({ key, name, sets, repsMin, repsMax, timed })

// Source: the Hub Zero Fitness timetable image.
export const PROGRAM: ProgramDay[] = [
  {
    day: 1, type: 'push', title: 'PUSH', muscles: 'Chest + Shoulders + Triceps',
    focus: 'Strength + Control', note: 'Push hard, maintain good form.',
    exercises: [
      ex('bench-press', 'Bench Press', 3, 6, 10),
      ex('incline-db-press', 'Incline Dumbbell Press', 3, 8, 12),
      ex('cable-machine-fly', 'Cable / Machine Fly', 2, 10, 15),
      ex('shoulder-press', 'Shoulder Press', 3, 6, 10),
      ex('lateral-raises', 'Lateral Raises', 3, 12, 20),
      ex('triceps-pushdown', 'Triceps Pushdown', 3, 10, 15),
      ex('overhead-triceps-ext', 'Overhead Triceps Extension', 2, 10, 15),
    ],
  },
  {
    day: 2, type: 'pull', title: 'PULL', muscles: 'Back + Rear Delts + Biceps',
    focus: 'Pull & Squeeze', note: 'Control the movement, feel the muscle.',
    exercises: [
      ex('lat-pulldown-pullups', 'Lat Pulldown / Pull-ups', 3, 6, 10),
      ex('barbell-cable-row', 'Barbell / Cable Row', 3, 6, 10),
      ex('seated-cable-row', 'Seated Cable Row', 2, 8, 12),
      ex('face-pulls-rear-delt-fly', 'Face Pulls / Rear Delt Fly', 3, 12, 20),
      ex('db-barbell-curl', 'Dumbbell / Barbell Curl', 3, 8, 12),
      ex('hammer-curl', 'Hammer Curl', 2, 10, 15),
    ],
  },
  {
    day: 3, type: 'legs', title: 'LEGS + CORE', muscles: 'Legs + Core',
    focus: 'Stronger legs, stronger you', note: 'Build a solid foundation.',
    exercises: [
      ex('squat-leg-press', 'Squat / Leg Press', 3, 6, 10),
      ex('romanian-deadlift', 'Romanian Deadlift', 3, 8, 12),
      ex('leg-extension', 'Leg Extension', 2, 10, 15),
      ex('leg-curl', 'Leg Curl', 3, 10, 15),
      ex('calf-raises', 'Calf Raises', 3, 10, 15),
      ex('cable-crunch', 'Cable Crunch', 3, 10, 15),
      ex('hanging-knee-raise', 'Hanging Knee Raise', 2, 8, 15),
    ],
  },
  {
    day: 4, type: 'push', title: 'PUSH', muscles: 'Chest + Shoulders + Triceps',
    focus: 'Progress & Form', note: 'Slight variations, same intensity.',
    exercises: [
      ex('db-bench-press', 'Dumbbell Bench Press', 3, 6, 10),
      ex('incline-machine-press', 'Incline Machine Press', 3, 8, 12),
      ex('cable-fly-pec-deck', 'Cable Fly / Pec Deck', 2, 10, 15),
      ex('arnold-shoulder-press', 'Arnold Press / Shoulder Press', 3, 6, 10),
      ex('lateral-raises', 'Lateral Raises', 3, 12, 20),
      ex('triceps-pushdown', 'Triceps Pushdown', 3, 10, 15),
      ex('overhead-triceps-ext', 'Overhead Triceps Extension', 2, 10, 15),
    ],
  },
  {
    day: 5, type: 'pull', title: 'PULL', muscles: 'Back + Rear Delts + Biceps',
    focus: 'Control & Strength', note: 'Pull with purpose.',
    exercises: [
      ex('pullups-lat-pulldown', 'Pull-ups / Lat Pulldown', 3, 6, 10),
      ex('tbar-cable-row', 'T-Bar Row / Cable Row', 3, 8, 10),
      ex('seated-cable-row', 'Seated Cable Row', 2, 8, 12),
      ex('face-pulls', 'Face Pulls', 3, 12, 20),
      ex('incline-db-curl', 'Incline Dumbbell Curl', 3, 8, 12),
      ex('hammer-curl', 'Hammer Curl', 2, 10, 15),
    ],
  },
  {
    day: 6, type: 'legs', title: 'LEGS + CORE', muscles: 'Legs + Core',
    focus: 'Stability & Endurance', note: 'Finish the week strong.',
    exercises: [
      ex('leg-press-hack-squat', 'Leg Press / Hack Squat', 3, 6, 10),
      ex('romanian-deadlift', 'Romanian Deadlift', 3, 8, 12),
      ex('walking-lunges', 'Walking Lunges', 2, 10, 15),
      ex('leg-curl', 'Leg Curl', 3, 10, 15),
      ex('calf-raises', 'Calf Raises', 3, 10, 15),
      ex('cable-crunch', 'Cable Crunch', 3, 10, 15),
      ex('plank-ab-wheel', 'Plank / Ab Wheel', 3, 30, 60, true),
    ],
  },
  {
    day: 7, type: 'rest', title: 'REST', muscles: 'Recover',
    focus: 'Recharge • Come back stronger', note: "Rest is not a step back, it's a step forward.",
    exercises: [],
  },
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

export const dayByNumber = (n: number) => PROGRAM.find((d) => d.day === n) ?? PROGRAM[0]

export const TIPS = {
  cardio: '15–20 minutes cycling after lifting (3–6 days/week) at moderate intensity.',
  core: '2–4 times per week, no need to train core daily.',
  overload: 'When you can do the top end of the rep range with good form, increase the weight slightly.',
  reps: 'Compounds: 5–10 reps · Hypertrophy: 8–15 reps · Isolation: 10–20 reps · 1–3 reps in reserve (RIR).',
}
