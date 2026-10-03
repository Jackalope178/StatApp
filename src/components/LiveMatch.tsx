import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { deleteEvent, ensurePlayer, logEvent, mutateClock, setGoalNames, undoLastEvent, updateMatch } from '../actions'
import { formatClock, matchMinute, pauseClock, readClock, setPossession, startClock, switchPossession } from '../clock'
import { db } from '../db'
import { EVENT_TYPES } from '../eventTypes'
import { useNow } from '../hooks'
import type { Match, MatchEvent, Side } from '../types'
import { GoalDialog } from './GoalDialog'
import { eventLabel } from '../labels'
import { Timeline } from './Timeline'

interface Props {
  match: Match
  onFinish: () => void
  onExit: () => void
}

export function LiveMatch({ match, onFinish, onExit }: Props) {
  const now = useNow(match.clock.runningSince !== null)
  const clock = readClock(match.clock, now)
  const events =
    useLiveQuery(
      () => db.events.where('matchId').equals(match.id).filter((e) => !e.deleted).sortBy('matchMs'),
      [match.id],
    ) ?? []
  const [toast, setToast] = useState<{ text: string; color: string; key: number } | null>(null)
  const [pendingGoal, setPendingGoal] = useState<MatchEvent | null>(null)
  const [showLog, setShowLog] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const toastSeq = useRef(0)
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const totalPoss = clock.homeMs + clock.awayMs
  const pctOf = (ms: number) => (totalPoss > 0 ? Math.round((ms / totalPoss) * 100) : 0)
  const teamName = (side: Side) => (side === 'home' ? match.homeName : match.awayName)

  const showToast = (e: MatchEvent) => {
    const color = EVENT_TYPES.find((t) => t.type === e.type)!.color
    setToast({ text: eventLabel(match, e), color, key: ++toastSeq.current })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const press = async (side: Side, type: MatchEvent['type']) => {
    navigator.vibrate?.(30)
    const e = await logEvent(match, side, type)
    if (type === 'goal') setPendingGoal(e)
    else showToast(e)
  }

  const renameTeam = (side: Side) => {
    const name = prompt(`Rename ${teamName(side)}`, teamName(side))?.trim()
    if (name) void updateMatch(match.id, side === 'home' ? { homeName: name } : { awayName: name })
  }

  return (
    <div className="live">
      <header className="live-header">
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          ‹ Matches
        </button>
        <div className="match-clock" aria-live="off">
          {formatClock(clock.matchMs)}
          <small>{matchMinute(clock.matchMs)}'</small>
        </div>
        {clock.running ? (
          <button type="button" className="btn" onClick={() => void mutateClock(match.id, pauseClock)}>
            Pause match
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => void mutateClock(match.id, startClock)}>
            {clock.matchMs === 0 ? 'Kick off' : 'Resume'}
          </button>
        )}
      </header>

      <section className="possession">
        {(['home', 'away'] as const).map((side) => {
          const active = match.clock.possession === side
          const ms = side === 'home' ? clock.homeMs : clock.awayMs
          return (
            <div key={side} className={`timer timer-${side} ${active ? 'is-active' : ''} ${active && clock.running ? 'is-running' : ''}`}>
              <button
                type="button"
                className="timer-main"
                onClick={() => void mutateClock(match.id, (c, now) => setPossession(c, side, now))}
              >
                <span className="timer-name">{teamName(side)}</span>
                <span className="timer-time">{formatClock(ms)}</span>
                <span className="timer-pct">{pctOf(ms)}% possession</span>
              </button>
              <button type="button" className="timer-edit" onClick={() => renameTeam(side)} aria-label={`Rename ${teamName(side)}`}>
                ✎
              </button>
            </div>
          )
        })}
        <button
          type="button"
          className="btn btn-switch"
          onClick={() => void mutateClock(match.id, switchPossession)}
        >
          ⇄ Switch possession
        </button>
      </section>

      <section className="event-grid">
        {(['home', 'away'] as const).map((side) => (
          <div key={side} className={`event-col event-col-${side}`}>
            <h3>{teamName(side)}</h3>
            {EVENT_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                className={`event-btn ${t.type === 'goal' ? 'event-btn-goal' : ''}`}
                style={{ '--c': t.color } as CSSProperties}
                onClick={() => void press(side, t.type)}
              >
                {t.label}
                <span className="count">{events.filter((e) => e.team === side && e.type === t.type).length}</span>
              </button>
            ))}
          </div>
        ))}
      </section>

      <Timeline match={match} events={events} currentMs={clock.matchMs} />

      <section className="live-actions">
        <button type="button" className="btn" disabled={events.length === 0} onClick={() => void undoLastEvent(match.id)}>
          ↶ Undo last
        </button>
        <button type="button" className="btn" onClick={() => setShowLog((v) => !v)}>
          {showLog ? 'Hide' : 'Show'} event log ({events.length})
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (!confirm('End the match and open the stat sheet?')) return
            void mutateClock(match.id, pauseClock)
              .then(() => updateMatch(match.id, { status: 'finished' }))
              .then(onFinish)
          }}
        >
          End match
        </button>
      </section>

      {showLog && (
        <ol className="event-log">
          {[...events].reverse().map((e) => (
            <li key={e.id}>
              <i style={{ background: EVENT_TYPES.find((t) => t.type === e.type)!.color }} />
              <span>{eventLabel(match, e)}</span>
              <button type="button" className="btn btn-ghost" onClick={() => void deleteEvent(e.id)} aria-label="Delete event">
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}

      {toast && (
        <div key={toast.key} className="toast" style={{ borderColor: toast.color }}>
          <i style={{ background: toast.color }} /> {toast.text}
        </div>
      )}

      {pendingGoal && (
        <GoalDialog
          teamName={teamName(pendingGoal.team)}
          minute={matchMinute(pendingGoal.matchMs)}
          onCancel={() => {
            void deleteEvent(pendingGoal.id)
            setPendingGoal(null)
          }}
          onSave={async (scorer, assist) => {
            const team = teamName(pendingGoal.team)
            await setGoalNames(pendingGoal.id, scorer, assist)
            await Promise.all([ensurePlayer(scorer, team), ensurePlayer(assist, team)])
            showToast({ ...pendingGoal, player: scorer || null, assist: assist || null })
            setPendingGoal(null)
          }}
        />
      )}
    </div>
  )
}
