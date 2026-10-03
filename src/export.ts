import { formatClock, matchMinute } from './clock'
import { EVENT_META } from './eventTypes'
import { computeStats, STAT_ROWS } from './stats'
import type { Match, MatchEvent } from './types'

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

export function eventsCsv(match: Match, events: MatchEvent[]): string {
  const rows: unknown[][] = [
    ['minute', 'match_clock', 'match_ms', 'team', 'team_name', 'event', 'player', 'assist', 'recorded_at'],
  ]
  for (const e of [...events].filter((e) => !e.deleted).sort((a, b) => a.matchMs - b.matchMs)) {
    rows.push([
      matchMinute(e.matchMs),
      formatClock(e.matchMs),
      e.matchMs,
      e.team,
      e.team === 'home' ? match.homeName : match.awayName,
      EVENT_META[e.type].label,
      e.player,
      e.assist,
      e.recordedAt,
    ])
  }
  return toCsv(rows)
}

export function summaryCsv(match: Match, events: MatchEvent[]): string {
  const s = computeStats(match, events, match.clock)
  const rows: unknown[][] = [['stat', match.homeName, match.awayName]]
  for (const r of STAT_ROWS) rows.push([r.label, s.home[r.key], s.away[r.key]])
  rows.push(['Possession %', s.home.possessionPct, s.away.possessionPct])
  rows.push(['Possession time', formatClock(s.home.possessionMs), formatClock(s.away.possessionMs)])
  rows.push([])
  rows.push(['goal_minute', 'team', 'scorer', 'assist'])
  for (const g of s.goals) rows.push([g.minute, g.teamName, g.player, g.assist])
  return toCsv(rows)
}

export function downloadFile(filename: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function fileBase(match: Match): string {
  const date = match.createdAt.slice(0, 10)
  const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  return `${date}_${slug(match.homeName)}-vs-${slug(match.awayName)}`
}
