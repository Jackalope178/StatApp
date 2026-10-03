import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { deletePlayer, ensurePlayer } from '../actions'
import { db } from '../db'

export function Players({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('')
  const [team, setTeam] = useState('')
  const players = useLiveQuery(() => db.players.filter((p) => !p.deleted).toArray(), []) ?? []
  const teams = [...new Set(players.map((p) => p.team))].sort()

  return (
    <div className="home">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        ‹ Matches
      </button>
      <h1>Player databank</h1>
      <form
        className="card new-match"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim() || !team.trim()) return
          await ensurePlayer(name, team)
          setName('')
        }}
      >
        <label>
          Team (must match the team name used in matches)
          <input list="teams" value={team} onChange={(e) => setTeam(e.target.value)} required />
          <datalist id="teams">
            {teams.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label>
          Player name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary">
          Add player
        </button>
      </form>

      {teams.map((t) => (
        <div key={t} className="card">
          <h2>{t}</h2>
          <ul className="player-list">
            {players
              .filter((p) => p.team === t)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <li key={p.id}>
                  {p.name}
                  <button type="button" className="btn btn-ghost" onClick={() => void deletePlayer(p.id)} aria-label={`Remove ${p.name}`}>
                    ✕
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
