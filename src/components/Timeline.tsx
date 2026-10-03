import { useState } from 'react'
import { EVENT_META } from '../eventTypes'
import { eventLabel } from '../labels'
import type { Match, MatchEvent } from '../types'

interface Props {
  match: Match
  events: MatchEvent[]
  currentMs: number
}

const MAX_LANES = 6
const LANE_PX = 16

/** Home team markers sit above the line, away team below. */
export function Timeline({ match, events, currentMs }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const spanMs = Math.max(90 * 60000, currentMs + 5 * 60000)
  const pct = (ms: number) => `${Math.min(100, (ms / spanMs) * 100)}%`
  const ticks = []
  for (let m = 0; m * 60000 <= spanMs; m += 15) ticks.push(m)
  const sel = events.find((e) => e.id === selected)

  // Markers closer than ~2% of the track would overlap, so stack them in rows.
  const lanes = new Map<string, number>()
  const laneEnds: Record<string, number[]> = { home: [], away: [] }
  for (const e of [...events].sort((a, b) => a.matchMs - b.matchMs)) {
    const ends = laneEnds[e.team]
    let lane = ends.findIndex((end) => e.matchMs - end > spanMs * 0.02)
    if (lane === -1) lane = ends.length < MAX_LANES ? ends.length : ends.indexOf(Math.min(...ends))
    ends[lane] = e.matchMs
    lanes.set(e.id, lane)
  }
  const rows = Math.max(1, laneEnds.home.length, laneEnds.away.length)
  const half = 14 + rows * LANE_PX
  const markerTop = (e: MatchEvent) =>
    e.team === 'home' ? half - 10 - (lanes.get(e.id) ?? 0) * LANE_PX - 14 : half + 10 + (lanes.get(e.id) ?? 0) * LANE_PX

  return (
    <div className="timeline">
      <div className="timeline-label timeline-label-home">▲ {match.homeName}</div>
      <div className="timeline-track" style={{ height: half * 2 }} onClick={() => setSelected(null)}>
        <div className="timeline-line" />
        {ticks.map((m) => (
          <div key={m} className="timeline-tick" style={{ left: pct(m * 60000) }} />
        ))}
        <div className="timeline-now" style={{ left: pct(currentMs) }} />
        {events.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`marker marker-${e.team} ${e.type === 'goal' ? 'marker-goal' : ''} ${selected === e.id ? 'is-selected' : ''}`}
            style={{ left: pct(e.matchMs), top: markerTop(e), background: EVENT_META[e.type].color }}
            aria-label={eventLabel(match, e)}
            onClick={(ev) => {
              ev.stopPropagation()
              setSelected(selected === e.id ? null : e.id)
            }}
          />
        ))}
      </div>
      <div className="timeline-axis">
        {ticks.map((m) => (
          <span key={m} style={{ left: pct(m * 60000) }}>
            {m}'
          </span>
        ))}
      </div>
      <div className="timeline-label timeline-label-away">▼ {match.awayName}</div>
      <div className="marker-pop" aria-live="polite">
        {sel ? (
          <>
            <i style={{ background: EVENT_META[sel.type].color }} /> {eventLabel(match, sel)}
          </>
        ) : (
          <span className="muted">Tap a marker to see what happened</span>
        )}
      </div>
      <div className="legend">
        {Object.values(EVENT_META).map((t) => (
          <span key={t.type}>
            <i style={{ background: t.color }} /> {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}
