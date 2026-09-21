import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { SESSION_ENDED, api, isUnreachable, type Profile } from './api'

interface AuthState {
  profile: Profile | null
  loading: boolean
  /** True when the person was signed out by the server (as opposed to signing out themselves). */
  sessionEnded: boolean
  /** The server could not be reached when the app opened (no signal). Not the same as being signed out. */
  unreachable: boolean
  retry: () => void
  setProfile: (p: Profile | null) => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [unreachable, setUnreachable] = useState(false)

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await api.me())
      setUnreachable(false)
    } catch (err) {
      // No signal is not the same as being signed out: keep the person out of the sign-in screen and try again.
      if (isUnreachable(err)) setUnreachable(true)
      else {
        setProfile(null)
        setUnreachable(false)
      }
    }
  }, [])

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false))
  }, [refreshProfile])

  // While the server cannot be reached, keep trying: every few seconds, and the moment the phone reports it is online.
  useEffect(() => {
    if (!unreachable) return
    const again = () => void refreshProfile()
    const timer = window.setInterval(again, 4000)
    window.addEventListener('online', again)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', again)
    }
  }, [unreachable, refreshProfile])

  useEffect(() => {
    const ended = () => {
      setProfile(null)
      setSessionEnded(true)
    }
    window.addEventListener(SESSION_ENDED, ended)
    return () => window.removeEventListener(SESSION_ENDED, ended)
  }, [])

  const value: AuthState = {
    profile,
    loading,
    sessionEnded,
    unreachable,
    retry: () => void refreshProfile(),
    setProfile: (p) => {
      if (p) setSessionEnded(false)
      setProfile(p)
    },
    refreshProfile,
    signOut: async () => {
      await api.logout().catch(() => {})
      setSessionEnded(false)
      setProfile(null)
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
