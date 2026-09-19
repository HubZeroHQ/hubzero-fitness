import logoSrc from '@/assets/hubzero-logo.jpeg'

interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0a0a0c' }}
    >
      {/* Background accent */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{ background: '#e63946' }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: '#111116', border: '1px solid #2a2a35' }}
            >
              <img src={logoSrc} alt="Hub Zero" className="w-full h-full object-cover" />
            </div>
          </div>

          <h1
            className="text-4xl font-black tracking-widest mb-1"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5' }}
          >
            HUB ZERO
          </h1>
          <div
            className="text-sm font-bold tracking-[0.3em] mb-3"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#e63946' }}
          >
            FITNESS
          </div>
          <p
            className="text-center text-sm font-medium tracking-widest"
            style={{ color: '#888899', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.2em' }}
          >
            TRAIN • IMPROVE • BELONG
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: '#111116', border: '1px solid #2a2a35' }}
        >
          <h2
            className="text-lg font-bold mb-2"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.05em' }}
          >
            MEMBER LOGIN
          </h2>
          <p className="text-sm mb-8" style={{ color: '#888899' }}>
            Use your HubZero account to access your fitness dashboard.
          </p>

          {/* Login button */}
          <button
            onClick={onLogin}
            className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: 'linear-gradient(135deg, #e63946 0%, #c62d3b 100%)',
              color: '#fff',
              fontFamily: 'Barlow Condensed, sans-serif',
              letterSpacing: '0.1em',
              fontSize: '1.05rem',
            }}
          >
            LOGIN WITH HUBZERO
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: '#2a2a35' }} />
            <span className="text-xs" style={{ color: '#444455' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: '#2a2a35' }} />
          </div>

          {/* Privacy note */}
          <div
            className="rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ background: '#1a1a22', border: '1px solid #2a2a35' }}
          >
            <span style={{ color: '#10b981' }}>🔒</span>
            <p className="text-xs leading-relaxed" style={{ color: '#888899' }}>
              Your personal workout data — weights, reps, and performance metrics — is{' '}
              <strong style={{ color: '#c0c0cc' }}>always private</strong>. Only your normalized
              progress trend is visible to teammates.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-8" style={{ color: '#444455' }}>
          fitness.hubzero.in · Hub Zero Fitness
        </p>
      </div>
    </div>
  )
}
