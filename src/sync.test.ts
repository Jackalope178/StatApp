import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsert = vi.fn()
const remote: Record<string, Record<string, unknown>[]> = { matches: [], events: [], players: [] }
const ranges: string[] = []
vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => ({
      upsert,
      select: () => ({
        order: () => ({
          range: async (from: number, to: number) => {
            ranges.push(`${table}:${from}-${to}`)
            return { data: remote[table].slice(from, to + 1), error: null }
          },
        }),
      }),
    }),
  },
}))
vi.stubGlobal('navigator', { onLine: true })

const { db } = await import('./db')
const { createMatch, logEvent } = await import('./actions')
const { pullFromCloud, syncNow, syncStore } = await import('./sync')

beforeEach(async () => {
  upsert.mockReset()
  upsert.mockResolvedValue({ error: null })
  remote.matches = []
  remote.events = []
  remote.players = []
  ranges.length = 0
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

const matchRow = (id: string, homeName: string, updatedAt: string) => ({
  id,
  home_name: homeName,
  away_name: 'B',
  status: 'finished',
  clock: { matchMs: 5400000, homeMs: 1, awayMs: 1, possession: null, runningSince: null },
  created_at: '2026-10-01T10:00:00+00:00',
  updated_at: updatedAt,
})

describe('pullFromCloud', () => {
  it('loads cloud matches, events and players onto an empty device', async () => {
    remote.matches = [matchRow('m1', 'Lions', '2026-10-01T12:00:00.123+00:00')]
    remote.events = [
      {
        id: 'e1', match_id: 'm1', team: 'home', type: 'goal', match_ms: 60000, player: 'Sam', assist: null,
        recorded_at: '2026-10-01T10:01:00+00:00', updated_at: '2026-10-01T10:01:00+00:00', deleted: false,
      },
    ]
    remote.players = [
      { id: 'p1', name: 'Sam', team: 'Lions', created_at: '2026-10-01T10:00:00+00:00', updated_at: '2026-10-01T10:00:00+00:00', deleted: false },
    ]
    await pullFromCloud()
    const m = (await db.matches.get('m1'))!
    expect(m).toMatchObject({ homeName: 'Lions', status: 'finished', synced: 1, updatedAt: '2026-10-01T12:00:00.123Z' })
    expect(await db.events.get('e1')).toMatchObject({ matchId: 'm1', type: 'goal', player: 'Sam', deleted: 0, synced: 1 })
    expect(await db.players.get('p1')).toMatchObject({ name: 'Sam', synced: 1 })
    // Pulled rows are not re-uploaded.
    expect(upsert).not.toHaveBeenCalled()
  })

  it('never overwrites changes not yet uploaded, but takes newer cloud copies', async () => {
    const id = await createMatch('Local', 'B')
    remote.matches = [matchRow(id, 'Cloud', '2999-01-01T00:00:00+00:00')]
    upsert.mockResolvedValue({ error: { message: 'offline' } }) // local edit stays unsynced
    await pullFromCloud()
    expect((await db.matches.get(id))!.homeName).toBe('Local')

    upsert.mockResolvedValue({ error: null })
    await syncNow() // now synced
    await pullFromCloud()
    expect((await db.matches.get(id))!.homeName).toBe('Cloud')
  })

  it('keeps the local copy when the cloud copy is older', async () => {
    const id = await createMatch('Local', 'B')
    await syncNow()
    remote.matches = [matchRow(id, 'Old', '2000-01-01T00:00:00+00:00')]
    await pullFromCloud()
    expect((await db.matches.get(id))!.homeName).toBe('Local')
  })

  it('reads in pages so large tables are fully loaded', async () => {
    remote.matches = [matchRow('m1', 'A', '2026-10-01T00:00:00+00:00')]
    remote.events = Array.from({ length: 1500 }, (_, i) => ({
      id: `e${String(i).padStart(4, '0')}`, match_id: 'm1', team: 'home', type: 'pass', match_ms: i, player: null,
      assist: null, recorded_at: '2026-10-01T00:00:00+00:00', updated_at: '2026-10-01T00:00:00+00:00', deleted: false,
    }))
    await pullFromCloud()
    expect(await db.events.count()).toBe(1500)
    expect(ranges.filter((r) => r.startsWith('events'))).toEqual(['events:0-999', 'events:1000-1999'])
  })
})
