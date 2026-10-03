import type { EntityTable } from 'dexie'
import { db } from './db'
import { supabase } from './supabase'
import type { Match, MatchEvent, Player } from './types'

export interface SyncStatus {
  configured: boolean
  online: boolean
  syncing: boolean
  pending: number
  lastSyncedAt: string | null
  lastError: string | null
}

let status: SyncStatus = {
  configured: supabase !== null,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
}
const listeners = new Set<() => void>()

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  listeners.forEach((l) => l())
}

export const syncStore = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  get: () => status,
}

const toMatchRow = (m: Match) => ({
  id: m.id,
  home_name: m.homeName,
  away_name: m.awayName,
  status: m.status,
  clock: m.clock,
  home_possession_ms: Math.round(m.clock.homeMs),
  away_possession_ms: Math.round(m.clock.awayMs),
  match_ms: Math.round(m.clock.matchMs),
  created_at: m.createdAt,
  updated_at: m.updatedAt,
})

const toEventRow = (e: MatchEvent) => ({
  id: e.id,
  match_id: e.matchId,
  team: e.team,
  type: e.type,
  match_ms: e.matchMs,
  player: e.player,
  assist: e.assist,
  recorded_at: e.recordedAt,
  updated_at: e.updatedAt,
  deleted: e.deleted === 1,
})

const toPlayerRow = (p: Player) => ({
  id: p.id,
  name: p.name,
  team: p.team,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
  deleted: p.deleted === 1,
})

async function countPending() {
  const [m, e, p] = await Promise.all([
    db.matches.where('synced').equals(0).count(),
    db.events.where('synced').equals(0).count(),
    db.players.where('synced').equals(0).count(),
  ])
  return m + e + p
}

/**
 * Push one table's unsynced rows. A row is only marked synced if it was not
 * edited again while the upload was in flight.
 */
async function pushTable<T extends { id: string; updatedAt: string; synced: 0 | 1 }>(
  table: EntityTable<T, 'id'>,
  remote: string,
  toRow: (r: T) => object,
) {
  const rows = await table.where('synced').equals(0).toArray()
  if (rows.length === 0 || !supabase) return
  const { error } = await supabase.from(remote).upsert(rows.map(toRow))
  if (error) throw new Error(`${remote}: ${error.message}`)
  await db.transaction('rw', table, async () => {
    for (const sent of rows) {
      await table
        .where('id')
        .equals(sent.id)
        .filter((current) => current.updatedAt === sent.updatedAt)
        .modify((row) => {
          row.synced = 1
        })
    }
  })
}

let running = false
let again = false

export async function syncNow(): Promise<void> {
  if (running) {
    again = true
    return
  }
  running = true
  try {
    do {
      again = false
      setStatus({ pending: await countPending() })
      if (!supabase || !navigator.onLine || status.pending === 0) break
      setStatus({ syncing: true })
      try {
        // Matches first: events reference them.
        await pushTable(db.matches, 'matches', toMatchRow)
        await pushTable(db.events, 'events', toEventRow)
        await pushTable(db.players, 'players', toPlayerRow)
        setStatus({ lastSyncedAt: new Date().toISOString(), lastError: null })
      } catch (err) {
        setStatus({ lastError: err instanceof Error ? err.message : String(err) })
        break
      } finally {
        setStatus({ syncing: false, pending: await countPending() })
      }
    } while (again)
  } finally {
    running = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Called after every local write. Debounced and never awaited by the UI. */
export function requestSync() {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), 500)
}

export function startSyncLoop() {
  const onOnline = () => {
    setStatus({ online: true })
    requestSync()
  }
  const onOffline = () => setStatus({ online: false })
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  // navigator.onLine can claim "online" with no real connection, so retry on a timer too.
  const interval = setInterval(() => void syncNow(), 15000)
  void syncNow()
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    clearInterval(interval)
  }
}
