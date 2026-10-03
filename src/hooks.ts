import { useEffect, useState, useSyncExternalStore } from 'react'
import { syncStore } from './sync'

/** Re-renders on an interval while `active`, returning the current time. */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])
  // When paused the clock doesn't depend on `now`, so a stale value is fine.
  return now
}

export function useSyncStatus() {
  return useSyncExternalStore(syncStore.subscribe, syncStore.get)
}
