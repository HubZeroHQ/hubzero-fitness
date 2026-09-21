import { expect, test } from '@playwright/test'
import { COACH, IYAD, MOD, RAIF, SAL, apiAs, daysAgo, ensureAccount, openPhone, setOf, signIn, tab, today } from './helpers'

// The team comparison (improvement vs your own previous week) and everyone's own body measurements with graphs.
test.describe.configure({ mode: 'serial' })

const THIS_WEEK = today()
const LAST_WEEK = daysAgo(7)

async function logDay(api: Awaited<ReturnType<typeof apiAs>>, date: string, sets: ReturnType<typeof setOf>[]) {
  const res = await api.put(`/api/logs/${date}`, { data: { day_number: 1, completed: true, sets } })
  expect(res.ok()).toBeTruthy()
}

test.beforeAll(async ({ playwright }) => {
  // Designed so the HEAVIER lifter does NOT win, and nobody's ranking comes from how much or how often they train:
  //   Salsabeel (light weights):  leg press 60→63 kg (+5%), curl 20→22 kg (+10%)     -> +7.5%
  //   Mohammed  (heavy weights):  bench 100→102 kg (+2%), squat 140→140 kg (0%)      -> +1.0%
  //   Syed:                       barbell row 50→50 kg                               -> 0.0%
  const iyad = await apiAs(playwright, IYAD)
  await logDay(iyad, LAST_WEEK, [setOf('bench-press', 'Bench Press', 1, 100, 5), setOf('squat', 'Squat', 1, 140, 5)])
  await logDay(iyad, THIS_WEEK, [setOf('bench-press', 'Bench Press', 1, 102, 5), setOf('squat', 'Squat', 1, 140, 5)])
  await iyad.dispose()

  const sal = await apiAs(playwright, SAL)
  await logDay(sal, LAST_WEEK, [setOf('leg-press', 'Leg Press', 1, 60, 10), setOf('curl', 'Curl', 1, 20, 10)])
  await logDay(sal, THIS_WEEK, [setOf('leg-press', 'Leg Press', 1, 63, 10), setOf('curl', 'Curl', 1, 22, 10)])
  await sal.dispose()

  const coach = await apiAs(playwright, COACH)
  await logDay(coach, LAST_WEEK, [setOf('barbell-row', 'Barbell Row', 1, 50, 8)])
  await logDay(coach, THIS_WEEK, [setOf('barbell-row', 'Barbell Row', 1, 50, 8)])
  await coach.dispose()

  for (const email of [MOD, RAIF]) {
    const c = await apiAs(playwright, email)
    await c.dispose()
  }
})

test.describe('team comparison: improvement, not strength', () => {
  test('ranks by improvement vs the person’s own previous week, so the lighter lifter can win', async ({ page }) => {
    await signIn(page, MOD)
    await page.getByRole('button', { name: 'Team' }).first().click()
    await expect(page.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'true')

    const rows = page.getByRole('list', { name: 'Improvement ranking' }).getByRole('listitem')
    // the three people with two weeks of data are ranked; the rest are listed as "not enough data yet"
    await expect(rows.nth(0)).toContainText('Salsabeel Kobattey')
    await expect(rows.nth(0)).toContainText('+7.5%')
    await expect(rows.nth(0)).toContainText('2 exercises compared')
    await expect(rows.nth(0)).toContainText('Curl +10.0%, Leg Press +5.0%')

    await expect(rows.nth(1)).toContainText('Mohammed Iyad')
    await expect(rows.nth(1)).toContainText('+1.0%')
    await expect(rows.nth(1)).toContainText('Bench Press +2.0%, Squat 0.0%')

    await expect(rows.nth(2)).toContainText('Syed Mohammed Sultan')
    await expect(rows.nth(2)).toContainText('0.0%')
    await expect(rows.nth(2)).toContainText('1 exercise compared')

    // the heaviest lifter (140 kg squat) is NOT first, and people without a comparable week say so
    await expect(rows.filter({ hasText: 'not enough data yet' }).filter({ hasText: 'Rifaque Ahmed Akrami' })).toHaveCount(1)
  })

  test('the bar chart and the weekly trend are drawn for everyone', async ({ page }) => {
    await signIn(page, IYAD)
    await page.getByRole('button', { name: 'Team' }).first().click()
    const bars = page.getByRole('img', { name: /^Improvement chart:/ })
    await expect(bars).toBeVisible()
    const label = (await bars.getAttribute('aria-label'))!
    expect(label).toContain('Salsabeel +7.5%')
    expect(label).toContain('Mohammed +1.0%')
    expect(label).toContain('Syed 0.0%')
    // drawn, not just described: one bar per ranked person
    await expect(bars.locator('.recharts-bar-rectangle')).toHaveCount(3)

    const trend = page.getByRole('img', { name: 'Weekly improvement trend for every person' })
    await expect(trend).toBeVisible()
    await expect(trend.locator('.recharts-line')).not.toHaveCount(0)
    // a legend names every person
    for (const first of ['Syed', 'Rifaque', 'Raif', 'Mohammed', 'Salsabeel']) await expect(page.getByText(first, { exact: true }).first()).toBeVisible()
  })

  test('last week compares with the week before it, which has no data yet', async ({ page }) => {
    await signIn(page, IYAD)
    await page.getByRole('button', { name: 'Team' }).first().click()
    await page.getByRole('button', { name: 'Last week' }).click()
    await expect(page.getByRole('button', { name: 'Last week' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText(/Nothing to compare yet/)).toBeVisible()
    await page.getByRole('button', { name: 'This week' }).click()
    await expect(page.getByRole('list', { name: 'Improvement ranking' }).getByRole('listitem').first()).toContainText('+7.5%')
  })

  test('improvement follows a new workout straight away', async ({ page, playwright }) => {
    // Syed trains again this week and adds 5 kg to the row: 50 -> 55 kg (+10%)
    const coach = await apiAs(playwright, COACH)
    await coach.put(`/api/logs/${THIS_WEEK}`, { data: { day_number: 1, completed: true, sets: [setOf('barbell-row', 'Barbell Row', 1, 55, 8)] } })
    await coach.dispose()

    await signIn(page, MOD)
    await page.getByRole('button', { name: 'Team' }).first().click()
    const rows = page.getByRole('list', { name: 'Improvement ranking' }).getByRole('listitem')
    await expect(rows.nth(0)).toContainText('Syed Mohammed Sultan')
    await expect(rows.nth(0)).toContainText('+10.0%')
  })

  test('members can still open each other’s progress from the Team page', async ({ page }) => {
    await signIn(page, IYAD)
    await page.getByRole('button', { name: 'Team' }).first().click()
    await page.getByRole('button', { name: "Open Salsabeel Kobattey's progress" }).click()
    await expect(page.getByRole('heading', { name: "Salsabeel's Progress" })).toBeVisible()
    await page.getByRole('button', { name: /Back to team/i }).click()
    await expect(page.getByText('Improvement vs previous week')).toBeVisible()
  })
})

test.describe('body measurements: everyone can add data and see graphs', () => {
  const graph = (page: import('@playwright/test').Page, name: string) => page.getByRole('img', { name: new RegExp(`^${name} over time:`) })

  test('adds measurements, and each one appears in the graphs', async ({ page }) => {
    await signIn(page, IYAD)
    await page.getByRole('button', { name: 'Profile & Body' }).first().click()
    await expect(page.getByRole('heading', { name: 'Profile & Body' })).toBeVisible()

    // nothing yet
    await expect(page.getByText('Add your first measurement above to start your graph.')).toBeVisible()

    await page.getByLabel('Height (cm)').fill('175')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Saved.')).toBeVisible()

    let entries = 0
    const add = async (date: string, kg: string, fat = '', waist = '') => {
      await page.getByLabel('Date', { exact: true }).fill(date)
      await page.getByLabel('Weight (kg)', { exact: true }).fill(kg)
      await page.getByLabel('Body fat % (opt.)').fill(fat)
      await page.getByLabel('Waist cm (opt.)').fill(waist)
      await page.getByRole('button', { name: 'Add', exact: true }).click()
      entries += 1
      // wait for the entry itself to appear, not for a notice that an earlier add may have left on screen
      await expect(page.getByRole('list', { name: 'All entries' }).getByRole('listitem')).toHaveCount(entries)
    }
    await add(daysAgo(14), '84', '18', '92')
    await add(daysAgo(7), '82.5', '17', '90')
    await add(daysAgo(0), '81')

    // weight: every entry, oldest first, with the change since the first entry
    await expect(graph(page, 'Weight')).toBeVisible()
    await expect(graph(page, 'Weight')).toHaveAttribute('aria-label', /81$/)
    const weight = (await graph(page, 'Weight').getAttribute('aria-label'))!
    expect(weight.match(/\d+(\.\d)?(?=(,|$))/g)).toEqual(['84', '82.5', '81'])
    const summary = page.getByLabel('Summary')
    await expect(summary).toContainText('81')
    await expect(summary).toContainText('-3')
    await expect(summary).toContainText('81–84')
    await expect(graph(page, 'Weight').locator('.recharts-line-dots circle')).toHaveCount(3)

    // BMI from height 175 cm: 27.4, 26.9, 26.4
    await page.getByRole('button', { name: /^BMI/ }).click()
    const bmi = (await graph(page, 'BMI').getAttribute('aria-label'))!
    expect(bmi.match(/\d+\.\d(?=(,|$))/g)).toEqual(['27.4', '26.9', '26.4'])
    await expect(page.getByText(/Dashed lines: 18.5/)).toBeVisible()

    // body fat and waist only have the entries that included them
    await page.getByRole('button', { name: /^Body fat/ }).click()
    expect((await graph(page, 'Body fat').getAttribute('aria-label'))!.match(/\d+(?=(,|$))/g)).toEqual(['18', '17'])
    await page.getByRole('button', { name: /^Waist/ }).click()
    expect((await graph(page, 'Waist').getAttribute('aria-label'))!.match(/\d+(?=(,|$))/g)).toEqual(['92', '90'])

    // the chips show how many points each graph has
    await expect(page.getByRole('button', { name: /^Weight · 3/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Body fat · 2/ })).toBeVisible()
  })

  test('an entry can be corrected, and a date that already exists is replaced, not duplicated', async ({ page }) => {
    await signIn(page, IYAD)
    await page.getByRole('button', { name: 'Profile & Body' }).first().click()
    const list = page.getByRole('list', { name: 'All entries' })
    await expect(list.getByRole('listitem')).toHaveCount(3)

    const row = list.getByRole('listitem').filter({ hasText: '82.5 kg' })
    await row.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByText(/^Editing /)).toBeVisible()
    await expect(page.getByLabel('Date', { exact: true })).toBeDisabled() // the date is the entry's identity
    await expect(page.getByLabel('Weight (kg)', { exact: true })).toHaveValue('82.5')
    await page.getByLabel('Weight (kg)', { exact: true }).fill('82')
    await page.getByRole('button', { name: 'Update', exact: true }).click()
    await expect(page.getByText(/^Updated your /)).toBeVisible()
    await expect(page.getByText(/^Editing /)).toHaveCount(0)
    await expect(list.getByRole('listitem')).toHaveCount(3)
    await expect(list.getByRole('listitem').filter({ hasText: '82 kg · 17% fat · 90 cm waist' })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible() // back to adding

    // typing the same date again replaces that entry
    await page.getByLabel('Date', { exact: true }).fill(daysAgo(0))
    await page.getByLabel('Weight (kg)', { exact: true }).fill('80.5')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    // the entry for that date now says 80.5 (it was 81) and there are still only three entries
    await expect(list.getByRole('listitem').filter({ hasText: '80.5 kg' })).toHaveCount(1)
    await expect(list.getByRole('listitem').filter({ hasText: /(^|[^.\d])81 kg/ })).toHaveCount(0)
    await expect(list.getByRole('listitem')).toHaveCount(3)
    await page.getByRole('button', { name: /^Weight/ }).click()
    await expect(graph(page, 'Weight')).toHaveAttribute('aria-label', /80\.5$/)
    expect((await graph(page, 'Weight').getAttribute('aria-label'))!.match(/\d+(\.\d)?(?=(,|$))/g)).toEqual(['84', '82', '80.5'])
  })

  test('cancelling an edit and removing an entry', async ({ page }) => {
    await signIn(page, IYAD)
    await page.getByRole('button', { name: 'Profile & Body' }).first().click()
    const list = page.getByRole('list', { name: 'All entries' })
    await list.getByRole('listitem').first().getByRole('button', { name: 'Edit' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Add a measurement')).toBeVisible()

    // declining the confirmation keeps it
    page.once('dialog', (d) => d.dismiss())
    await list.getByRole('listitem').first().getByRole('button', { name: 'Remove' }).click()
    await expect(list.getByRole('listitem')).toHaveCount(3)

    page.once('dialog', (d) => d.accept())
    await list.getByRole('listitem').first().getByRole('button', { name: 'Remove' }).click()
    await expect(list.getByRole('listitem')).toHaveCount(2)
    await expect(page.getByRole('button', { name: /^Weight · 2/ })).toBeVisible()
  })

  test('another member starts from nothing: BMI needs a height, and adding data works for them too', async ({ page }) => {
    await signIn(page, SAL)
    await page.getByRole('button', { name: 'Profile & Body' }).first().click()
    await page.getByRole('button', { name: /^BMI/ }).click()
    await expect(page.getByText('Enter your height above and save to see your BMI over time.')).toBeVisible()

    await page.getByLabel('Weight (kg)', { exact: true }).fill('62.4')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByRole('list', { name: 'All entries' }).getByRole('listitem')).toHaveCount(1)
    await page.getByRole('button', { name: /^Weight/ }).click()
    await expect(graph(page, 'Weight')).toBeVisible()
    await expect(page.getByLabel('Summary')).toContainText('62.4')
  })

  test('a member can read the rest of the team’s measurements (a team of five) but cannot delete or overwrite them', async ({ page }) => {
    await signIn(page, SAL)
    await page.getByRole('button', { name: 'Profile & Body' }).first().click()
    // her own page lists only her own entries
    await expect(page.getByRole('list', { name: 'All entries' }).getByRole('listitem')).toHaveCount(1)

    const me = await (await page.request.get('/api/me')).json()
    const all = await (await page.request.get('/api/metrics')).json()
    const theirs = all.find((m: { user_id: number }) => m.user_id !== me.id)
    expect(theirs, 'teammates entries are readable').toBeTruthy()

    // deleting somebody else's entry is a silent no-op
    await page.request.delete(`/api/metrics/${theirs.id}`)
    const afterDelete = await (await page.request.get('/api/metrics')).json()
    expect(afterDelete.find((m: { id: number }) => m.id === theirs.id)).toMatchObject({ weight_kg: theirs.weight_kg })

    // saving a measurement always lands on her own account, never on theirs
    await page.request.put('/api/metrics', { data: { measured_on: theirs.measured_on, weight_kg: 1 + theirs.weight_kg } })
    const afterPut = await (await page.request.get('/api/metrics')).json()
    expect(afterPut.find((m: { id: number }) => m.id === theirs.id).weight_kg).toBe(theirs.weight_kg)
  })

  test('on a phone the graph is readable and the form is easy to use', async ({ browser }) => {
    const { page, context } = await openPhone(browser, IYAD, { width: 360, height: 640 })
    await tab(page, /Profile/).click()
    await page.getByLabel('Date', { exact: true }).fill(daysAgo(2))
    await page.getByLabel('Weight (kg)', { exact: true }).fill('81.6')
    await page.getByRole('button', { name: 'Add', exact: true }).tap()
    await expect(page.getByRole('list', { name: 'All entries' }).getByRole('listitem').filter({ hasText: '81.6 kg' })).toHaveCount(1)
    await page.getByRole('button', { name: /^Weight/ }).tap()
    const chart = page.getByRole('img', { name: /^Weight over time:/ })
    await expect(chart).toBeVisible()
    const box = (await chart.boundingBox())!
    expect(box.width).toBeGreaterThan(280) // the whole card width (360 minus page margins and card padding)
    expect(box.width).toBeLessThanOrEqual(360)
    expect(box.height).toBeGreaterThan(200)
    await context.close()
  })
})

