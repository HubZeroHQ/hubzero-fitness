import express from 'express'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_PASSWORD, hashPassword, tx, verifyPassword } from './db.js'

const COOKIE = 'hz_session'
const SESSION_DAYS = 30
const MAX_FAILS = 5
const LOCK_MS = 15 * 60 * 1000

const sha = (s) => createHash('sha256').update(s).digest('hex')
const bool = (v) => (v ? 1 : 0)
const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

const publicUser = (u) => ({
  id: u.id,
  full_name: u.full_name,
  role: u.role,
  must_change_password: !!u.must_change_password,
  height_cm: u.height_cm,
  sex: u.sex,
  birth_date: u.birth_date,
  goal_weight_kg: u.goal_weight_kg,
})

const logOut = (l, sets) => ({ ...l, completed: !!l.completed, set_logs: sets.map((s) => ({ ...s, done: !!s.done })) })

export function createApp(db, { secureCookie = false, trustProxy = false, staticDir } = {}) {
  const app = express()
  app.disable('x-powered-by')
  if (trustProxy) app.set('trust proxy', 1) // behind nginx/Caddy: use the real client IP for login rate limiting
  app.use(express.json({ limit: '200kb' }))

  const fails = new Map() // "ip|email" -> { count, until }

  // ---- auth helpers -------------------------------------------------------
  const cookieOpts = () => `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secureCookie ? '; Secure' : ''}`

  function readToken(req) {
    const raw = req.headers.cookie ?? ''
    const part = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`))
    return part ? part.slice(COOKIE.length + 1) : null
  }

  function startSession(res, userId) {
    const token = randomBytes(32).toString('hex')
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha(token), userId, Date.now() + SESSION_DAYS * 86400_000)
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; ${cookieOpts()}`)
  }

  function requireAuth(req, res, next) {
    const token = readToken(req)
    if (token) {
      const row = db
        .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
        .get(sha(token), Date.now())
      if (row) {
        req.user = row
        return next()
      }
    }
    res.status(401).json({ error: 'Not signed in' })
  }

  // Everything except login needs a session; the forced password change blocks all data routes.
  const requireReady = (req, res, next) =>
    req.user.must_change_password ? res.status(403).json({ error: 'Change your password first' }) : next()

  // ---- auth routes --------------------------------------------------------
  app.post('/api/login', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const password = String(req.body?.password ?? '')
    const key = `${req.ip}|${email}`
    const f = fails.get(key)
    if (f && f.count >= MAX_FAILS && f.until > Date.now()) {
      return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' })
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user || !verifyPassword(password, user.password_hash)) {
      fails.set(key, { count: (f && f.until > Date.now() ? f.count : 0) + 1, until: Date.now() + LOCK_MS })
      return res.status(401).json({ error: 'Wrong email or password.' })
    }
    fails.delete(key)
    startSession(res, user.id)
    res.json(publicUser(user))
  })

  app.post('/api/logout', (req, res) => {
    const token = readToken(req)
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token))
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`)
    res.json({ ok: true })
  })

  app.get('/api/me', requireAuth, (req, res) => res.json(publicUser(req.user)))

  app.post('/api/change-password', requireAuth, (req, res) => {
    const current = String(req.body?.current ?? '')
    const next = String(req.body?.password ?? '')
    if (!verifyPassword(current, req.user.password_hash)) return res.status(400).json({ error: 'Current password is wrong.' })
    if (next.length < 8) return res.status(400).json({ error: 'Use at least 8 characters.' })
    if (next.toLowerCase().includes(DEFAULT_PASSWORD)) return res.status(400).json({ error: 'Choose something different from the default password.' })
    tx(db, () => {
      db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hashPassword(next), req.user.id)
      // Sign out every other device; keep the current one.
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(req.user.id, sha(readToken(req)))
    })
    res.json(publicUser({ ...req.user, must_change_password: 0 }))
  })

  // ---- data routes --------------------------------------------------------
  const data = express.Router()
  data.use(requireAuth, requireReady)

  data.patch('/me', (req, res) => {
    const b = req.body ?? {}
    const sex = b.sex === 'male' || b.sex === 'female' ? b.sex : null
    const birth = b.birth_date && isDate(b.birth_date) ? b.birth_date : null
    db.prepare('UPDATE users SET height_cm = ?, sex = ?, birth_date = ?, goal_weight_kg = ? WHERE id = ?').run(
      numOrNull(b.height_cm),
      sex,
      birth,
      numOrNull(b.goal_weight_kg),
      req.user.id,
    )
    res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)))
  })

  data.get('/profiles', (_req, res) => {
    res.json(db.prepare('SELECT * FROM users ORDER BY full_name').all().map(publicUser))
  })

  // All workout logs (with sets), oldest first. ?userId= limits to one person; everyone can read everyone (team of 5).
  data.get('/logs', (req, res) => {
    const userId = numOrNull(req.query.userId)
    const logs = userId
      ? db.prepare('SELECT * FROM workout_logs WHERE user_id = ? ORDER BY log_date').all(userId)
      : db.prepare('SELECT * FROM workout_logs ORDER BY log_date').all()
    const sets = userId
      ? db.prepare('SELECT s.* FROM set_logs s JOIN workout_logs w ON w.id = s.workout_log_id WHERE w.user_id = ?').all(userId)
      : db.prepare('SELECT * FROM set_logs').all()
    const byLog = new Map()
    for (const s of sets) {
      if (!byLog.has(s.workout_log_id)) byLog.set(s.workout_log_id, [])
      byLog.get(s.workout_log_id).push(s)
    }
    res.json(logs.map((l) => logOut(l, byLog.get(l.id) ?? [])))
  })

  // Save (create or replace) the signed-in user's log for one date, including all of its sets.
  data.put('/logs/:date', (req, res) => {
    const date = req.params.date
    const b = req.body ?? {}
    if (!isDate(date)) return res.status(400).json({ error: 'Bad date' })
    const day = Number(b.day_number)
    if (!Number.isInteger(day) || day < 1 || day > 7) return res.status(400).json({ error: 'Bad day' })
    const sets = Array.isArray(b.sets) ? b.sets.slice(0, 200) : []

    const saved = tx(db, () => {
      db.prepare(
        `INSERT INTO workout_logs (user_id, log_date, day_number, completed, duration_min, cardio_min, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, log_date) DO UPDATE SET
           day_number = excluded.day_number, completed = excluded.completed,
           duration_min = excluded.duration_min, cardio_min = excluded.cardio_min, notes = excluded.notes`,
      ).run(req.user.id, date, day, bool(b.completed), numOrNull(b.duration_min), numOrNull(b.cardio_min), b.notes ? String(b.notes).slice(0, 500) : null)
      const log = db.prepare('SELECT * FROM workout_logs WHERE user_id = ? AND log_date = ?').get(req.user.id, date)
      db.prepare('DELETE FROM set_logs WHERE workout_log_id = ?').run(log.id)
      const ins = db.prepare(
        'INSERT OR REPLACE INTO set_logs (workout_log_id, exercise_key, exercise_name, set_number, weight_kg, reps, done) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      for (const s of sets) {
        if (!s?.exercise_key || !Number.isInteger(s.set_number)) continue
        ins.run(log.id, String(s.exercise_key).slice(0, 80), String(s.exercise_name ?? s.exercise_key).slice(0, 120), s.set_number, numOrNull(s.weight_kg), numOrNull(s.reps), bool(s.done))
      }
      return { log, sets: db.prepare('SELECT * FROM set_logs WHERE workout_log_id = ?').all(log.id) }
    })
    res.json(logOut(saved.log, saved.sets))
  })

  data.get('/metrics', (req, res) => {
    const userId = numOrNull(req.query.userId)
    res.json(
      userId
        ? db.prepare('SELECT * FROM body_metrics WHERE user_id = ? ORDER BY measured_on').all(userId)
        : db.prepare('SELECT * FROM body_metrics ORDER BY measured_on').all(),
    )
  })

  data.put('/metrics', (req, res) => {
    const b = req.body ?? {}
    const weight = numOrNull(b.weight_kg)
    if (!isDate(b.measured_on) || !weight || weight <= 0 || weight > 400) return res.status(400).json({ error: 'Need a date and a valid weight' })
    db.prepare(
      `INSERT INTO body_metrics (user_id, measured_on, weight_kg, body_fat_pct, waist_cm) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, measured_on) DO UPDATE SET weight_kg = excluded.weight_kg, body_fat_pct = excluded.body_fat_pct, waist_cm = excluded.waist_cm`,
    ).run(req.user.id, b.measured_on, weight, numOrNull(b.body_fat_pct), numOrNull(b.waist_cm))
    res.json({ ok: true })
  })

  data.delete('/metrics/:id', (req, res) => {
    db.prepare('DELETE FROM body_metrics WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id)
    res.json({ ok: true })
  })

  // ---- program (timetable): everyone reads, only the coach edits ----------
  const requireCoach = (req, res, next) => (req.user.role === 'coach' ? next() : res.status(403).json({ error: 'Only the coach can change the program' }))
  const TYPES = ['push', 'pull', 'legs', 'rest']
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  const text = (v, max) => String(v ?? '').trim().slice(0, max)
  const int = (v) => (Number.isInteger(Number(v)) && v !== '' && v !== null ? Number(v) : NaN)

  const exerciseOut = (e) => ({ id: e.id, key: e.key, name: e.name, sets: e.sets, repsMin: e.reps_min, repsMax: e.reps_max, timed: !!e.timed })

  function readProgram() {
    const exercises = db.prepare('SELECT * FROM program_exercises ORDER BY day, position').all()
    return db.prepare('SELECT * FROM program_days ORDER BY day').all().map((d) => ({
      ...d,
      exercises: exercises.filter((e) => e.day === d.day).map(exerciseOut),
    }))
  }

  /** Validate exercise fields; returns { error } or the cleaned values. */
  function cleanExercise(b, partial = false) {
    const out = {}
    if (!partial || b.name !== undefined) {
      out.name = text(b.name, 80)
      if (!out.name) return { error: 'Exercise needs a name' }
    }
    if (!partial || b.sets !== undefined) {
      out.sets = int(b.sets)
      if (!(out.sets >= 1 && out.sets <= 10)) return { error: 'Sets must be 1–10' }
    }
    if (!partial || b.repsMin !== undefined) out.repsMin = int(b.repsMin)
    if (!partial || b.repsMax !== undefined) out.repsMax = int(b.repsMax)
    for (const k of ['repsMin', 'repsMax']) {
      if (k in out && !(out[k] >= 1 && out[k] <= 999)) return { error: 'Reps must be a whole number between 1 and 999' }
    }
    if (!partial || b.timed !== undefined) out.timed = !!b.timed
    return out
  }

  app.get('/api/program', requireAuth, requireReady, (_req, res) => res.json(readProgram()))

  const program = express.Router()
  program.use(requireAuth, requireReady, requireCoach)

  program.put('/days/:day', (req, res) => {
    const day = Number(req.params.day)
    const b = req.body ?? {}
    if (!db.prepare('SELECT 1 FROM program_days WHERE day = ?').get(day)) return res.status(404).json({ error: 'No such day' })
    if (!TYPES.includes(b.type)) return res.status(400).json({ error: 'Bad day type' })
    const title = text(b.title, 40)
    if (!title) return res.status(400).json({ error: 'Day needs a title' })
    db.prepare('UPDATE program_days SET type = ?, title = ?, muscles = ?, focus = ?, note = ? WHERE day = ?').run(b.type, title, text(b.muscles, 80), text(b.focus, 80), text(b.note, 160), day)
    res.json(readProgram().find((d) => d.day === day))
  })

  program.post('/days/:day/exercises', (req, res) => {
    const day = Number(req.params.day)
    if (!db.prepare('SELECT 1 FROM program_days WHERE day = ?').get(day)) return res.status(404).json({ error: 'No such day' })
    const c = cleanExercise(req.body ?? {})
    if (c.error) return res.status(400).json({ error: c.error })
    if (c.repsMin > c.repsMax) return res.status(400).json({ error: 'Min reps cannot be above max reps' })
    const key = slug(c.name) || `exercise-${Date.now()}`
    if (db.prepare('SELECT 1 FROM program_exercises WHERE day = ? AND key = ?').get(day, key)) return res.status(409).json({ error: 'That exercise is already on this day' })
    const pos = db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM program_exercises WHERE day = ?').get(day).p
    db.prepare('INSERT INTO program_exercises (day, position, key, name, sets, reps_min, reps_max, timed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(day, pos, key, c.name, c.sets, c.repsMin, c.repsMax, c.timed ? 1 : 0)
    res.status(201).json(readProgram().find((d) => d.day === day))
  })

  program.patch('/exercises/:id', (req, res) => {
    const id = Number(req.params.id)
    const cur = db.prepare('SELECT * FROM program_exercises WHERE id = ?').get(id)
    if (!cur) return res.status(404).json({ error: 'No such exercise' })
    const c = cleanExercise(req.body ?? {}, true)
    if (c.error) return res.status(400).json({ error: c.error })
    const next = { name: c.name ?? cur.name, sets: c.sets ?? cur.sets, repsMin: c.repsMin ?? cur.reps_min, repsMax: c.repsMax ?? cur.reps_max, timed: c.timed ?? !!cur.timed }
    if (next.repsMin > next.repsMax) return res.status(400).json({ error: 'Min reps cannot be above max reps' })
    // The key stays the same on rename so past logs and personal records stay linked to this exercise.
    db.prepare('UPDATE program_exercises SET name = ?, sets = ?, reps_min = ?, reps_max = ?, timed = ? WHERE id = ?').run(next.name, next.sets, next.repsMin, next.repsMax, next.timed ? 1 : 0, id)
    res.json(readProgram().find((d) => d.day === cur.day))
  })

  program.delete('/exercises/:id', (req, res) => {
    const id = Number(req.params.id)
    const cur = db.prepare('SELECT * FROM program_exercises WHERE id = ?').get(id)
    if (!cur) return res.status(404).json({ error: 'No such exercise' })
    tx(db, () => {
      db.prepare('DELETE FROM program_exercises WHERE id = ?').run(id)
      db.prepare('UPDATE program_exercises SET position = position - 1 WHERE day = ? AND position > ?').run(cur.day, cur.position)
    })
    res.json(readProgram().find((d) => d.day === cur.day))
  })

  program.post('/exercises/:id/move', (req, res) => {
    const id = Number(req.params.id)
    const cur = db.prepare('SELECT * FROM program_exercises WHERE id = ?').get(id)
    if (!cur) return res.status(404).json({ error: 'No such exercise' })
    const target = cur.position + (req.body?.direction === 'up' ? -1 : 1)
    const other = db.prepare('SELECT * FROM program_exercises WHERE day = ? AND position = ?').get(cur.day, target)
    if (other) {
      tx(db, () => {
        db.prepare('UPDATE program_exercises SET position = ? WHERE id = ?').run(target, cur.id)
        db.prepare('UPDATE program_exercises SET position = ? WHERE id = ?').run(cur.position, other.id)
      })
    }
    res.json(readProgram().find((d) => d.day === cur.day))
  })

  app.use('/api/program', program)

  app.use('/api', data)
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

  // ---- built frontend (production) ----------------------------------------
  if (staticDir && existsSync(resolve(staticDir, 'index.html'))) {
    app.use(express.static(staticDir))
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(staticDir, 'index.html')))
  }

  app.use((err, _req, res, _next) => {
    // Client mistakes (bad JSON, body too large) are not server errors.
    if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.status === 413 ? 'Request too large' : 'Bad request' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  })
  return app
}
