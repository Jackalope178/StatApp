import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db'

interface Props {
  teamName: string
  minute: number
  onSave: (scorer: string, assist: string) => void
  onCancel: () => void
}

/** Pick scorer and (optional) assist from the player databank, or type new names. */
export function GoalDialog({ teamName, minute, onSave, onCancel }: Props) {
  const [scorer, setScorer] = useState('')
  const [assist, setAssist] = useState('')
  const players =
    useLiveQuery(
      () =>
        db.players
          .filter((p) => !p.deleted && p.team.toLowerCase() === teamName.trim().toLowerCase())
          .sortBy('name'),
      [teamName],
    ) ?? []
  const listId = 'goal-players'

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Goal details">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(scorer, assist)
        }}
      >
        <h2>
          Goal · {teamName} · {minute}'
        </h2>
        <p className="muted">The goal is already timed. Names are optional; you can save without them.</p>
        <label>
          Scorer
          <input autoFocus list={listId} value={scorer} onChange={(e) => setScorer(e.target.value)} placeholder="Type or pick" />
        </label>
        <label>
          Assist
          <input list={listId} value={assist} onChange={(e) => setAssist(e.target.value)} placeholder="None" />
        </label>
        <datalist id={listId}>
          {players.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
        {players.length > 0 && (
          <div className="chips">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                onClick={() => (scorer ? setAssist(p.name) : setScorer(p.name))}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel goal
          </button>
          <button type="submit" className="btn btn-primary">
            Save goal
          </button>
        </div>
      </form>
    </div>
  )
}
