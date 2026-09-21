import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { audit, openDb, pruneAudit } from './db.js'
import { createApp } from './app.js'

function boot(db = openDb(':memory:')) {
  const server = createApp(db).listen(0)
  const base = `http://localhost:${server.address().port}`
  const client = () => {
    let cookie = ''
    return {
      async call(method, path, body) {
        const res = await fetch(base + path, {
          method,
          headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
          body: body === undefined || method === 'GET' ? undefined : JSON.stringify(body),
        })
        const set = res.headers.get('set-cookie')
        if (set) cookie = set.split(';')[0]
        return { status: res.status, body: await res.json().catch(() => ({})) }
      },
      async ready(email, password) {
        await this.call('POST', '/api/login', { email, password: 'hubzero' })
        await this.call('POST', '/api/change-password', { current: 'hubzero', password })
        return this
      },
    }
  }
  return { client, db, close: () => server.close() }
}

async function everyone() {
  const s = boot()
  const coach = await s.client().ready('ssultanmaliki47@gmail.com', 'coach-new-pass')
  const mod = await s.client().ready('rifaque.rs@gmail.com', 'mod-new-pass')
  const raif = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  const id = async (c) => (await c.call('GET', '/api/me')).body.id
  return { s, coach, mod, raif, ids: { raif: await id(raif) } }
}
const feed = async (c, qs = '') => (await c.call('GET', `/api/audit${qs}`)).body
const actions = (rows) => rows.map((r) => r.action)

test('only the coach and the moderator can read the activity log', async () => {
  const { s, coach, mod, raif } = await everyone()
  assert.equal((await raif.call('GET', '/api/audit')).status, 403)
  assert.equal((await mod.call('GET', '/api/audit')).status, 200)
  assert.equal((await coach.call('GET', '/api/audit')).status, 200)
  assert.equal((await s.client().call('GET', '/api/audit')).status, 401)
  s.close()
})

test('sign-ins, failures, logouts and password changes are recorded, and never the password itself', async () => {
  const s = boot()
  const c = s.client()
  await c.call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'a-wrong-guess-123' })
  await c.call('POST', '/api/login', { email: 'nobody@example.com', password: 'another-guess-456' })
  await c.ready('karaniraif@gmail.com', 'my-secret-new-pass')
  await c.call('POST', '/api/logout')
  const mod = await s.client().ready('rifaque.rs@gmail.com', 'mod-new-pass')

  const rows = (await feed(mod)).rows
  const byAction = (a) => rows.filter((r) => r.action === a)
  const failed = byAction('login_failed')
  assert.deepEqual(failed.map((r) => [r.target, r.detail]).sort(), [['karaniraif@gmail.com', 'wrong password'], ['nobody@example.com', 'unknown email']])
  assert.equal(failed[0].actor_name, null, 'nobody was signed in')
  assert.ok(byAction('login').some((r) => r.actor_name === 'Raif Karani' && r.target === 'karaniraif@gmail.com'))
  assert.ok(byAction('logout').some((r) => r.actor_name === 'Raif Karani'))
  const changed = byAction('password_changed')
  assert.ok(changed.some((r) => r.actor_name === 'Raif Karani' && r.detail === 'first login'))

  const everything = JSON.stringify(s.db.prepare('SELECT * FROM audit_log').all())
  for (const secret of ['a-wrong-guess-123', 'another-guess-456', 'my-secret-new-pass', 'mod-new-pass', 'hubzero']) {
    assert.ok(!everything.includes(secret), `the log must not contain a password (${secret})`)
  }
  s.close()
})

test('too many wrong passwords is recorded as a lockout', async () => {
  const { s, mod } = await everyone()
  const attacker = s.client()
  for (let i = 0; i < 6; i++) await attacker.call('POST', '/api/login', { email: 'mohdiyad26@gmail.com', password: 'nope' })
  const rows = (await feed(mod)).rows
  assert.equal(rows.filter((r) => r.action === 'login_failed' && r.target === 'mohdiyad26@gmail.com').length, 5)
  assert.ok(rows.some((r) => r.action === 'login_locked' && r.target === 'mohdiyad26@gmail.com'))
  assert.ok(rows.every((r) => r.ip), 'each entry has the address it came from')
  s.close()
})

test('finishing a workout is logged once, not on every autosave', async () => {
  const { s, mod, raif } = await everyone()
  const body = (completed) => ({ day_number: 1, completed, sets: [{ exercise_key: 'bench-press', exercise_name: 'Bench Press', set_number: 1, weight_kg: 60, reps: 8, done: true }] })
  await raif.call('PUT', '/api/logs/2026-09-21', body(false)) // autosave
  await raif.call('PUT', '/api/logs/2026-09-21', body(true)) // finish
  await raif.call('PUT', '/api/logs/2026-09-21', body(true)) // saved again
  const finished = (await feed(mod, '?category=workout')).rows.filter((r) => r.action === 'workout_finished')
  assert.equal(finished.length, 1)
  assert.equal(finished[0].actor_name, 'Raif Karani')
  assert.match(finished[0].target, /PUSH · 2026-09-21/)
  assert.equal(finished[0].detail, '1 sets')
  s.close()
})

test('program changes are recorded with who they were for', async () => {
  const { s, coach, mod, ids } = await everyone()
  await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })
  await coach.call('POST', '/api/program/days/1/exercises', { owner: ids.raif, name: 'Dips', sets: 3, repsMin: 8, repsMax: 12 })
  const day = (await coach.call('GET', `/api/program/scope/${ids.raif}`)).body.days[0]
  await coach.call('PUT', '/api/program/days/1', { owner: ids.raif, type: 'push', title: 'RAIF PUSH' })
  await coach.call('PATCH', `/api/program/exercises/${day.exercises[0].id}`, { sets: 5 })
  await coach.call('DELETE', `/api/program/exercises/${day.exercises[1].id}`)
  await coach.call('POST', '/api/program/apply', { from: ids.raif, days: [1], targets: [], everyone: true })
  await coach.call('POST', '/api/program/days/2/customize', { owner: ids.raif })
  await coach.call('DELETE', `/api/program/days/2/customize?owner=${ids.raif}`)

  const rows = (await feed(mod, '?category=program')).rows
  const find = (a) => rows.find((r) => r.action === a)
  assert.deepEqual(rows.filter((r) => r.action === 'program_day_customised').map((r) => r.target), ['Day 2 · Raif Karani', 'Day 1 · Raif Karani'], 'newest first')
  assert.equal(find('program_exercise_added').detail, 'Dips 3×8–12')
  assert.equal(find('program_day_edited').detail, 'push, "RAIF PUSH"')
  assert.match(find('program_exercise_edited').detail, /Bench Press → Bench Press 5×6–10/)
  assert.equal(find('program_exercise_removed').detail, 'Incline Dumbbell Press')
  assert.equal(find('program_applied').detail, "from Raif Karani to everyone at once")
  assert.equal(find('program_applied').target, 'Day 1')
  assert.equal(find('program_day_reset').target, 'Day 2 · Raif Karani')
  assert.ok(rows.every((r) => r.actor_name === 'Syed Mohammed Sultan'))
  s.close()
})

test('the coach’s deletions and password resets are recorded', async () => {
  const { s, coach, mod, raif, ids } = await everyone()
  await raif.call('PUT', '/api/logs/2026-09-21', { day_number: 1, completed: true, sets: [] })
  await raif.call('PUT', '/api/metrics', { measured_on: '2026-09-21', weight_kg: 80 })
  const logId = (await coach.call('GET', '/api/logs')).body[0].id
  const metricId = (await coach.call('GET', '/api/metrics')).body[0].id
  await coach.call('DELETE', `/api/logs/${logId}`)
  await coach.call('DELETE', `/api/metrics/${metricId}`)
  await coach.call('POST', `/api/users/${ids.raif}/reset-password`)

  const rows = (await feed(mod)).rows
  assert.ok(rows.some((r) => r.action === 'workout_deleted' && r.target === 'Raif Karani · 2026-09-21' && r.actor_name === 'Syed Mohammed Sultan'))
  assert.ok(rows.some((r) => r.action === 'weigh_in_deleted' && r.target === 'Raif Karani · 2026-09-21'))
  assert.ok(rows.some((r) => r.action === 'password_reset' && r.target === 'Raif Karani'))
  s.close()
})

test('the log can be filtered by category and paged', async () => {
  const { s, mod } = await everyone()
  for (let i = 0; i < 12; i++) audit(s.db, { category: 'program', action: 'x', target: `t${i}` })
  const all = await feed(mod, '?limit=5')
  assert.equal(all.rows.length, 5)
  assert.equal(all.hasMore, true)
  assert.ok(all.rows[0].id > all.rows[1].id, 'newest first')

  const next = await feed(mod, `?limit=5&before=${all.rows.at(-1).id}`)
  assert.ok(next.rows.every((r) => r.id < all.rows.at(-1).id))
  assert.equal(new Set([...all.rows, ...next.rows].map((r) => r.id)).size, 10, 'no overlap between pages')

  const onlyProgram = await feed(mod, '?category=program&limit=200')
  assert.ok(onlyProgram.rows.length >= 12 && onlyProgram.rows.every((r) => r.category === 'program'))
  const bogus = await feed(mod, '?category=nonsense&limit=200')
  assert.ok(bogus.rows.some((r) => r.category === 'auth'), 'an unknown category is ignored, not an error')
  assert.equal((await feed(mod, '?limit=100000')).rows.length <= 200, true, 'page size is capped')
  s.close()
})

test('the log is trimmed to the newest 20000 entries', () => {
  const db = openDb(':memory:')
  db.exec('BEGIN')
  const ins = db.prepare("INSERT INTO audit_log (category, action) VALUES ('auth', 'filler')")
  for (let i = 0; i < 20050; i++) ins.run()
  db.exec('COMMIT')
  pruneAudit(db)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM audit_log').get().n, 20000)
  assert.equal(db.prepare('SELECT MIN(id) m FROM audit_log').get().m, 51)
})

test('writing to the log can never break the action being logged', () => {
  const db = openDb(':memory:')
  db.exec('DROP TABLE audit_log')
  assert.doesNotThrow(() => audit(db, { category: 'auth', action: 'login' }))
})

test('admin commands from the command line are recorded too', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hz-'))
  const file = join(dir, 'cli.db')
  const run = (...args) => execFileSync(process.execPath, ['server/admin.js', ...args], { env: { ...process.env, DB_PATH: file }, encoding: 'utf8' })
  try {
    run('add-user', 'new@example.com', 'New Person', 'member')
    run('set-role', 'new@example.com', 'coach')
    run('reset-password', 'karaniraif@gmail.com')
    const db = openDb(file)
    const rows = db.prepare("SELECT * FROM audit_log WHERE category = 'admin' ORDER BY id").all()
    assert.deepEqual(rows.map((r) => [r.action, r.target, r.actor_name]), [
      ['cli_add_user', 'new@example.com', 'Server admin (command line)'],
      ['cli_set_role', 'new@example.com', 'Server admin (command line)'],
      ['cli_reset_password', 'karaniraif@gmail.com', 'Server admin (command line)'],
    ])
    db.close()
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {}
  }
})
