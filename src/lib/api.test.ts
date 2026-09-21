import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, OFFLINE_MESSAGE, SESSION_ENDED, api, isRejected, isUnreachable } from './api'

const reply = (status: number, body: unknown, raw = false) =>
  Promise.resolve(new Response(raw ? String(body) : JSON.stringify(body), { status, headers: { 'Content-Type': raw ? 'text/html' : 'application/json' } }))

let ended: number
beforeEach(() => {
  ended = 0
  const win = new EventTarget()
  win.addEventListener(SESSION_ENDED, () => ended++)
  vi.stubGlobal('window', win)
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requests', () => {
  it('sends JSON with the session cookie only when there is a body', async () => {
    const fetchMock = vi.fn(() => reply(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    await api.deleteMetric(7)
    await api.login('a@b.c', 'pw')
    const [getUrl, getInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(getUrl).toBe('/api/metrics/7')
    expect(getInit.method).toBe('DELETE')
    expect(getInit.headers).toBeUndefined()
    expect(getInit.body).toBeUndefined()
    const [, postInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(postInit.credentials).toBe('same-origin')
    expect(postInit.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(postInit.body as string)).toEqual({ email: 'a@b.c', password: 'pw' })
  })

  it('filters logs and measurements by person with a query string', async () => {
    const fetchMock = vi.fn(() => reply(200, []))
    vi.stubGlobal('fetch', fetchMock)
    await api.logs()
    await api.logs(5)
    await api.metrics(5)
    expect(fetchMock.mock.calls.map((c) => (c as unknown as [string])[0])).toEqual(['/api/logs', '/api/logs?userId=5', '/api/metrics?userId=5'])
  })
})

describe('errors', () => {
  it('turns "no signal" into a clear message with status 0, which is worth retrying', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    const err = await api.me().catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(0)
    expect(err.message).toBe(OFFLINE_MESSAGE)
    expect(isUnreachable(err)).toBe(true)
    expect(isRejected(err)).toBe(false)
  })

  it('uses the server’s own message for a refused request, which is never worth retrying', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(400, { error: 'Bad day' })))
    const err = await api.saveLog('2026-09-21', { day_number: 9, completed: false, duration_min: null, cardio_min: null, notes: null, sets: [] }).catch((e) => e)
    expect(err.status).toBe(400)
    expect(err.message).toBe('Bad day')
    expect(isRejected(err)).toBe(true)
    expect(isUnreachable(err)).toBe(false)
  })

  it.each([500, 502, 503, 429])('treats %i as temporary trouble worth retrying', async (status) => {
    vi.stubGlobal('fetch', vi.fn(() => reply(status, '<html>Bad gateway</html>', true)))
    const err = await api.profiles().catch((e) => e)
    expect(err.status).toBe(status)
    expect(err.message).toBe(`Request failed (${status})`) // a non-JSON error page does not break error handling
    expect(isUnreachable(err)).toBe(true)
    expect(isRejected(err)).toBe(false)
  })

  it('classifies other errors as neither', () => {
    expect(isUnreachable(new Error('x'))).toBe(false)
    expect(isRejected(new Error('x'))).toBe(false)
    expect(isRejected(new ApiError('nope', 401))).toBe(false) // an ended session is handled by signing in again
    expect(isRejected(new ApiError('gone', 404))).toBe(true)
    expect(isRejected(new ApiError('forbidden', 403))).toBe(true)
  })
})

describe('an ended session', () => {
  it('announces itself when a signed-in request gets a 401', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(401, { error: 'Not signed in' })))
    await expect(api.logs()).rejects.toMatchObject({ status: 401 })
    expect(ended).toBe(1)
  })

  it.each([
    ['me', () => api.me()],
    ['login', () => api.login('a@b.c', 'wrong')],
    ['logout', () => api.logout()],
  ])('does not announce it for %s (a 401 there is normal)', async (_name, run) => {
    vi.stubGlobal('fetch', vi.fn(() => reply(401, { error: 'no' })))
    await expect(run()).rejects.toBeInstanceOf(ApiError)
    expect(ended).toBe(0)
  })
})
