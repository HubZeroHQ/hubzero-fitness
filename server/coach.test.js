import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb } from './db.js'
import { createApp } from './app.js'

function boot() {
  const db = openDb(':memory:')
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

/** A running server with the coach and three members signed in, and everyone's user id. */
async function team() {
  const s = boot()
  const coach = await s.client().ready('ssultanmaliki47@gmail.com', 'coach-new-pass')
  const raif = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  const iyad = await s.client().ready('mohdiyad26@gmail.com', 'iyad-new-pass')
  const sal = await s.client().ready('kobatteysalsabeel@gmail.com', 'sal-new-pass')
  const id = async (c) => (await c.call('GET', '/api/me')).body.id
  const ids = { coach: await id(coach), raif: await id(raif), iyad: await id(iyad), sal: await id(sal) }
  return { s, coach, raif, iyad, sal, ids }
}

const day = (program, n) => program.find((d) => d.day === n)
const names = (d) => d.exercises.map((e) => e.name)

test('a customised day is seen only by that person; everyone else keeps the team version', async () => {
  const { s, coach, raif, iyad, ids } = await team()
  assert.equal(day((await raif.call('GET', '/api/program')).body, 1).custom, false)

  const made = await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })
  assert.equal(made.status, 201)
  assert.equal(made.body.custom, true)
  assert.equal(made.body.owner, ids.raif)

  // change Raif's copy: add an exercise and rename the day
  await coach.call('POST', '/api/program/days/1/exercises', { owner: ids.raif, name: 'Raif Special', sets: 4, repsMin: 5, repsMax: 5 })
  await coach.call('PUT', '/api/program/days/1', { owner: ids.raif, type: 'push', title: 'RAIF PUSH', muscles: 'Chest', focus: 'Heavy', note: 'Go heavy' })

  const mine = day((await raif.call('GET', '/api/program')).body, 1)
  assert.equal(mine.title, 'RAIF PUSH')
  assert.equal(mine.custom, true)
  assert.ok(names(mine).includes('Raif Special'))

  const theirs = day((await iyad.call('GET', '/api/program')).body, 1)
  assert.equal(theirs.title, 'PUSH')
  assert.equal(theirs.custom, false)
  assert.ok(!names(theirs).includes('Raif Special'))
  assert.equal(names(theirs).length, 7)
  // and Raif's other days still follow the team
  assert.equal(day((await raif.call('GET', '/api/program')).body, 2).custom, false)
  s.close()
})

test('you cannot edit an inherited day for a person without customising it first', async () => {
  const { s, coach, ids } = await team()
  const add = await coach.call('POST', '/api/program/days/1/exercises', { owner: ids.raif, name: 'X', sets: 3, repsMin: 5, repsMax: 8 })
  assert.equal(add.status, 409)
  assert.equal((await coach.call('PUT', '/api/program/days/1', { owner: ids.raif, type: 'push', title: 'X' })).status, 409)
  await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })
  assert.equal((await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })).status, 409, 'already customised')
  assert.equal((await coach.call('POST', '/api/program/days/1/customize', { owner: 999 })).status, 404)
  assert.equal((await coach.call('POST', '/api/program/days/1/customize', { owner: 0 })).status, 404, 'team default is not a person')
  s.close()
})

test('editing a personal exercise leaves the team default untouched, and vice versa', async () => {
  const { s, coach, raif, iyad, ids } = await team()
  const personal = (await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })).body
  const bench = personal.exercises[0]
  await coach.call('PATCH', `/api/program/exercises/${bench.id}`, { sets: 6, name: 'Paused Bench' })

  const team1 = day((await coach.call('GET', '/api/program/scope/0')).body.days, 1)
  assert.equal(team1.exercises[0].name, 'Bench Press')
  assert.equal(team1.exercises[0].sets, 3)

  // change the team version; Raif keeps his own, Iyad follows the team
  const teamBench = team1.exercises[0]
  await coach.call('PATCH', `/api/program/exercises/${teamBench.id}`, { sets: 5 })
  assert.equal(day((await raif.call('GET', '/api/program')).body, 1).exercises[0].sets, 6)
  assert.equal(day((await iyad.call('GET', '/api/program')).body, 1).exercises[0].sets, 5)
  s.close()
})

test('resetting a personal day sends the person back to the team version', async () => {
  const { s, coach, raif, ids } = await team()
  await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })
  await coach.call('PUT', '/api/program/days/1', { owner: ids.raif, type: 'legs', title: 'MINE' })
  assert.equal(day((await raif.call('GET', '/api/program')).body, 1).title, 'MINE')
  assert.equal((await coach.call('DELETE', `/api/program/days/1/customize?owner=${ids.raif}`)).status, 200)
  const back = day((await raif.call('GET', '/api/program')).body, 1)
  assert.equal(back.title, 'PUSH')
  assert.equal(back.custom, false)
  // the deleted copy's exercises are gone too (no orphans)
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM program_exercises WHERE day_id NOT IN (SELECT id FROM program_days)').get().n, 0)
  s.close()
})

test('scope endpoint shows a person\'s effective program and who has custom days', async () => {
  const { s, coach, raif, ids } = await team()
  await coach.call('POST', '/api/program/days/3/customize', { owner: ids.raif })
  await coach.call('POST', '/api/program/days/3/customize', { owner: ids.iyad })
  const teamScope = (await coach.call('GET', '/api/program/scope/0')).body
  assert.deepEqual(teamScope.overrides['3'].sort(), [ids.raif, ids.iyad].sort())
  assert.equal(teamScope.days.length, 7)
  assert.ok(teamScope.days.every((d) => d.custom === false))

  const raifScope = (await coach.call('GET', `/api/program/scope/${ids.raif}`)).body
  assert.equal(day(raifScope.days, 3).custom, true)
  assert.equal(day(raifScope.days, 4).custom, false)

  assert.equal((await coach.call('GET', '/api/program/scope/999')).status, 404)
  assert.equal((await raif.call('GET', '/api/program/scope/0')).status, 403, 'members cannot open the editor data')
  s.close()
})

test('apply one day to chosen people gives each their own copy', async () => {
  const { s, coach, raif, iyad, sal, ids } = await team()
  await coach.call('PUT', '/api/program/days/2', { owner: 0, type: 'pull', title: 'NEW PULL', muscles: 'Back', focus: 'x', note: 'y' })
  const res = await coach.call('POST', '/api/program/apply', { from: 0, days: [2], targets: [ids.iyad, ids.sal] })
  assert.equal(res.status, 200)
  for (const c of [iyad, sal]) {
    const d = day((await c.call('GET', '/api/program')).body, 2)
    assert.equal(d.title, 'NEW PULL')
    assert.equal(d.custom, true)
  }
  // Raif was not chosen: he follows the team default (which is also NEW PULL, but not a personal copy)
  assert.equal(day((await raif.call('GET', '/api/program')).body, 2).custom, false)
  // other days of the chosen people are untouched
  assert.equal(day((await iyad.call('GET', '/api/program')).body, 1).custom, false)
  s.close()
})

test('apply the whole program from one person to another copies all 7 days', async () => {
  const { s, coach, raif, sal, ids } = await team()
  await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })
  await coach.call('PUT', '/api/program/days/1', { owner: ids.raif, type: 'push', title: 'RAIF DAY ONE' })
  const res = await coach.call('POST', '/api/program/apply', { from: ids.raif, days: 'all', targets: [ids.sal] })
  assert.equal(res.body.days, 7)
  const prog = (await sal.call('GET', '/api/program')).body
  assert.ok(prog.every((d) => d.custom), 'all seven days are personal copies')
  assert.equal(day(prog, 1).title, 'RAIF DAY ONE', "took Raif's version of day 1")
  assert.equal(day(prog, 2).title, 'PULL', "and the team's version of the days Raif had not changed")
  s.close()
})

test('apply to everyone makes it the team default and clears personal copies', async () => {
  const { s, coach, raif, iyad, ids } = await team()
  await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })
  await coach.call('PUT', '/api/program/days/1', { owner: ids.raif, type: 'push', title: 'THE NEW STANDARD' })
  await coach.call('POST', '/api/program/days/1/customize', { owner: ids.iyad })
  await coach.call('PUT', '/api/program/days/1', { owner: ids.iyad, type: 'legs', title: 'IYAD OWN' })

  assert.equal((await coach.call('POST', '/api/program/apply', { from: ids.raif, days: [1], everyone: true })).status, 200)
  for (const c of [raif, iyad, coach]) {
    const d = day((await c.call('GET', '/api/program')).body, 1)
    assert.equal(d.title, 'THE NEW STANDARD')
    assert.equal(d.custom, false, 'nobody keeps a personal copy')
  }
  assert.equal((await coach.call('GET', '/api/program/scope/0')).body.overrides['1'], undefined)
  s.close()
})

test('apply validates its input and is coach-only', async () => {
  const { s, coach, raif, ids } = await team()
  const post = (body) => coach.call('POST', '/api/program/apply', body)
  assert.equal((await post({ from: 0, days: [1], targets: [] })).status, 400, 'nobody chosen')
  assert.equal((await post({ from: 0, days: [], targets: [ids.raif] })).status, 400, 'no days')
  assert.equal((await post({ from: 0, days: [9], targets: [ids.raif] })).status, 400, 'bad day')
  assert.equal((await post({ from: 0, days: [1], targets: [999] })).status, 400, 'unknown person')
  assert.equal((await post({ from: 999, days: [1], targets: [ids.raif] })).status, 400, 'unknown source')
  assert.equal((await raif.call('POST', '/api/program/apply', { from: 0, days: [1], everyone: true })).status, 403)
  // applying a person's day to themselves changes nothing and does not fail
  await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })
  assert.equal((await post({ from: ids.raif, days: [1], targets: [ids.raif] })).status, 200)
  s.close()
})

test('a logged workout remembers the day title even after the coach changes it', async () => {
  const { s, coach, raif, ids } = await team()
  await coach.call('POST', '/api/program/days/1/customize', { owner: ids.raif })
  await coach.call('PUT', '/api/program/days/1', { owner: ids.raif, type: 'legs', title: 'OLD NAME' })
  const saved = await raif.call('PUT', '/api/logs/2026-09-21', { day_number: 1, completed: true, sets: [] })
  assert.equal(saved.body.day_title, 'OLD NAME')
  assert.equal(saved.body.day_type, 'legs')

  await coach.call('PUT', '/api/program/days/1', { owner: ids.raif, type: 'push', title: 'NEW NAME' })
  const logs = (await raif.call('GET', '/api/logs')).body
  assert.equal(logs[0].day_title, 'OLD NAME', 'history is not rewritten')
  s.close()
})

test('the coach can delete any workout log; members cannot', async () => {
  const { s, coach, raif, iyad } = await team()
  await raif.call('PUT', '/api/logs/2026-09-21', {
    day_number: 1, completed: true,
    sets: [{ exercise_key: 'bench-press', exercise_name: 'Bench Press', set_number: 1, weight_kg: 60, reps: 8, done: true }],
  })
  const id = (await coach.call('GET', '/api/logs')).body[0].id
  assert.equal((await iyad.call('DELETE', `/api/logs/${id}`)).status, 403)
  assert.equal((await raif.call('DELETE', `/api/logs/${id}`)).status, 403, 'not even the owner')
  assert.equal((await coach.call('DELETE', `/api/logs/${id}`)).status, 200)
  assert.equal((await coach.call('GET', '/api/logs')).body.length, 0)
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM set_logs').get().n, 0, 'its sets went too')
  s.close()
})

test('the coach can remove anyone\'s weigh-in', async () => {
  const { s, coach, raif, iyad } = await team()
  await raif.call('PUT', '/api/metrics', { measured_on: '2026-09-21', weight_kg: 80 })
  const id = (await coach.call('GET', '/api/metrics')).body[0].id
  await iyad.call('DELETE', `/api/metrics/${id}`)
  assert.equal((await coach.call('GET', '/api/metrics')).body.length, 1, 'another member cannot')
  await coach.call('DELETE', `/api/metrics/${id}`)
  assert.equal((await coach.call('GET', '/api/metrics')).body.length, 0)
  s.close()
})

test('the coach can reset a member\'s password; nobody else can', async () => {
  const { s, coach, raif, iyad, ids } = await team()
  assert.equal((await iyad.call('POST', `/api/users/${ids.raif}/reset-password`)).status, 403)
  assert.equal((await coach.call('POST', `/api/users/${ids.coach}/reset-password`)).status, 400, 'not yourself')
  assert.equal((await coach.call('POST', '/api/users/999/reset-password')).status, 404)

  assert.equal((await coach.call('POST', `/api/users/${ids.raif}/reset-password`)).status, 200)
  assert.equal((await raif.call('GET', '/api/me')).status, 401, 'signed out everywhere')
  const again = s.client()
  const login = await again.call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'hubzero' })
  assert.equal(login.status, 200)
  assert.equal(login.body.must_change_password, true)
  s.close()
})

test('a database from before personal programs is migrated without losing anything', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hz-'))
  const file = join(dir, 'legacy.db')
  try {
    // build the previous schema by hand: one program for the team, keyed by day
    const old = new DatabaseSync(file)
    old.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, full_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', must_change_password INTEGER NOT NULL DEFAULT 1, height_cm REAL, sex TEXT, birth_date TEXT, goal_weight_kg REAL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO users (email, password_hash, full_name, role, must_change_password) VALUES ('a@x.com', 'scrypt$00$00', 'Old User', 'coach', 0);
      CREATE TABLE workout_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, log_date TEXT NOT NULL, day_number INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0, duration_min INTEGER, cardio_min INTEGER, notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (user_id, log_date));
      INSERT INTO workout_logs (user_id, log_date, day_number, completed) VALUES (1, '2026-09-01', 1, 1);
      CREATE TABLE program_days (day INTEGER PRIMARY KEY CHECK (day BETWEEN 1 AND 7), type TEXT NOT NULL, title TEXT NOT NULL, muscles TEXT NOT NULL DEFAULT '', focus TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '');
      CREATE TABLE program_exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, day INTEGER NOT NULL REFERENCES program_days(day) ON DELETE CASCADE, position INTEGER NOT NULL, key TEXT NOT NULL, name TEXT NOT NULL, sets INTEGER NOT NULL, reps_min INTEGER NOT NULL, reps_max INTEGER NOT NULL, timed INTEGER NOT NULL DEFAULT 0, UNIQUE (day, key));
      INSERT INTO program_days (day, type, title) VALUES (1, 'push', 'MY PUSH'), (2, 'pull', 'MY PULL');
      INSERT INTO program_exercises (id, day, position, key, name, sets, reps_min, reps_max) VALUES (41, 1, 1, 'curl', 'Coach Curl', 3, 8, 12), (42, 2, 1, 'row', 'Coach Row', 4, 6, 10);
    `)
    old.close()

    const db = openDb(file)
    const team = db.prepare('SELECT * FROM program_days WHERE owner = 0 ORDER BY day').all()
    assert.deepEqual(team.map((d) => [d.day, d.title]), [[1, 'MY PUSH'], [2, 'MY PULL']], 'the coach\'s edited program survived (and was not replaced by the seed)')
    const ex = db.prepare('SELECT e.id, e.name, d.day FROM program_exercises e JOIN program_days d ON d.id = e.day_id ORDER BY e.id').all()
    assert.deepEqual(ex.map((e) => [e.id, e.name, e.day]), [[41, 'Coach Curl', 1], [42, 'Coach Row', 2]], 'exercise ids kept')
    assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name LIKE '%_old'").get().n, 0, 'no leftover tables')
    assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n, 1, 'users untouched (no roster re-seeded)')
    const log = db.prepare('SELECT * FROM workout_logs').get()
    assert.equal(log.log_date, '2026-09-01')
    assert.ok('day_title' in log && log.day_title === null, 'old logs gained the day snapshot columns')
    db.close()

    // opening it a second time is a no-op
    const again = openDb(file)
    assert.equal(again.prepare('SELECT COUNT(*) n FROM program_days').get().n, 2)
    again.close()
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {}
  }
})
