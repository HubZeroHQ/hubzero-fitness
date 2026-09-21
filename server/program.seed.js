// Initial timetable, from the Hub Zero Fitness timetable image. Only used to fill an empty database;
// after that the coach edits the program inside the app.
const ex = (key, name, sets, repsMin, repsMax, timed = false) => ({ key, name, sets, repsMin, repsMax, timed })

export const PROGRAM_SEED = [
  {
    day: 1, type: 'push', title: 'PUSH', muscles: 'Chest + Shoulders + Triceps',
    focus: 'Strength + Control', note: 'Push hard, maintain good form.',
    exercises: [
      ex('bench-press', 'Bench Press', 3, 6, 10),
      ex('incline-dumbbell-press', 'Incline Dumbbell Press', 3, 8, 12),
      ex('cable-machine-fly', 'Cable / Machine Fly', 2, 10, 15),
      ex('shoulder-press', 'Shoulder Press', 3, 6, 10),
      ex('lateral-raises', 'Lateral Raises', 3, 12, 20),
      ex('triceps-pushdown', 'Triceps Pushdown', 3, 10, 15),
      ex('overhead-triceps-extension', 'Overhead Triceps Extension', 2, 10, 15),
    ],
  },
  {
    day: 2, type: 'pull', title: 'PULL', muscles: 'Back + Rear Delts + Biceps',
    focus: 'Pull & Squeeze', note: 'Control the movement, feel the muscle.',
    exercises: [
      ex('lat-pulldown-pull-ups', 'Lat Pulldown / Pull-ups', 3, 6, 10),
      ex('barbell-cable-row', 'Barbell / Cable Row', 3, 6, 10),
      ex('seated-cable-row', 'Seated Cable Row', 2, 8, 12),
      ex('face-pulls-rear-delt-fly', 'Face Pulls / Rear Delt Fly', 3, 12, 20),
      ex('dumbbell-barbell-curl', 'Dumbbell / Barbell Curl', 3, 8, 12),
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
      ex('dumbbell-bench-press', 'Dumbbell Bench Press', 3, 6, 10),
      ex('incline-machine-press', 'Incline Machine Press', 3, 8, 12),
      ex('cable-fly-pec-deck', 'Cable Fly / Pec Deck', 2, 10, 15),
      ex('arnold-press-shoulder-press', 'Arnold Press / Shoulder Press', 3, 6, 10),
      ex('lateral-raises', 'Lateral Raises', 3, 12, 20),
      ex('triceps-pushdown', 'Triceps Pushdown', 3, 10, 15),
      ex('overhead-triceps-extension', 'Overhead Triceps Extension', 2, 10, 15),
    ],
  },
  {
    day: 5, type: 'pull', title: 'PULL', muscles: 'Back + Rear Delts + Biceps',
    focus: 'Control & Strength', note: 'Pull with purpose.',
    exercises: [
      ex('pull-ups-lat-pulldown', 'Pull-ups / Lat Pulldown', 3, 6, 10),
      ex('t-bar-row-cable-row', 'T-Bar Row / Cable Row', 3, 8, 10),
      ex('seated-cable-row', 'Seated Cable Row', 2, 8, 12),
      ex('face-pulls', 'Face Pulls', 3, 12, 20),
      ex('incline-dumbbell-curl', 'Incline Dumbbell Curl', 3, 8, 12),
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
