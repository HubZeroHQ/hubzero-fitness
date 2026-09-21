import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb } from './db.js'
import { createApp } from './app.js'

function boot(opts = {}) {
  const db = openDb(':memory:')
  const server = createApp(db, opts).listen(0)
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
        const text = await res.text()
        let json = {}
        try {
          json = JSON.parse(text)
        } catch {}
        return { status: res.status, body: json, text, headers: res.headers }
      },
      async ready(email, password) {
        await this.call('POST', '/api/login', { email, password: 'hubzero' })
        await this.call('POST', '/api/change-password', { current: 'hubzero', password })
        return this
      },
    }
  }
  return { client, db, base, close: () => server.close() }
}

test('every response carries the security headers, and API responses are never cached', async () => {
  const s = boot()
  const c = s.client()
  for (const path of ['/api/me', '/api/nope', '/api/login']) {
    const res = await c.call(path === '/api/login' ? 'POST' : 'GET', path, {})
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path)
    assert.equal(res.headers.get('x-frame-options'), 'DENY', path)
    assert.equal(res.headers.get('referrer-policy'), 'same-origin', path)
    assert.equal(res.headers.get('cache-control'), 'no-store', path)
    assert.match(res.headers.get('permissions-policy'), /camera=\(\)/, path)
  }
  const csp = (await c.call('GET', '/api/me')).headers.get('content-security-policy')
  assert.match(csp, /default-src 'self'/)
  assert.match(csp, /frame-ancestors 'none'/)
  assert.match(csp, /object-src 'none'/)
  assert.doesNotMatch(csp, /https?:\/\//, 'no third-party origins are allowed')
  s.close()
})

test('the built site is served with sensible caching and a single-page fallback', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hz-static-'))
  try {
    mkdirSync(join(dir, 'assets'))
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Hub</title><div id="root"></div>')
    writeFileSync(join(dir, 'assets', 'index-AbCdEf12.js'), 'console.log(1)')
    writeFileSync(join(dir, 'assets', 'hubzero-logo.jpeg'), 'not really a jpeg')
    const s = boot({ staticDir: dir })
    const c = s.client()

    const index = await c.call('GET', '/')
    assert.equal(index.status, 200)
    assert.equal(index.headers.get('cache-control'), 'no-cache', 'a new release is picked up straight away')
    assert.match(index.headers.get('content-security-policy'), /default-src 'self'/, 'the page itself is covered by the CSP')

    const hashed = await c.call('GET', '/assets/index-AbCdEf12.js')
    assert.equal(hashed.headers.get('cache-control'), 'public, max-age=31536000, immutable')
    const logo = await c.call('GET', '/assets/hubzero-logo.jpeg')
    assert.equal(logo.headers.get('cache-control'), 'public, max-age=86400', 'un-fingerprinted files are only cached for a day')

    const deep = await c.call('GET', '/progress/some/deep/link')
    assert.equal(deep.status, 200)
    assert.match(deep.text, /id="root"/, 'client-side routes fall back to the app')
    assert.equal(deep.headers.get('cache-control'), 'no-cache')

    const api = await c.call('GET', '/api/does-not-exist')
    assert.notEqual(api.status, 200, 'unknown API paths never return the app shell')
    assert.doesNotMatch(api.text, /id="root"/)
    s.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('typos in a workout are dropped instead of failing or corrupting the save', async () => {
  const s = boot()
  const c = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  const set = (n, weight_kg, reps) => ({ exercise_key: 'bench-press', exercise_name: 'Bench Press', set_number: n, weight_kg, reps, done: true })
  const res = await c.call('PUT', '/api/logs/2026-09-21', {
    day_number: 1,
    completed: false,
    duration_min: 99999,
    cardio_min: -5,
    sets: [set(1, 5000, 8), set(2, -20, 8), set(3, 60, 999999), set(4, 'abc', 'xyz'), set(5, 62.5, 9)],
  })
  assert.equal(res.status, 200)
  const byNumber = Object.fromEntries(res.body.set_logs.map((x) => [x.set_number, x]))
  assert.equal(byNumber[1].weight_kg, null, '5000 kg is a typo')
  assert.equal(byNumber[1].reps, 8, 'the rest of the set is kept')
  assert.equal(byNumber[2].weight_kg, null, 'negative weight')
  assert.equal(byNumber[3].reps, null, 'absurd reps')
  assert.equal(byNumber[4].weight_kg, null)
  assert.equal(byNumber[5].weight_kg, 62.5, 'a sensible set is untouched')
  assert.equal(res.body.duration_min, null)
  assert.equal(res.body.cardio_min, null)
  s.close()
})

test('weigh-in values are range-checked', async () => {
  const s = boot()
  const c = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  const put = (extra) => c.call('PUT', '/api/metrics', { measured_on: '2026-09-21', weight_kg: 80, ...extra })
  assert.equal((await put({ body_fat_pct: 0 })).status, 400)
  assert.equal((await put({ body_fat_pct: 80 })).status, 400)
  assert.equal((await put({ waist_cm: 10 })).status, 400)
  assert.equal((await put({ waist_cm: 400 })).status, 400)
  assert.equal((await put({ weight_kg: 0 })).status, 400)
  assert.equal((await put({ body_fat_pct: 15.5, waist_cm: 84 })).status, 200)
  assert.equal((await put({ body_fat_pct: '', waist_cm: '' })).status, 200, 'the optional fields can be left empty')
  const [m] = (await c.call('GET', '/api/metrics')).body
  assert.equal(m.body_fat_pct, null)
  s.close()
})

test('profile values are range-checked', async () => {
  const s = boot()
  const c = await s.client().ready('karaniraif@gmail.com', 'raif-new-pass')
  const patch = (extra) => c.call('PATCH', '/api/me', { height_cm: 175, ...extra })
  assert.equal((await patch({ height_cm: 300 })).status, 400)
  assert.equal((await patch({ height_cm: 20 })).status, 400)
  assert.equal((await patch({ goal_weight_kg: 5 })).status, 400)
  assert.equal((await patch({ goal_weight_kg: 900 })).status, 400)
  assert.equal((await patch({ birth_date: '1850-01-01' })).status, 400)
  assert.equal((await patch({ birth_date: '2999-01-01' })).status, 400)
  const ok = await patch({ birth_date: '2000-02-29', goal_weight_kg: 75, sex: 'male' })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.height_cm, 175)
  assert.equal((await c.call('GET', '/api/me')).body.height_cm, 175, 'a rejected update changed nothing')
  s.close()
})

test('a flood of failed sign-ins from many emails does not break the server', async () => {
  const s = boot()
  const c = s.client()
  for (let i = 0; i < 520; i++) assert.equal((await c.call('POST', '/api/login', { email: `flood${i}@nowhere.test`, password: 'x' })).status, 401)
  assert.equal((await c.call('POST', '/api/login', { email: 'karaniraif@gmail.com', password: 'hubzero' })).status, 200, 'real users can still sign in')
  s.close()
})
