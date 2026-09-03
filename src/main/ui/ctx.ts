// What every view is handed. Kept in its own file so views and the app shell
// can both import it without importing each other.

import { t } from '../../shared/i18n.ts'
import type { Engine } from '../engine.ts'
import type { Playlist, Track } from '../parse.ts'
import type { YtCfg } from '../ytcfg.ts'

export type View =
  | { kind: 'explore' }
  | { kind: 'home' }
  | { kind: 'search'; query: string }
  | { kind: 'subs' }
  | { kind: 'history' }
  | { kind: 'playlists' }
  | { kind: 'playlist'; id: string; title: string }
  | { kind: 'queue' }

export interface Ctx {
  engine: Engine
  cfg: YtCfg
  /** Where menus, modals and toasts go: above the video, not behind it. */
  overlay: ShadowRoot
  view: View
  /** Navigates, remembering the destination for the next page load. */
  go(view: View): void
  /** Re-renders the current view from scratch. */
  reload(): void
  say(message: string, bad?: boolean): void
  /** The user's playlists, as last fetched. Empty when signed out. */
  playlists: Playlist[]
  refreshPlaylists(): Promise<void>
  /** Asks which playlist, creating one if that is what they choose. */
  addToPlaylist(tracks: Track[]): Promise<void>
}

/** `m:ss`, or `h:mm:ss` past an hour. */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const hrs = Math.floor(seconds / 3600)
  const mm = hrs > 0 ? String(m).padStart(2, '0') : String(m)
  return `${hrs > 0 ? `${hrs}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

/** Turns whatever InnerTube threw into something worth showing a person. */
export function explain(err: unknown): string {
  const kind = (err as { kind?: string } | null)?.kind
  if (kind === 'auth') return t('유튜브에 로그인해야 볼 수 있는 내용입니다.')
  if (kind === 'shape') return t('유튜브 응답이 예상과 달랐습니다. 잠시 후 다시 시도해 주세요.')
  return t('유튜브에서 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.')
}
