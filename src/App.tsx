import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import Nav, { type Page } from './components/Nav'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Today from './pages/Today'
import Progress from './pages/Progress'
import Team from './pages/Team'
import Me from './pages/Me'
import EditProgram from './pages/EditProgram'
import Coach from './pages/Coach'
import Logs from './pages/Logs'
import { ProgramProvider } from './lib/programContext'

function Shell() {
  const { profile, loading } = useAuth()
  const [page, setPage] = useState<Page>('today')
  // Which person's program the editor opens on (0 = the team default); set by the Coach Panel's shortcut.
  const [programScope, setProgramScope] = useState(0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: '#888899' }}>
        Loading…
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
        <main className="md:pl-56 pb-24 md:pb-8">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">{content}</div>
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
