import { expect, test, type Page } from '@playwright/test'
import { COACH, MOD, RAIF, apiAs, createMember, daysAgo, openPhone, setOf, tab, today } from './helpers'

// Phone audit: every screen, on real phone sizes, must be usable with a thumb.
//   - nothing scrolls sideways or pokes out of the screen
//   - every button, tab, chip, link and field is a proper touch target (44px tall)
//   - text fields are 16px or larger (smaller and iPhones zoom the page when you tap one)
//   - the fixed tab bar never hides the end of the page, and its labels are not cut off
//   - no script errors and no blocked resources (the site's security policy allows only its own files)

test.describe.configure({ mode: 'serial' })

const SIZES = [
  { width: 320, height: 568 }, // small / older phones
  { width: 360, height: 640 }, // common Android
  { width: 390, height: 844 }, // iPhone 12-15
  { width: 430, height: 932 }, // large iPhones / Pro Max
]

interface Finding {
  rule: string
  what: string
}

/** Measure the current screen. Returns everything that would be awkward on a phone. */
async function audit(page: Page): Promise<Finding[]> {
  // In phone emulation the browser WIDENS its layout to fit over-wide content, so window.innerWidth would grow with the
  // problem and hide it. Always measure against the phone's real screen width.
  const screenWidth = page.viewportSize()!.width
  return page.evaluate((vw) => {
    const out: { rule: string; what: string }[] = []
    const minWidth = vw <= 320 ? 36 : 40 // the 7-day picker is a row of seven buttons
    const describe = (el: Element) => {
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
      const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || ''
      return `<${el.tagName.toLowerCase()}> "${text || label}"`
    }
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'
    }
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX
        if (o === 'auto' || o === 'scroll') return true
      }
      return false
    }

    // 1. nothing sideways
    if (document.documentElement.scrollWidth > vw + 1) out.push({ rule: 'page scrolls sideways', what: `content ${document.documentElement.scrollWidth}px wide on a ${vw}px screen` })
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('svg') || !visible(el) || inScroller(el)) continue
      const r = el.getBoundingClientRect()
      if (r.right > vw + 1 || r.left < -1) out.push({ rule: 'sticks out of the screen', what: `${describe(el)} spans ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}` })
    }

    // 2. touch targets
    const targets = document.querySelectorAll(
      'button, a[href], select, textarea, [role="button"], input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), label:has(> input[type="checkbox"]), label:has(> input[type="radio"])',
    )
    for (const el of targets) {
      if (!visible(el) || el.closest('.recharts-wrapper')) continue
      const r = el.getBoundingClientRect()
      if (r.height < 44 - 0.5 || r.width < minWidth - 0.5) out.push({ rule: 'touch target too small', what: `${describe(el)} is ${Math.round(r.width)}x${Math.round(r.height)}px` })
    }

    // 3. field text size (iOS zooms below 16px)
    for (const el of document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea')) {
      if (!visible(el)) continue
      const size = parseFloat(getComputedStyle(el).fontSize)
      if (size < 16) out.push({ rule: 'field text under 16px (iPhone would zoom)', what: `${describe(el)} is ${size}px` })
    }

    // 4. tab bar labels and clipped buttons
    for (const el of document.querySelectorAll('nav.hz-tabbar span')) {
      if (el.scrollWidth > el.clientWidth + 1) out.push({ rule: 'tab label cut off', what: `${describe(el)} needs ${el.scrollWidth}px but has ${el.clientWidth}px` })
    }
    for (const el of document.querySelectorAll('button')) {
      if (visible(el) && !el.closest('nav') && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === 'hidden') out.push({ rule: 'button text clipped', what: describe(el) })
    }
    return out
  }, screenWidth)
}

/** After scrolling to the very end, the last piece of content must sit above the fixed tab bar. */
async function endIsReachable(page: Page): Promise<Finding[]> {
  return page.evaluate(async () => {
    window.scrollTo(0, document.documentElement.scrollHeight)
    await new Promise((r) => setTimeout(r, 150))
    const bar = document.querySelector('nav.hz-tabbar')
    const main = document.querySelector('main')
    if (!bar || !main) return [{ rule: 'layout', what: 'no tab bar or main found' }]
    let last: Element = main
    while (last.lastElementChild) last = last.lastElementChild
    const gap = bar.getBoundingClientRect().top - last.getBoundingClientRect().bottom
    return gap >= -1 ? [] : [{ rule: 'tab bar covers the end of the page', what: `last element is ${Math.round(-gap)}px behind the bar` }]
  })
}

const problems: string[] = []

async function signInFor(page: Page) {
  await page.goto('/')
  await page.getByLabel('Email').fill(RAIF)
  await page.getByLabel('Password').fill('Raif-Strong-1')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: /^(⚡ )?Today/i }).first()).toBeVisible()
}
// A member with no personal program days, so the editor's read-only "follows the team" state can always be checked,
// whatever earlier tests did to the other accounts.
const FRESH = 'audit-fresh@example.test'
const report = (where: string, findings: Finding[]) => {
  // the same problem often repeats (e.g. seven identical buttons): show each kind once per screen
  const seen = new Set<string>()
  for (const f of findings) {
    const key = `${f.rule}|${f.what}`
    if (seen.has(key)) continue
    seen.add(key)
    problems.push(`${where}: ${f.rule}: ${f.what}`)
  }
}

async function checkScreen(page: Page, where: string, wait: () => Promise<unknown>) {
  await wait()
  await page.waitForTimeout(250) // let charts finish laying out
  report(where, await audit(page))
  report(where, await endIsReachable(page))
  await page.evaluate(() => window.scrollTo(0, 0))
}

test.beforeAll(async ({ playwright }) => {
  createMember(FRESH, 'Audit Person')
  // enough data on each account that every screen shows its real, fuller layout
  const raif = await apiAs(playwright, RAIF)
  await raif.patch('/api/me', { data: { height_cm: 178, sex: 'male', birth_date: '1999-04-12', goal_weight_kg: 76 } })
  for (const [d, kg, fat, waist] of [[21, 84, 19, 92], [14, 82.5, 18, 90], [7, 81.5, 17.5, 89], [0, 80.5, 16.5, 87]] as const) {
    await raif.put('/api/metrics', { data: { measured_on: daysAgo(d), weight_kg: kg, body_fat_pct: fat, waist_cm: waist } })
  }
  for (const d of [13, 6]) {
    await raif.put(`/api/logs/${daysAgo(d)}`, { data: { day_number: 1, completed: true, sets: [setOf('bench-press', 'Bench Press', 1, 80 + (13 - d), 8), setOf('bench-press', 'Bench Press', 2, 80, 7)] } })
  }
  await raif.dispose()

  const mod = await apiAs(playwright, MOD)
  await mod.dispose()
  const coach = await apiAs(playwright, COACH)
  const profiles = await (await coach.get('/api/profiles')).json()
  const raifId = profiles.find((p: { full_name: string }) => p.full_name === 'Raif Karani').id
  await coach.post('/api/program/days/1/customize', { data: { owner: raifId } }) // a personal day, so the editor shows its full layout
  await coach.dispose()
})

for (const size of SIZES) {
  test(`${size.width}x${size.height}: member screens`, async ({ browser }) => {
    const { page, context } = await openPhone(browser, RAIF, size)
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(String(e)))
    const at = (screen: string) => `${size.width}px · ${screen}`

    await checkScreen(page, at('Today'), async () => {
      await page.getByRole('button', { name: '1', exact: true }).click()
      await expect(page.getByLabel('Set 1 weight in kg').first()).toBeVisible()
    })

    await tab(page, /Progress/).click()
    await checkScreen(page, at('Progress'), async () => {
      await expect(page.getByRole('heading', { name: 'My Progress' })).toBeVisible()
      await page.getByRole('button', { name: /Day 1/ }).first().click() // open a workout's sets
    })

    await tab(page, /Team/).click()
    await checkScreen(page, at('Team'), async () => {
      await expect(page.getByText('Improvement vs previous week')).toBeVisible()
    })
    await page.getByRole('button', { name: "Open Raif Karani's progress" }).click()
    await checkScreen(page, at('Team → a member'), async () => expect(page.getByRole('heading', { name: "Raif's Progress" })).toBeVisible())
    await page.getByRole('button', { name: /Back to team/i }).click()

    await tab(page, /Profile/).click()
    await checkScreen(page, at('Profile & Body'), async () => {
      await expect(page.getByRole('heading', { name: 'Profile & Body' })).toBeVisible()
    })
    await page.getByRole('button', { name: /^BMI/ }).click()
    await checkScreen(page, at('Profile & Body · BMI graph'), async () => expect(page.getByText('Dashed lines')).toBeVisible())
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await checkScreen(page, at('Profile & Body · editing an entry'), async () => expect(page.getByText(/^Editing/)).toBeVisible())

    expect(errors, `${size.width}px console errors`).toEqual([])
    await context.close()
  })

  test(`${size.width}x${size.height}: moderator and coach screens`, async ({ browser }) => {
    const errors: string[] = []
    const at = (screen: string) => `${size.width}px · ${screen}`

    const mod = await openPhone(browser, MOD, size)
    mod.page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await tab(mod.page, /Activity Log/).click()
    await checkScreen(mod.page, at('Activity Log'), async () => expect(mod.page.getByRole('list', { name: 'Activity log' })).toBeVisible())
    await mod.context.close()

    const { page, context } = await openPhone(browser, COACH, size)
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await expect(tab(page, /.*/)).toHaveCount(7)

    await tab(page, /Coach Panel/).click()
    await checkScreen(page, at('Coach Panel'), async () => expect(page.getByRole('heading', { name: 'Coach Panel' })).toBeVisible())

    await page.getByRole('button', { name: 'View full progress' }).first().click()
    await checkScreen(page, at('Coach Panel → a member'), async () => expect(page.getByRole('heading', { name: /'s Progress$/ })).toBeVisible())
    await page.getByRole('button', { name: /Back to coach panel/i }).click()

    await tab(page, /Edit Program/).click()
    await checkScreen(page, at('Edit Program · team'), async () => expect(page.getByText('Apply this to other people')).toBeVisible())
    await page.getByRole('button', { name: /^Raif/ }).click()
    await checkScreen(page, at('Edit Program · a person'), async () => expect(page.getByText("You're editing Raif's program")).toBeVisible())
    await page.getByRole('button', { name: /^Audit/ }).click()
    await page.getByRole('button', { name: /^Day 3/ }).click() // an inherited day (read-only until customised)
    await checkScreen(page, at('Edit Program · inherited day'), async () => expect(page.getByText('follows the team program')).toBeVisible())

    await tab(page, /Activity Log/).click()
    await checkScreen(page, at('Activity Log (coach)'), async () => expect(page.getByRole('list', { name: 'Activity log' })).toBeVisible())

    expect(errors, `${size.width}px console errors`).toEqual([])
    await context.close()
  })
}

test('the sign-in screen is phone-friendly', async ({ browser }) => {
  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: size, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    const email = page.getByLabel('Email')
    await expect(email).toHaveAttribute('inputmode', 'email')
    await expect(email).toHaveAttribute('autocapitalize', 'none')
    await expect(email).toHaveAttribute('autocomplete', 'username')
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'current-password')
    report(`${size.width}px · Sign in`, (await audit(page)).filter((f) => !f.rule.includes('tab bar')))
    await context.close()
  }
})

test('the page is set up as a phone web app', async ({ page, request }) => {
  await page.goto('/')
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toBe('width=device-width, initial-scale=1, viewport-fit=cover')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a0a0c')
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest')
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'Hub Zero Fitness', display: 'standalone', start_url: '/', theme_color: '#0a0a0c' })
  expect(manifest.icons.length).toBeGreaterThan(0)
  const icon = await request.get(manifest.icons[0].src)
  expect(icon.ok()).toBeTruthy()
})

test('the fonts come from the site itself, not from Google', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !r.url().startsWith('data:')) external.push(r.url())
  })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(external, 'no request should leave the site').toEqual([])
  const families = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/['"]/g, '')))
  expect(families).toEqual(expect.arrayContaining(['Barlow Condensed', 'Inter']))
})

test('the first screen downloads little (the charts load later), and the other pages are prefetched', async ({ page, request }) => {
  // The page the gym uses is sign-in + today's workout. The charting library is most of the code and must stay out of it.
  const html = await (await request.get('/')).text()
  const src = html.match(/<script[^>]+src="([^"]+\.js)"/)![1]
  const main = await request.get(src)
  const kb = (await main.body()).length / 1024
  expect(kb, `first-screen JavaScript is ${Math.round(kb)} kB`).toBeLessThan(300)
  expect(await main.text()).not.toContain('recharts') // the library's own marker text is not in the entry file

  const seen: string[] = []
  page.on('response', (r) => r.url().endsWith('.js') && seen.push(r.url()))
  await signInFor(page)
  await page.waitForTimeout(3500) // the prefetch starts two seconds after the workout screen is up
  const chunks = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name))
  for (const name of ['Progress', 'Team', 'Me']) expect(chunks.some((u) => new RegExp(`/${name}-[^/]+\\.js$`).test(u)), `${name} page was prefetched`).toBe(true)
  expect(chunks.some((u) => /\/Coach-[^/]+\.js$/.test(u)), 'staff-only pages are not downloaded by a member').toBe(false)
})

test('the audit itself really catches phone problems (so a pass means something)', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<button id="tiny" style="width:20px;height:20px">x</button>' +
        '<input id="small-text" style="font-size:12px;height:48px;width:120px" />' +
        '<div id="wide" style="width:900px;height:10px;background:red">wide</div>',
    )
  })
  const rules = (await audit(page)).map((f) => f.rule)
  expect(rules).toContain('touch target too small')
  expect(rules).toContain('field text under 16px (iPhone would zoom)')
  expect(rules).toContain('page scrolls sideways')
  expect(rules).toContain('sticks out of the screen')
  await context.close()
})

test.afterAll(() => {
  // one combined report, so a single run shows every phone problem at once
  expect(problems, `\n${problems.join('\n')}\n`).toEqual([])
})

