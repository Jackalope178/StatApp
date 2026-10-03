import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { createMatch } from '../actions'
import { db } from '../db'
import { useSyncStatus } from '../hooks'
import { pullFromCloud } from '../sync'

interface Props {
  onOpen: (id: string) => void
  onPlayers: () => void
}

export function MatchList({ onOpen, onPlayers }: Props) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const matches = useLiveQuery(() => db.matches.orderBy('createdAt').reverse().toArray(), []) ?? []
  const sync = useSyncStatus()

  return (
    <div className="home">
      <h1>StatApp</h1>
      <form
        className="card new-match"
        onSubmit={async (e) => {
          e.preventDefault()
          onOpen(await createMatch(home.trim() || 'Home', away.trim() || 'Away'))
        }}
      >
        <h2>New match</h2>
        <label>
          Team 1
          <input value={home} onChange={(e) => setHome(e.target.value)} placeholder="Home" />
        </label>
        <label>
          Team 2
          <input value={away} onChange={(e) => setAway(e.target.value)} placeholder="Away" />
        </label>
        <button type="submit" className="btn btn-primary">
          Start tracking
        </button>
      </form>

      <button type="button" className="btn" onClick={onPlayers}>
        Player databank
      </button>

      <div className="card">
        <div className="card-head">
          <h2>Matches</h2>
          {sync.configured && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={sync.pulling || !sync.online}
              title="Load matches saved from other devices"
              onClick={() => void pullFromCloud()}
            >
              {sync.pulling ? 'Loading…' : '↻ Refresh'}
            </button>
          )}
        </div>
        {matches.length === 0 && (
          <p className="muted">
            {sync.pulling
              ? 'Loading saved matches from the cloud…'
              : !sync.configured
                ? 'No matches yet.'
                : sync.online
                  ? 'No matches yet. Matches saved from any device appear here.'
                  : 'No matches on this device. Connect to the internet to load matches saved in the cloud.'}
          </p>
        )}
        {matches.length > 0 && (
          <ul className="match-list">
            {matches.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onOpen(m.id)}>
                  <span>
                    {m.homeName} vs {m.awayName}
                  </span>
                  <small>
                    {new Date(m.createdAt).toLocaleDateString()} · {m.status === 'live' ? 'In progress' : 'Finished'}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
