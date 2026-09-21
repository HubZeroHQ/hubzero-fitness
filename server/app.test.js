import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from './db.js'
import { createApp } from './app.js'

async function boot() {
  const db = openDb(':memory:')
  const server = createApp(db).listen(0)
  const base = `http://localhost:${server.address().port}`
  let cookie = ''
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    return { status: res.status, body: await res.json() }
  }
  return { call, close: () => server.close(), db, clearCookie: () => (cookie = '') }
}

test('seeded roster can log in, but must change the default password first', async () => {
  const t = await boot()
  assert.equal((await t.call('GET', '/api/me')).status, 401)
  assert.equal((await t.call('POST', '/api/login', { email: 'rifaque.rs@gmail.com', password: 'wrong' })).status, 401)

  const login = await t.call('POST', '/api/login', { email: 'RIFAQUE.rs@gmail.com', password: 'hubzero' })
  assert.equal(login.status, 200)
  assert.equal(login.body.role, 'moderator')
  assert.equal(login.body.must_change_password, true)
  assert.equal((await t.call('GET', '/api/logs')).status, 403, 'data locked until password changed')

  assert.equal((await t.call('POST', '/api/change-password', { current: 'hubzero', password: 'hubzero123' })).status, 400)
  assert.equal((await t.call('POST', '/api/change-password', { current: 'nope', password: 'a-good-password' })).status, 400)
  assert.equal((await t.call('POST', '/api/change-password', { current: 'hubzero', password: 'a-good-password' })).status, 200)
  assert.equal((await t.call('GET', '/api/logs')).status, 200)
  t.close()
})

test('logging a workout saves sets, replaces them on resave, and is visible to teammates', async () => {
  const t = await boot()
  await t.call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'hubzero' })
  await t.call('POST', '/api/change-password', { current: 'hubzero', password: 'raif-new-pass' })

  const sets = [
    { exercise_key: 'bench-press', exercise_name: 'Bench Press', set_number: 1, weight_kg: 60, reps: 8, done: true },
    { exercise_key: 'bench-press', exercise_name: 'Bench Press', set_number: 2, weight_kg: 60, reps: 7, done: true },
  ]
  const saved = await t.call('PUT', '/api/logs/2026-09-21', { day_number: 1, completed: false, sets })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.set_logs.length, 2)

  const resaved = await t.call('PUT', '/api/logs/2026-09-21', { day_number: 1, completed: true, sets: sets.slice(0, 1) })
  assert.equal(resaved.body.completed, true)
  assert.equal(resaved.body.set_logs.length, 1)

  // another member sees it
  t.clearCookie()
  await t.call('POST', '/api/login', { email: 'mohdiyad26@gmail.com', password: 'hubzero' })
  await t.call('POST', '/api/change-password', { current: 'hubzero', password: 'iyad-new-pass' })
  const all = await t.call('GET', '/api/logs')
  assert.equal(all.body.length, 1)
  assert.equal(all.body[0].set_logs[0].weight_kg, 60)

  // but cannot overwrite someone else's log: their own PUT creates their own row
  await t.call('PUT', '/api/logs/2026-09-21', { day_number: 2, completed: false, sets: [] })
  assert.equal((await t.call('GET', '/api/logs')).body.length, 2)
  t.close()
})

test('too many wrong passwords locks the login', async () => {
  const t = await boot()
  for (let i = 0; i < 5; i++) await t.call('POST', '/api/login', { email: 'raif@x.com', password: 'bad' })
  assert.equal((await t.call('POST', '/api/login', { email: 'raif@x.com', password: 'bad' })).status, 429)
  t.close()
})

test('body metrics are per user and can be deleted only by their owner', async () => {
  const t = await boot()
  await t.call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'hubzero' })
  await t.call('POST', '/api/change-password', { current: 'hubzero', password: 'raif-new-pass' })
  assert.equal((await t.call('PUT', '/api/metrics', { measured_on: '2026-09-21', weight_kg: 78, waist_cm: 84 })).status, 200)
  assert.equal((await t.call('PUT', '/api/metrics', { measured_on: '2026-09-21', weight_kg: 'x' })).status, 400)
  const list = await t.call('GET', '/api/metrics')
  assert.equal(list.body.length, 1)

  t.clearCookie()
  await t.call('POST', '/api/login', { email: 'mohdiyad26@gmail.com', password: 'hubzero' })
  await t.call('POST', '/api/change-password', { current: 'hubzero', password: 'iyad-new-pass' })
  await t.call('DELETE', `/api/metrics/${list.body[0].id}`)
  assert.equal((await t.call('GET', '/api/metrics')).body.length, 1, "someone else's delete is ignored")
  t.close()
})

async function loginAs(t, email, newPassword) {
  t.clearCookie()
  await t.call('POST', '/api/login', { email, password: 'hubzero' })
  await t.call('POST', '/api/change-password', { current: 'hubzero', password: newPassword })
}

test('everyone reads the seeded program; only the coach can edit it', async () => {
  const t = await boot()
  await loginAs(t, 'karaniraif@gmail.com', 'raif-new-pass')
  const prog = await t.call('GET', '/api/program')
  assert.equal(prog.status, 200)
  assert.equal(prog.body.length, 7)
  assert.equal(prog.body[0].exercises[0].name, 'Bench Press')
  assert.equal(prog.body[5].exercises.at(-1).timed, true)

  const ex = prog.body[0].exercises[0]
  assert.equal((await t.call('PATCH', `/api/program/exercises/${ex.id}`, { sets: 5 })).status, 403)
  assert.equal((await t.call('POST', '/api/program/days/1/exercises', { name: 'Dips', sets: 3, repsMin: 8, repsMax: 12 })).status, 403)
  assert.equal((await t.call('DELETE', `/api/program/exercises/${ex.id}`)).status, 403)
  assert.equal((await t.call('PUT', '/api/program/days/1', { type: 'push', title: 'X' })).status, 403)

  await loginAs(t, 'rifaque.rs@gmail.com', 'rifaque-new-pass')
  assert.equal((await t.call('PATCH', `/api/program/exercises/${ex.id}`, { sets: 5 })).status, 403, 'moderator is not coach')
  t.close()
})

test('coach can add, change, reorder and remove exercises and edit a day', async () => {
  const t = await boot()
  await loginAs(t, 'ssultanmaliki47@gmail.com', 'coach-new-pass')

  const added = await t.call('POST', '/api/program/days/1/exercises', { name: 'Weighted Dips', sets: 3, repsMin: 8, repsMax: 12 })
  assert.equal(added.status, 201)
  const dips = added.body.exercises.at(-1)
  assert.equal(dips.key, 'weighted-dips')
  assert.equal(added.body.exercises.length, 8)
  assert.equal((await t.call('POST', '/api/program/days/1/exercises', { name: 'weighted dips', sets: 3, repsMin: 8, repsMax: 12 })).status, 409, 'duplicate on same day')
  assert.equal((await t.call('POST', '/api/program/days/1/exercises', { name: '', sets: 3, repsMin: 8, repsMax: 12 })).status, 400)
  assert.equal((await t.call('POST', '/api/program/days/1/exercises', { name: 'Bad', sets: 30, repsMin: 8, repsMax: 12 })).status, 400)
  assert.equal((await t.call('POST', '/api/program/days/1/exercises', { name: 'Bad', sets: 3, repsMin: 12, repsMax: 8 })).status, 400)

  const edited = await t.call('PATCH', `/api/program/exercises/${dips.id}`, { name: 'Ring Dips', sets: 4 })
  const changed = edited.body.exercises.find((e) => e.id === dips.id)
  assert.equal(changed.name, 'Ring Dips')
  assert.equal(changed.sets, 4)
  assert.equal(changed.key, 'weighted-dips', 'key is stable so history stays linked')

  const up = await t.call('POST', `/api/program/exercises/${dips.id}/move`, { direction: 'up' })
  assert.equal(up.body.exercises.at(-2).id, dips.id)

  const removed = await t.call('DELETE', `/api/program/exercises/${dips.id}`)
  assert.equal(removed.body.exercises.length, 7)
  assert.deepEqual(removed.body.exercises.map((e) => e.name).slice(0, 2), ['Bench Press', 'Incline Dumbbell Press'])

  const day = await t.call('PUT', '/api/program/days/7', { type: 'legs', title: 'BONUS LEGS', muscles: 'Legs', focus: 'Extra', note: 'Optional' })
  assert.equal(day.body.type, 'legs')
  assert.equal(day.body.title, 'BONUS LEGS')
  assert.equal((await t.call('PUT', '/api/program/days/7', { type: 'nope', title: 'X' })).status, 400)

  // members see the change
  await loginAs(t, 'mohdiyad26@gmail.com', 'iyad-new-pass')
  assert.equal((await t.call('GET', '/api/program')).body[6].title, 'BONUS LEGS')
  t.close()
})

test('removing an exercise from the program keeps past workout logs intact', async () => {
  const t = await boot()
  await loginAs(t, 'ssultanmaliki47@gmail.com', 'coach-new-pass')
  const bench = (await t.call('GET', '/api/program')).body[0].exercises[0]
  await t.call('PUT', '/api/logs/2026-09-21', {
    day_number: 1, completed: true,
    sets: [{ exercise_key: bench.key, exercise_name: bench.name, set_number: 1, weight_kg: 80, reps: 5, done: true }],
  })
  await t.call('DELETE', `/api/program/exercises/${bench.id}`)
  const logs = await t.call('GET', '/api/logs')
  assert.equal(logs.body[0].set_logs[0].exercise_name, 'Bench Press')
  assert.equal(logs.body[0].set_logs[0].weight_kg, 80)
  t.close()
})
