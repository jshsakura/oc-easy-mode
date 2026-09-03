// What the player remembers between page loads.
//
// Kept in the page's own localStorage rather than chrome.storage: it is read
// synchronously at boot, before the bridge to the other world is up, and it
// belongs to this origin anyway.

import type { Track } from './parse.ts'
import { narrowNow } from './ui/device.ts'

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

/** Which side the UI takes. 'auto' is whatever YouTube is set to. */
export type Theme = 'auto' | 'dark' | 'light'

export interface Persisted {
  mode: Mode
  /** Remembered so a reload comes back the way it was left. */
  theme: Theme
  /** null follows YouTube's interface language. */
  lang: 'ko' | 'en' | null
  queue: Track[]
  index: number
  repeat: Repeat
  shuffle: boolean
  volume: number
  /** Playback speed, 1 being ordinary. Kept, because a podcast listener means it. */
  rate: number
  video: VideoLayout
  /** Where the UI was; restored so a reload lands in the same place. */
  view: string
}

const KEY = 'oc-easy-mode:state'
const THEME_KEY = 'oc-easy-mode:theme'

export function getStoredTheme(): 'light' | 'dark' | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {}
  return null
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {}
}

/**
 * Whether the mode should be in dark theme.
 * Explicit user selection in Easy Mode wins and survives reloads.
 * Fallbacks follow YouTube's root attribute and system preference.
 */
export function youtubeIsDark(): boolean {
  const stored = getStoredTheme()
  if (stored) return stored === 'dark'
  if (document.documentElement.hasAttribute('dark')) return true
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return true
  }
}

/** A synchronous "is the mode on" flag, so the hide style can go in at document_start. */
const KEY_ON = 'oc-easy-mode:on'

export const DEFAULTS: Persisted = {
  mode: 'music',
  theme: 'auto',
  lang: null,
  queue: [],
  index: -1,
  repeat: 'off',
  shuffle: false,
  volume: 100,
  rate: 1,
  video: 'corner',
  // Not 'search', which opens on an empty box, and not 'home', which YouTube
  // leaves empty until it knows you.
  view: 'explore',
}

/**
 * Where the picture goes when a mode is switched on.
 *
 * On a narrow screen, music mode shows no picture at all. A floating corner
 * window has nowhere to float to on 390 pixels — it sits on top of the list you
 * are reading — and the intent here is YouTube Music, where the artwork in the
 * bar is picture enough.
 */
export function layoutFor(mode: Mode, narrow: boolean = narrowNow()): VideoLayout {
  if (mode === 'video') return 'stage'
  return narrow ? 'hidden' : 'corner'
}

export function load(): Persisted {
  // The first run's picture placement depends on the device; everything else
  // is the same everywhere.
  const fresh = { ...DEFAULTS, video: layoutFor(DEFAULTS.mode) }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh
    const got = JSON.parse(raw) as Partial<Persisted>
    return { ...fresh, ...got, queue: Array.isArray(got.queue) ? got.queue : [] }
  } catch {
    return fresh
  }
}

export function save(state: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Quota or private mode: the queue is lost on reload, nothing worse.
  }
}

// ── Recently played ────────────────────────────────────────────────────────
//
// YouTube's own 시청 기록 needs a session, and signed out there is nothing to
// show — which is the one screen a signed-out listener most wants back. This is
// the same idea kept here instead: the last fifty things this browser played,
// in this origin's own storage, never sent anywhere.

const HISTORY_KEY = 'oc-easy-mode:history'

/** Fifty is a few evenings of listening and a few kilobytes of storage. */
const HISTORY_MAX = 50

export function history(): Track[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const got = JSON.parse(raw) as unknown
    return Array.isArray(got) ? (got as Track[]).filter((t) => t && typeof t.videoId === 'string') : []
  } catch {
    return []
  }
}

/**
 * Puts a track at the front, and only there once.
 *
 * A song played twice in an evening should be one row at the top rather than
 * two rows apart, which is what makes a list like this readable at all.
 */
export function remember(track: Track): void {
  try {
    const next = [track, ...history().filter((t) => t.videoId !== track.videoId)].slice(0, HISTORY_MAX)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    // See save(). A lost history is not worth a broken player.
  }
}

export function forgetHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {}
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
