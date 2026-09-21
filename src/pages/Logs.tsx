import { useCallback, useEffect, useState } from 'react'
import { api, type AuditCategory, type AuditEntry } from '../lib/api'
import { Button, Card, Heading, font } from '../components/ui'

const FILTERS: { value: AuditCategory | ''; label: string }[] = [
  { value: '', label: 'Everything' },
  { value: 'auth', label: 'Sign-ins & passwords' },
  { value: 'program', label: 'Program changes' },
  { value: 'workout', label: 'Workouts' },
  { value: 'admin', label: 'Server admin' },
]

const CATEGORY_COLOR: Record<AuditCategory, string> = { auth: '#3b82f6', program: '#f59e0b', workout: '#10b981', admin: '#a78bfa' }

const ACTION_LABEL: Record<string, string> = {
  login: 'Signed in',
  login_failed: 'Failed sign-in',
  login_locked: 'Locked out (too many wrong passwords)',
  logout: 'Signed out',
  password_changed: 'Changed their password',
  password_reset: 'Password reset by the coach',
  workout_finished: 'Finished a workout',
  workout_deleted: 'Workout deleted',
  weigh_in_deleted: 'Weigh-in deleted',
  program_day_edited: 'Edited a day',
  program_exercise_added: 'Added an exercise',
  program_exercise_edited: 'Changed an exercise',
  program_exercise_removed: 'Removed an exercise',
  program_day_customised: 'Gave a person their own day',
  program_day_reset: 'Reset a day to the team version',
  program_applied: 'Applied a program',
  cli_reset_password: 'Password reset (command line)',
  cli_add_user: 'Account added (command line)',
  cli_set_role: 'Role changed (command line)',
}

const isBad = (a: string) => a === 'login_failed' || a === 'login_locked'

/** SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; show it in the viewer's own time. */
const when = (at: string) =>
  new Date(at.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })

/** Read-only activity log for the coach and the moderator: who signed in, what changed, what was deleted. */
export default function Logs() {
  const [category, setCategory] = useState<AuditCategory | ''>('')
  const [rows, setRows] = useState<AuditEntry[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async (cat: AuditCategory | '') => {
    setError('')
    try {
      const page = await api.audit(cat || undefined)
      setRows(page.rows)
      setHasMore(page.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the log')
      setRows([])
    }
  }, [])

  useEffect(() => {
    setRows(null)
    load(category)
  }, [category, load])

  async function more() {
    if (!rows?.length) return
    setLoadingMore(true)
    try {
      const page = await api.audit(category || undefined, rows[rows.length - 1].id)
      setRows([...rows, ...page.rows])
      setHasMore(page.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more')
    }
    setLoadingMore(false)
  }

  return (
    <div>
      <Heading sub="Who did what on the site. Passwords are never recorded. Newest first.">Activity Log</Heading>

      <div className="flex gap-1.5 flex-wrap items-center mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setCategory(f.value)}
            aria-pressed={category === f.value}
            className="px-3 h-10 rounded-full text-sm font-semibold"
            style={{
              fontFamily: font.display,
              fontSize: 16,
              background: category === f.value ? '#e63946' : '#111116',
              color: category === f.value ? '#fff' : '#c0c0cc',
              border: `1px solid ${category === f.value ? '#e63946' : '#2a2a35'}`,
            }}
          >
            {f.label}
          </button>
        ))}
        <span className="flex-1" />
        <Button variant="ghost" onClick={() => load(category)}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-3 text-sm rounded-lg px-3 py-2" role="alert" style={{ background: '#3a1216', color: '#ff8a93' }}>
          {error}
        </div>
      )}

      <Card>
        {rows === null ? (
          <div className="text-sm py-6 text-center" style={{ color: '#888899' }}>
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm py-6 text-center" style={{ color: '#888899' }}>
            Nothing recorded here yet.
          </div>
        ) : (
          <ul aria-label="Activity log">
            {rows.map((r, i) => (
              <li key={r.id} className="py-2.5 text-sm" style={{ borderTop: i === 0 ? 'none' : '1px solid #1f1f28' }}>
                <div className="flex items-baseline gap-x-3 gap-y-0.5 flex-wrap">
                  <span className="text-xs whitespace-nowrap" style={{ color: '#888899', fontFamily: font.mono }}>
                    {when(r.at)}
                  </span>
                  <span className="w-2 h-2 rounded-full inline-block self-center" style={{ background: CATEGORY_COLOR[r.category] }} title={r.category} />
                  <b>{r.actor_name ?? 'Not signed in'}</b>
                  <span style={{ color: isBad(r.action) ? '#ff8a93' : '#c0c0cc' }}>{ACTION_LABEL[r.action] ?? r.action}</span>
                </div>
                {(r.target || r.detail || r.ip) && (
                  <div className="pl-1 mt-0.5 text-xs" style={{ color: '#888899' }}>
                    {[r.target, r.detail].filter(Boolean).join(' · ')}
                    {r.ip && <span style={{ fontFamily: font.mono }}>{r.target || r.detail ? ' · ' : ''}{r.ip}</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <div className="pt-3 text-center">
            <Button variant="ghost" disabled={loadingMore} onClick={more}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
