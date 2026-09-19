export interface TeamMember {
  id: string
  name: string
  initials: string
  color: string
  role: 'member' | 'coach' | 'admin'
  age: number
  height: string
  startDate: string
  experience: string
  avatar?: string
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'u1', name: 'Aryan S.', initials: 'AS', color: '#10b981', role: 'admin', age: 26, height: '5\'11"', startDate: 'July 2026', experience: 'Intermediate', avatar: 'https://i.pravatar.cc/100?img=11' },
  { id: 'u2', name: 'Priya M.', initials: 'PM', color: '#3b82f6', role: 'coach', age: 24, height: '5\'5"', startDate: 'July 2026', experience: 'Beginner', avatar: 'https://i.pravatar.cc/100?img=5' },
  { id: 'u3', name: 'Rahul K.', initials: 'RK', color: '#f59e0b', role: 'member', age: 28, height: '6\'0"', startDate: 'August 2026', experience: 'Beginner', avatar: 'https://i.pravatar.cc/100?img=15' },
  { id: 'u4', name: 'Sneha T.', initials: 'ST', color: '#a855f7', role: 'member', age: 23, height: '5\'4"', startDate: 'August 2026', experience: 'Beginner', avatar: 'https://i.pravatar.cc/100?img=9' },
  { id: 'u5', name: 'Dev P.', initials: 'DP', color: '#ec4899', role: 'member', age: 27, height: '5\'9"', startDate: 'September 2026', experience: 'Beginner', avatar: 'https://i.pravatar.cc/100?img=7' },
]

export const LOGGED_IN_USER = TEAM_MEMBERS[0]

export const generateTeamProgressData = (days: number) => {
  const data = []
  const today = new Date('2026-09-19')
  const start = new Date(today)
  start.setDate(today.getDate() - days + 1)

  const baseScores = { u1: 72, u2: 65, u3: 55, u4: 60, u5: 45 }
  const momentums = { u1: 0.35, u2: 0.45, u3: 0.28, u4: 0.38, u5: 0.52 }

  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const label = `${d.getDate()}/${d.getMonth() + 1}`
    const point: Record<string, string | number> = { date: label }
    for (const m of TEAM_MEMBERS) {
      const base = baseScores[m.id as keyof typeof baseScores]
      const momentum = momentums[m.id as keyof typeof momentums]
      const noise = (Math.sin(i * 1.7 + m.id.charCodeAt(1)) * 5 + Math.cos(i * 0.8) * 3)
      const rest = i % 7 === 6 ? -8 : 0
      point[m.id] = Math.min(100, Math.max(20, Math.round(base + momentum * i + noise + rest)))
    }
    data.push(point)
  }
  return data
}

export const EXERCISE_HISTORY = {
  'd6e1': {
    name: 'Leg Press / Hack Squat',
    weeks: [
      { week: 'Week 1 (Sep 8)', sets: [{ w: 100, r: 10 }, { w: 100, r: 9 }, { w: 100, r: 8 }] },
      { week: 'Week 2 (Sep 15)', sets: [{ w: 110, r: 10 }, { w: 110, r: 10 }, { w: 105, r: 9 }] },
      { week: 'This Week', sets: [{ w: 120, r: 10 }, { w: 115, r: 9 }, { w: 115, r: 8 }] },
    ],
  },
  'd6e2': {
    name: 'Romanian Deadlift',
    weeks: [
      { week: 'Week 1 (Sep 8)', sets: [{ w: 60, r: 10 }, { w: 60, r: 10 }, { w: 55, r: 10 }] },
      { week: 'Week 2 (Sep 15)', sets: [{ w: 65, r: 10 }, { w: 65, r: 10 }, { w: 60, r: 10 }] },
      { week: 'This Week', sets: [{ w: 70, r: 10 }, { w: 70, r: 9 }, { w: 65, r: 10 }] },
    ],
  },
}

export const WEEKLY_COMPLETION = [
  { day: 'Mon', pct: 100 },
  { day: 'Tue', pct: 100 },
  { day: 'Wed', pct: 71 },
  { day: 'Thu', pct: 100 },
  { day: 'Fri', pct: 83 },
  { day: 'Sat', pct: 0 },
  { day: 'Sun', pct: 0 },
]

export const MONTHLY_VOLUME = [
  { week: 'W1', volume: 8400 },
  { week: 'W2', volume: 9200 },
  { week: 'W3', volume: 9800 },
  { week: 'W4', volume: 10600 },
]

export const WORKOUT_HISTORY_CALENDAR = [
  { date: '2026-09-19', day: 6, label: 'Legs + Core', completed: 0, total: 7, isToday: true },
  { date: '2026-09-18', day: 5, label: 'Pull', completed: 6, total: 6, isToday: false },
  { date: '2026-09-17', day: 4, label: 'Push', completed: 7, total: 7, isToday: false },
  { date: '2026-09-16', day: 3, label: 'Legs + Core', completed: 5, total: 7, isToday: false },
  { date: '2026-09-15', day: 2, label: 'Pull', completed: 6, total: 6, isToday: false },
  { date: '2026-09-14', day: 1, label: 'Push', completed: 7, total: 7, isToday: false },
  { date: '2026-09-13', day: 7, label: 'Rest', completed: 0, total: 0, isToday: false },
  { date: '2026-09-12', day: 6, label: 'Legs + Core', completed: 7, total: 7, isToday: false },
  { date: '2026-09-11', day: 5, label: 'Pull', completed: 5, total: 6, isToday: false },
  { date: '2026-09-10', day: 4, label: 'Push', completed: 7, total: 7, isToday: false },
  { date: '2026-09-09', day: 3, label: 'Legs + Core', completed: 6, total: 7, isToday: false },
  { date: '2026-09-08', day: 2, label: 'Pull', completed: 6, total: 6, isToday: false },
  { date: '2026-09-07', day: 1, label: 'Push', completed: 7, total: 7, isToday: false },
  { date: '2026-09-06', day: 7, label: 'Rest', completed: 0, total: 0, isToday: false },
]
