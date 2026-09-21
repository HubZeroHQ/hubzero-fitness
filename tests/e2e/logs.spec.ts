import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// The moderator's activity log. Self-sufficient: accounts are prepared through the API, so it also passes on its own.
test.describe.configure({ mode: 'serial' })

const COACH = 'ssultanmaliki47@gmail.com'
const MOD = 'rifaque.rs@gmail.com'
const RAIF = 'karaniraif@gmail.com'
const PW: Record<string, string> = { [COACH]: 'Coach-Strong-1', [MOD]: 'Rifaque-Strong-1', [RAIF]: 'Raif-Strong-1' }
const BASE = 'http://localhost:3100'

const prepared = new Set<string>()
async function ensureAccount(request: APIRequestContext, email: string) {
  if (prepared.has(email)) return
  const first = await request.post('/api/login', { data: { email, password: 'hubzero' } })
  if (first.ok()) {
    const changed = await request.post('/api/change-password', { data: { current: 'hubzero', password: PW[email] } })
    expect(changed.ok()).toBeTruthy()
  }
  prepared.add(email)
}

async function signIn(page: Page, email: string) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PW[email])
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: /^(⚡ )?Today/i }).first()).toBeVisible()
}

const openLog = async (page: Page) => {
  await page.getByRole('button', { name: 'Activity Log' }).click()
  await expect(page.getByRole('heading', { name: 'Activity Log' })).toBeVisible()
}
const entries = (page: Page) => page.getByRole('list', { name: 'Activity log' }).getByRole('listitem')

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL: BASE })
  for (const email of [COACH, MOD, RAIF]) await ensureAccount(request, email)
  await request.dispose()
})

test('the moderator sees the Activity Log, with their own sign-in at the top', async ({ page }) => {
  await signIn(page, MOD)
  await openLog(page)
  const first = entries(page).first()
  await expect(first).toContainText('Rifaque Ahmed Akrami')
  await expect(first).toContainText('Signed in')
  await expect(first).toContainText(MOD)
  // the coach's tools are not shared with the moderator
  await expect(page.getByRole('button', { name: 'Coach Panel' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit Program' })).toHaveCount(0)
})

test('the coach can read it too, but members cannot', async ({ page, browser }) => {
  await signIn(page, COACH)
  await expect(page.getByRole('button', { name: 'Activity Log' })).toBeVisible()

  const member = await (await browser.newContext()).newPage()
  await signIn(member, RAIF)
  await expect(member.getByRole('button', { name: 'Activity Log' })).toHaveCount(0)
  expect((await member.request.get('/api/audit')).status()).toBe(403)
})

test('a failed sign-in shows up with the email tried, and the wrong password is never shown', async ({ page, request }) => {
  const wrong = 'not-the-password-XYZ-987'
  const bad = await request.post('/api/login', { data: { email: RAIF, password: wrong } })
  expect(bad.status()).toBe(401)

  await signIn(page, MOD)
  await openLog(page)
  const failed = entries(page).filter({ hasText: 'Failed sign-in' }).first()
  await expect(failed).toContainText('Not signed in')
  await expect(failed).toContainText(RAIF)
  await expect(failed).toContainText('wrong password')
  expect(await page.locator('body').innerText()).not.toContain(wrong)
})

test("the coach's program changes are logged with who they were for", async ({ page, playwright }) => {
  const coach = await playwright.request.newContext({ baseURL: BASE })
  await coach.post('/api/login', { data: { email: COACH, password: PW[COACH] } })
  const added = await coach.post('/api/program/days/4/exercises', { data: { owner: 0, name: 'E2E Logged Move', sets: 3, repsMin: 8, repsMax: 12 } })
  expect(added.ok()).toBeTruthy()
  await coach.dispose()

  await signIn(page, MOD)
  await openLog(page)
  await page.getByRole('button', { name: 'Program changes' }).click()
  await expect(page.getByRole('button', { name: 'Program changes' })).toHaveAttribute('aria-pressed', 'true')
  const row = entries(page).first()
  await expect(row).toContainText('Syed Mohammed Sultan')
  await expect(row).toContainText('Added an exercise')
  await expect(row).toContainText('Day 4 · team default')
  await expect(row).toContainText('E2E Logged Move 3×8–12')
  // filtering hides everything that is not a program change
  await expect(entries(page).filter({ hasText: 'Signed in' })).toHaveCount(0)
})

test('the category filter and refresh work, and finishing a workout is listed', async ({ page, playwright }) => {
  const raif = await playwright.request.newContext({ baseURL: BASE })
  await raif.post('/api/login', { data: { email: RAIF, password: PW[RAIF] } })
  await raif.put('/api/logs/2026-02-02', { data: { day_number: 1, completed: true, sets: [{ exercise_key: 'bench-press', exercise_name: 'Bench Press', set_number: 1, weight_kg: 60, reps: 8, done: true }] } })
  await raif.dispose()

  await signIn(page, MOD)
  await openLog(page)
  await page.getByRole('button', { name: 'Workouts', exact: true }).click()
  const row = entries(page).first()
  await expect(row).toContainText('Raif Karani')
  await expect(row).toContainText('Finished a workout')
  await expect(row).toContainText('2026-02-02')

  await page.getByRole('button', { name: 'Sign-ins & passwords' }).click()
  await expect(entries(page).filter({ hasText: 'Finished a workout' })).toHaveCount(0)
  await expect(entries(page).first()).toBeVisible()

  // new activity appears after Refresh
  const before = await entries(page).count()
  await (await playwright.request.newContext({ baseURL: BASE })).post('/api/login', { data: { email: 'someone@nowhere.test', password: 'x' } })
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(entries(page).first()).toContainText('someone@nowhere.test')
  expect(await entries(page).count()).toBeGreaterThanOrEqual(Math.min(before + 1, 50))
})

test('long logs load in pages', async ({ page, request }) => {
  // 55 failed sign-ins from different emails (so none of them hits the lockout)
  for (let i = 0; i < 55; i++) await request.post('/api/login', { data: { email: `bulk${i}@nowhere.test`, password: 'x' } })

  await signIn(page, MOD)
  await openLog(page)
  await expect(entries(page)).toHaveCount(50)
  await page.getByRole('button', { name: 'Load more' }).click()
  await expect.poll(() => entries(page).count()).toBeGreaterThan(50)
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the moderator’s five tabs fit and the log does not scroll sideways', async ({ page }) => {
    await signIn(page, MOD)
    const bottom = page.locator('nav').last()
    await expect(bottom.getByRole('button')).toHaveCount(5)
    await bottom.getByRole('button', { name: /Activity Log/i }).click()
    await expect(page.getByRole('heading', { name: 'Activity Log' })).toBeVisible()
    await expect(entries(page).first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })
})
