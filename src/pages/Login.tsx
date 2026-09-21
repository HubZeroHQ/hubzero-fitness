import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button, Field, Notice, font, inputStyle } from '../components/ui'

export default function Login() {
  const { setProfile, sessionEnded } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setProfile(await api.login(email.trim(), password))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
      setBusy(false)
    }
  }

  return (
    // 100dvh follows the visible screen height, so the form is not hidden behind the phone's address bar or keyboard.
    <div className="flex items-center justify-center px-4 py-8" style={{ background: '#0a0a0c', minHeight: '100dvh' }}>
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <img src="/assets/hubzero-logo.jpeg" alt="Hub Zero" className="w-20 h-20 rounded-xl object-cover mb-4" />
          <div className="text-4xl font-bold tracking-widest" style={{ fontFamily: font.display }}>
            HUB ZERO
          </div>
          <div className="text-lg tracking-[0.35em]" style={{ fontFamily: font.display, color: '#10b981' }}>
            FITNESS
          </div>
          <div className="text-xs mt-3 tracking-[0.25em]" style={{ color: '#888899', fontFamily: font.display }}>
            TRAIN • IMPROVE • BELONG
          </div>
        </div>

        {sessionEnded && (
          <Notice kind="warn">You were signed out (your session ended). Sign in again. Any sets you had not saved are still on this phone and will be sent.</Notice>
        )}

        <div className="rounded-xl p-5 space-y-4" style={{ background: '#111116', border: '1px solid #2a2a35' }}>
          <Field label="Email">
            <input
              type="email"
              required
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </Field>
          {error && (
            <div className="text-sm" role="alert" style={{ color: '#ff8a93' }}>
              {error}
            </div>
          )}
          <Button type="submit" disabled={busy} wide>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
        <p className="text-xs text-center mt-4" style={{ color: '#888899' }}>
          Private to the Hub Zero team. Ask the coach if you can&apos;t get in.
        </p>
      </form>
    </div>
  )
}
