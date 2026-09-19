import { LOGGED_IN_USER } from '../data/sampleData'

export default function ProfilePage() {
  const user = LOGGED_IN_USER

  const fields = [
    { label: 'Name', value: 'Aryan Sharma', private: false },
    { label: 'Age', value: '26 years', private: true },
    { label: 'Height', value: "5'11\" / 180 cm", private: true },
    { label: 'Fitness Start Date', value: 'July 2026', private: false },
    { label: 'Training Experience', value: 'Intermediate (2 years)', private: true },
    { label: 'Current Program', value: 'Hub Zero PPL — 6 Day Split', private: false },
    { label: 'Body Weight', value: '78 kg', private: true },
  ]

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: '#0a0a0c' }}>
      <div className="px-4 pt-6 pb-4 md:px-8">
        <h1
          className="text-3xl font-black mb-1"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.04em' }}
        >
          PROFILE
        </h1>
      </div>

      <div className="px-4 md:px-8 max-w-2xl">
        {/* Profile card */}
        <div
          className="rounded-2xl p-6 mb-5 flex flex-col sm:flex-row items-center sm:items-start gap-5"
          style={{ background: '#111116', border: '1px solid #2a2a35' }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
            style={{ background: user.color, color: '#0a0a0c', fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            {user.initials}
          </div>
          <div className="text-center sm:text-left">
            <h2
              className="text-2xl font-black mb-1"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.04em' }}
            >
              ARYAN SHARMA
            </h2>
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <span
                className="text-xs px-2 py-1 rounded font-bold"
                style={{ background: '#3a121640', color: '#e63946', fontFamily: 'Barlow Condensed, sans-serif', border: '1px solid #e6394630', letterSpacing: '0.1em' }}
              >
                ADMIN
              </span>
              <span className="text-sm" style={{ color: '#888899' }}>fitness.hubzero.in</span>
            </div>
            <p className="text-sm mt-3" style={{ color: '#888899' }}>
              Member since July 2026 · Hub Zero Fitness
            </p>
          </div>
        </div>

        {/* Privacy legend */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
            <span style={{ color: '#888899' }}>Public to team</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#888899' }} />
            <span style={{ color: '#888899' }}>Private to you</span>
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3 mb-5">
          {fields.map((f) => (
            <div
              key={f.label}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: '#111116', border: '1px solid #2a2a35' }}
            >
              <div>
                <div className="text-xs mb-0.5 font-medium" style={{ color: '#888899', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em' }}>
                  {f.label.toUpperCase()}
                </div>
                <div className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>{f.value}</div>
              </div>
              <div className="flex items-center gap-2">
                {f.private ? (
                  <span className="text-xs flex items-center gap-1" style={{ color: '#888899' }}>
                    <span>🔒</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}>PRIVATE</span>
                  </span>
                ) : (
                  <span className="text-xs flex items-center gap-1" style={{ color: '#10b981' }}>
                    <span>👥</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}>TEAM</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Workouts', value: '11', sub: 'total logged' },
            { label: 'Streak', value: '5', sub: 'day streak' },
            { label: 'Consistency', value: '91%', sub: 'this month' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-3 py-4 text-center"
              style={{ background: '#111116', border: '1px solid #2a2a35' }}
            >
              <div className="text-2xl font-black mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#10b981' }}>
                {s.value}
              </div>
              <div className="text-xs font-semibold" style={{ color: '#f0f0f5' }}>{s.label}</div>
              <div className="text-xs" style={{ color: '#888899' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Edit button */}
        <button
          className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
          style={{
            background: '#1a1a22',
            color: '#888899',
            border: '1px solid #2a2a35',
            fontFamily: 'Barlow Condensed, sans-serif',
            letterSpacing: '0.1em',
          }}
        >
          EDIT PROFILE
        </button>
      </div>
    </div>
  )
}
