import { expect, test, type Page } from '@playwright/test'
import { PHONE_SIZE as SIZE, daysAgo, newMember, passwordOf, phoneFor, setOf, signIn, storedSets, tab } from './helpers'

// How the workout screen behaves in a real gym: thumbs, a screen that locks, no signal, a tab left open overnight.
// Each test uses a brand-new member (created with the admin command) so its "today" starts empty.
test.describe.configure({ mode: 'serial' })

/** Replace the browser's screen wake lock with a counter, so the test can see it being requested and released. */
async function mockWakeLock(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __wake: { requests: number; releases: number } }
    w.__wake = { requests: 0, releases: 0 }
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          w.__wake.requests++
          return { release: async () => void w.__wake.releases++, addEventListener() {}, removeEventListener() {} }
        },
      },
    })
  })
}
const wake = (page: Page) => page.evaluate(() => (window as unknown as { __wake: { requests: number; releases: number } }).__wake)

const weightBox = (page: Page, n = 1) => page.getByLabel(`Set ${n} weight in kg`).first()
const repsBox = (page: Page, n = 1) => page.getByLabel(`Set ${n} reps`).first()
const tick = (page: Page, n = 1) => page.getByLabel(`Set ${n} done`).first()
const openDay = (page: Page, n: number) => page.getByRole('button', { name: String(n), exact: true }).tap()

test('the progress bar stays on screen while scrolling, and a whole workout can be logged with taps', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'flow')
  const { page, context } = await phoneFor(browser)
  await mockWakeLock(page)
  await signIn(page, email)
  await openDay(page, 1)
  await expect(page.getByText('0 / 19 sets done')).toBeVisible()

  // the screen is kept awake while a workout is open
  await expect.poll(async () => (await wake(page)).requests).toBeGreaterThan(0)

  // scroll far down: the bar with progress and save status is still pinned to the top of the screen
  await page.evaluate(() => window.scrollTo(0, 1400))
  const bar = page.locator('div.sticky').first()
  await expect(bar).toContainText('sets done')
  expect((await bar.boundingBox())!.y).toBeLessThanOrEqual(1)
  await page.evaluate(() => window.scrollTo(0, 0))

  await weightBox(page).fill('62.5')
  await repsBox(page).fill('9')
  await tick(page).tap()
  await expect(page.getByText('1 / 19 sets done')).toBeVisible()
  await expect(page.getByText('✓ Saved')).toBeVisible()

  await page.getByRole('button', { name: 'Finish workout' }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Finish workout' }).tap()
  await expect(page.getByText('✓ Workout complete')).toBeVisible()

  // finished: the wake lock is released so the phone can sleep again
  await expect.poll(async () => (await wake(page)).releases).toBeGreaterThan(0)

  const [log] = await storedSets(api)
  expect(log.completed).toBe(true)
  expect(log.set_logs).toEqual([expect.objectContaining({ set_number: 1, weight_kg: 62.5, reps: 9, done: true, exercise_key: 'bench-press' })])
  await context.close()
})

test('"Same as last time" copies the previous session and never overwrites what was typed', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'same')
  await api.put(`/api/logs/${daysAgo(3)}`, {
    data: { day_number: 1, completed: true, sets: [setOf('bench-press', 'Bench Press', 1, 60, 8), setOf('bench-press', 'Bench Press', 2, 60, 8), setOf('bench-press', 'Bench Press', 3, 57.5, 9)] },
  })
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay(page, 1)

  await expect(page.getByText(/Last time \(/).first()).toContainText('60×8 · 60×8 · 57.5×9')
  // placeholders show last time's numbers per set
  await expect(weightBox(page, 3)).toHaveAttribute('placeholder', '57.5')

  await weightBox(page, 1).fill('99') // typed by hand: must survive
  await page.getByRole('button', { name: 'Same as last time' }).first().tap()
  await expect(weightBox(page, 1)).toHaveValue('99')
  await expect(repsBox(page, 1)).toHaveValue('')
  await expect(weightBox(page, 2)).toHaveValue('60')
  await expect(repsBox(page, 2)).toHaveValue('8')
  await expect(weightBox(page, 3)).toHaveValue('57.5')
  await expect(repsBox(page, 3)).toHaveValue('9')
  // copying does not tick anything: the person still confirms each set themselves
  for (const n of [1, 2, 3]) await expect(tick(page, n)).not.toBeChecked()
  await expect(page.getByText('0 / 19 sets done')).toBeVisible()
  await context.close()
})

test('"+2.5 kg" starts the next session a little heavier than the last', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'plus')
  await api.put(`/api/logs/${daysAgo(2)}`, {
    data: { day_number: 1, completed: true, sets: [setOf('bench-press', 'Bench Press', 1, 60, 8), setOf('bench-press', 'Bench Press', 2, 60, 8), setOf('bench-press', 'Bench Press', 3, 57.5, 9)] },
  })
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay(page, 1)
  await page.getByRole('button', { name: '+2.5 kg' }).first().tap()
  await expect(weightBox(page, 1)).toHaveValue('62.5')
  await expect(weightBox(page, 2)).toHaveValue('62.5')
  await expect(weightBox(page, 3)).toHaveValue('60')
  await expect(repsBox(page, 3)).toHaveValue('9')
  // exercises with no history have no copy buttons
  await expect(page.getByRole('button', { name: 'Same as last time' })).toHaveCount(1)
  await context.close()
})

test('with no signal the sets are kept, and they are sent as soon as the phone is back online', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'offline')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay(page, 1)

  await context.setOffline(true)
  await weightBox(page).fill('50')
  await repsBox(page).fill('10')
  await tick(page).tap()
  await expect(page.getByText(/Not saved yet/)).toBeVisible()
  await expect(weightBox(page)).toHaveValue('50') // nothing is lost from the screen
  expect(await storedSets(api)).toEqual([]) // and the server really has nothing yet

  await context.setOffline(false)
  await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 20_000 })
  const [log] = await storedSets(api)
  expect(log.set_logs).toEqual([expect.objectContaining({ weight_kg: 50, reps: 10, done: true })])
  await context.close()
})

test('unsent work survives closing or reloading the page and is sent when the connection returns', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'draft')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay(page, 1)

  // the server is unreachable for saves only
  await page.route('**/api/logs/*', (route) => (route.request().method() === 'PUT' ? route.abort() : route.continue()))
  await weightBox(page).fill('55')
  await repsBox(page).fill('8')
  await tick(page).tap()
  await expect(page.getByText(/Not saved yet/)).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('hz-draft')).length)).toBe(1)

  await page.reload() // as if the phone killed the tab
  await expect(weightBox(page)).toHaveValue('55') // restored from the phone's own copy
  await expect(repsBox(page)).toHaveValue('8')
  await expect(tick(page)).toBeChecked()
  expect(await storedSets(api)).toEqual([])

  await page.unroute('**/api/logs/*')
  await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 30_000 })
  const [log] = await storedSets(api)
  expect(log.set_logs[0]).toMatchObject({ weight_kg: 55, reps: 8, done: true })
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('hz-draft')).length)).toBe(0) // cleaned up once safe
  await context.close()
})

test('switching tab right after typing does not lose the last entry', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'tab')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay(page, 1)
  await weightBox(page).fill('72')
  await tab(page, /Progress/).tap() // well inside the 0.7 s autosave delay
  await expect(page.getByRole('heading', { name: 'My Progress' })).toBeVisible()
  await expect
    .poll(async () => (await storedSets(api)).flatMap((l) => l.set_logs).map((s) => s.weight_kg), { timeout: 10_000 })
    .toContain(72)
  await context.close()
})

test('tapping Finish quickly after the last tick cannot be undone by a late autosave', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'race')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay(page, 1)

  // a slow connection: every save takes 1.2 s to reach the server
  await page.route('**/api/logs/*', async (route) => {
    if (route.request().method() === 'PUT') await new Promise((r) => setTimeout(r, 1200))
    await route.continue()
  })
  await weightBox(page).fill('60')
  await repsBox(page).fill('8')
  await tick(page).tap()
  await page.getByRole('button', { name: 'Finish workout' }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Finish workout' }).tap() // immediately, before the autosave fired

  await expect(page.getByText('✓ Workout complete')).toBeVisible()
  await page.waitForTimeout(4000) // long enough for any stray autosave to have landed
  const [log] = await storedSets(api)
  expect(log.completed, 'the workout must stay finished').toBe(true)
  expect(log.set_logs[0]).toMatchObject({ weight_kg: 60, reps: 8, done: true })
  await context.close()
})

test('two saves are never in flight at once, so an older state cannot overwrite a newer one', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'order')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay(page, 1)

  let active = 0
  let maxActive = 0
  const bodies: number[] = []
  await page.route('**/api/logs/*', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue()
    active++
    maxActive = Math.max(maxActive, active)
    bodies.push(route.request().postDataJSON().sets.length)
    await new Promise((r) => setTimeout(r, 900))
    const response = await route.fetch()
    active--
    await route.fulfill({ response })
  })

  // keep changing things while earlier saves are still travelling
  for (const [i, kg] of ['50', '52', '54', '56', '58'].entries()) {
    await page.getByLabel(/^Set \d weight in kg$/).nth(i).fill(kg) // the first five weight boxes on the screen
    await page.waitForTimeout(800)
  }
  await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 20_000 })
  expect(maxActive, 'saves overlapped').toBe(1)
  const [log] = await storedSets(api)
  expect(log.set_logs.map((s) => s.weight_kg).sort()).toEqual([50, 52, 54, 56, 58]) // the newest state won
  expect(bodies.at(-1)).toBe(5)
  await context.close()
})

test('a phone left open past midnight starts the new day instead of logging into yesterday', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'midnight')
  const { page, context } = await phoneFor(browser)
  await context.clock.install({ time: new Date(2026, 8, 21, 23, 58, 0) })
  await signIn(page, email)
  await openDay(page, 1)
  await expect(page.getByText(/21 September 2026/)).toBeVisible()

  await weightBox(page).fill('45')
  await repsBox(page).fill('10')
  await tick(page).tap()
  await page.clock.runFor(2000) // let the autosave timer fire
  await expect(page.getByText('✓ Saved')).toBeVisible()

  await page.clock.fastForward('03:00') // three minutes later it is 00:01 on the 22nd
  await expect(page.getByText(/22 September 2026/)).toBeVisible()
  await expect(page.getByText(/^0 \/ \d+ sets done$/)).toBeVisible() // a clean sheet (and the new weekday's own workout)
  expect((await storedSets(api)).map((l) => l.log_date)).toEqual(['2026-09-21']) // yesterday's log untouched, none invented

  await openDay(page, 1)
  await weightBox(page).fill('46')
  await tick(page).tap()
  await page.clock.runFor(2000)
  await expect(page.getByText('✓ Saved')).toBeVisible()
  const logs = await storedSets(api)
  expect(logs.map((l) => l.log_date).sort()).toEqual(['2026-09-21', '2026-09-22'])
  expect(logs.find((l) => l.log_date === '2026-09-21')!.set_logs[0].weight_kg).toBe(45)
  expect(logs.find((l) => l.log_date === '2026-09-22')!.set_logs[0].weight_kg).toBe(46)
  await context.close()
})

test('when the session ends, the sign-in screen explains it and unsent sets come back after signing in', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'expire')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay(page, 1)
  await weightBox(page, 1).fill('40')
  await repsBox(page, 1).fill('10')
  await tick(page, 1).tap()
  await expect(page.getByText('✓ Saved')).toBeVisible()

  await context.clearCookies() // the server no longer knows this phone
  await weightBox(page, 2).fill('41')
  await repsBox(page, 2).fill('9')
  await tick(page, 2).tap()
  await expect(page.getByText(/You were signed out/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(passwordOf(email))
  await page.getByRole('button', { name: 'Sign in' }).tap()
  await expect(weightBox(page, 1)).toHaveValue('40')
  await expect(weightBox(page, 2)).toHaveValue('41') // the unsent set is back
  await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 20_000 })
  const [log] = await storedSets(api)
  expect(log.set_logs.map((s) => s.weight_kg).sort()).toEqual([40, 41])
  await context.close()
})

test('browsing through the days does not create empty workouts', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'browse')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  for (const n of [1, 2, 3, 4, 5, 6, 7, 1]) {
    await openDay(page, n)
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(1500) // longer than the autosave delay
  expect(await storedSets(api)).toEqual([])
  await context.close()
})

test('number fields bring up the right phone keyboard', async ({ browser, playwright }) => {
  const { email } = await newMember(playwright, 'keys')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay(page, 1)
  await expect(weightBox(page)).toHaveAttribute('inputmode', 'decimal')
  await expect(repsBox(page)).toHaveAttribute('inputmode', 'numeric')
  await expect(page.getByPlaceholder('Cardio (min)')).toHaveAttribute('inputmode', 'numeric')
  await context.close()
})
