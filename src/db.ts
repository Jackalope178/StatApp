import { Dexie, type EntityTable } from 'dexie'
import type { Match, MatchEvent, Player } from './types'

export const db = new Dexie('statapp') as Dexie & {
  matches: EntityTable<Match, 'id'>
  events: EntityTable<MatchEvent, 'id'>
  players: EntityTable<Player, 'id'>
}

db.version(1).stores({
  matches: 'id, createdAt, synced',
  events: 'id, matchId, synced',
  players: 'id, name, team, synced',
})

/** Ask the browser not to evict our data under storage pressure. Best effort. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
