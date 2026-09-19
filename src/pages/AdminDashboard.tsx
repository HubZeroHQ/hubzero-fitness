import { useState } from 'react'
import { TEAM_MEMBERS } from '../data/sampleData'
import type { TeamMember } from '../data/sampleData'

type Role = 'member' | 'coach' | 'admin'

const roleColors: Record<Role, { bg: string; text: string }> = {
  admin: { bg: '#3a121640', text: '#e63946' },
  coach: { bg: '#0f204040', text: '#3b82f6' },
  member: { bg: '#1a1a22', text: '#888899' },
}

export default function AdminDashboard() {
  const [members, setMembers] = useState<TeamMember[]>(TEAM_MEMBERS)
  const [activeSection, setActiveSection] = useState<'users' | 'schedules' | 'settings'>('users')

  function changeRole(id: string, role: Role) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
  }

  const sections = [
    { id: 'users' as const, label: 'USER MANAGEMENT', icon: '👥' },
    { id: 'schedules' as const, label: 'SCHEDULES', icon: '📅' },
    { id: 'settings' as const, label: 'SETTINGS', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: '#0a0a0c' }}>
      <div className="px-4 pt-6 pb-4 md:px-8">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1
            className="text-3xl font-black"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.04em' }}
          >
            ADMIN DASHBOARD
          </h1>
          <span
            className="text-xs px-2 py-1 rounded font-bold"
            style={{ background: '#3a121640', color: '#e63946', border: '1px solid #e6394630', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em' }}
          >
            ⚙️ ADMIN
          </span>
        </div>
        <p className="text-sm" style={{ color: '#888899' }}>Full system access — manage team, roles, and settings</p>
      </div>

      <div className="px-4 md:px-8 max-w-4xl">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Members', value: members.length, color: '#3b82f6' },
            { label: 'Active Today', value: 3, color: '#10b981' },
            { label: 'Coaches', value: members.filter((m) => m.role === 'coach').length, color: '#f59e0b' },
            { label: 'Admins', value: members.filter((m) => m.role === 'admin').length, color: '#e63946' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-4 py-4"
              style={{ background: '#111116', border: '1px solid #2a2a35' }}
            >
              <div className="text-3xl font-black mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: s.color }}>
                {s.value}
              </div>
              <div className="text-xs" style={{ color: '#888899' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: activeSection === s.id ? '#1a1a22' : '#111116',
                color: activeSection === s.id ? '#f0f0f5' : '#888899',
                border: `1px solid ${activeSection === s.id ? '#2a2a35' : '#1a1a22'}`,
                fontFamily: 'Barlow Condensed, sans-serif',
                letterSpacing: '0.06em',
              }}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* USER MANAGEMENT */}
        {activeSection === 'users' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: '#111116', border: '1px solid #2a2a35' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2a2a35', background: '#0d0d12' }}>
              <span className="text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.06em' }}>
                TEAM MEMBERS
              </span>
              <button
                className="text-xs px-3 py-1.5 rounded font-bold transition-colors"
                style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98130', fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                + ADD MEMBER
              </button>
            </div>

            <div className="divide-y" style={{ borderColor: '#1a1a22' }}>
              {members.map((m) => {
                const rc = roleColors[m.role]
                return (
                  <div key={m.id} className="px-5 py-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: m.color + '22', color: m.color, fontFamily: 'Barlow Condensed, sans-serif' }}
                    >
                      {m.initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>{m.name}</div>
                      <div className="text-xs" style={{ color: '#888899' }}>
                        Age {m.age} · {m.height} · Since {m.startDate}
                      </div>
                    </div>

                    {/* Role selector */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(['member', 'coach', 'admin'] as Role[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => changeRole(m.id, r)}
                          className="text-xs px-2 py-1 rounded font-bold transition-all"
                          style={{
                            background: m.role === r ? roleColors[r].bg : 'transparent',
                            color: m.role === r ? roleColors[r].text : '#444455',
                            border: `1px solid ${m.role === r ? roleColors[r].text + '30' : 'transparent'}`,
                            fontFamily: 'Barlow Condensed, sans-serif',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {r.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {/* Actions */}
                    <button className="flex-shrink-0 text-xs" style={{ color: '#444455' }}>✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SCHEDULES */}
        {activeSection === 'schedules' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-5" style={{ background: '#111116', border: '1px solid #2a2a35' }}>
              <div className="text-sm font-bold mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.06em' }}>
                CURRENT WEEK — SEPT 14–20, 2026
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { day: 'Monday, Sep 14', label: 'DAY 1 — PUSH', color: '#e63946' },
                  { day: 'Tuesday, Sep 15', label: 'DAY 2 — PULL', color: '#3b82f6' },
                  { day: 'Wednesday, Sep 16', label: 'DAY 3 — LEGS + CORE', color: '#10b981' },
                  { day: 'Thursday, Sep 17', label: 'DAY 4 — PUSH', color: '#e63946' },
                  { day: 'Friday, Sep 18', label: 'DAY 5 — PULL', color: '#3b82f6' },
                  { day: 'Saturday, Sep 19', label: 'DAY 6 — LEGS + CORE', color: '#10b981', isToday: true },
                  { day: 'Sunday, Sep 20', label: 'DAY 7 — REST', color: '#6b7280' },
                ].map((s) => (
                  <div
                    key={s.day}
                    className="flex items-center gap-4 rounded-lg px-4 py-3"
                    style={{ background: s.isToday ? '#1a1a22' : '#0d0d12', border: `1px solid ${s.isToday ? s.color + '40' : '#2a2a35'}` }}
                  >
                    <div className="w-36 text-xs" style={{ color: '#888899', fontFamily: 'JetBrains Mono, monospace' }}>{s.day}</div>
                    <div className="flex-1 text-sm font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: s.color, letterSpacing: '0.04em' }}>
                      {s.label}
                    </div>
                    {s.isToday && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: s.color + '20', color: s.color, fontFamily: 'Barlow Condensed, sans-serif' }}>
                        TODAY
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeSection === 'settings' && (
          <div className="flex flex-col gap-4">
            {[
              { label: 'Public Progress Visibility', sub: 'Allow team members to view team progress page', on: true },
              { label: 'Normalized Scores Only', sub: 'Never expose raw weights or reps to other members', on: true },
              { label: 'Name Visibility', sub: 'Show member names on the team progress chart', on: true },
              { label: 'Progress Notifications', sub: 'Notify members of weekly progress summaries', on: false },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-4 rounded-xl px-5 py-4"
                style={{ background: '#111116', border: '1px solid #2a2a35' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>{s.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#888899' }}>{s.sub}</div>
                </div>
                <div
                  className="flex-shrink-0 w-12 h-6 rounded-full relative cursor-pointer transition-all"
                  style={{ background: s.on ? '#10b981' : '#2a2a35' }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full transition-all"
                    style={{ left: s.on ? 28 : 4, background: '#fff' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
