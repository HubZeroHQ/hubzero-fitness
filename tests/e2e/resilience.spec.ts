import { expect, test } from '@playwright/test'
import { newMember, passwordOf, phoneFor, signIn, storedSets } from './helpers'

// Poor connections: the app opens with no signal, the server has a bad moment, or refuses a save.
test.describe.configure({ mode: 'serial' })

const weightBox = (page: import('@playwright/test').Page, n = 1) => page.getByLabel(`Set ${n} weight in kg`).first()
const repsBox = (page: import('@playwright/test').Page, n = 1) => page.getByLabel(`Set ${n} reps`).first()
const openDay1 = (page: import('@playwright/test').Page) => page.getByRole('button', { name: '1', exact: true }).tap()

test('opening the app with no signal shows a "no connection" screen (not the sign-in page) and recovers by itself', async ({ browser, playwright }) => {
  const { email } = await newMember(playwright, 'nosignal')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)

  await page.route('**/api/me', (route) => route.abort())
  await page.reload()
  await expect(page.getByText('No connection')).toBeVisible()
  await expect(page.getByText(/Anything you logged is kept on this phone/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0) // the person is NOT signed out

  await page.unroute('**/api/me')
  // no tap needed: the app keeps trying and comes back on its own
  await expect(page.getByRole('button', { name: /^(⚡ )?Today/i }).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('No connection')).toHaveCount(0)
  await context.close()
})

test('"Try again now" retries straight away', async ({ browser, playwright }) => {
  const { email } = await newMember(playwright, 'retrynow')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await page.route('**/api/me', (route) => route.abort())
  await page.reload()
  await expect(page.getByText('No connection')).toBeVisible()
  await page.unroute('**/api/me')
  await page.getByRole('button', { name: 'Try again now' }).tap()
  await expect(page.getByRole('button', { name: /^(⚡ )?Today/i }).first()).toBeVisible({ timeout: 5000 })
  await context.close()
})

test('a signed-out visitor still gets the sign-in page (not "no connection")', async ({ browser }) => {
  const { page, context } = await phoneFor(browser)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByText('No connection')).toHaveCount(0)
  await context.close()
})

test('signing in with no signal says so plainly', async ({ browser, playwright }) => {
  const { email } = await newMember(playwright, 'loginoffline')
  const { page, context } = await phoneFor(browser)
  await page.goto('/')
  await context.setOffline(true)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(passwordOf(email))
  await page.getByRole('button', { name: 'Sign in' }).tap()
  await expect(page.getByRole('alert')).toContainText("Can't reach the server")
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Sign in' }).tap()
  await expect(page.getByRole('button', { name: /^(⚡ )?Today/i }).first()).toBeVisible()
  await context.close()
})

test('a save the server refuses shows the reason and is not retried in a loop', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'refused')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay1(page)

  let attempts = 0
  await page.route('**/api/logs/*', (route) => {
    if (route.request().method() !== 'PUT') return route.continue()
    attempts++
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Bad day' }) })
  })
  await weightBox(page).fill('60')
  await expect(page.getByText("Couldn't save: Bad day")).toBeVisible()
  const seen = attempts
  await page.waitForTimeout(6000) // longer than the first retry delay
  expect(attempts, 'a refused save must not be retried by itself').toBe(seen)
  await expect(weightBox(page)).toHaveValue('60') // and what was typed is still there

  // once the problem is gone, the next change is sent normally and includes everything typed so far
  await page.unroute('**/api/logs/*')
  await repsBox(page).fill('8')
  await expect(page.getByText('✓ Saved')).toBeVisible()
  const [log] = await storedSets(api)
  expect(log.set_logs[0]).toMatchObject({ weight_kg: 60, reps: 8 })
  await context.close()
})

test('temporary server trouble (502) is retried until it works', async ({ browser, playwright }) => {
  const { email, api } = await newMember(playwright, 'flaky')
  const { page, context } = await phoneFor(browser)
  await signIn(page, email)
  await openDay1(page)

  let attempts = 0
  await page.route('**/api/logs/*', (route) => {
    if (route.request().method() !== 'PUT') return route.continue()
    attempts++
    return attempts <= 2 ? route.fulfill({ status: 502, contentType: 'text/html', body: '<h1>Bad gateway</h1>' }) : route.continue()
  })
  await weightBox(page).fill('70')
  await repsBox(page).fill('5')
  await expect(page.getByText(/Not saved yet/)).toBeVisible()
  await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 30_000 })
  expect(attempts).toBeGreaterThanOrEqual(3)
  const [log] = await storedSets(api)
  expect(log.set_logs[0]).toMatchObject({ weight_kg: 70, reps: 5 })
  await context.close()
})
