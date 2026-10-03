import type { EventType } from './types'

export const EVENT_TYPES: { type: EventType; label: string; color: string }[] = [
  { type: 'goal', label: 'Goal', color: '#16a34a' },
  { type: 'shot', label: 'Shot', color: '#f97316' },
  { type: 'shot_on_goal', label: 'Shot on goal', color: '#dc2626' },
  { type: 'chance_created', label: 'Chance created', color: '#a855f7' },
  { type: 'pass', label: 'Pass', color: '#3b82f6' },
  { type: 'tackle', label: 'Tackle', color: '#0d9488' },
  { type: 'foul', label: 'Foul', color: '#ca8a04' },
]

export const EVENT_META = Object.fromEntries(EVENT_TYPES.map((e) => [e.type, e])) as Record<
  EventType,
  (typeof EVENT_TYPES)[number]
>
