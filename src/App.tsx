import { Suspense, lazy, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import Nav, { type Page } from './components/Nav'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Today from './pages/Today'
import { ProgramProvider } from './lib/programContext'

// Everything except sign-in and today's workout loads on demand: the charting library is most of the download and only
// these pages need it, so the screen used in the gym starts fast even on a weak connection.
const loadProgress = () => import('./pages/Progress')
const loadTeam = () => import('./pages/Team')
const loadMe = () => import('./pages/Me')
const Progress = lazy(loadProgress)
const Team = lazy(loadTeam)
const Me = lazy(loadMe)
const EditProgram = lazy(() => import('./pages/EditProgram'))
const Coach = lazy(() => import('./pages/Coach'))
const Logs = lazy(() => import('./pages/Logs'))

function Shell() {
  const { profile, loading, unreachable, retry } = useAuth()
  const [page, setPage] = useState<Page>('today')
  // Which person's program the editor opens on (0 = the team default); set by the Coach Panel's shortcut.
  const [programScope, setProgramScope] = useState(0)

  // Once the workout screen is up, quietly fetch the other pages so they still open if the signal drops later.
  const signedIn = !!profile && !profile.must_change_password
  useEffect(() => {
    if (!signedIn) return
    const t = window.setTimeout(() => {
      void loadProgress().catch(() => {})
      void loadTeam().catch(() => {})
      void loadMe().catch(() => {})
    }, 2000)
    return () => window.clearTimeout(t)
  }, [signedIn])

  // A new tab opens at the top, not wherever the previous one was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: '#888899' }}>
        Loading…
      </div>
    )
  }
  if (!profile && unreachable) {
    return (
      <div className="flex items-center justify-center px-6 text-center" style={{ minHeight: '100dvh', background: '#0a0a0c' }}>
        <div className="max-w-sm">
          <div className="text-3xl font-bold uppercase mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            No connection
          </div>
          <p className="text-sm mb-5" style={{ color: '#888899' }}>
            Can&apos;t reach the server. Anything you logged is kept on this phone and will be sent once you are back online. Trying again automatically…
          </p>
          <button onClick={retry} className="rounded-lg px-6 font-semibold uppercase tracking-wide" style={{ minHeight: 48, background: '#e63946', color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17 }}>
            Try again now
          </button>
        </div>
      </div>
    )
  }
  if (!profile) return <Login />
  if (profile.must_change_password) return <ChangePassword />

  const content = {
    today: <Today />,
    progress: <Progress />,
    team: <Team />,
    me: <Me />,
    // Also enforced on the server; this just hides the page from non-coaches.
    coach: profile.role === 'coach' ? (
      <Coach
        onEditProgram={(id) => {
          setProgramScope(id)
          setPage('program')
        }}
      />
    ) : (
      <Today />
    ),
    // Read-only activity log for the coach and the moderator (the server checks this too).
    logs: profile.role === 'coach' || profile.role === 'moderator' ? <Logs /> : <Today />,
    program: profile.role === 'coach' ? <EditProgram key={programScope} initialScope={programScope} /> : <Today />,
  }[page]

  return (
    <ProgramProvider>
      <div className="min-h-screen" style={{ background: '#0a0a0c' }}>
        <Nav
          current={page}
          onNavigate={(p) => {
            if (p === 'program') setProgramScope(0)
            setPage(p)
          }}
        />
        <main className="md:pl-56 hz-page-bottom">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
            <Suspense fallback={<div style={{ color: '#888899' }}>Loading…</div>}>{content}</Suspense>
          </div>
        </main>
      </div>
    </ProgramProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
