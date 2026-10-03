import { describe, expect, it } from 'vitest'
import { formatClock, matchMinute, NEW_CLOCK, pauseClock, readClock, setPossession, startClock, switchPossession } from './clock'

describe('clock', () => {
  it('accrues match and possession time only while running', () => {
    let c = setPossession(NEW_CLOCK, 'home', 1000) // also kicks off
    expect(readClock(c, 11_000)).toMatchObject({ matchMs: 10_000, homeMs: 10_000, awayMs: 0, running: true })
    c = switchPossession(c, 11_000)
    c = pauseClock(c, 16_000)
    expect(readClock(c, 99_000)).toMatchObject({ matchMs: 15_000, homeMs: 10_000, awayMs: 5_000, running: false })
    c = startClock(c, 100_000)
    expect(readClock(c, 102_000)).toMatchObject({ matchMs: 17_000, awayMs: 7_000 })
  })

  it('match clock can run with no possession set', () => {
    const c = startClock(NEW_CLOCK, 0)
    expect(readClock(c, 5000)).toMatchObject({ matchMs: 5000, homeMs: 0, awayMs: 0 })
  })

  it('switching with no possession gives it to home', () => {
    expect(switchPossession(NEW_CLOCK, 0).possession).toBe('home')
  })

  it('formats minutes in soccer style', () => {
    expect(matchMinute(0)).toBe(1)
    expect(matchMinute(59_999)).toBe(1)
    expect(matchMinute(60_000)).toBe(2)
    expect(formatClock(23 * 60_000 + 7_400)).toBe('23:07')
  })
})
