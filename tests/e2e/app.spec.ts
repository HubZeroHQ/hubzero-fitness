import { expect, test, type Page } from '@playwright/test'

// One shared, empty database for the whole file, so the tests run in order and build on each other.
test.describe.configure({ mode: 'serial' })

const RAIF = 'karaniraif@gmail.com'
const COACH = 'ssultanmaliki47@gmail.com'
const RIFAQUE = 'rifaque.rs@gmail.com'
const RAIF_PW = 'Raif-Strong-1'
const COACH_PW = 'Coach-Strong-1'

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** First-ever login with the default password, then choose a real one. */
async function firstLogin(page: Page, email: string, newPassword: string) {
  await signIn(page, email, 'hubzero')
  await expect(page.getByText('Set your own password before you continue.')).toBeVisible()
  await page.getByLabel('Current password (the default one)').fill('hubzero')
  await page.getByLabel('New password', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirm new password').fill(newPassword)
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page.getByRole('button', { name: /Finish workout|Edit again/ }).or(page.getByText('Recover'))).toBeVisible()
}

const nav = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).first()

test.describe('login and password', () => {
  test('login page shows the brand and rejects a wrong password', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('HUB ZERO', { exact: true })).toBeVisible()
    await expect(page.getByText('TRAIN • IMPROVE • BELONG')).toBeVisible()
    await expect(page).toHaveTitle('Hub Zero Fitness')

    await signIn(page, RAIF, 'not-the-password')
    await expect(page.getByText('Wrong email or password.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('first login forces a new password and rejects weak ones', async ({ page }) => {
    await signIn(page, RAIF, 'hubzero')
    await expect(page.getByText('Welcome, Raif')).toBeVisible()
    // The app is locked until the password is changed: no navigation is offered.
    await expect(page.getByRole('button', { name: "Today's Workout" })).toHaveCount(0)

    const cur = page.getByLabel('Current password (the default one)')
    const pw = page.getByLabel('New password', { exact: true })
    const conf = page.getByLabel('Confirm new password')
    const save = page.getByRole('button', { name: 'Save password' })

    await cur.fill('hubzero')
    await pw.fill('short')
    await conf.fill('short')
    await save.click()
    await expect(page.getByText('Use at least 8 characters.')).toBeVisible()

    await pw.fill('hubzero2026')
    await conf.fill('hubzero2026')
    await save.click()
    await expect(page.getByText('Choose something different from the default password.')).toBeVisible()

    await pw.fill(RAIF_PW)
    await conf.fill('Different-Pass-9')
    await save.click()
    await expect(page.getByText("The two passwords don't match.")).toBeVisible()

    await cur.fill('wrong-current')
    await conf.fill(RAIF_PW)
    await save.click()
    await expect(page.getByText('Current password is wrong.')).toBeVisible()

    await cur.fill('hubzero')
    await save.click()
    await expect(page.getByRole('button', { name: "Today's Workout" })).toBeVisible()
  })

  test('the default password no longer works after it was changed', async ({ page }) => {
    await signIn(page, RAIF, 'hubzero')
    await expect(page.getByText('Wrong email or password.')).toBeVisible()
    await signIn(page, RAIF, RAIF_PW)
    await expect(page.getByRole('button', { name: "Today's Workout" })).toBeVisible()
  })
})

test.describe('logging a workout', () => {
  test('member logs a set, it autosaves and survives a reload', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await page.getByRole('button', { name: '1', exact: true }).click() // Day 1 = Push
    await expect(page.getByRole('heading', { name: /Day 1\s*PUSH/i })).toBeVisible()
    await expect(page.getByText('Chest + Shoulders + Triceps')).toBeVisible()
    await expect(page.getByText('0 / 19 sets done')).toBeVisible()
    await expect(page.getByText('Target 3 × 6–10').first()).toBeVisible()

    await page.getByLabel('Set 1 weight in kg').first().fill('62.5')
    await page.getByLabel('Set 1 reps').first().fill('9')
    await page.getByLabel('Set 1 done').first().check()
    await expect(page.getByText('1 / 19 sets done')).toBeVisible()
    await expect(page.getByText('✓ Saved')).toBeVisible()

    await page.reload()
    await expect(page.getByLabel('Set 1 weight in kg').first()).toHaveValue('62.5')
    await expect(page.getByLabel('Set 1 reps').first()).toHaveValue('9')
    await expect(page.getByLabel('Set 1 done').first()).toBeChecked()
    await expect(page.getByText('1 / 19 sets done')).toBeVisible()
  })

  test('finishing completes the workout and locks the day; it can be reopened', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await page.getByLabel('Set 2 weight in kg').first().fill('60')
    await page.getByLabel('Set 2 reps').first().fill('8')
    await page.getByLabel('Set 2 done').first().check()
    await page.getByPlaceholder('Cardio (min)').fill('15')
    await page.getByRole('button', { name: 'Finish workout' }).click()
    await expect(page.getByText('✓ Workout complete')).toBeVisible()
    await expect(page.getByLabel('Set 1 weight in kg').first()).toBeDisabled()

    await page.getByRole('button', { name: 'Edit again' }).click()
    await expect(page.getByRole('button', { name: 'Finish workout' })).toBeVisible()
    await page.getByRole('button', { name: 'Finish workout' }).click()
    await expect(page.getByText('✓ Workout complete')).toBeVisible()
  })

  test('the day picker is locked once data is logged', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await expect(page.getByRole('button', { name: '2', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: '1', exact: true })).toBeEnabled()
  })
})

test.describe('progress and team', () => {
  test('My Progress reflects the finished workout', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await nav(page, 'My Progress').click()
    await expect(page.getByRole('heading', { name: 'My Progress' })).toBeVisible()
    // each stat is a card whose first child is the label, so the label's parent is the whole card
    const stat = (label: string) => page.getByText(label, { exact: true }).locator('..')
    await expect(stat('Workouts done')).toContainText('1')
    await expect(stat('Streak')).toContainText('1')
    // 62.5×9 was ticked (562.5) and 60×8 (480): total 1042.5 kg = 1.0 tonnes
    await expect(stat('Total volume')).toContainText('1.0')
    await expect(page.getByRole('cell', { name: 'Bench Press' })).toBeVisible()
    await expect(page.getByRole('cell', { name: '62.5 kg × 9' })).toBeVisible()
    await expect(page.getByText('Day 1 PUSH')).toBeVisible()
  })

  test('Team lists all five members with Raif on top, and opens a member', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await nav(page, 'Team').click()
    for (const name of ['Syed Mohammed Sultan', 'Rifaque Ahmed Akrami', 'Raif Karani', 'Mohammed Iyad', 'Salsabeel Kobattey']) {
      await expect(page.locator('main').getByText(name, { exact: true })).toBeVisible()
    }
    await expect(page.locator('main').getByText('Coach', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Moderator', { exact: true })).toBeVisible()
    const first = page.locator('button', { hasText: 'Raif Karani' }).first()
    await expect(first).toContainText('1') // 1 workout in the last 30 days
    await first.click()
    await expect(page.getByRole('heading', { name: "Raif's Progress" })).toBeVisible()
    await page.getByRole('button', { name: /Back to team/i }).click()
    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible()
  })
})

test.describe('profile, BMI and weigh-ins', () => {
  test('BMI calculator gives correct numbers and categories', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await nav(page, 'Profile & BMI').click()
    await page.getByLabel('Height (cm)').fill('175')
    await page.getByLabel('Sex').selectOption('male')
    await page.getByLabel('Date of birth').fill('2000-01-01')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Saved.')).toBeVisible()

    await page.getByLabel('Weight (kg)', { exact: true }).first().fill('78')
    await expect(page.getByText('25.5', { exact: true })).toBeVisible()
    await expect(page.getByText('Obese')).toBeVisible() // Asia-Pacific: 25+
    await expect(page.getByText('Overweight', { exact: true })).toBeVisible() // WHO: 25–29.9
    await expect(page.getByText(/56\.7–70\.1 kg/)).toBeVisible()

    await page.getByLabel('Weight (kg)', { exact: true }).first().fill('68')
    await expect(page.getByText('22.2', { exact: true })).toBeVisible()
    await expect(page.getByText('Normal').first()).toBeVisible()

    // Calories appear once height, sex, age and weight are known.
    await expect(page.getByText(/kcal\/day/)).toBeVisible()
  })

  test('profile details persist across a reload', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await nav(page, 'Profile & BMI').click()
    await expect(page.getByLabel('Height (cm)')).toHaveValue('175')
    await expect(page.getByLabel('Sex')).toHaveValue('male')
    await expect(page.getByLabel('Date of birth')).toHaveValue('2000-01-01')
  })

  test('weigh-ins can be added and removed', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await nav(page, 'Profile & BMI').click()
    await page.getByLabel('Weight (kg)', { exact: true }).nth(1).fill('79.5')
    await page.getByLabel('Waist cm (opt.)').fill('84')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('79.5 kg · 84 cm waist')).toBeVisible()
    // the calculator now uses the latest weigh-in
    await expect(page.getByText('26.0', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'remove' }).first().click()
    await expect(page.getByText('79.5 kg · 84 cm waist')).toHaveCount(0)
  })

  test('changing the password from the profile page needs the current one', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await nav(page, 'Profile & BMI').click()
    await page.getByLabel('Current password').fill('wrong')
    await page.getByLabel('New password').fill('Another-Strong-2')
    await page.getByLabel('Confirm', { exact: true }).fill('Another-Strong-2')
    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page.getByText('Current password is wrong.')).toBeVisible()

    await page.getByLabel('Current password').fill(RAIF_PW)
    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page.getByText('Password updated.')).toBeVisible()

    // and change it back so later tests can still sign in
    await page.getByLabel('Current password').fill('Another-Strong-2')
    await page.getByLabel('New password').fill(RAIF_PW)
    await page.getByLabel('Confirm', { exact: true }).fill(RAIF_PW)
    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page.getByText('Password updated.')).toBeVisible()
  })
})

test.describe('roles', () => {
  test('members and the moderator do not get the Edit Program tab', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await expect(page.getByRole('button', { name: "Today's Workout" })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit Program' })).toHaveCount(0)
    // the API refuses too, even when called directly
    const res = await page.request.patch('/api/program/exercises/1', { data: { sets: 9 } })
    expect(res.status()).toBe(403)
  })

  test('the moderator is also blocked from editing the program', async ({ page }) => {
    await firstLogin(page, RIFAQUE, 'Rifaque-Strong-1')
    await expect(page.getByRole('button', { name: 'Edit Program' })).toHaveCount(0)
    const res = await page.request.post('/api/program/days/1/exercises', { data: { name: 'Hack', sets: 3, repsMin: 5, repsMax: 8 } })
    expect(res.status()).toBe(403)
  })

  test('sign out returns to login and protects the API', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    expect((await page.request.get('/api/logs')).status()).toBe(401)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })
})

test.describe('coach edits the program', () => {
  test('coach signs in for the first time and sees Edit Program', async ({ page }) => {
    await firstLogin(page, COACH, COACH_PW)
    await expect(page.getByRole('button', { name: 'Edit Program' })).toBeVisible()
    await page.getByRole('button', { name: 'Edit Program' }).click()
    await expect(page.getByRole('heading', { name: 'Edit Program' })).toBeVisible()
    await expect(page.getByLabel('Exercise name').first()).toHaveValue('Bench Press')
  })

  test('coach adds an exercise and members see it straight away', async ({ browser }) => {
    const coach = await (await browser.newContext()).newPage()
    await signIn(coach, COACH, COACH_PW)
    await coach.getByRole('button', { name: 'Edit Program' }).click()
    await coach.getByPlaceholder('Exercise name').fill('E2E Weighted Dips')
    await coach.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(coach.getByLabel('Exercise name').last()).toHaveValue('E2E Weighted Dips')

    const member = await (await browser.newContext()).newPage()
    await signIn(member, RAIF, RAIF_PW)
    await expect(member.getByText('E2E WEIGHTED DIPS')).toBeVisible()
    await expect(member.getByText('0 / 22 sets done').or(member.getByText(/\/ 22 sets done/))).toBeVisible()
  })

  test('coach edits sets and reps, reorders, and members see the change', async ({ browser }) => {
    const coach = await (await browser.newContext()).newPage()
    await signIn(coach, COACH, COACH_PW)
    await coach.getByRole('button', { name: 'Edit Program' }).click()
    const row = coach.locator('div.rounded-xl').filter({ has: coach.locator('input[value="E2E Weighted Dips"]') })
    await row.getByLabel('Sets').fill('4')
    await row.getByLabel('Min reps').fill('5')
    await row.getByLabel('Max reps').fill('8')
    await row.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(row.getByRole('button', { name: 'Save', exact: true })).toBeDisabled() // saved, nothing pending

    await row.getByRole('button', { name: '↑' }).click()
    const names = coach.getByLabel('Exercise name')
    await expect(names.nth(6)).toHaveValue('E2E Weighted Dips')

    const member = await (await browser.newContext()).newPage()
    await signIn(member, RAIF, RAIF_PW)
    await expect(member.getByText('Target 4 × 5–8')).toBeVisible()
  })

  test('coach can change a day title and type', async ({ page }) => {
    await signIn(page, COACH, COACH_PW)
    await page.getByRole('button', { name: 'Edit Program' }).click()
    await page.getByRole('button', { name: 'Day 7', exact: true }).click()
    await page.getByLabel('Type (sets the colour)').selectOption('legs')
    await page.getByLabel('Title').fill('BONUS LEGS')
    await page.getByRole('button', { name: 'Save day' }).click()
    await expect(page.getByRole('button', { name: 'Save day' })).toBeDisabled()

    await page.getByRole('button', { name: "Today's Workout" }).click()
    await expect(page.getByRole('button', { name: '7', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '7', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Day 7\s*BONUS LEGS/i })).toBeVisible()
  })

  test('coach removes an exercise; a member’s history for it is kept', async ({ browser }) => {
    const coach = await (await browser.newContext()).newPage()
    await signIn(coach, COACH, COACH_PW)
    await coach.getByRole('button', { name: 'Edit Program' }).click()
    coach.once('dialog', (d) => d.accept())
    const row = coach.locator('div.rounded-xl').filter({ has: coach.locator('input[value="E2E Weighted Dips"]') })
    await row.getByRole('button', { name: 'Remove' }).click()
    await expect(coach.locator('input[value="E2E Weighted Dips"]')).toHaveCount(0)

    // Raif's earlier bench-press log is untouched by program edits.
    const member = await (await browser.newContext()).newPage()
    await signIn(member, RAIF, RAIF_PW)
    await expect(member.getByText('E2E WEIGHTED DIPS')).toHaveCount(0)
    await member.getByRole('button', { name: 'My Progress' }).first().click()
    await expect(member.getByRole('cell', { name: '62.5 kg × 9' })).toBeVisible()
  })

  test('coach cancelling the remove dialog keeps the exercise', async ({ page }) => {
    await signIn(page, COACH, COACH_PW)
    await page.getByRole('button', { name: 'Edit Program' }).click()
    page.once('dialog', (d) => d.dismiss())
    await page.getByRole('button', { name: 'Remove' }).first().click()
    await expect(page.getByLabel('Exercise name').first()).toHaveValue('Bench Press')
  })

  test('coach sees validation errors from the server', async ({ page }) => {
    await signIn(page, COACH, COACH_PW)
    await page.getByRole('button', { name: 'Edit Program' }).click()
    await page.getByPlaceholder('Exercise name').fill('Bad Reps')
    await page.locator('input[aria-label="Min reps"]').last().fill('12')
    await page.locator('input[aria-label="Max reps"]').last().fill('6')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Min reps cannot be above max reps')).toBeVisible()
  })
})

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('bottom navigation works and nothing overflows sideways', async ({ page }) => {
    await signIn(page, RAIF, RAIF_PW)
    const bottom = page.locator('nav').last()
    await expect(bottom).toBeVisible()
    await expect(page.locator('nav').first()).toBeHidden() // desktop sidebar is hidden
    for (const [label, heading] of [['Progress', 'My Progress'], ['Team', 'Team'], ['Profile', 'Profile & BMI']] as const) {
      await bottom.getByRole('button', { name: new RegExp(label, 'i') }).click()
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${label} page scrolls sideways`).toBeLessThanOrEqual(0)
    }
    await bottom.getByRole('button', { name: /Today/i }).click()
    await expect(page.getByLabel('Set 1 weight in kg').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })

  test('login screen fits a phone', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })
})
