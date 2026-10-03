import { useSyncStatus } from '../hooks'
import { pullFromCloud, syncNow } from '../sync'

export function SyncBadge() {
  const s = useSyncStatus()
  let text: string
  let tone: 'ok' | 'warn' | 'off'
  if (!s.configured) {
    text = 'On-device only (cloud not set up)'
    tone = 'off'
  } else if (s.pulling) {
    text = 'Loading from cloud…'
    tone = 'warn'
  } else if (s.pending === 0) {
    text = 'All saved to cloud'
    tone = 'ok'
  } else if (!s.online) {
    text = `Offline · ${s.pending} saved on device`
    tone = 'warn'
  } else if (s.syncing) {
    text = `Uploading ${s.pending}…`
    tone = 'warn'
  } else {
    text = `${s.pending} waiting to upload`
    tone = 'warn'
  }
  return (
    <button
      type="button"
      className={`sync-badge sync-${tone}`}
      onClick={() => void (s.online ? pullFromCloud() : syncNow())}
      title={s.lastError ?? (s.lastSyncedAt ? `Last upload ${new Date(s.lastSyncedAt).toLocaleTimeString()}` : 'Tap to retry')}
    >
      <span className="dot" aria-hidden /> {text}
    </button>
  )
}
