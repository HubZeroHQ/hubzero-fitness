export type Role = 'coach' | 'moderator' | 'member'

export interface Profile {
  id: number
  full_name: string
  role: Role
  must_change_password: boolean
  height_cm: number | null
  sex: 'male' | 'female' | null
  birth_date: string | null
  goal_weight_kg: number | null
}

export interface SetLog {
  exercise_key: string
  exercise_name: string
  set_number: number
  weight_kg: number | null
  reps: number | null
  done: boolean
}

export interface WorkoutLog {
  id: number
  user_id: number
  log_date: string
  day_number: number
  /** The workout name/type the person actually trained (the program can change later). */
  day_title: string | null
  day_type: 'push' | 'pull' | 'legs' | 'rest' | null
  completed: boolean
  duration_min: number | null
  cardio_min: number | null
  notes: string | null
}

export type FullLog = WorkoutLog & { set_logs: SetLog[] }

export interface BodyMetric {
  id: number
  user_id: number
  measured_on: string
  weight_kg: number
  body_fat_pct: number | null
  waist_cm: number | null
}

export type AuditCategory = 'auth' | 'program' | 'workout' | 'admin'

export interface AuditEntry {
  id: number
  /** UTC, "YYYY-MM-DD HH:MM:SS". */
  at: string
  actor_id: number | null
  actor_name: string | null
  category: AuditCategory
  action: string
  target: string
  detail: string
  ip: string | null
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(json.error ?? `Request failed (${res.status})`, res.status)
  return json as T
}

const q = (userId?: number) => (userId ? `?userId=${userId}` : '')

export const api = {
  login: (email: string, password: string) => call<Profile>('POST', '/login', { email, password }),
  logout: () => call<{ ok: true }>('POST', '/logout'),
  me: () => call<Profile>('GET', '/me'),
  changePassword: (current: string, password: string) => call<Profile>('POST', '/change-password', { current, password }),
  updateProfile: (p: Pick<Profile, 'height_cm' | 'sex' | 'birth_date' | 'goal_weight_kg'>) => call<Profile>('PATCH', '/me', p),
  profiles: () => call<Profile[]>('GET', '/profiles'),
  logs: (userId?: number) => call<FullLog[]>('GET', `/logs${q(userId)}`),
  saveLog: (
    date: string,
    log: { day_number: number; completed: boolean; duration_min: number | null; cardio_min: number | null; notes: string | null; sets: SetLog[] },
  ) => call<FullLog>('PUT', `/logs/${date}`, log),
  metrics: (userId?: number) => call<BodyMetric[]>('GET', `/metrics${q(userId)}`),
  saveMetric: (m: { measured_on: string; weight_kg: number; body_fat_pct: number | null; waist_cm: number | null }) => call<{ ok: true }>('PUT', '/metrics', m),
  deleteMetric: (id: number) => call<{ ok: true }>('DELETE', `/metrics/${id}`),
  // coach and moderator only
  audit: (category?: AuditCategory, before?: number) =>
    call<{ rows: AuditEntry[]; hasMore: boolean }>('GET', `/audit?limit=50${category ? `&category=${category}` : ''}${before ? `&before=${before}` : ''}`),
  // coach only
  deleteLog: (id: number) => call<{ ok: true }>('DELETE', `/logs/${id}`),
  resetPassword: (userId: number) => call<{ ok: true }>('POST', `/users/${userId}/reset-password`),
}

// ---- program (timetable) -------------------------------------------------
import type { ProgramDay } from './program'

export interface ExerciseInput {
  name: string
  sets: number
  repsMin: number
  repsMax: number
  timed: boolean
}

export interface ProgramScope {
  days: ProgramDay[]
  /** For each day number, the ids of people who have their own copy of it. */
  overrides: Record<string, number[]>
}

export interface ApplyRequest {
  /** The scope to copy from: 0 = team default, or a person's id. */
  from: number
  days: number[] | 'all'
  /** People who receive a personal copy (0 = the team default itself). */
  targets: number[]
  /** Make it the team default and remove every personal copy of those days. */
  everyone: boolean
}

type DayHeader = Pick<ProgramDay, 'type' | 'title' | 'muscles' | 'focus' | 'note'>

/** `owner` is 0 for the team default, or a person's id for their own copy. */
export const programApi = {
  /** The program the signed-in person trains on. */
  get: () => call<ProgramDay[]>('GET', '/program'),
  scope: (owner: number) => call<ProgramScope>('GET', `/program/scope/${owner}`),
  saveDay: (day: number, owner: number, d: DayHeader) => call<ProgramDay>('PUT', `/program/days/${day}`, { ...d, owner }),
  addExercise: (day: number, owner: number, e: ExerciseInput) => call<ProgramDay>('POST', `/program/days/${day}/exercises`, { ...e, owner }),
  updateExercise: (id: number, e: Partial<ExerciseInput>) => call<ProgramDay>('PATCH', `/program/exercises/${id}`, e),
  deleteExercise: (id: number) => call<ProgramDay>('DELETE', `/program/exercises/${id}`),
  moveExercise: (id: number, direction: 'up' | 'down') => call<ProgramDay>('POST', `/program/exercises/${id}/move`, { direction }),
  customize: (day: number, owner: number) => call<ProgramDay>('POST', `/program/days/${day}/customize`, { owner }),
  resetDay: (day: number, owner: number) => call<{ ok: true }>('DELETE', `/program/days/${day}/customize?owner=${owner}`),
  apply: (req: ApplyRequest) => call<{ ok: true; days: number }>('POST', '/program/apply', req),
}
