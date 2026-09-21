import { execFileSync } from 'node:child_process'
import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page, type PlaywrightWorkerArgs } from '@playwright/test'

export const BASE = 'http://localhost:3100'
export const DB_PATH = 'tests/.e2e-data/e2e.db'

export const COACH = 'ssultanmaliki47@gmail.com'
export const MOD = 'rifaque.rs@gmail.com'
export const RAIF = 'karaniraif@gmail.com'
export const IYAD = 'mohdiyad26@gmail.com'
export const SAL = 'kobatteysalsabeel@gmail.com'

const PW: Record<string, string> = {
  [COACH]: 'Coach-Strong-1',
  [MOD]: 'Rifaque-Strong-1',
  [RAIF]: 'Raif-Strong-1',
  [IYAD]: 'Iyad-Strong-1',
  [SAL]: 'Sal-Strong-1',
}
export const passwordOf = (email: string) => PW[email] ?? 'Extra-Strong-1'

// ---- dates (local, like the app) ----------------------------------------------------------------------------
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return iso(d)
}
export const today = () => iso(new Date())

// ---- accounts -----------------------------------------------------------------------------------------------
const prepared = new Set<string>()

/** Make sure the account exists and has its chosen password, whether or not an earlier test already did the first login. */
export async function ensureAccount(request: APIRequestContext, email: string) {
  if (prepared.has(email)) return
  const first = await request.post('/api/login', { data: { email, password: 'hubzero' } })
  if (first.ok()) {
    const changed = await request.post('/api/change-password', { data: { current: 'hubzero', password: passwordOf(email) } })
    expect(changed.ok()).toBeTruthy()
  }
  prepared.add(email)
}

/** Create a brand-new member in the test database (through the same admin command an operator would use). */
export function createMember(email: string, name: string) {
  execFileSync(process.execPath, ['server/admin.js', 'add-user', email, name, 'member'], { env: { ...process.env, DB_PATH }, stdio: 'ignore' })
}

/** An API session signed in as this person (their own cookie jar). */
export async function apiAs(playwright: PlaywrightWorkerArgs['playwright'], email: string): Promise<APIRequestContext> {
  const ctx = await playwright.request.newContext({ baseURL: BASE })
  await ensureAccount(ctx, email)
  const res = await ctx.post('/api/login', { data: { email, password: passwordOf(email) } })
  expect(res.ok(), `sign in as ${email}`).toBeTruthy()
  return ctx
}

export async function signIn(page: Page, email: string) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(passwordOf(email))
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: /^(⚡ )?Today/i }).first()).toBeVisible()
}

export const PHONE = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } as const

/** A phone-shaped, touch-enabled browser tab for someone, already signed in. */
export async function openPhone(browser: Browser, email: string, size = { width: 390, height: 844 }): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext({ viewport: size, ...PHONE })
  const page = await context.newPage()
  await signIn(page, email)
  return { page, context }
}

/** The phone's bottom tab bar (the second "Main" navigation; the first is the desktop side bar, hidden on phones). */
export const tabBar = (page: Page) => page.getByRole('navigation', { name: 'Main' }).last()
export const tab = (page: Page, name: RegExp | string) => tabBar(page).getByRole('button', { name })

/** Shorthand for a set as the API stores it. */
export const setOf = (key: string, name: string, n: number, weight: number, reps: number, done = true) => ({
  exercise_key: key,
  exercise_name: name,
  set_number: n,
  weight_kg: weight,
  reps,
  done,
})

// ---- fresh members and phone tabs (used by the gym and resilience specs) --------------------------------------
export const PHONE_SIZE = { width: 360, height: 640 }
let memberCounter = 0

/** A brand-new member (empty "today") with an API session, ready for a phone to sign in as. */
export async function newMember(playwright: PlaywrightWorkerArgs['playwright'], tag: string) {
  const email = `gym-${tag}-${++memberCounter}@example.test`
  createMember(email, `Gym ${tag}`)
  const api = await apiAs(playwright, email)
  return { email, api }
}

/** A touch phone tab. It accepts "leave the page?" prompts, which appear while work is still unsaved. */
export async function phoneFor(browser: Browser, size = PHONE_SIZE) {
  const context = await browser.newContext({ viewport: size, ...PHONE })
  const page = await context.newPage()
  page.on('dialog', (d) => d.accept())
  return { context, page }
}

interface StoredLog {
  log_date: string
  completed: boolean
  set_logs: { set_number: number; weight_kg: number | null; reps: number | null; done: boolean; exercise_key: string }[]
}

/** What the server has stored for THIS member (the logs endpoint lists the whole team, by design). */
export async function storedSets(api: APIRequestContext): Promise<StoredLog[]> {
  const me = await (await api.get('/api/me')).json()
  return (await (await api.get(`/api/logs?userId=${me.id}`)).json()) as StoredLog[]
}
