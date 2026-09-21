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
import { ProgramProvider } from './lib/programContext'

function Shell() {
  const { profile, loading } = useAuth()
  const [page, setPage] = useState<Page>('today')

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
    program: profile.role === 'coach' ? <EditProgram /> : <Today />,
  }[page]

  return (
    <ProgramProvider>
      <div className="min-h-screen" style={{ background: '#0a0a0c' }}>
        <Nav current={page} onNavigate={setPage} />
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
