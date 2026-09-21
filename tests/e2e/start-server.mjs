// Starts the production server on a fresh, empty database for the end-to-end tests.
import { rmSync } from 'node:fs'

rmSync('tests/.e2e-data', { recursive: true, force: true })
process.env.DB_PATH = 'tests/.e2e-data/e2e.db'
process.env.STATIC_DIR = 'dist'
await import('../../server/index.js')
