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
}
