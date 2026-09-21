import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { programApi } from './api'
import type { ProgramDay } from './program'

interface ProgramState {
  days: ProgramDay[]
  dayByNumber: (n: number) => ProgramDay
  /** Replace one day after the coach edits it. */
  replaceDay: (d: ProgramDay) => void
  reload: () => Promise<void>
}

const ProgramContext = createContext<ProgramState | null>(null)

/** Loads the timetable once after login; the coach's edits update it in place. */
export function ProgramProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<ProgramDay[] | null>(null)
  const [failed, setFailed] = useState(false)

  const reload = useCallback(async () => {
    try {
      setDays(await programApi.get())
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  if (!days) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: '#888899' }}>
        {failed ? "Couldn't load the workout program. Refresh to retry." : 'Loading…'}
      </div>
    )
  }

  const value: ProgramState = {
    days,
    dayByNumber: (n) => days.find((d) => d.day === n) ?? days[0],
    replaceDay: (d) => setDays((cur) => cur!.map((x) => (x.day === d.day ? d : x))),
    reload,
  }
  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>
}

export function useProgram(): ProgramState {
  const ctx = useContext(ProgramContext)
  if (!ctx) throw new Error('useProgram must be used inside ProgramProvider')
  return ctx
}
