import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button, Field, font, inputStyle } from '../components/ui'

export const DEFAULT_PASSWORD = 'hubzero'

export function validateNewPassword(pw: string, confirm: string): string {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (pw.toLowerCase().includes(DEFAULT_PASSWORD)) return 'Choose something different from the default password.'
  if (pw !== confirm) return "The two passwords don't match."
  return ''
}

/** Shown after first login; the app stays locked until the default password is replaced. */
export default function ChangePassword() {
  const { profile, setProfile, signOut } = useAuth()
  const [current, setCurrent] = useState('')
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const problem = validateNewPassword(pw, confirm)
    if (problem) return setError(problem)
    setBusy(true)
    setError('')
    try {
      setProfile(await api.changePassword(current, pw))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.')
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-8" style={{ background: '#0a0a0c', minHeight: '100dvh' }}>
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold tracking-wide uppercase" style={{ fontFamily: font.display }}>
            Welcome, {profile?.full_name.split(' ')[0]}
          </div>
          <div className="text-sm mt-1" style={{ color: '#888899' }}>
            Set your own password before you continue.
          </div>
        </div>
        <div className="rounded-xl p-5 space-y-4" style={{ background: '#111116', border: '1px solid #2a2a35' }}>
          <Field label="Current password (the default one)">
            <input type="password" required autoComplete="current-password" enterKeyHint="next" value={current} onChange={(e) => setCurrent(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="New password">
            <input type="password" required autoComplete="new-password" enterKeyHint="next" value={pw} onChange={(e) => setPw(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Confirm new password">
            <input type="password" required autoComplete="new-password" enterKeyHint="go" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
          </Field>
          {error && (
            <div className="text-sm" role="alert" style={{ color: '#ff8a93' }}>
              {error}
            </div>
          )}
          <Button type="submit" disabled={busy} wide>
            {busy ? 'Saving…' : 'Save password'}
          </Button>
          <div className="text-center">
            <button type="button" onClick={signOut} className="text-xs uppercase tracking-widest px-4" style={{ minHeight: 44, color: '#888899', fontFamily: font.display }}>
              Sign out
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
