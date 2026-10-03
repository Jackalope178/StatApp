import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsert = vi.fn()
vi.mock('./supabase', () => ({ supabase: { from: () => ({ upsert }) } }))
vi.stubGlobal('navigator', { onLine: true })

const { db } = await import('./db')
const { createMatch, logEvent } = await import('./actions')
const { syncNow, syncStore } = await import('./sync')

beforeEach(async () => {
  upsert.mockReset()
  await Promise.all([db.matches.clear(), db.events.clear(), db.players.clear()])
})

describe('sync', () => {
  it('uploads unsynced rows and marks them synced', async () => {
    upsert.mockResolvedValue({ error: null })
    const id = await createMatch('A', 'B')
    await logEvent((await db.matches.get(id))!, 'home', 'shot')
    await syncNow()
    expect(upsert).toHaveBeenCalledTimes(2)
    expect(await db.matches.where('synced').equals(0).count()).toBe(0)
    expect(await db.events.where('synced').equals(0).count()).toBe(0)
    expect(syncStore.get().pending).toBe(0)
  })

  it('keeps rows on the device when the upload fails', async () => {
    upsert.mockResolvedValue({ error: { message: 'network down' } })
    await createMatch('A', 'B')
    await syncNow()
    expect(await db.matches.where('synced').equals(0).count()).toBe(1)
    expect(syncStore.get().lastError).toContain('network down')
  })

  it('does not mark a row synced if it changed during upload', async () => {
    const id = await createMatch('A', 'B')
    upsert.mockImplementation(async () => {
      await db.matches.update(id, { homeName: 'Edited', updatedAt: new Date(Date.now() + 1000).toISOString() })
      return { error: null }
    })
    await syncNow()
    expect((await db.matches.get(id))!.synced).toBe(0)
  })
})
