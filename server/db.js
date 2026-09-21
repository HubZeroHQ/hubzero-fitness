import { DatabaseSync } from 'node:sqlite'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PROGRAM_SEED } from './program.seed.js'

export const DEFAULT_PASSWORD = 'hubzero'

// The five team members. Edit here (or use `node server/admin.js add-user`) to change the roster.
export const ROSTER = [
  { email: 'ssultanmaliki47@gmail.com', full_name: 'Syed Mohammed Sultan', role: 'coach' },
  { email: 'rifaque.rs@gmail.com', full_name: 'Rifaque Ahmed Akrami', role: 'moderator' },
  { email: 'karaniraif@gmail.com', full_name: 'Raif Karani', role: 'member' },
  { email: 'mohdiyad26@gmail.com', full_name: 'Mohammed Iyad', role: 'member' },
  { email: 'kobatteysalsabeel@gmail.com', full_name: 'Salsabeel Kobattey', role: 'member' },
]

export function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt') return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

export function openDb(path = process.env.DB_PATH || './data/fitness.db') {
  const file = resolve(path)
  if (path !== ':memory:') mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(path === ':memory:' ? path : file)

  // Older databases had a single team program; set those tables aside, create the new layout, then copy across.
  const cols = (table) => db.prepare(`SELECT name FROM pragma_table_info('${table}')`).all().map((c) => c.name)
  const legacyProgram = cols('program_days').length > 0 && !cols('program_days').includes('owner')
  if (legacyProgram) {
    db.exec('PRAGMA foreign_keys = OFF')
    tx(db, () => {
      db.exec('ALTER TABLE program_exercises RENAME TO program_exercises_old; ALTER TABLE program_days RENAME TO program_days_old;')
    })
  }

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('coach','moderator','member')),
      must_change_password INTEGER NOT NULL DEFAULT 1,
      height_cm REAL,
      sex TEXT CHECK (sex IN ('male','female')),
      birth_date TEXT,
      goal_weight_kg REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
      day_title TEXT,
      day_type TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      duration_min INTEGER,
      cardio_min INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS set_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_log_id INTEGER NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
      exercise_key TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      weight_kg REAL,
      reps INTEGER,
      done INTEGER NOT NULL DEFAULT 0,
      UNIQUE (workout_log_id, exercise_key, set_number)
    );

    CREATE TABLE IF NOT EXISTS body_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      measured_on TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      body_fat_pct REAL,
      waist_cm REAL,
      UNIQUE (user_id, measured_on)
    );

    -- The editable timetable. owner 0 is the team default; owner = a user id is that person's own copy of a day.
    CREATE TABLE IF NOT EXISTS program_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner INTEGER NOT NULL DEFAULT 0,
      day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 7),
      type TEXT NOT NULL CHECK (type IN ('push','pull','legs','rest')),
      title TEXT NOT NULL,
      muscles TEXT NOT NULL DEFAULT '',
      focus TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      UNIQUE (owner, day)
    );

    CREATE TABLE IF NOT EXISTS program_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id INTEGER NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      sets INTEGER NOT NULL CHECK (sets BETWEEN 1 AND 10),
      reps_min INTEGER NOT NULL,
      reps_max INTEGER NOT NULL,
      timed INTEGER NOT NULL DEFAULT 0,
      UNIQUE (day_id, key)
    );

    -- Activity log: who did what. Never stores passwords.
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL DEFAULT (datetime('now')),
      actor_id INTEGER,
      actor_name TEXT,
      category TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      ip TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_audit_cat ON audit_log (category, id);
    CREATE INDEX IF NOT EXISTS idx_logs_user_date ON workout_logs (user_id, log_date);
    CREATE INDEX IF NOT EXISTS idx_sets_log ON set_logs (workout_log_id);
    CREATE INDEX IF NOT EXISTS idx_metrics_user ON body_metrics (user_id, measured_on);
  `)

  if (legacyProgram) {
    tx(db, () => {
      db.exec(`
        INSERT INTO program_days (owner, day, type, title, muscles, focus, note)
          SELECT 0, day, type, title, muscles, focus, note FROM program_days_old;
        INSERT INTO program_exercises (id, day_id, position, key, name, sets, reps_min, reps_max, timed)
          SELECT e.id, d.id, e.position, e.key, e.name, e.sets, e.reps_min, e.reps_max, e.timed
          FROM program_exercises_old e JOIN program_days d ON d.owner = 0 AND d.day = e.day;
        DROP TABLE program_exercises_old;
        DROP TABLE program_days_old;
      `)
    })
  }
  // Databases created before day titles were remembered on each workout.
  if (!cols('workout_logs').includes('day_title')) {
    db.exec('ALTER TABLE workout_logs ADD COLUMN day_title TEXT; ALTER TABLE workout_logs ADD COLUMN day_type TEXT;')
  }

  // First run: create the roster with the default password (everyone must change it on first login).
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get()
  if (n === 0) {
    const insert = db.prepare('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
    for (const u of ROSTER) insert.run(u.email, hashPassword(DEFAULT_PASSWORD), u.full_name, u.role)
  }
  // First run (or an older database without a program): load the initial timetable.
  const days = db.prepare('SELECT COUNT(*) AS n FROM program_days WHERE owner = 0').get().n
  if (days === 0) {
    const insDay = db.prepare('INSERT INTO program_days (owner, day, type, title, muscles, focus, note) VALUES (0, ?, ?, ?, ?, ?, ?)')
    const insEx = db.prepare('INSERT INTO program_exercises (day_id, position, key, name, sets, reps_min, reps_max, timed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    for (const d of PROGRAM_SEED) {
      const dayId = insDay.run(d.day, d.type, d.title, d.muscles, d.focus, d.note).lastInsertRowid
      d.exercises.forEach((e, i) => insEx.run(dayId, i + 1, e.key, e.name, e.sets, e.repsMin, e.repsMax, e.timed ? 1 : 0))
    }
  }
  return db
}

export const AUDIT_CATEGORIES = ['auth', 'program', 'workout', 'admin']
const AUDIT_KEEP = 20000

/** Record an event in the activity log. Logging must never break the request that caused it. */
export function audit(db, { actorId = null, actorName = null, category, action, target = '', detail = '', ip = null }) {
  try {
    const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
    db.prepare('INSERT INTO audit_log (actor_id, actor_name, category, action, target, detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      actorId,
      actorName ? clip(actorName, 80) : null,
      category,
      clip(action, 60),
      clip(target, 160),
      clip(detail, 300),
      ip ? clip(ip, 60) : null,
    )
  } catch (err) {
    console.error('audit log write failed', err)
  }
}

/** Keep the activity log from growing forever: drop everything older than the newest AUDIT_KEEP entries. */
export function pruneAudit(db) {
  db.prepare('DELETE FROM audit_log WHERE id <= (SELECT MAX(id) FROM audit_log) - ?').run(AUDIT_KEEP)
}

/** Run fn inside a transaction; roll back if it throws. */
export function tx(db, fn) {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
