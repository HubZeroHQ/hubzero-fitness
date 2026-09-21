// Starts the API (with auto-restart) and the Vite dev server together; Ctrl+C stops both.
import { spawn } from 'node:child_process'

const run = (name, args) => {
  const p = spawn(process.execPath, args, { stdio: 'inherit' })
  p.on('exit', (code) => {
    console.log(`[${name}] exited (${code ?? 'signal'})`)
    stopAll()
  })
  return p
}

const procs = [run('api', ['--watch', 'server/index.js']), run('web', ['node_modules/vite/bin/vite.js'])]
let stopping = false
function stopAll() {
  if (stopping) return
  stopping = true
  for (const p of procs) p.kill()
  setTimeout(() => process.exit(0), 300)
}
process.on('SIGINT', stopAll)
process.on('SIGTERM', stopAll)
