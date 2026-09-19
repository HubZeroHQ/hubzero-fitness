import { LOGGED_IN_USER } from '../data/sampleData'

type Page = 'workout' | 'progress' | 'team' | 'profile' | 'coach' | 'admin'

interface NavProps {
  current: Page
  onNavigate: (p: Page) => void
  onLogout: () => void
}

const navItems: { id: Page; label: string; icon: string; roles?: string[] }[] = [
  { id: 'workout', label: "Today's Workout", icon: '⚡' },
  { id: 'progress', label: 'My Progress', icon: '📈' },
  { id: 'team', label: 'Team Progress', icon: '👥' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'coach', label: 'Coach', icon: '🎯', roles: ['coach', 'admin'] },
  { id: 'admin', label: 'Admin', icon: '⚙️', roles: ['admin'] },
]

export default function Nav({ current, onNavigate, onLogout }: NavProps) {
  const user = LOGGED_IN_USER
  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  )

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 z-40"
        style={{ background: '#0d0d12', borderRight: '1px solid #2a2a35' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #2a2a35' }}>
          <img
            src="/assets/hubzero-logo.jpeg"
            alt="Hub Zero"
            className="w-9 h-9 rounded-md object-cover"
          />
          <div>
            <div
              className="text-sm font-bold leading-tight tracking-widest"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5' }}
            >
              HUB ZERO
            </div>
            <div className="text-xs" style={{ color: '#10b981', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.12em' }}>
              FITNESS
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = current === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  background: isActive ? '#1a1a22' : 'transparent',
                  color: isActive ? '#f0f0f5' : '#888899',
                  borderLeft: isActive ? '2px solid #e63946' : '2px solid transparent',
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>

        {/* User footer */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid #2a2a35' }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: user.color, color: '#0a0a0c' }}
            >
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: '#f0f0f5' }}>{user.name}</div>
              <div
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: user.color, fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                {user.role}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full text-xs py-1.5 rounded text-center transition-colors"
            style={{ color: '#888899', background: '#1a1a22' }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{ background: '#0d0d12', borderTop: '1px solid #2a2a35' }}
      >
        {visibleItems.slice(0, 5).map((item) => {
          const isActive = current === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors"
              style={{ color: isActive ? '#e63946' : '#888899' }}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] leading-none">{item.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
