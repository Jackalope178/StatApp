import { describe, expect, it } from 'vitest'
import { NEW_CLOCK } from './clock'
import { eventsCsv, summaryCsv } from './export'
import { computeStats } from './stats'
import type { Match, MatchEvent } from './types'

const match: Match = {
  id: 'm1',
  homeName: 'Lions',
  awayName: 'Tigers, FC',
  status: 'finished',
  clock: { ...NEW_CLOCK, matchMs: 90 * 60_000, homeMs: 30 * 60_000, awayMs: 10 * 60_000 },
  createdAt: '2026-10-03T15:00:00.000Z',
  updatedAt: '2026-10-03T15:00:00.000Z',
  synced: 0,
}

let n = 0
const ev = (p: Partial<MatchEvent>): MatchEvent => ({
  id: `e${n++}`,
  matchId: 'm1',
  team: 'home',
  type: 'pass',
  matchMs: 0,
  player: null,
  assist: null,
  recordedAt: '2026-10-03T15:00:00.000Z',
  updatedAt: '2026-10-03T15:00:00.000Z',
  deleted: 0,
  synced: 0,
  ...p,
})

const events = [
  ev({ type: 'goal', matchMs: 22 * 60_000 + 5000, player: 'Sam', assist: 'Alex' }),
  ev({ type: 'goal', team: 'away', matchMs: 70 * 60_000, player: 'Jo' }),
  ev({ type: 'shot' }),
  ev({ type: 'shot', deleted: 1 }),
  ev({ type: 'foul', team: 'away' }),
]

describe('computeStats', () => {
  it('counts per team, ignores deleted events, and computes possession', () => {
    const s = computeStats(match, events, match.clock)
    expect(s.home).toMatchObject({ goal: 1, assists: 1, shot: 1, possessionPct: 75 })
    expect(s.away).toMatchObject({ goal: 1, assists: 0, foul: 1, possessionPct: 25 })
    expect(s.goals.map((g) => [g.minute, g.player])).toEqual([
      [23, 'Sam'],
      [71, 'Jo'],
    ])
  })
})

describe('CSV export', () => {
  it('quotes values containing commas and skips deleted events', () => {
    const csv = eventsCsv(match, events)
    expect(csv.split('\r\n')).toHaveLength(1 + 4)
    expect(csv).toContain('"Tigers, FC"')
  })

  it('summary includes possession and scorers', () => {
    const csv = summaryCsv(match, events)
    expect(csv).toContain('Possession %,75,25')
    expect(csv).toContain('23,Lions,Sam,Alex')
  })
})
