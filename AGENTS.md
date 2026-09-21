# Hub Zero Fitness

A private, phone-first workout tracker for a team of five (`fitness.hubzero.in`). React 19 + Vite + Tailwind CSS v4
frontend; Node + Express + SQLite (built-in `node:sqlite`) backend in one process. No external services.
`README.md` is the user/operator guide; this file is for people (and AI assistants) changing the code.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev:all` | API on :3001 (auto-restart) + Vite on :8443, together. The site alone cannot sign in: it proxies `/api` to :3001 |
| `pnpm dev` / `pnpm dev:server` | The website / the API on their own |
| `pnpm build` | Build the site into `dist/` (the server serves it in production: `pnpm start`) |
| `pnpm test` | Backend (`node --test`) + unit (`vitest`) tests, about 20 s |
| `pnpm test:e2e` | Builds, then runs the Playwright suite in the installed Chrome on a throwaway DB, about 3 min |
| `pnpm test:all` | Everything |
| `pnpm test:mutation` | Temporarily breaks the save protections in `Today.tsx` one at a time and checks a test fails (restores the file) |
| `pnpm admin <cmd>` | Server-side account commands (`list`, `reset-password`, `add-user`, `set-role`); recorded in the activity log |
| `npx tsc --noEmit -p .` | Type-check (keep it clean) |

Requires Node >= 22.13 (`node:sqlite`). The e2e run needs the site built first; `pnpm test:e2e` does that.

## Layout

```
server/      db.js (schema, seed, migrations, audit helper)  app.js (all routes, security headers, static serving)
             admin.js (CLI)  program.seed.js (initial timetable)  *.test.js (node:test)
src/lib/     api.ts (typed client, error classes)  auth.tsx  programContext.tsx  data.ts (fetch hooks)
             improvement.ts  body.ts  health.ts  stats.ts  program.ts (types/colours)   + *.test.ts (vitest)
src/pages/   Login  ChangePassword  Today  Progress  Team  Me  Coach  EditProgram  Logs
src/components/  Nav (desktop side bar + phone tab bar)  ui.tsx (Card, Button, Chip, Field, Notice...)  ErrorBoundary
tests/e2e/   *.spec.ts + helpers.ts     scripts/dev-all.mjs     public/manifest.webmanifest
```

`.figma/` and the Figma plugins in `vite.config.ts` are leftovers from the Figma Make export; leave them alone.

## Product rules that must not regress

- **Phone first.** The app is used in a gym on a phone. Every interactive element is >= 44 px tall, field text is
  >= 16 px (iOS zooms below that), nothing scrolls sideways at 320-430 px, the fixed tab bar must never cover content.
  Use `ui.tsx` primitives (`Button`, `Chip`, `inputStyle`) which already meet this. `tests/e2e/phone-audit.spec.ts`
  enforces it on every screen: when you add a screen, add it there.
- **Never lose a logged set.** `Today.tsx` sends one save at a time, retries on network/5xx, keeps a draft in
  `localStorage` until the server confirms, flushes when leaving the screen, and never lets a late autosave undo
  "Finish". Do not simplify this without keeping `tests/e2e/phone-gym.spec.ts` green.
- **The team comparison is about improvement, not strength.** `src/lib/improvement.ts` scores each person against their
  own previous week. Never rank people by absolute weight, volume or number of workouts.
- **Privacy model.** Everyone can read everyone's numbers (team of five); each person writes only their own. Coach-only
  actions (programs, password resets, deleting logs) are enforced on the server, not just hidden in the UI.
- **Never record passwords**, even wrong ones, in the activity log or anywhere else.
- **History is never rewritten.** Set logs store the exercise name + stable key, workouts store the day name they were
  done under; renaming or deleting program items must not change past data.

## Conventions

- TypeScript strict; no `any` unless unavoidable. Styling is Tailwind v4 utilities plus inline `style` for the brand
  colours (`#0a0a0c` background, `#e63946` red, `#10b981` green, `#3b82f6` blue, `#f59e0b` amber; fonts Barlow Condensed
  for headings, Inter for text, JetBrains Mono for numbers, all bundled with `@fontsource`, never loaded from Google).
- Pages fetch through `src/lib/api.ts` only. Errors are `ApiError` (`status` 0 = no answer). Use `isUnreachable` (retry)
  vs `isRejected` (show the reason) to decide what to do. A 401 on a signed-in request fires `SESSION_ENDED`.
- Server: one `createApp(db, opts)` in `app.js`; routes validate their input and never trust the client (`ranged()`,
  `numOrNull()`, `isDate()`). Add an `audit` entry (`log(req, category, action, target, detail)`) for anything a
  moderator would want to see. SQL is parameterised; multi-step writes use `tx(db, fn)`.
- Schema changes go in `db.js` as `CREATE TABLE IF NOT EXISTS` plus a small migration for existing databases (see the
  program-tables and `day_title` migrations) with a test that opens an old-shaped database.
- Security headers/CSP are set in `app.js` (`default-src 'self'`): do not add third-party scripts, styles, fonts or images.
- Dates are local `YYYY-MM-DD` strings chosen by the client (`isoDate`); weeks run Monday to Sunday.

## Testing rules

- Add tests with the change. Backend: `server/*.test.js` (boot the app in memory; see the `boot()` helper). Pure logic:
  `src/lib/*.test.ts`. UI behaviour: `tests/e2e/*.spec.ts`.
- E2E specs share one throwaway database and run in file order (`app`, `coach`, `insights`, `logs`, `phone-*`,
  `resilience`). Keep each spec self-sufficient: prepare accounts with `ensureAccount`, and create fresh members with
  `newMember()` when you need an empty "today".
- Wait for the resulting state, not for a notice that an earlier action may have left on screen (a past flake).
- In phone emulation the browser widens its layout to fit over-wide content, so measure against the configured screen
  width, never `window.innerWidth` (see `audit()`).
- Do not weaken or delete a test to make it pass; find out why it fails. A test that never fails proves nothing:
  the phone audit and the save-race tests have self-checks/mutation checks for exactly that reason.
- Run `pnpm test:all` before committing. Commit only files you meant to (`git add` explicit paths): `*.jpeg`/`*.png`
  are Git LFS-tracked in this repo (see `.gitattributes`).

## Gotchas

- Windows dev machine: paths use forward slashes in scripts; SQLite files may stay locked briefly after `db.close()`.
- `GET /api/logs` returns the whole team's logs by design; filter with `?userId=` when you want one person.
- Node's `--test` on a directory would also start `server/index.js`; the scripts list test files explicitly.
