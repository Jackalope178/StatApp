import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { createMatch } from '../actions'
import { db } from '../db'

interface Props {
  onOpen: (id: string) => void
  onPlayers: () => void
}

export function MatchList({ onOpen, onPlayers }: Props) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const matches = useLiveQuery(() => db.matches.orderBy('createdAt').reverse().toArray(), []) ?? []

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

      {matches.length > 0 && (
        <div className="card">
          <h2>Matches</h2>
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
        </div>
      )}
    </div>
  )
}
