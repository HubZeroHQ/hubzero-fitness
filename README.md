# Hub Zero Fitness (fitness.hubzero.in)

A private workout tracker for the five members of the Hub Zero fitness team, **built to be used on a phone in the
gym**. It follows the team's 6-day Push / Pull / Legs+Core timetable, saves progress after every set, and compares
the team by **who improved**, never by who lifts more.

- **Today's workout**: sets, weight and reps with big tick boxes, autosaved. Shows what you did last time for each
  exercise and can fill it in for you.
- **My Progress**: streak, weekly count, volume, personal records, charts, and a set-by-set history.
- **Team**: who improved the most against their own previous week (bar chart, ranking and an 8-week trend for
  everyone). See [How the comparison works](#how-the-team-comparison-works).
- **Profile & Body**: everyone adds their own measurements (weight, body fat, waist) and gets graphs for weight,
  BMI, body fat and waist over time. Also BMI (Asia-Pacific and WHO), healthy range, calories and body-fat estimate.
- **Coach Panel** (coach): every member at a glance, who needs a nudge, a team activity feed, and controls.
- **Edit Program** (coach): change the team's program or give any one person their own version, and copy a day or
  the whole week to chosen people or everyone at once.
- **Activity Log** (coach and moderator, read-only): who signed in, what changed, what was deleted.

Stack: React 19 + Vite + Tailwind 4 (frontend), Node + Express + SQLite (backend, one process, one database file).
There is **no external service, cloud account or paid dependency**, and nothing is loaded from other websites
(the fonts are bundled too).

## Made for the gym (phone first)

| Situation | What the app does |
| --------- | ----------------- |
| Sweaty thumbs, gloves | Every button, tab, chip and field is at least 44 px tall; inputs are 52 px; set tick boxes have a 48 px tap area |
| Scrolling a long workout | A bar with "x / y sets done" and the save status stays pinned at the top |
| Same weights as last time | "Same as last time" and "+2.5 kg" fill an exercise's empty sets (never overwriting what you typed) |
| The phone locks between sets | The screen is kept awake while a workout is open (where the browser allows it) |
| No signal in the basement | Sets are kept on the phone and sent automatically when the connection returns; a clear message says so |
| App killed, tab closed, phone restarted | Unsent sets are restored from the phone and sent on the next visit |
| Tapping Finish right after the last set | The finished state cannot be undone by a late autosave; saves are sent one at a time, so an older state never overwrites a newer one |
| Switching tab straight after typing | The last entry is saved as you leave the screen |
| Phone left open overnight | It starts the new day instead of logging into yesterday |
| Session expires | The sign-in screen explains why, and unsent sets come back after signing in |
| Opening the app with no signal | A "No connection" screen retries by itself (you are not shown the sign-in page) |
| Typing a 5000 kg set by mistake | The typo is dropped, the rest of the set is kept |
| iPhone zooming into fields | Field text is 16 px or larger, so the page never zooms |
| Notched phones, gesture bars | The tab bar respects the safe areas; pages have room above it |

### Install it on your phone (recommended)

The site is an installable web app (needs HTTPS once it is hosted; `localhost` also works):

- **iPhone (Safari):** Share button, then **Add to Home Screen**.
- **Android (Chrome):** menu, then **Install app** / **Add to Home screen**.

It then opens full screen with its own icon.

## Requirements

- **Node.js 22.13 or newer** (uses Node's built-in `node:sqlite`; tested on Node 24)
- **pnpm** (`npm i -g pnpm`). Plain `npm` also works: replace `pnpm` with `npm run` below.

## Run it locally (development)

```bash
pnpm install
pnpm dev:all         # starts the API (port 3001) and the website (port 8443) together
```

Or run them separately in two terminals: `pnpm dev:server` (API + database) and `pnpm dev` (website with hot reload).
The website alone cannot sign anyone in: without the API you will see `http proxy error ... ECONNREFUSED`.

Open http://localhost:8443. The first time the server starts it creates `data/fitness.db` and the five accounts.
To try it on your phone while developing, open `http://<your computer's address>:8443` on the same Wi-Fi.

## Run it for real (production, single process)

```bash
pnpm install
pnpm build          # builds the website into dist/
pnpm start          # serves the website AND the API on http://localhost:3001
```

`pnpm start` serves everything from one port. Put a reverse proxy with HTTPS in front of it and use these
environment variables:

| Variable        | Default            | Meaning                                                                     |
| --------------- | ------------------ | --------------------------------------------------------------------------- |
| `PORT_API`      | `3001`             | Port to listen on                                                           |
| `DB_PATH`       | `./data/fitness.db`| Where the SQLite database file lives                                        |
| `COOKIE_SECURE` | `false`            | Set `true` once the site is served over HTTPS (marks the login cookie Secure)|
| `TRUST_PROXY`   | `false`            | Set `true` behind nginx/Caddy so login rate-limiting and the log see real client IPs |
| `STATIC_DIR`    | `./dist`           | Folder with the built website                                               |

Example (Linux):

```bash
COOKIE_SECURE=true TRUST_PROXY=true PORT_API=3001 DB_PATH=/var/lib/hubzero-fitness/fitness.db pnpm start
```

The server shuts down cleanly on `SIGINT`/`SIGTERM` (finishes open requests, closes the database).

### Keep it running (systemd example)

`/etc/systemd/system/hubzero-fitness.service`:

```ini
[Unit]
Description=Hub Zero Fitness
After=network.target

[Service]
WorkingDirectory=/srv/DesignFitnessWebsite
Environment=COOKIE_SECURE=true TRUST_PROXY=true PORT_API=3001 DB_PATH=/var/lib/hubzero-fitness/fitness.db
ExecStart=/usr/bin/node server/index.js
Restart=always
User=hubzero

[Install]
WantedBy=multi-user.target
```

Then `sudo systemctl enable --now hubzero-fitness`. On Windows you can use `pm2` or NSSM instead.

### HTTPS with nginx (fitness.hubzero.in)

```nginx
server {
  server_name fitness.hubzero.in;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  # add TLS with certbot: sudo certbot --nginx -d fitness.hubzero.in
}
```

Do not add an nginx `Content-Security-Policy` of your own: the app already sends a strict one
(`default-src 'self'`) and blocks everything from other origins.

**Updating:** `git pull`, `pnpm install`, `pnpm build`, restart the service. Databases from older versions are
upgraded automatically on start (no data is lost). Browsers pick up the new version on the next open because the
page itself is never cached; the JS/CSS/fonts are cached for a year under fingerprinted names.

## Accounts and passwords

The first start creates these accounts, all with the password **`hubzero`**. Each person is forced to choose a
new password (min 8 characters, must not contain "hubzero") at first login before they can use the site.

| Name                  | Email                        | Role      |
| --------------------- | ---------------------------- | --------- |
| Syed Mohammed Sultan  | ssultanmaliki47@gmail.com    | coach     |
| Rifaque Ahmed Akrami  | rifaque.rs@gmail.com         | moderator |
| Raif Karani           | karaniraif@gmail.com         | member    |
| Mohammed Iyad         | mohdiyad26@gmail.com         | member    |
| Salsabeel Kobattey    | kobatteysalsabeel@gmail.com  | member    |

The roster is defined in `server/db.js` (`ROSTER`). It is only used when the database is empty.

> Log in and change the default passwords **immediately** after deploying; until then anyone who knows
> `hubzero` and an email address can get in.

### Admin commands (there is no "forgot password" email)

Run these on the server, in the project folder:

```bash
pnpm admin list                                             # show everyone
pnpm admin reset-password someone@example.com               # back to "hubzero", forces a change
pnpm admin add-user new@example.com "Full Name" member      # role: coach | moderator | member
pnpm admin set-role someone@example.com coach
```

These are recorded in the Activity Log too. The coach can also reset passwords inside the app (Coach Panel).

### What each role can do

| | Member | Moderator | Coach |
| --- | :---: | :---: | :---: |
| Log own workouts and measurements | yes | yes | yes |
| See everyone's progress, measurements and the team comparison | yes | yes | yes |
| Read the Activity Log | no | yes | yes |
| Coach Panel, edit the team or a person's program, apply programs | no | no | yes |
| Reset a member's password, delete a workout or a weigh-in | no | no | yes |

Everyone can read everyone's numbers (it is a team of five); each person can change only their own data.

## How the team comparison works

The Team page answers "who improved the most", **not** "who is strongest" or "who trains most".

1. Weeks run Monday to Sunday. Only ticked sets with a weight and reps count.
2. For every exercise, the week's best set gives an estimated one-rep max (Epley: `weight x (1 + reps / 30)`).
3. For each exercise someone did **in both** this week and the week before, the change is
   `(this week - last week) / last week`, as a percentage, capped at +/-50% so one typo cannot dominate.
4. A person's score is the average of those changes. With nothing in common there is no score ("not enough data yet").

So a beginner who adds 2 kg to a light lift and an experienced lifter who adds 10 kg to a heavy one can score the
same, and extra sessions or heavier weights do not raise a score by themselves. **This week** updates as people log;
**Last week** compares the week before with the one before that. The maths lives in `src/lib/improvement.ts`.

## Body measurements

On **Profile & Body** everyone can add a measurement (date, weight, and optionally body fat % and waist), edit or
remove any of their own entries, and see a graph for weight (with the goal line), BMI (with the 18.5 / 23 / 25 lines),
body fat and waist. Saving a date that already has an entry replaces it. Accepted ranges: weight 20-400 kg,
body fat 1-75 %, waist 30-250 cm, height 50-260 cm, goal weight 20-400 kg. BMI uses your current height for every entry.

## Changing the timetable (coach)

The timetable lives in the database. The first start loads the Hub Zero timetable image's program from
`server/program.seed.js`; after that the coach changes it inside the app under **Edit Program**.

**Whose program?** Pick a scope at the top:

- **Everyone (team default)**: the program every member follows unless the coach gave them their own version of a day.
- **One person**: that person's program. Days they follow from the team are read-only until you press
  **Customise Day N for <name>**, which gives them their own copy to change. **Reset** takes them back to the team
  version. Because personal and team versions are separate, nothing you change for one person can leak to anyone else.
  A dot on a day tab (and "N custom" on a person) shows where personal versions exist.

**Editing**: pick a day (1 to 7); change its type (Push / Pull / Legs / Rest, sets the colour), title, muscles, focus
and note; edit an exercise's name, sets and rep range (or seconds for timed ones like planks) and press **Save**;
reorder with the arrows, **Remove**, or **Add** an exercise at the end of the day.

**Apply this to other people** (bottom of the page): copy what you are looking at, either **Day N only** or the
**Whole program (all 7 days)**, to any combination of people (each gets their own copy), or tick **Everyone at once**:
it becomes the team default and every personal version of those days is removed, so all members follow it.
You are asked to confirm before anything is overwritten.

Changes apply immediately. Past workouts, personal records and charts are never deleted: each logged set stores the
exercise name and a stable key (renaming an exercise keeps its key), and each workout remembers the day name it was
done under, so history reads correctly even after the program changes. There are always 7 days (turn a day into a rest
day by setting its type to Rest and removing its exercises). To reset the whole program to the original timetable,
stop the server and run
`sqlite3 data/fitness.db "DELETE FROM program_exercises; DELETE FROM program_days;"`, then start it again.

Day mapping: Monday is Day 1 through Saturday Day 6, Sunday is Day 7; members can switch day on the page
(`defaultDayFor` in `src/lib/program.ts`).

## Coach Panel

Per member: whether they trained today, last workout, workouts this week / 30 days, streak, weight and goal, and how
many custom program days they have. Anyone who has not trained for 3 days (or ever) is flagged. Controls: open a
member's full progress (every set of every workout), jump to editing their program, reset their password, delete a
workout entered by mistake, remove a weigh-in. A feed shows the latest workouts across the team.

## Activity log

The coach and the moderator have an **Activity Log** tab (read-only). It records:

| Filter | Events |
| ------ | ------ |
| Sign-ins & passwords | sign-ins, failed sign-ins (with the email tried and whether it exists), lockouts after too many wrong passwords, sign-outs, password changes, password resets by the coach |
| Program changes | day edits, exercises added / changed / removed, a person given their own day or reset to the team version, programs applied to people or everyone |
| Workouts | workouts finished (once, not on every autosave), workouts and weigh-ins deleted by the coach |
| Server admin | `pnpm admin` commands (reset password, add user, set role) |

Each entry has the time, who did it, the target, details, and the address it came from. **Passwords are never
recorded**, not even wrong ones. Behind nginx set `TRUST_PROXY=true` so the address is the visitor's rather than the
proxy's. The log keeps the newest 20,000 entries and older ones are dropped automatically. It lives in the same
SQLite database (`audit_log` table), so it is included in backups.

## Data and backups

Everything is one SQLite file (`data/fitness.db`, plus `-wal`/`-shm` side files while running). To back it up
safely while the server is running:

```bash
sqlite3 data/fitness.db ".backup 'backup-$(date +%F).db'"
```

or stop the server and copy the file. To restore, stop the server and put the file back. `data/` is git-ignored.

Tables: `users`, `sessions`, `workout_logs` (one per person per day), `set_logs` (one per set),
`body_metrics` (measurements), `audit_log` (the activity log), `program_days` and `program_exercises` (the editable
timetable: `owner` 0 is the team default, any other owner is that person's own copy of a day). The schema is at the
top of `server/db.js`, which also upgrades older databases on start.

### Using MySQL instead

SQLite is recommended: 5 users need nothing more, it needs no separate database server, and backup is one file.
If MySQL is required, the SQL is confined to `server/db.js`, `server/app.js` and `server/admin.js`: swap
`node:sqlite` for the `mysql2` package, change `INTEGER PRIMARY KEY AUTOINCREMENT` to `AUTO_INCREMENT`, replace
`ON CONFLICT ... DO UPDATE` with `ON DUPLICATE KEY UPDATE`, and make the handlers `async`. The frontend does not change.

## Security notes

- Passwords are hashed with scrypt; sessions are random tokens stored hashed, in an HttpOnly, SameSite cookie (30 days).
- 5 wrong passwords for the same email+IP locks login for 15 minutes; every attempt is in the Activity Log.
- Every response carries `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` and a strict
  `Content-Security-Policy` (only the site's own files); API responses are never cached.
- Numbers are range-checked on the server (workouts, weigh-ins, profile); malformed requests get a 400, not a crash.
- Any signed-in member can read every member's logs and weigh-ins (by design); each can only write their own.
- Use HTTPS in production and set `COOKIE_SECURE=true`.

## Tests

```bash
pnpm test          # backend API tests + unit tests (fast, ~20 s)
pnpm test:e2e      # builds the site and drives it in a real Chrome (about 3 minutes)
pnpm test:all      # everything
pnpm test:mutation # breaks the save protections one by one and checks a test notices (about 1 minute)
```

- **Backend** (`server/*.test.js`, node:test): login, forced password change, sessions, password hashing, cookie flags,
  every route rejecting signed-out users, validation, workout and weigh-in saving, coach-only actions, personal
  programs, the activity log, security headers and caching, input range checks, the admin CLI, and the migration of
  older databases.
- **Unit** (`src/lib/*.test.ts`, vitest): BMI and categories, healthy range, BMR, body fat, estimated 1RM, streaks,
  personal records, the weekly **improvement** maths, body-measurement series, and the API client's error handling.
- **End-to-end** (`tests/e2e/*.spec.ts`, Playwright): the real production build in Chrome on a throwaway database,
  covering every role and screen, plus a **phone audit** and **gym-behaviour** tests:
  - The audit opens every screen at 320, 360, 390 and 430 px wide with touch emulation and fails on anything that scrolls
    sideways, sticks out of the screen, is a touch target under 44 px, uses field text under 16 px, has cut-off tab
    labels, is hidden behind the tab bar, or logs a script error or blocked resource. It also checks itself against
    deliberately broken markup, so a pass means something.
  - The gym tests use a touch phone to cover the sticky bar, screen wake lock, same-as-last-time, offline and reconnect,
    unsent-work recovery after a reload, saving on tab switch, finish/autosave and overlapping-save races, midnight
    rollover (with a fake clock), session expiry, no-signal start-up, refused and failing saves.

The end-to-end tests use the Chrome already installed on the machine (no browser download) and always start from an
empty database, so they never touch real data.

## Project layout

```
server/        Express API + SQLite (db.js schema/seed/migrations, program.seed.js, app.js routes, admin.js CLI, *.test.js)
src/lib/       api client, auth + program context, improvement/BMI/body/stats maths, timetable types (+ unit tests)
src/pages/     Login, ChangePassword, Today, Progress, Team, Me (Profile & Body), Logs, Coach, EditProgram
src/components Nav (side bar / phone tab bar), ui (buttons, chips, fields), ErrorBoundary
public/        manifest.webmanifest (installable app) and the logo
tests/e2e/     Playwright specs and helpers
scripts/       dev-all.mjs (starts API + website together)
data/          SQLite database (created on first run, not in git)
```

The project began as a Figma Make export; the `.figma/` folder and the Figma plugins in `vite.config.ts` are leftovers
that are safe to ignore.

## Troubleshooting

- **`http proxy error ... ECONNREFUSED` in the dev console**: the API is not running. Use `pnpm dev:all`.
- **`Port 8443 is already in use`**: another `pnpm dev` is still running; stop it first.
- **Locked out after wrong passwords**: wait 15 minutes, or ask the coach to reset the password.
- **A phone shows "Not saved yet"**: there is no connection; nothing is lost and it sends itself when back online.
