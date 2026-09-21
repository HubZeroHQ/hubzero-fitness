import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'

// Runs after app.spec.ts on the same throwaway database, but does not depend on it: every account it needs
// is prepared through the API first (see ensureAccount).
test.describe.configure({ mode: 'serial' })

const COACH = 'ssultanmaliki47@gmail.com'
const RAIF = 'karaniraif@gmail.com'
const IYAD = 'mohdiyad26@gmail.com'
const SAL = 'kobatteysalsabeel@gmail.com'
const PW = { [COACH]: 'Coach-Strong-1', [RAIF]: 'Raif-Strong-1', [IYAD]: 'Iyad-Strong-1', [SAL]: 'Sal-Strong-1' } as Record<string, string>

const prepared = new Set<string>()
/** Make sure the account exists with its chosen password, whether or not an earlier spec already did the first login. */
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
  // "Today's Workout" in the desktop sidebar, "Today" in the phone's bottom bar
  await expect(page.getByRole('button', { name: /^(⚡ )?Today/i }).first()).toBeVisible()
}

/** A fresh signed-in browser tab for someone (their own cookies). */
async function openAs(browser: Browser, email: string) {
  const page = await (await browser.newContext()).newPage()
  await signIn(page, email)
  return page
}

const dayTab = (page: Page, n: number) => page.getByRole('button', { name: new RegExp(`^Day ${n}\\b`) })
const scopeChip = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) })
const goToEditor = async (page: Page) => page.getByRole('button', { name: 'Edit Program' }).click()

async function addExercise(page: Page, name: string) {
  await page.getByPlaceholder('Exercise name').fill(name)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  // the new exercise's own row (the "Add" box below keeps the typed text for a moment, so match on the row's label)
  await expect(page.locator(`input[aria-label="Exercise name"][value="${name}"]`)).toBeVisible()
}

/** The exercise names on one day of a member's own program (what they would train on). */
async function exercisesFor(browser: Browser, email: string, day: number): Promise<string[]> {
  const page = await openAs(browser, email)
  const program = await (await page.request.get('/api/program')).json()
  await page.context().close()
  return program.find((d: { day: number }) => d.day === day).exercises.map((e: { name: string }) => e.name)
}

/** What a member sees for one day on their Today page (only for people with no workout logged today). */
async function seeDay(browser: Browser, email: string, day: number) {
  const page = await openAs(browser, email)
  await page.getByRole('button', { name: String(day), exact: true }).click()
  return page
}

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL: 'http://localhost:3100' })
  for (const email of [COACH, RAIF, IYAD, SAL]) await ensureAccount(request, email)
  await request.dispose()
})

test.describe('coach panel', () => {
  test('shows every member with their status and flags people who have not trained', async ({ page }) => {
    await signIn(page, COACH)
    await page.getByRole('button', { name: 'Coach Panel' }).click()
    await expect(page.getByRole('heading', { name: 'Coach Panel' })).toBeVisible()
    for (const name of ['Syed Mohammed Sultan', 'Rifaque Ahmed Akrami', 'Raif Karani', 'Mohammed Iyad', 'Salsabeel Kobattey']) {
      await expect(page.locator('main').getByText(name, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByText('Trained today', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Workouts this week')).toBeVisible()
    await expect(page.getByText('Need a nudge')).toBeVisible()
    // Rifaque never trains in these tests, so the coach is told
    await expect(page.getByText(/Rifaque has not trained yet/)).toBeVisible()
    // controls on each member; the coach cannot reset their own password from here
    await expect(page.getByRole('button', { name: 'Reset password' })).toHaveCount(4)
    await expect(page.getByRole('button', { name: 'Edit their program' })).toHaveCount(5)
  })

  test('members do not get the coach panel or its API', async ({ page }) => {
    await signIn(page, RAIF)
    await expect(page.getByRole('button', { name: 'Coach Panel' })).toHaveCount(0)
    expect((await page.request.post('/api/program/apply', { data: { from: 0, days: [1], everyone: true } })).status()).toBe(403)
    expect((await page.request.get('/api/program/scope/0')).status()).toBe(403)
    expect((await page.request.post('/api/users/1/reset-password')).status()).toBe(403)
  })
})

test.describe('personal programs', () => {
  test('the coach gives one person their own day; nobody else is affected', async ({ page, browser }) => {
    await signIn(page, COACH)
    await goToEditor(page)
    await scopeChip(page, 'Mohammed').click()
    await expect(scopeChip(page, 'Mohammed')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText("You're editing Mohammed's program")).toBeVisible()

    await dayTab(page, 2).click()
    // an inherited day is read-only until customised: there is nothing to type into yet
    await expect(page.getByText('Mohammed follows the team program for this day.')).toBeVisible()
    await expect(page.getByPlaceholder('Exercise name')).toHaveCount(0)

    await page.getByRole('button', { name: 'Customise Day 2 for Mohammed' }).click()
    await expect(page.getByRole('status')).toContainText('Mohammed now has their own Day 2')
    await addExercise(page, 'E2E Iyad Only')
    await expect(scopeChip(page, 'Mohammed')).toContainText('1 custom')

    const iyad = await seeDay(browser, IYAD, 2)
    await expect(iyad.getByText('E2E Iyad Only')).toBeVisible()
    const raifDay = await exercisesFor(browser, RAIF, 2)
    expect(raifDay).toContain('Lat Pulldown / Pull-ups')
    expect(raifDay).not.toContain('E2E Iyad Only')
  })

  test('changing the team default reaches everyone except people with their own version', async ({ page, browser }) => {
    await signIn(page, COACH)
    await goToEditor(page)
    await expect(scopeChip(page, 'Everyone')).toHaveAttribute('aria-pressed', 'true')
    await dayTab(page, 2).click()
    await expect(page.getByText(/Day 2 has its own version for: Mohammed/)).toBeVisible()
    await addExercise(page, 'E2E Team Wide')

    expect(await exercisesFor(browser, RAIF, 2)).toContain('E2E Team Wide')
    const iyad = await exercisesFor(browser, IYAD, 2)
    expect(iyad).toContain('E2E Iyad Only')
    expect(iyad).not.toContain('E2E Team Wide')
  })

  test('apply a day to one chosen person', async ({ page, browser }) => {
    await signIn(page, COACH)
    await goToEditor(page)
    await scopeChip(page, 'Mohammed').click()
    await dayTab(page, 2).click()
    // Mohammed is the source, so he is not offered as a target
    await expect(page.getByRole('checkbox', { name: 'Mohammed' })).toHaveCount(0)
    await page.getByRole('checkbox', { name: 'Salsabeel' }).check()
    page.once('dialog', (d) => {
      expect(d.message()).toContain('Day 2')
      expect(d.message()).toContain('Salsabeel')
      return d.accept()
    })
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Applied Day 2 to Salsabeel')

    expect(await exercisesFor(browser, SAL, 2)).toContain('E2E Iyad Only')
    expect(await exercisesFor(browser, RAIF, 2)).not.toContain('E2E Iyad Only')
  })

  test('apply the whole program from one person to another', async ({ page }) => {
    await signIn(page, COACH)
    await goToEditor(page)
    await scopeChip(page, 'Mohammed').click()
    await page.getByRole('radio', { name: /Whole program/ }).check()
    await page.getByRole('checkbox', { name: 'Raif', exact: true }).check()
    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('whole program')
    await scopeChip(page, 'Raif').click()
    await expect(scopeChip(page, 'Raif')).toContainText('7 custom')
  })

  test('apply to everyone at once makes it the team default and clears personal versions', async ({ page, browser }) => {
    await signIn(page, COACH)
    await goToEditor(page)
    await dayTab(page, 2).click()
    await page.getByRole('checkbox', { name: /Everyone at once/ }).check()
    // the individual boxes are switched off while "everyone" is on
    await expect(page.getByRole('checkbox', { name: 'Salsabeel' })).toBeDisabled()
    page.once('dialog', (d) => {
      expect(d.message()).toContain('everyone at once')
      return d.accept()
    })
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('everyone at once')
    await expect(page.getByText(/Day 2 has its own version for/)).toHaveCount(0)

    for (const email of [IYAD, SAL, RAIF]) {
      const names = await exercisesFor(browser, email, 2)
      expect(names, email).toContain('E2E Team Wide')
      expect(names, email).not.toContain('E2E Iyad Only')
    }
  })

  test('resetting one person sends them back to the team version', async ({ page, browser }) => {
    await signIn(page, COACH)
    await goToEditor(page)
    await scopeChip(page, 'Salsabeel').click()
    await dayTab(page, 3).click()
    await page.getByRole('button', { name: 'Customise Day 3 for Salsabeel' }).click()
    await page.getByLabel('Title').fill('SAL LEGS')
    await page.getByRole('button', { name: 'Save day' }).click()
    await expect(scopeChip(page, 'Salsabeel')).toContainText('1 custom')
    const sal = await seeDay(browser, SAL, 3)
    await expect(sal.getByRole('heading', { name: /SAL LEGS/ })).toBeVisible()

    page.once('dialog', (d) => d.accept())
    await page.getByRole('button', { name: /Reset Salsabeel to the team version of Day 3/ }).click()
    await expect(page.getByRole('status')).toContainText("follows the team's Day 3 again")
    await expect(scopeChip(page, 'Salsabeel')).not.toContainText('custom')
    await sal.reload()
    await sal.getByRole('button', { name: '3', exact: true }).click()
    await expect(sal.getByRole('heading', { name: /SAL LEGS/ })).toHaveCount(0)
  })

  test("the coach panel's shortcut opens that person's program", async ({ page }) => {
    await signIn(page, COACH)
    await page.getByRole('button', { name: 'Coach Panel' }).click()
    const raifCard = page.locator('main div.rounded-xl').filter({ hasText: 'Raif Karani' }).filter({ has: page.getByRole('button', { name: 'Edit their program' }) }).last()
    await raifCard.getByRole('button', { name: 'Edit their program' }).click()
    await expect(page.getByRole('heading', { name: 'Edit Program' })).toBeVisible()
    await expect(scopeChip(page, 'Raif')).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('coach oversight and control', () => {
  const OLD = '2026-01-05'

  test.beforeAll(async ({ playwright }) => {
    // Raif has an old workout on record (made through the API so this spec does not depend on app.spec)
    const raif = await playwright.request.newContext({ baseURL: 'http://localhost:3100' })
    await raif.post('/api/login', { data: { email: RAIF, password: PW[RAIF] } })
    const saved = await raif.put(`/api/logs/${OLD}`, {
      data: {
        day_number: 1,
        completed: true,
        sets: [
          { exercise_key: 'bench-press', exercise_name: 'Bench Press', set_number: 1, weight_kg: 70, reps: 5, done: true },
          { exercise_key: 'bench-press', exercise_name: 'Bench Press', set_number: 2, weight_kg: 65, reps: 6, done: true },
        ],
      },
    })
    expect(saved.ok()).toBeTruthy()
    await raif.dispose()
  })

  test('every set of a past workout can be opened, by the member and by the coach', async ({ page, browser }) => {
    const raif = await openAs(browser, RAIF)
    await raif.getByRole('button', { name: 'My Progress' }).first().click()
    const row = raif.getByRole('button', { name: /5 Jan/ })
    await row.click()
    await expect(raif.getByText(/70×5 · 65×6/)).toBeVisible()
    await expect(raif.getByRole('button', { name: 'Delete this workout' })).toHaveCount(0) // members cannot delete

    await signIn(page, COACH)
    await page.getByRole('button', { name: 'Coach Panel' }).click()
    const card = page.locator('main div.rounded-xl').filter({ hasText: 'Raif Karani' }).filter({ has: page.getByRole('button', { name: 'View full progress' }) }).last()
    await card.getByRole('button', { name: 'View full progress' }).click()
    await expect(page.getByRole('heading', { name: "Raif's Progress" })).toBeVisible()
    await page.getByRole('button', { name: /5 Jan/ }).click()
    await expect(page.getByText(/70×5 · 65×6/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete this workout' })).toBeVisible()
  })

  test('the coach can delete a member’s workout from the activity feed', async ({ page }) => {
    await signIn(page, COACH)
    await page.getByRole('button', { name: 'Coach Panel' }).click()
    const before = (await (await page.request.get('/api/logs')).json()).length
    const feedRow = page.locator('main div').filter({ hasText: /^Raif Karani.*5 Jan/ }).filter({ has: page.getByRole('button', { name: 'Delete', exact: true }) }).last()
    page.once('dialog', (d) => {
      expect(d.message()).toContain('Raif Karani')
      return d.accept()
    })
    await feedRow.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect.poll(async () => (await (await page.request.get('/api/logs')).json()).length).toBe(before - 1)
    const logs = await (await page.request.get('/api/logs')).json()
    expect(logs.some((l: { log_date: string }) => l.log_date === OLD)).toBe(false)
  })

  test('the coach can reset a member’s password; they must choose a new one', async ({ page, browser, request }) => {
    await signIn(page, COACH)
    await page.getByRole('button', { name: 'Coach Panel' }).click()
    const card = page.locator('main div.rounded-xl').filter({ hasText: 'Salsabeel Kobattey' }).filter({ has: page.getByRole('button', { name: 'Reset password' }) }).last()
    page.once('dialog', (d) => {
      expect(d.message()).toContain('Salsabeel Kobattey')
      return d.accept()
    })
    await card.getByRole('button', { name: 'Reset password' }).click()
    await expect(page.getByRole('status')).toContainText('password was reset')

    // her old password stops working; the default works and forces a change
    const old = await request.post('/api/login', { data: { email: SAL, password: PW[SAL] } })
    expect(old.status()).toBe(401)
    const page2 = await (await browser.newContext()).newPage()
    await page2.goto('/')
    await page2.getByLabel('Email').fill(SAL)
    await page2.getByLabel('Password').fill('hubzero')
    await page2.getByRole('button', { name: 'Sign in' }).click()
    await expect(page2.getByText('Set your own password before you continue.')).toBeVisible()
  })
})

test.describe('coach on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('all seven tabs fit and the coach pages do not scroll sideways', async ({ page }) => {
    await signIn(page, COACH)
    const bottom = page.locator('nav').last()
    await expect(bottom.getByRole('button')).toHaveCount(7)
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

    await bottom.getByRole('button', { name: /Coach/i }).click()
    await expect(page.getByRole('heading', { name: 'Coach Panel' })).toBeVisible()
    expect(await overflow(), 'Coach Panel scrolls sideways').toBeLessThanOrEqual(0)

    await bottom.getByRole('button', { name: /Program/i }).click()
    await expect(page.getByRole('heading', { name: 'Edit Program' })).toBeVisible()
    await expect(page.getByText('Apply this to other people')).toBeVisible()
    expect(await overflow(), 'Edit Program scrolls sideways').toBeLessThanOrEqual(0)
  })
})
