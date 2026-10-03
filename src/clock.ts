import type { ClockState, Side } from './types'

export const NEW_CLOCK: ClockState = {
  matchMs: 0,
  homeMs: 0,
  awayMs: 0,
  possession: null,
  runningSince: null,
}

/** Current totals, including the stretch that is running right now. */
export function readClock(c: ClockState, now: number) {
  const running = c.runningSince === null ? 0 : Math.max(0, now - c.runningSince)
  return {
    matchMs: c.matchMs + running,
    homeMs: c.homeMs + (c.possession === 'home' ? running : 0),
    awayMs: c.awayMs + (c.possession === 'away' ? running : 0),
    running: c.runningSince !== null,
  }
}

/** Bank the running stretch into the totals so the state can change safely. */
function settle(c: ClockState, now: number): ClockState {
  const t = readClock(c, now)
  return {
    ...c,
    matchMs: t.matchMs,
    homeMs: t.homeMs,
    awayMs: t.awayMs,
    runningSince: c.runningSince === null ? null : now,
  }
}

export function startClock(c: ClockState, now: number): ClockState {
  return c.runningSince === null ? { ...c, runningSince: now } : c
}

export function pauseClock(c: ClockState, now: number): ClockState {
  return { ...settle(c, now), runningSince: null }
}

/** Give possession to a side. Starts the match clock if it was paused. */
export function setPossession(c: ClockState, side: Side, now: number): ClockState {
  return startClock({ ...settle(c, now), possession: side }, now)
}

export function switchPossession(c: ClockState, now: number): ClockState {
  return setPossession(c, c.possession === 'home' ? 'away' : 'home', now)
}

/** Soccer convention: 0:00–0:59 is the 1st minute, shown as 1'. */
export function matchMinute(ms: number): number {
  return Math.floor(ms / 60000) + 1
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
