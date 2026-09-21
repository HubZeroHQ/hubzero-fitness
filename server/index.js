import { resolve } from 'node:path'
import { openDb, pruneAudit } from './db.js'
import { createApp } from './app.js'

const port = Number(process.env.PORT_API || process.env.PORT || 3001)
const db = openDb()
const app = createApp(db, {
  secureCookie: process.env.COOKIE_SECURE === 'true',
  trustProxy: process.env.TRUST_PROXY === 'true',
  staticDir: resolve(process.env.STATIC_DIR || './dist'),
})

// Drop expired sessions now and then.
setInterval(() => {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  pruneAudit(db)
}, 3600_000).unref()

const server = app.listen(port, () => {
  console.log(`Hub Zero Fitness listening on http://localhost:${port}`)
})

// Stop cleanly (systemd / pm2 / Ctrl+C): finish open requests, then close the database so nothing is left half-written.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close()
      process.exit(0)
    })
    setTimeout(() => process.exit(0), 3000).unref()
  })
}
