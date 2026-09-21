import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type Profile } from './api'

interface AuthState {
  profile: Profile | null
  loading: boolean
  setProfile: (p: Profile | null) => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await api.me())
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false))
  }, [refreshProfile])

  const value: AuthState = {
    profile,
    loading,
    setProfile,
    refreshProfile,
    signOut: async () => {
      await api.logout().catch(() => {})
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
