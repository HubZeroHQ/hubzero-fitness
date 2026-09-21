import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb } from './db.js'
import { createApp } from './app.js'

/** A server plus independent "browsers" (each with its own cookie jar). */
function boot(opts = {}, db = openDb(':memory:')) {
  const server = createApp(db, opts).listen(0)
  const base = `http://localhost:${server.address().port}`
  const client = () => {
    let cookie = ''
    return {
      async call(method, path, body, raw = false) {
        const res = await fetch(base + path, {
          method,
          headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
          body: body === undefined || method === 'GET' ? undefined : raw ? body : JSON.stringify(body),
        })
        const set = res.headers.get('set-cookie')
        if (set) cookie = set.split(';')[0]
        return { status: res.status, body: await res.json().catch(() => ({})), setCookie: set }
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

test('logout invalidates the session', async () => {
  const s = boot()
  const c = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  assert.equal((await c.call('GET', '/api/me')).status, 200)
  await c.call('POST', '/api/logout')
  assert.equal((await c.call('GET', '/api/me')).status, 401)
  s.close()
})

test('changing a password signs out the account on other devices', async () => {
  const s = boot()
  const phone = await s.client().ready('mohdiyad26@gmail.com', 'iyad-first-pass')
  const laptop = s.client()
  assert.equal((await laptop.call('POST', '/api/login', { email: 'mohdiyad26@gmail.com', password: 'iyad-first-pass' })).status, 200)
  assert.equal((await laptop.call('GET', '/api/me')).status, 200)

  assert.equal((await phone.call('POST', '/api/change-password', { current: 'iyad-first-pass', password: 'iyad-second-pass' })).status, 200)
  assert.equal((await phone.call('GET', '/api/me')).status, 200, 'the device that changed it stays signed in')
  assert.equal((await laptop.call('GET', '/api/me')).status, 401, 'the other device is signed out')
  assert.equal((await s.client().call('POST', '/api/login', { email: 'mohdiyad26@gmail.com', password: 'iyad-first-pass' })).status, 401, 'old password no longer works')
  s.close()
})

test('passwords are hashed in the database, never stored in plain text', () => {
  const db = openDb(':memory:')
  for (const u of db.prepare('SELECT password_hash FROM users').all()) {
    assert.match(u.password_hash, /^scrypt\$[0-9a-f]+\$[0-9a-f]+$/)
    assert.ok(!u.password_hash.includes('hubzero'))
  }
  const hashes = new Set(db.prepare('SELECT password_hash FROM users').all().map((u) => u.password_hash))
  assert.equal(hashes.size, 5, 'each user gets a different salt')
})

test('session cookie is HttpOnly and SameSite, and Secure when enabled', async () => {
  const plain = boot()
  const a = await plain.client().call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'hubzero' })
  assert.match(a.setCookie, /HttpOnly/)
  assert.match(a.setCookie, /SameSite=Lax/)
  assert.doesNotMatch(a.setCookie, /Secure/)
  plain.close()

  const secure = boot({ secureCookie: true })
  const b = await secure.client().call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'hubzero' })
  assert.match(b.setCookie, /Secure/)
  secure.close()
})

test('every data route rejects signed-out visitors', async () => {
  const s = boot()
  const c = s.client()
  const routes = [
    ['GET', '/api/me'], ['PATCH', '/api/me'], ['GET', '/api/profiles'], ['GET', '/api/logs'],
    ['PUT', '/api/logs/2026-09-21'], ['GET', '/api/metrics'], ['PUT', '/api/metrics'],
    ['DELETE', '/api/metrics/1'], ['GET', '/api/program'], ['PUT', '/api/program/days/1'],
    ['POST', '/api/program/days/1/exercises'], ['PATCH', '/api/program/exercises/1'],
    ['DELETE', '/api/program/exercises/1'], ['POST', '/api/change-password'],
  ]
  for (const [method, path] of routes) {
    assert.equal((await c.call(method, path, {})).status, 401, `${method} ${path}`)
  }
  s.close()
})

test('a user who has not changed the default password is locked out of all data routes', async () => {
  const s = boot()
  const c = s.client()
  await c.call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'hubzero' })
  for (const [method, path] of [['GET', '/api/logs'], ['GET', '/api/profiles'], ['GET', '/api/program'], ['GET', '/api/metrics'], ['PUT', '/api/logs/2026-09-21']]) {
    assert.equal((await c.call(method, path, {})).status, 403, `${method} ${path}`)
  }
  assert.equal((await c.call('GET', '/api/me')).status, 200, '/api/me is still allowed so the app can show the change-password screen')
  s.close()
})

test('malformed JSON gets a 400, not a crash', async () => {
  const s = boot()
  const c = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  const res = await c.call('PUT', '/api/metrics', '{not json', true)
  assert.equal(res.status, 400)
  assert.equal((await c.call('GET', '/api/me')).status, 200, 'server is still fine')
  s.close()
})

test('profile update cleans its input and cannot change the role', async () => {
  const s = boot()
  const c = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  const res = await c.call('PATCH', '/api/me', { height_cm: '178', sex: 'robot', birth_date: 'not-a-date', goal_weight_kg: 'abc', role: 'coach' })
  assert.equal(res.status, 200)
  assert.equal(res.body.height_cm, 178)
  assert.equal(res.body.sex, null)
  assert.equal(res.body.birth_date, null)
  assert.equal(res.body.goal_weight_kg, null)
  assert.equal(res.body.role, 'member', 'role is not editable by the user')
  const ok = await c.call('PATCH', '/api/me', { height_cm: 178, sex: 'male', birth_date: '2000-01-31', goal_weight_kg: 80 })
  assert.deepEqual([ok.body.sex, ok.body.birth_date, ok.body.goal_weight_kg], ['male', '2000-01-31', 80])
  s.close()
})

test('workout log validation', async () => {
  const s = boot()
  const c = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  assert.equal((await c.call('PUT', '/api/logs/tomorrow', { day_number: 1, sets: [] })).status, 400)
  assert.equal((await c.call('PUT', '/api/logs/2026-09-21', { day_number: 9, sets: [] })).status, 400)
  assert.equal((await c.call('PUT', '/api/logs/2026-09-21', { day_number: 'x', sets: [] })).status, 400)
  // junk sets are skipped, valid ones kept
  const res = await c.call('PUT', '/api/logs/2026-09-21', {
    day_number: 1,
    sets: [{ set_number: 1 }, null, { exercise_key: 'bench-press', exercise_name: 'Bench Press', set_number: 1, weight_kg: '60', reps: '8', done: 1 }],
  })
  assert.equal(res.status, 200)
  assert.equal(res.body.set_logs.length, 1)
  assert.equal(res.body.set_logs[0].weight_kg, 60)
  assert.equal(res.body.set_logs[0].done, true)
  s.close()
})

test('logs can be filtered by user and metrics upsert per date', async () => {
  const s = boot()
  const raif = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  const iyad = await s.client().ready('mohdiyad26@gmail.com', 'iyad-new-pass')
  await raif.call('PUT', '/api/logs/2026-09-20', { day_number: 1, completed: true, sets: [] })
  await iyad.call('PUT', '/api/logs/2026-09-21', { day_number: 2, completed: true, sets: [] })
  const raifId = (await raif.call('GET', '/api/me')).body.id
  const only = await iyad.call('GET', `/api/logs?userId=${raifId}`)
  assert.equal(only.body.length, 1)
  assert.equal(only.body[0].user_id, raifId)
  assert.equal((await iyad.call('GET', '/api/logs')).body.length, 2)

  await raif.call('PUT', '/api/metrics', { measured_on: '2026-09-21', weight_kg: 80 })
  await raif.call('PUT', '/api/metrics', { measured_on: '2026-09-21', weight_kg: 79.4, body_fat_pct: 15 })
  const m = await raif.call('GET', '/api/metrics')
  assert.equal(m.body.length, 1)
  assert.equal(m.body[0].weight_kg, 79.4)
  assert.equal(m.body[0].body_fat_pct, 15)
  assert.equal((await raif.call('PUT', '/api/metrics', { measured_on: '2026-09-22', weight_kg: 900 })).status, 400)
  s.close()
})

test('unknown API routes return 404 for signed-in users', async () => {
  const s = boot()
  const c = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  assert.equal((await c.call('GET', '/api/nope')).status, 404)
  s.close()
})

test('login lockout is per email and does not leak whether the account exists', async () => {
  const s = boot()
  const c = s.client()
  const nobody = await c.call('POST', '/api/login', { email: 'nobody@example.com', password: 'x' })
  const wrong = await c.call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'x' })
  assert.equal(nobody.status, 401)
  assert.deepEqual(nobody.body, wrong.body, 'same message for unknown email and wrong password')
  for (let i = 0; i < 5; i++) await c.call('POST', '/api/login', { email: 'mohdiyad26@gmail.com', password: 'bad' })
  assert.equal((await c.call('POST', '/api/login', { email: 'mohdiyad26@gmail.com', password: 'hubzero' })).status, 429, 'locked even with the right password')
  assert.equal((await c.call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'hubzero' })).status, 200, 'other accounts unaffected')
  s.close()
})

test('program edits: partial updates, moving at the edges, unknown ids', async () => {
  const s = boot()
  const coach = await s.client().ready('ssultanmaliki47@gmail.com', 'coach-new-pass')
  const day1 = (await coach.call('GET', '/api/program')).body[0]
  const first = day1.exercises[0]
  const last = day1.exercises.at(-1)

  const moved = await coach.call('POST', `/api/program/exercises/${first.id}/move`, { direction: 'up' })
  assert.equal(moved.body.exercises[0].id, first.id, 'moving the first one up changes nothing')
  const moved2 = await coach.call('POST', `/api/program/exercises/${last.id}/move`, { direction: 'down' })
  assert.equal(moved2.body.exercises.at(-1).id, last.id, 'moving the last one down changes nothing')

  const renamed = await coach.call('PATCH', `/api/program/exercises/${first.id}`, { name: 'Flat Bench Press' })
  const e = renamed.body.exercises[0]
  assert.equal(e.name, 'Flat Bench Press')
  assert.equal(e.sets, first.sets, 'other fields untouched')
  assert.equal(e.repsMin, first.repsMin)

  assert.equal((await coach.call('PATCH', `/api/program/exercises/${first.id}`, { repsMin: 20 })).status, 400, 'min above existing max')
  assert.equal((await coach.call('PATCH', '/api/program/exercises/99999', { sets: 3 })).status, 404)
  assert.equal((await coach.call('DELETE', '/api/program/exercises/99999')).status, 404)
  assert.equal((await coach.call('POST', '/api/program/days/9/exercises', { name: 'X', sets: 3, repsMin: 1, repsMax: 2 })).status, 404)
  assert.equal((await coach.call('PUT', '/api/program/days/1', { type: 'push', title: '   ' })).status, 400)
  s.close()
})

test('the same exercise name can be used on different days and keeps one key', async () => {
  const s = boot()
  const coach = await s.client().ready('ssultanmaliki47@gmail.com', 'coach-new-pass')
  const a = await coach.call('POST', '/api/program/days/2/exercises', { name: 'Lateral Raises', sets: 3, repsMin: 12, repsMax: 20 })
  assert.equal(a.status, 201)
  assert.equal(a.body.exercises.at(-1).key, 'lateral-raises', 'same key as the Day 1 / Day 4 exercise, so progress links up')
  s.close()
})

test('reopening an existing database does not duplicate the roster or program', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hz-'))
  const file = join(dir, 'f.db')
  try {
    const a = openDb(file)
    const counts = () => [
      a.prepare('SELECT COUNT(*) n FROM users').get().n,
      a.prepare('SELECT COUNT(*) n FROM program_days').get().n,
      a.prepare('SELECT COUNT(*) n FROM program_exercises').get().n,
    ]
    const before = counts()
    a.close()
    const b = openDb(file)
    assert.deepEqual([b.prepare('SELECT COUNT(*) n FROM users').get().n, b.prepare('SELECT COUNT(*) n FROM program_days').get().n, b.prepare('SELECT COUNT(*) n FROM program_exercises').get().n], before)
    assert.deepEqual(before.slice(0, 2), [5, 7])
    b.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('admin CLI: reset-password, add-user and set-role', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hz-'))
  const file = join(dir, 'cli.db')
  const run = (...args) => execFileSync(process.execPath, ['server/admin.js', ...args], { env: { ...process.env, DB_PATH: file }, encoding: 'utf8' })
  try {
    const db = openDb(file)
    const s = boot({}, db)
    const raif = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
    assert.equal((await raif.call('GET', '/api/logs')).status, 200)

    assert.match(run('reset-password', 'KARANIRAIF@gmail.com'), /reset to "hubzero"/)
    assert.equal((await raif.call('GET', '/api/me')).status, 401, 'reset signs the user out everywhere')
    const again = s.client()
    assert.equal((await again.call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'hubzero' })).body.must_change_password, true)

    assert.match(run('add-user', 'new@example.com', 'New Person', 'member'), /Added New Person/)
    assert.match(run('list'), /New Person <new@example.com> member \(must change password\)/)
    run('set-role', 'new@example.com', 'coach')
    assert.match(run('list'), /New Person <new@example.com> coach/)
    assert.throws(() => run('reset-password', 'ghost@example.com'), /No user/)
    assert.throws(() => run('add-user', 'x@example.com', 'X', 'boss'))
    s.close()
    db.close()
  } finally {
    // Windows keeps SQLite files locked briefly; a leftover temp folder must not fail the test.
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {}
  }
})
