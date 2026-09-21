# Hub Zero Fitness (fitness.hubzero.in)

A private workout tracker for the five members of the Hub Zero fitness team. It follows the team's 6-day
Push / Pull / Legs+Core timetable and saves progress after every workout.

- **Today's workout**: sets, weight and reps with tick boxes, autosaved; shows your last numbers per exercise.
- **My progress**: streak, weekly count, volume, personal records, charts, history.
- **Team**: ranking of all members. Everyone can see everyone's numbers.
- **Profile & BMI**: BMI (Asia-Pacific and WHO), healthy range, calories, body-fat estimate, weigh-in log.
- **Edit Program** (coach only): add, change, reorder and remove exercises, and edit each day's title, type and notes.

Stack: React 19 + Vite + Tailwind 4 (frontend), Node + Express + SQLite (backend, one process, one database file).
There is **no external service, cloud account or paid dependency**.

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
| `TRUST_PROXY`   | `false`            | Set `true` behind nginx/Caddy so login rate-limiting sees real client IPs   |
| `STATIC_DIR`    | `./dist`           | Folder with the built website                                               |

Example (Linux):

```bash
COOKIE_SECURE=true TRUST_PROXY=true PORT_API=3001 DB_PATH=/var/lib/hubzero-fitness/fitness.db pnpm start
```

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

Permissions: the **coach** can edit the workout program; **moderator** and **member** have the same access
(their own data is editable only by themselves; everyone can read everyone's progress).

## Data and backups

Everything is one SQLite file (`data/fitness.db`, plus `-wal`/`-shm` side files while running). To back it up
safely while the server is running:

```bash
sqlite3 data/fitness.db ".backup 'backup-$(date +%F).db'"
```

or stop the server and copy the file. To restore, stop the server and put the file back. `data/` is git-ignored.

Tables: `users`, `sessions`, `workout_logs` (one per person per day), `set_logs` (one per set),
`body_metrics` (weigh-ins), `program_days` and `program_exercises` (the editable timetable). The schema is at the top of `server/db.js`.

### Using MySQL instead

SQLite is recommended: 5 users need nothing more, it needs no separate database server, and backup is one file.
If MySQL is required, the SQL is confined to `server/db.js`, `server/app.js` and `server/admin.js` (about 300
lines): swap `node:sqlite` for the `mysql2` package, change `INTEGER PRIMARY KEY AUTOINCREMENT` to
`AUTO_INCREMENT`, replace `ON CONFLICT ... DO UPDATE` with `ON DUPLICATE KEY UPDATE`, and make the handlers
`async`. The frontend does not change.

## Changing the timetable (coach)

The timetable lives in the database. The first start loads the Hub Zero timetable image's program from
`server/program.seed.js`; after that the coach changes it inside the app under **Edit Program**:

- Pick a day (1 to 7) and edit its type (Push / Pull / Legs / Rest, sets the colour), title, muscles, focus and note.
- Edit an exercise's name, sets and rep range (or seconds for timed ones like planks), then press **Save**.
- Reorder with the arrows, **Remove** an exercise, or **Add** a new one at the end of the day.

Changes apply to everyone immediately. Past workouts, personal records and charts are never deleted: each logged set
stores the exercise name and a stable key, and renaming an exercise keeps its key so its history stays linked.
There are always 7 days (a day can be turned into a rest day by setting its type to Rest and removing its exercises).
To reset the program to the original timetable, stop the server and run
`sqlite3 data/fitness.db "DELETE FROM program_exercises; DELETE FROM program_days;"`, then start it again.

Day mapping: Monday is Day 1 through Saturday Day 6, Sunday is Day 7; members can switch day on the page
(`defaultDayFor` in `src/lib/program.ts`).

## Project layout

```
server/        Express API + SQLite (db.js schema/seed, program.seed.js, app.js routes, admin.js CLI, app.test.js tests)
src/lib/       api client, auth + program context, BMI/health maths, stats
src/pages/     Login, ChangePassword, Today, Progress, Team, Me, EditProgram (coach)
src/components Nav and shared UI
data/          SQLite database (created on first run, not in git)
```

## Tests

```bash
pnpm test          # backend API tests + unit tests (fast, ~10 s)
pnpm test:e2e      # builds the site and drives it in a real Chrome (about 1 minute)
pnpm test:all      # everything
```

- **Backend** (`server/app.test.js`, `server/edge.test.js`, 23 tests): login, forced password change, session
  handling, password hashing, cookie flags, every route rejecting signed-out users, input validation, workout and
  weigh-in saving, coach-only program editing, login lockout, the admin CLI, and idempotent database start-up.
- **Unit** (`src/lib/*.test.ts`, 40 tests): BMI and categories (WHO and Asia-Pacific), healthy range, BMR, age,
  body fat, estimated 1RM, streaks, personal records, volume and date helpers.
- **End-to-end** (`tests/e2e/app.spec.ts`, 24 tests): the real production build in Chrome on a throwaway database,
  covering first login and password change, logging and finishing a workout, progress, team, BMI and weigh-ins,
  role restrictions, the coach editing the program while a member watches, and the phone layout.

The end-to-end tests use the Chrome already installed on the machine (no browser download) and always start from an
empty database, so they never touch real data.

## Security notes

- Passwords are hashed with scrypt; sessions are random tokens stored hashed, in an HttpOnly cookie (30 days).
- 5 wrong passwords for the same email+IP locks login for 15 minutes.
- Any signed-in member can read every member's logs and weigh-ins (by design); each can only write their own.
- Use HTTPS in production and set `COOKIE_SECURE=true`.
