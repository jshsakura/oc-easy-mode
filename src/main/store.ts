// What the player remembers between page loads.
//
// Kept in the page's own localStorage rather than chrome.storage: it is read
// synchronously at boot, before the bridge to the other world is up, and it
// belongs to this origin anyway.

import type { Track } from './parse.ts'

export type Repeat = 'off' | 'all' | 'one'
/** Where YouTube's own player sits on screen. */
export type VideoLayout = 'hidden' | 'corner' | 'stage'
/**
 * Which of the two shapes the UI takes. Music is a list with the picture
 * tucked into a corner; video puts the picture first. They share every screen
 * underneath — the same search, the same queue, the same playlists — because
 * on YouTube a song and a video are the same object.
 */
export type Mode = 'music' | 'video'

export interface Persisted {
  mode: Mode
  queue: Track[]
  index: number
  repeat: Repeat
  shuffle: boolean
  volume: number
  video: VideoLayout
  /** Where the UI was; restored so a reload lands in the same place. */
  view: string
}

const KEY = 'oc-easy-mode:state'
/** A synchronous "is the mode on" flag, so the hide style can go in at document_start. */
const KEY_ON = 'oc-easy-mode:on'

export const DEFAULTS: Persisted = {
  mode: 'music',
  queue: [],
  index: -1,
  repeat: 'off',
  shuffle: false,
  volume: 100,
  video: 'corner',
  // Not 'search', which opens on an empty box, and not 'home', which YouTube
  // leaves empty until it knows you.
  view: 'explore',
}

/** The video layout each mode falls back to when it is switched on. */
export const LAYOUT_FOR: Record<Mode, VideoLayout> = { music: 'corner', video: 'stage' }

export function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const got = JSON.parse(raw) as Partial<Persisted>
    return { ...DEFAULTS, ...got, queue: Array.isArray(got.queue) ? got.queue : [] }
  } catch {
    return { ...DEFAULTS }
  }
}

export function save(state: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Quota or private mode: the queue is lost on reload, nothing worse.
  }
}

export function quickOn(): boolean {
  try {
    return localStorage.getItem(KEY_ON) === '1'
  } catch {
    return false
  }
}

export function setQuickOn(on: boolean): void {
  try {
    localStorage.setItem(KEY_ON, on ? '1' : '0')
  } catch {
    // See save().
  }
}
