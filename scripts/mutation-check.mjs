// Proves the save-protection tests really catch regressions ("a test that never fails proves nothing").
//
// It temporarily breaks one protection at a time in src/pages/Today.tsx, rebuilds, runs the browser test that is meant
// to notice, and reports CAUGHT or MISSED. The original file is always restored afterwards, even if this is interrupted.
//
//   pnpm test:mutation      (takes about a minute)
import { execSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FILE = 'src/pages/Today.tsx'
const backup = join(mkdtempSync(join(tmpdir(), 'hz-mutation-')), 'Today.tsx')
copyFileSync(FILE, backup)
const original = readFileSync(FILE, 'utf8')

const restore = () => {
  copyFileSync(backup, FILE)
  try {
    execSync('npx vite build', { stdio: 'ignore' })
  } catch {
    /* the next normal build will fix it */
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restore()
    process.exit(130)
  })
}

const mutations = [
  {
    name: 'allow two saves to overlap',
    from: '    if (inflight.current) return // the running save re-checks the version and sends the newer state when it finishes\n',
    to: '',
    test: 'two saves are never in flight',
  },
  {
    name: 'do not save when leaving the screen',
    from: '      if (dirty.current) void flushRef.current()\n    }\n  }, [])',
    to: '    }\n  }, [])',
    test: 'switching tab right after typing',
  },
  {
    name: 'do not keep a draft on the phone',
    from: '    writeDraft(userId, dateStr, snapshot())\n    window.clearTimeout(timer.current)\n    timer.current = window.setTimeout',
    to: '    window.clearTimeout(timer.current)\n    timer.current = window.setTimeout',
    test: 'unsent work survives closing',
  },
  {
    name: 'Finish does not record the intended state',
    from: '    completedRef.current = value\n    setCompleted(value)',
    to: '    setCompleted(value)',
    test: 'tapping Finish quickly',
  },
]

let allCaught = true
try {
  for (const m of mutations) {
    if (!original.includes(m.from)) throw new Error(`The code this mutation targets has changed: "${m.name}". Update scripts/mutation-check.mjs.`)
    writeFileSync(FILE, original.replace(m.from, () => m.to)) // a function, so "$" in the text is never treated specially
    execSync('npx vite build', { stdio: 'ignore' })
    let output = ''
    try {
      output = execSync(`npx playwright test phone-gym -g "${m.test}"`, { encoding: 'utf8', timeout: 240_000 })
    } catch (err) {
      output = String(err.stdout ?? '')
    }
    const caught = /\d+ failed/.test(output)
    console.log(`${caught ? 'CAUGHT' : 'MISSED'}  ${m.name}`)
    if (!caught) allCaught = false
  }
} finally {
  restore()
}
console.log(allCaught ? 'Every mutation was caught by a test.' : 'SOME MUTATIONS WERE NOT CAUGHT: a test has lost its teeth.')
process.exit(allCaught ? 0 : 1)
