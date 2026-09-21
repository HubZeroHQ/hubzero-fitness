import { useAuth } from '../lib/auth'
import type { Role } from '../lib/api'
import { font } from './ui'

export type Page = 'today' | 'progress' | 'team' | 'me' | 'coach' | 'logs' | 'program'

const items: { id: Page; label: string; short: string; icon: string; roles?: Role[] }[] = [
  { id: 'today', label: "Today's Workout", short: 'Today', icon: '⚡' },
  { id: 'progress', label: 'My Progress', short: 'Progress', icon: '📈' },
  { id: 'team', label: 'Team', short: 'Team', icon: '👥' },
  { id: 'me', label: 'Profile & BMI', short: 'Profile', icon: '👤' },
  { id: 'coach', label: 'Coach Panel', short: 'Coach', icon: '🎯', roles: ['coach'] },
  { id: 'logs', label: 'Activity Log', short: 'Logs', icon: '📜', roles: ['coach', 'moderator'] },
  { id: 'program', label: 'Edit Program', short: 'Program', icon: '🛠️', roles: ['coach'] },
]

const roleLabel = { coach: 'Coach', moderator: 'Moderator', member: 'Member' } as const

export default function Nav({ current, onNavigate }: { current: Page; onNavigate: (p: Page) => void }) {
  const { profile, signOut } = useAuth()
  const visible = items.filter((it) => !it.roles || (profile && it.roles.includes(profile.role)))

  return (
    <>
      <nav
        className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 z-40"
        style={{ background: '#0d0d12', borderRight: '1px solid #2a2a35' }}
      >
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #2a2a35' }}>
          <img src="/assets/hubzero-logo.jpeg" alt="Hub Zero" className="w-9 h-9 rounded-md object-cover" />
          <div>
            <div className="text-sm font-bold leading-tight tracking-widest" style={{ fontFamily: font.display }}>
              HUB ZERO
            </div>
            <div className="text-xs" style={{ color: '#10b981', fontFamily: font.display, letterSpacing: '0.12em' }}>
              FITNESS
            </div>
          </div>
        </div>

        <div className="flex-1 py-4 flex flex-col gap-1 px-3">
          {visible.map((it) => {
            const active = current === it.id
            return (
              <button
                key={it.id}
                onClick={() => onNavigate(it.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left"
                style={{
                  background: active ? '#1a1a22' : 'transparent',
                  color: active ? '#f0f0f5' : '#888899',
                  borderLeft: active ? '3px solid #e63946' : '3px solid transparent',
                  fontFamily: font.display,
                  fontSize: 17,
                  letterSpacing: '0.05em',
                }}
              >
                <span>{it.icon}</span>
                {it.label}
              </button>
            )
          })}
        </div>

        <div className="p-4" style={{ borderTop: '1px solid #2a2a35' }}>
          <div className="text-sm font-semibold">{profile?.full_name}</div>
          <div className="text-xs mb-3" style={{ color: '#888899' }}>
            {profile ? roleLabel[profile.role] : ''}
          </div>
          <button onClick={signOut} className="text-xs uppercase tracking-widest" style={{ color: '#e63946', fontFamily: font.display }}>
            Sign out
          </button>
        </div>
      </nav>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{ background: '#0d0d12', borderTop: '1px solid #2a2a35', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {visible.map((it) => {
          const active = current === it.id
          return (
            <button
              key={it.id}
              onClick={() => onNavigate(it.id)}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5"
              style={{ color: active ? '#f0f0f5' : '#888899', borderTop: active ? '2px solid #e63946' : '2px solid transparent' }}
            >
              <span className="text-lg">{it.icon}</span>
              <span className="text-[11px]" style={{ fontFamily: font.display, letterSpacing: '0.06em' }}>
                {it.short.toUpperCase()}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
