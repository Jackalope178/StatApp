import { matchMinute } from './clock'
import { EVENT_META, EVENT_TYPES } from './eventTypes'
import type { EventType, Match, MatchEvent, Side } from './types'

export type TeamStats = Record<EventType, number> & { assists: number; possessionMs: number; possessionPct: number }

export function computeStats(match: Match, events: MatchEvent[], clock: { homeMs: number; awayMs: number }) {
  const live = events.filter((e) => !e.deleted)
  const totalPoss = clock.homeMs + clock.awayMs
  const team = (side: Side): TeamStats => {
    const counts = Object.fromEntries(EVENT_TYPES.map((t) => [t.type, 0])) as Record<EventType, number>
    for (const e of live) if (e.team === side) counts[e.type]++
    const possessionMs = side === 'home' ? clock.homeMs : clock.awayMs
    return {
      ...counts,
      assists: live.filter((e) => e.team === side && e.type === 'goal' && e.assist).length,
      possessionMs,
      possessionPct: totalPoss > 0 ? Math.round((possessionMs / totalPoss) * 100) : 0,
    }
  }
  const goals = live
    .filter((e) => e.type === 'goal')
    .sort((a, b) => a.matchMs - b.matchMs)
    .map((e) => ({
      team: e.team,
      teamName: e.team === 'home' ? match.homeName : match.awayName,
      minute: matchMinute(e.matchMs),
      player: e.player,
      assist: e.assist,
    }))
  return { home: team('home'), away: team('away'), goals }
}

export const STAT_ROWS: { key: keyof TeamStats; label: string }[] = [
  { key: 'goal', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'shot', label: EVENT_META.shot.label + 's' },
  { key: 'shot_on_goal', label: 'Shots on goal' },
  { key: 'chance_created', label: 'Chances created' },
  { key: 'pass', label: 'Passes' },
  { key: 'tackle', label: 'Tackles' },
  { key: 'foul', label: 'Fouls' },
]
