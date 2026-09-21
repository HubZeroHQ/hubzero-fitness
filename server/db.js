import { DatabaseSync } from 'node:sqlite'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

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

    CREATE INDEX IF NOT EXISTS idx_logs_user_date ON workout_logs (user_id, log_date);
    CREATE INDEX IF NOT EXISTS idx_sets_log ON set_logs (workout_log_id);
    CREATE INDEX IF NOT EXISTS idx_metrics_user ON body_metrics (user_id, measured_on);
  `)

  // First run: create the roster with the default password (everyone must change it on first login).
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get()
  if (n === 0) {
    const insert = db.prepare('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
    for (const u of ROSTER) insert.run(u.email, hashPassword(DEFAULT_PASSWORD), u.full_name, u.role)
  }
  return db
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
