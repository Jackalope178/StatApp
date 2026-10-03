export type Side = 'home' | 'away'

export type EventType =
  | 'goal'
  | 'shot'
  | 'shot_on_goal'
  | 'chance_created'
  | 'pass'
  | 'tackle'
  | 'foul'

/** 0 / 1 instead of boolean so Dexie can index the field. */
export type Flag = 0 | 1

export interface ClockState {
  /** Match time banked before the current running stretch. */
  matchMs: number
  homeMs: number
  awayMs: number
  /** Which possession timer is running (only accrues while the match clock runs). */
  possession: Side | null
  /** Epoch ms the match clock was last started, or null when paused. */
  runningSince: number | null
}

export type MatchStatus = 'live' | 'finished'

export interface Match {
  id: string
  homeName: string
  awayName: string
  status: MatchStatus
  clock: ClockState
  createdAt: string
  updatedAt: string
  synced: Flag
}

export interface MatchEvent {
  id: string
  matchId: string
  team: Side
  type: EventType
  /** Match clock time when the button was pressed. */
  matchMs: number
  player: string | null
  assist: string | null
  /** Wall-clock time of the tap, for lining up with video later. */
  recordedAt: string
  updatedAt: string
  deleted: Flag
  synced: Flag
}

export interface Player {
  id: string
  name: string
  team: string
  createdAt: string
  updatedAt: string
  deleted: Flag
  synced: Flag
}
