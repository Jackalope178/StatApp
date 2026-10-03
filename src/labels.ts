import { matchMinute } from './clock'
import { EVENT_META } from './eventTypes'
import type { Match, MatchEvent } from './types'

export function eventLabel(match: Match, e: MatchEvent): string {
  const team = e.team === 'home' ? match.homeName : match.awayName
  let label = `${EVENT_META[e.type].label} · ${team} · ${matchMinute(e.matchMs)}'`
  if (e.player) label += ` · ${e.player}`
  if (e.assist) label += ` (assist ${e.assist})`
  return label
}
