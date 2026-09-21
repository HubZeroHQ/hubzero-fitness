import { useEffect, useState } from 'react'
import { api, type BodyMetric, type FullLog, type Profile } from './api'

/** All workout logs (with sets) for one user, or for everyone when userId is omitted. Oldest first. */
export function useLogs(userId?: number) {
  const [logs, setLogs] = useState<FullLog[] | null>(null)
  useEffect(() => {
    let active = true
    api.logs(userId).then((d) => active && setLogs(d)).catch(() => active && setLogs([]))
    return () => {
      active = false
    }
  }, [userId])
  return logs
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  useEffect(() => {
    let active = true
    api.profiles().then((d) => active && setProfiles(d)).catch(() => active && setProfiles([]))
    return () => {
      active = false
    }
  }, [])
  return profiles
}

export function useMetrics(userId?: number, reloadKey = 0) {
  const [metrics, setMetrics] = useState<BodyMetric[] | null>(null)
  useEffect(() => {
    let active = true
    api.metrics(userId).then((d) => active && setMetrics(d)).catch(() => active && setMetrics([]))
    return () => {
      active = false
    }
  }, [userId, reloadKey])
  return metrics
}
