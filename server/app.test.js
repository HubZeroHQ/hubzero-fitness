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
