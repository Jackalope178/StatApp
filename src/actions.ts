import { db } from './db'
import { NEW_CLOCK, readClock } from './clock'
import { requestSync } from './sync'
import type { ClockState, EventType, Match, MatchEvent, Side } from './types'

const nowIso = () => new Date().toISOString()

export async function createMatch(homeName: string, awayName: string): Promise<string> {
  const ts = nowIso()
  const match: Match = {
    id: crypto.randomUUID(),
    homeName,
    awayName,
    status: 'live',
    clock: NEW_CLOCK,
    createdAt: ts,
    updatedAt: ts,
    synced: 0,
  }
  await db.matches.add(match)
  requestSync()
  return match.id
}

export async function updateMatch(id: string, changes: Partial<Pick<Match, 'homeName' | 'awayName' | 'status' | 'clock'>>) {
  await db.matches.update(id, { ...changes, updatedAt: nowIso(), synced: 0 })
  requestSync()
}

/**
 * Apply a clock transition to the stored state inside a transaction, so rapid
 * taps always build on the latest saved clock rather than a stale render.
 */
export async function mutateClock(id: string, fn: (c: ClockState, now: number) => ClockState) {
  await db.transaction('rw', db.matches, async () => {
    const match = await db.matches.get(id)
    if (!match) return
    await db.matches.update(id, { clock: fn(match.clock, Date.now()), updatedAt: nowIso(), synced: 0 })
  })
  requestSync()
}

export async function logEvent(
  match: Match,
  team: Side,
  type: EventType,
  extra: { player?: string | null; assist?: string | null } = {},
): Promise<MatchEvent> {
  const ts = nowIso()
  const event: MatchEvent = {
    id: crypto.randomUUID(),
    matchId: match.id,
    team,
    type,
    matchMs: Math.round(readClock(match.clock, Date.now()).matchMs),
    player: extra.player?.trim() || null,
    assist: extra.assist?.trim() || null,
    recordedAt: ts,
    updatedAt: ts,
    deleted: 0,
    synced: 0,
  }
  await db.events.add(event)
  requestSync()
  return event
}

/** Soft delete so the removal also syncs to the cloud. */
export async function deleteEvent(id: string) {
  await db.events.update(id, { deleted: 1, updatedAt: nowIso(), synced: 0 })
  requestSync()
}

export async function undoLastEvent(matchId: string) {
  const events = await db.events.where('matchId').equals(matchId).filter((e) => !e.deleted).sortBy('recordedAt')
  const last = events.at(-1)
  if (last) await deleteEvent(last.id)
}

/** Add a player to the databank unless that name already exists for the team. */
export async function ensurePlayer(name: string, team: string) {
  const clean = name.trim()
  if (!clean) return
  const existing = await db.players
    .where('name')
    .equalsIgnoreCase(clean)
    .filter((p) => !p.deleted && p.team.toLowerCase() === team.trim().toLowerCase())
    .first()
  if (existing) return
  const ts = nowIso()
  await db.players.add({
    id: crypto.randomUUID(),
    name: clean,
    team: team.trim(),
    createdAt: ts,
    updatedAt: ts,
    deleted: 0,
    synced: 0,
  })
  requestSync()
}

export async function deletePlayer(id: string) {
  await db.players.update(id, { deleted: 1, updatedAt: nowIso(), synced: 0 })
  requestSync()
}

export async function setGoalNames(id: string, player: string, assist: string) {
  await db.events.update(id, {
    player: player.trim() || null,
    assist: assist.trim() || null,
    updatedAt: nowIso(),
    synced: 0,
  })
  requestSync()
}
