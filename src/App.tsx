import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { updateMatch } from './actions'
import { LiveMatch } from './components/LiveMatch'
import { MatchList } from './components/MatchList'
import { Players } from './components/Players'
import { StatSheet } from './components/StatSheet'
import { SyncBadge } from './components/SyncBadge'
import { db, requestPersistentStorage } from './db'
import { startSyncLoop } from './sync'

type View = { name: 'home' } | { name: 'players' } | { name: 'match'; id: string } | { name: 'sheet'; id: string }

const VIEW_KEY = 'statapp.view'

function loadView(): View {
  try {
    const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? '')
    if (v && typeof v.name === 'string') return v
  } catch {
    /* ignore */
  }
  return { name: 'home' }
}

export default function App() {
  const [view, setView] = useState<View>(loadView)
  const matchId = view.name === 'match' || view.name === 'sheet' ? view.id : null
  const match = useLiveQuery(() => (matchId ? db.matches.get(matchId) : undefined), [matchId])

  useEffect(() => startSyncLoop(), [])
  useEffect(() => void requestPersistentStorage(), [])
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(view))
    } catch {
      /* ignore */
    }
  }, [view])

  const home = () => setView({ name: 'home' })
  let body
  if (view.name === 'players') body = <Players onBack={home} />
  else if (view.name === 'home' || !matchId) {
    body = (
      <MatchList
        onPlayers={() => setView({ name: 'players' })}
        onOpen={async (id) => {
          const m = await db.matches.get(id)
          setView(m?.status === 'finished' ? { name: 'sheet', id } : { name: 'match', id })
        }}
      />
    )
  } else if (!match) body = <p className="muted center">Loading…</p>
  else if (view.name === 'sheet')
    body = <StatSheet match={match} onBack={home} onResume={() => {
          // Going back to tracking reopens the match.
          void updateMatch(match.id, { status: 'live' })
          setView({ name: 'match', id: match.id })
        }} />
  else body = <LiveMatch match={match} onExit={home} onFinish={() => setView({ name: 'sheet', id: match.id })} />

  return (
    <div className="app">
      <div className="topbar no-print">
        <SyncBadge />
      </div>
      {body}
    </div>
  )
}
