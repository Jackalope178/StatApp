import { useLiveQuery } from 'dexie-react-hooks'
import { formatClock, matchMinute } from '../clock'
import { db } from '../db'
import { EVENT_META } from '../eventTypes'
import { downloadFile, eventsCsv, fileBase, summaryCsv } from '../export'
import { computeStats, STAT_ROWS } from '../stats'
import type { Match } from '../types'
import { Timeline } from './Timeline'

interface Props {
  match: Match
  onBack: () => void
  onResume: () => void
}

export function StatSheet({ match, onBack, onResume }: Props) {
  const events =
    useLiveQuery(
      () => db.events.where('matchId').equals(match.id).filter((e) => !e.deleted).sortBy('matchMs'),
      [match.id],
    ) ?? []
  const s = computeStats(match, events, match.clock)
  const base = fileBase(match)

  return (
    <div className="sheet">
      <div className="sheet-toolbar no-print">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ‹ Matches
        </button>
        <button type="button" className="btn" onClick={onResume}>
          Back to tracking
        </button>
        <button type="button" className="btn" onClick={() => downloadFile(`${base}_summary.csv`, summaryCsv(match, events))}>
          Summary CSV
        </button>
        <button type="button" className="btn" onClick={() => downloadFile(`${base}_events.csv`, eventsCsv(match, events))}>
          Events CSV
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Print / PDF
        </button>
      </div>

      <h1 className="scoreline">
        <span>{match.homeName}</span>
        <strong>
          {s.home.goal} – {s.away.goal}
        </strong>
        <span>{match.awayName}</span>
      </h1>
      <p className="muted center">
        {new Date(match.createdAt).toLocaleDateString()} · Match time {formatClock(match.clock.matchMs)}
        {match.status === 'live' && ' · still in progress'}
      </p>

      {s.goals.length > 0 && (
        <ul className="goal-list">
          {s.goals.map((g, i) => (
            <li key={i} className={`goal-${g.team}`}>
              ⚽ {g.minute}' {g.player ?? 'Unnamed'} ({g.teamName}){g.assist && ` · assist ${g.assist}`}
            </li>
          ))}
        </ul>
      )}

      <table className="stat-table">
        <thead>
          <tr>
            <th>{match.homeName}</th>
            <th />
            <th>{match.awayName}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{s.home.possessionPct}%</td>
            <th>Possession</th>
            <td>{s.away.possessionPct}%</td>
          </tr>
          <tr>
            <td>{formatClock(s.home.possessionMs)}</td>
            <th>Possession time</th>
            <td>{formatClock(s.away.possessionMs)}</td>
          </tr>
          {STAT_ROWS.map((r) => (
            <tr key={r.key}>
              <td>{s.home[r.key]}</td>
              <th>{r.label}</th>
              <td>{s.away[r.key]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Timeline match={match} events={events} currentMs={match.clock.matchMs} />

      <h2>Event log</h2>
      <table className="log-table">
        <thead>
          <tr>
            <th>Min</th>
            <th>Clock</th>
            <th>Team</th>
            <th>Event</th>
            <th>Player</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>{matchMinute(e.matchMs)}'</td>
              <td>{formatClock(e.matchMs)}</td>
              <td>{e.team === 'home' ? match.homeName : match.awayName}</td>
              <td>
                <i className="swatch" style={{ background: EVENT_META[e.type].color }} /> {EVENT_META[e.type].label}
              </td>
              <td>
                {e.player}
                {e.assist && ` (assist ${e.assist})`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
