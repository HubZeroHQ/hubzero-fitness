import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import WorkoutPage from './pages/WorkoutPage'
import MyProgressPage from './pages/MyProgressPage'
import TeamProgressPage from './pages/TeamProgressPage'
import ProfilePage from './pages/ProfilePage'
import CoachDashboard from './pages/CoachDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Nav from './components/Nav'

type Page = 'workout' | 'progress' | 'team' | 'profile' | 'coach' | 'admin'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [page, setPage] = useState<Page>('workout')

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />
  }

  const pageContent = {
    workout: <WorkoutPage />,
    progress: <MyProgressPage />,
    team: <TeamProgressPage />,
    profile: <ProfilePage />,
    coach: <CoachDashboard />,
    admin: <AdminDashboard />,
  }[page]

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0c' }}>
      <Nav current={page} onNavigate={setPage} onLogout={() => setLoggedIn(false)} />
      <div className="md:pl-56">
        {pageContent}
      </div>
    </div>
  )
}
