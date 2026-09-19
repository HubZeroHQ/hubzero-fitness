export type WorkoutType = 'push' | 'pull' | 'legs' | 'rest'

export interface Exercise {
  id: string
  name: string
  sets: number
  repsMin: number
  repsMax: number
  isTime?: boolean
  unit?: string
  tutorialThumb?: string
  instructions?: string
}

export interface WorkoutDay {
  day: number
  label: string
  type: WorkoutType
  focus: string
  tagline: string
  exercises: Exercise[]
}

export const WORKOUT_PROGRAM: WorkoutDay[] = [
  {
    day: 1,
    label: 'DAY 1 — PUSH',
    type: 'push',
    focus: 'Chest + Shoulders + Triceps',
    tagline: 'Focus: Strength + Control — Push hard, maintain good form.',
    exercises: [
      { id: 'd1e1', name: 'Bench Press', sets: 3, repsMin: 6, repsMax: 10, instructions: 'Retract scapula, arch back slightly, drive through heels. Control the descent.' },
      { id: 'd1e2', name: 'Incline Dumbbell Press', sets: 3, repsMin: 8, repsMax: 12, instructions: 'Set bench at 30-45°. Press at a slight angle toward your chin.' },
      { id: 'd1e3', name: 'Cable / Machine Fly', sets: 2, repsMin: 10, repsMax: 15, instructions: 'Squeeze pecs at the peak. Keep a slight bend in elbows throughout.' },
      { id: 'd1e4', name: 'Shoulder Press', sets: 3, repsMin: 6, repsMax: 10, instructions: 'Brace core. Press vertically. Do not flare elbows excessively.' },
      { id: 'd1e5', name: 'Lateral Raises', sets: 3, repsMin: 12, repsMax: 20, instructions: 'Lead with elbows. Slight lean forward. Go up to shoulder height only.' },
      { id: 'd1e6', name: 'Triceps Pushdown', sets: 3, repsMin: 10, repsMax: 15, instructions: 'Keep elbows pinned to sides. Full extension at the bottom.' },
      { id: 'd1e7', name: 'Overhead Triceps Extension', sets: 2, repsMin: 10, repsMax: 15, instructions: 'Keep upper arms still. Full stretch at the top of the movement.' },
    ],
  },
  {
    day: 2,
    label: 'DAY 2 — PULL',
    type: 'pull',
    focus: 'Back + Rear Delts + Biceps',
    tagline: 'Focus: Pull & Squeeze — Control the movement, feel the muscle.',
    exercises: [
      { id: 'd2e1', name: 'Lat Pulldown / Pull-ups', sets: 3, repsMin: 6, repsMax: 10, instructions: 'Pull through elbows. Arch the upper back slightly at the bottom.' },
      { id: 'd2e2', name: 'Barbell / Cable Row', sets: 3, repsMin: 6, repsMax: 10, instructions: 'Hinge at hips. Pull to lower chest. Squeeze for 1 second.' },
      { id: 'd2e3', name: 'Seated Cable Row', sets: 2, repsMin: 8, repsMax: 12, instructions: 'Sit tall. Pull handles to your navel. Retract and depress scapula.' },
      { id: 'd2e4', name: 'Face Pulls / Rear Delt Fly', sets: 3, repsMin: 12, repsMax: 20, instructions: 'Aim for face-level. External rotate at end position.' },
      { id: 'd2e5', name: 'Dumbbell / Barbell Curl', sets: 3, repsMin: 8, repsMax: 12, instructions: 'Supinate at the top. Control the eccentric down.' },
      { id: 'd2e6', name: 'Hammer Curl', sets: 2, repsMin: 10, repsMax: 15, instructions: 'Neutral grip. Targets brachialis. Slow and controlled.' },
    ],
  },
  {
    day: 3,
    label: 'DAY 3 — LEGS + CORE',
    type: 'legs',
    focus: 'Legs + Core',
    tagline: 'Focus: Stronger Legs, Stronger You — Build a solid foundation.',
    exercises: [
      { id: 'd3e1', name: 'Squat / Leg Press', sets: 3, repsMin: 6, repsMax: 10, instructions: 'Full depth if mobility allows. Drive through heels. Stay braced.' },
      { id: 'd3e2', name: 'Romanian Deadlift', sets: 3, repsMin: 8, repsMax: 12, instructions: 'Push hips back. Feel hamstring stretch. Neutral spine always.' },
      { id: 'd3e3', name: 'Leg Extension', sets: 2, repsMin: 10, repsMax: 15, instructions: 'Full extension. Hold 1 second. Slow eccentric.' },
      { id: 'd3e4', name: 'Leg Curl', sets: 3, repsMin: 10, repsMax: 15, instructions: 'Curl through full range. Pause at peak contraction.' },
      { id: 'd3e5', name: 'Calf Raises', sets: 3, repsMin: 10, repsMax: 15, instructions: 'Full stretch at bottom. Pause 1 second at peak.' },
      { id: 'd3e6', name: 'Cable Crunch', sets: 3, repsMin: 10, repsMax: 15, instructions: 'Round the spine. Don\'t use hip flexors to pull down.' },
      { id: 'd3e7', name: 'Hanging Knee Raise', sets: 2, repsMin: 8, repsMax: 15, instructions: 'Control the swing. Tuck knees to chest. Slow descent.' },
    ],
  },
  {
    day: 4,
    label: 'DAY 4 — PUSH',
    type: 'push',
    focus: 'Chest + Shoulders + Triceps',
    tagline: 'Focus: Progress & Form — Slight variations, same intensity.',
    exercises: [
      { id: 'd4e1', name: 'Dumbbell Bench Press', sets: 3, repsMin: 6, repsMax: 10, instructions: 'Greater range of motion than barbell. Control at the bottom.' },
      { id: 'd4e2', name: 'Incline Machine Press', sets: 3, repsMin: 8, repsMax: 12, instructions: 'Use full range. Don\'t bounce off the chest pad.' },
      { id: 'd4e3', name: 'Cable Fly / Pec Deck', sets: 2, repsMin: 10, repsMax: 15, instructions: 'Squeeze pecs. Do not lock out elbows.' },
      { id: 'd4e4', name: 'Arnold Press / Shoulder Press', sets: 3, repsMin: 6, repsMax: 10, instructions: 'Rotate palms outward as you press up. Targets all three delt heads.' },
      { id: 'd4e5', name: 'Lateral Raises', sets: 3, repsMin: 12, repsMax: 20, instructions: 'Use cables or dumbbells. Controlled tempo. No swinging.' },
      { id: 'd4e6', name: 'Triceps Pushdown', sets: 3, repsMin: 10, repsMax: 15, instructions: 'Rope or bar. Keep elbows fixed. Full lock-out.' },
      { id: 'd4e7', name: 'Overhead Triceps Extension', sets: 2, repsMin: 10, repsMax: 15, instructions: 'Use cable or dumbbell. Full stretch in the long head.' },
    ],
  },
  {
    day: 5,
    label: 'DAY 5 — PULL',
    type: 'pull',
    focus: 'Back + Rear Delts + Biceps',
    tagline: 'Focus: Control & Strength — Pull with purpose.',
    exercises: [
      { id: 'd5e1', name: 'Pull-ups / Lat Pulldown', sets: 3, repsMin: 6, repsMax: 10, instructions: 'Full hang to chin above bar. Slow descent.' },
      { id: 'd5e2', name: 'T-Bar Row / Cable Row', sets: 3, repsMin: 8, repsMax: 10, instructions: 'Chest supported if available. Elbows close to body.' },
      { id: 'd5e3', name: 'Seated Cable Row', sets: 2, repsMin: 8, repsMax: 12, instructions: 'Wide or narrow grip. Full stretch at the front.' },
      { id: 'd5e4', name: 'Face Pulls', sets: 3, repsMin: 12, repsMax: 20, instructions: 'High cable attachment. Pull rope to face. External rotate.' },
      { id: 'd5e5', name: 'Incline Dumbbell Curl', sets: 3, repsMin: 8, repsMax: 12, instructions: 'Incline bench stretches bicep. Long head focus.' },
      { id: 'd5e6', name: 'Hammer Curl', sets: 2, repsMin: 10, repsMax: 15, instructions: 'Neutral grip. Controlled tempo.' },
    ],
  },
  {
    day: 6,
    label: 'DAY 6 — LEGS + CORE',
    type: 'legs',
    focus: 'Legs + Core',
    tagline: 'Focus: Stability & Endurance — Finish the week strong.',
    exercises: [
      { id: 'd6e1', name: 'Leg Press / Hack Squat', sets: 3, repsMin: 6, repsMax: 10, instructions: 'High foot position for more glutes. Full range. Don\'t lock knees.' },
      { id: 'd6e2', name: 'Romanian Deadlift', sets: 3, repsMin: 8, repsMax: 12, instructions: 'Drive hips back. Bar close to legs. Feel the stretch.' },
      { id: 'd6e3', name: 'Walking Lunges', sets: 2, repsMin: 10, repsMax: 15, unit: 'each leg', instructions: 'Long stride. Front knee tracks toes. Torso upright.' },
      { id: 'd6e4', name: 'Leg Curl', sets: 3, repsMin: 10, repsMax: 15, instructions: 'Prone or seated. Full curl. Slow return.' },
      { id: 'd6e5', name: 'Calf Raises', sets: 3, repsMin: 10, repsMax: 15, instructions: 'Full range. Pause at top and bottom.' },
      { id: 'd6e6', name: 'Cable Crunch', sets: 3, repsMin: 10, repsMax: 15, instructions: 'Kneeling. Round the spine. Full crunch.' },
      { id: 'd6e7', name: 'Plank / Ab Wheel', sets: 2, repsMin: 30, repsMax: 60, isTime: true, unit: 'sec', instructions: 'Brace entire core. Don\'t let hips sag. Breathe steadily.' },
    ],
  },
  {
    day: 7,
    label: 'DAY 7 — REST',
    type: 'rest',
    focus: 'Recover • Recharge • Come Back Stronger',
    tagline: '"Rest is not a step back, it\'s a step forward."',
    exercises: [],
  },
]

export const typeColors: Record<WorkoutType, { accent: string; dim: string; label: string }> = {
  push: { accent: '#e63946', dim: '#3a1216', label: 'PUSH' },
  pull: { accent: '#3b82f6', dim: '#0f2040', label: 'PULL' },
  legs: { accent: '#10b981', dim: '#0a2e22', label: 'LEGS + CORE' },
  rest: { accent: '#6b7280', dim: '#1a1a22', label: 'REST' },
}
