// Reading InnerTube responses.
//
// **Searched, not addressed.** The path to a row differs between search, a
// playlist, a mix and the library, and changes without notice. A recursive
// search for the renderer by name survives all of that, because the renderer
// names are the part YouTube keeps stable: they are what its own client
// dispatches on. Every collector is narrow about what it accepts in return.

export type Json = Record<string, unknown>

export function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Every value stored under `key`, anywhere in the tree, in document order. */
export function collect(root: unknown, key: string): unknown[] {
  const out: unknown[] = []
  const stack: unknown[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) stack.push(node[i])
    } else if (isObject(node)) {
      const entries = Object.entries(node)
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i]!
        if (entry[0] === key) out.push(entry[1])
        else stack.push(entry[1])
      }
      const hit = node[key]
      if (hit !== undefined) stack.push(hit)
    }
  }
  return out
}

export function findFirst(root: unknown, key: string): unknown {
  return collect(root, key)[0]
}

/** Flattens one of YouTube's text objects: `{runs}`, `{simpleText}` or `{content}`. */
export function text(node: unknown): string {
  if (typeof node === 'string') return node
  if (!isObject(node)) return ''
  if (typeof node.simpleText === 'string') return node.simpleText
  if (typeof node.content === 'string') return node.content
  const runs = node.runs
  if (Array.isArray(runs)) {
    return runs.map((r) => (isObject(r) && typeof r.text === 'string' ? r.text : '')).join('')
  }
  return ''
}

/** One track, as far as a player cares about it. */
export interface Track {
  videoId: string
  title: string
  /** Channel or artist, as the row itself renders it. */
  byline: string
  /** `m:ss` as rendered, or empty when the row did not say. */
  duration: string
  /** Identifies this track's slot in a playlist; needed to remove it. */
  setVideoId?: string
  /** Greyed out: taken down, private or region-locked. Skipped on play. */
  unavailable: boolean
}

export interface Playlist {
  id: string
  title: string
  /** Free text under the title, usually the count. */
  subtitle: string
  /** A ready-to-use image URL, when the row offered one. */
  cover?: string
}

/**
 * One titled row of a feed — what a television's home screen is made of.
 *
 * A shelf holds videos or playlists but rarely both, so both are carried and
 * whichever is empty is simply not drawn.
 */
export interface Shelf {
  title: string
  tracks: Track[]
  playlists: Playlist[]
}

/**
 * A middling thumbnail out of one of YouTube's image lists.
 *
 * Biggest that is still under 700px: the covers are drawn at ~200px and the
 * 1200px variant is a megabyte nobody sees.
 */
function pickThumb(node: unknown): string | undefined {
  let best: { url: string; width: number } | undefined
  for (const list of collect(node, 'thumbnails')) {
    if (!Array.isArray(list)) continue
    for (const t of list) {
      if (!isObject(t) || typeof t.url !== 'string') continue
      const width = typeof t.width === 'number' ? t.width : 0
      if (width > 700) continue
      if (!best || width > best.width) best = { url: t.url, width }
    }
  }
  return best?.url
}

/** The medium thumbnail for any video, without asking the API for it. */
export function thumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
}

/**
 * Whether a row is a Short.
 *
 * Shorts are excluded everywhere, on purpose: this is meant to feel like
 * YouTube on a television, and a vertical clip that autoplays into the next
 * one is the opposite of that.
 *
 * Mostly they never arrive — search is asked for videos only, and the renderer
 * Shorts come in (`shortsLockupViewModel`) is not one this file collects. This
 * is the guarantee behind that accident, for the feeds where the same row can
 * be either. Two tells, because YouTube uses both: a reel endpoint, and a
 * `/shorts/` link.
 */
function isShort(item: unknown): boolean {
  if (collect(item, 'reelWatchEndpoint').length > 0) return true
  for (const meta of collect(item, 'webCommandMetadata')) {
    if (isObject(meta) && typeof meta.url === 'string' && meta.url.startsWith('/shorts/')) return true
  }
  return false
}

function watchVideoId(node: unknown): string | undefined {
  for (const endpoint of collect(node, 'watchEndpoint')) {
    if (isObject(endpoint) && typeof endpoint.videoId === 'string') return endpoint.videoId
  }
  return undefined
}

/** `setVideoId` from the row's own remove-from-playlist action, if it has one. */
function setVideoIdOf(node: unknown): string | undefined {
  for (const endpoint of collect(node, 'playlistEditEndpoint')) {
    if (!isObject(endpoint) || !Array.isArray(endpoint.actions)) continue
    for (const action of endpoint.actions) {
      if (isObject(action) && action.action === 'ACTION_REMOVE_VIDEO' && typeof action.setVideoId === 'string') {
        return action.setVideoId
      }
    }
  }
  return undefined
}

/** Search results and the classic list rows: `videoRenderer`, `playlistVideoRenderer`. */
function tracksFromVideoRenderers(root: unknown, key: string): Track[] {
  const out: Track[] = []
  for (const item of collect(root, key)) {
    if (!isObject(item) || typeof item.videoId !== 'string') continue
    if (isShort(item)) continue
    out.push({
      videoId: item.videoId,
      title: text(item.title),
      byline: text(item.ownerText) || text(item.shortBylineText) || text(item.longBylineText),
      duration: text(item.lengthText),
      setVideoId: typeof item.setVideoId === 'string' ? item.setVideoId : setVideoIdOf(item),
      unavailable: item.isPlayable === false,
    })
  }
  return out
}

/** The queue panel of a `next` response, which is what a mix is. */
function tracksFromQueue(root: unknown): Track[] {
  const out: Track[] = []
  for (const item of collect(root, 'playlistPanelVideoRenderer')) {
    if (!isObject(item)) continue
    const videoId = typeof item.videoId === 'string' ? item.videoId : watchVideoId(item)
    if (!videoId || isShort(item)) continue
    out.push({
      videoId,
      title: text(item.title),
      byline: text(item.shortBylineText) || text(item.longBylineText),
      duration: text(item.lengthText),
      setVideoId: typeof item.playlistSetVideoId === 'string' ? item.playlistSetVideoId : undefined,
      unavailable: item.unplayableText !== undefined,
    })
  }
  return out
}

/**
 * The 2025 row: `lockupViewModel`. One component for videos and playlists,
 * told apart by `contentType`. Title and byline live under `metadata`, the
 * duration is the badge on the thumbnail.
 */
function lockups(root: unknown, contentType: string): Json[] {
  const out: Json[] = []
  for (const item of collect(root, 'lockupViewModel')) {
    if (isObject(item) && item.contentType === contentType) out.push(item)
  }
  return out
}

function lockupTitle(item: Json): string {
  return text(findFirst(item.metadata, 'title'))
}

function lockupRows(item: Json): string[] {
  const rows: string[] = []
  const meta = findFirst(item.metadata, 'contentMetadataViewModel')
  if (!isObject(meta) || !Array.isArray(meta.metadataRows)) return rows
  for (const row of meta.metadataRows) {
    if (!isObject(row) || !Array.isArray(row.metadataParts)) continue
    const parts = row.metadataParts
      .map((p) => (isObject(p) ? text(p.text) : ''))
      .filter(Boolean)
    if (parts.length) rows.push(parts.join(' · '))
  }
  return rows
}

function lockupBadge(item: Json): string {
  const badge = findFirst(item.contentImage, 'thumbnailBadgeViewModel')
  return isObject(badge) ? text(badge.text) : ''
}

function tracksFromLockups(root: unknown): Track[] {
  const out: Track[] = []
  for (const item of lockups(root, 'LOCKUP_CONTENT_TYPE_VIDEO')) {
    const videoId = (typeof item.contentId === 'string' && item.contentId) || watchVideoId(item)
    if (!videoId || isShort(item)) continue
    out.push({
      videoId,
      title: lockupTitle(item),
      byline: lockupRows(item)[0] ?? '',
      duration: lockupBadge(item),
      setVideoId: setVideoIdOf(item),
      unavailable: false,
    })
  }
  return out
}

/** Tracks from any response shape this player reads, in document order. */
export function tracks(root: unknown): Track[] {
  return dedupe([
    ...tracksFromVideoRenderers(root, 'videoRenderer'),
    ...tracksFromVideoRenderers(root, 'playlistVideoRenderer'),
    // What m.youtube.com sends instead. Same fields, different name.
    ...tracksFromVideoRenderers(root, 'compactVideoRenderer'),
    ...tracksFromQueue(root),
    ...tracksFromLockups(root),
  ])
}

/**
 * Playlists from a library, a search, or a shelf.
 *
 * Albums count. YouTube gives them their own content type, but the id is an
 * ordinary playlist id and opening one does exactly what opening a playlist
 * does, so the distinction would only cost the reader a dead end.
 */
export function playlists(root: unknown): Playlist[] {
  const out: Playlist[] = []
  const AS_PLAYLIST = new Set(['LOCKUP_CONTENT_TYPE_PLAYLIST', 'LOCKUP_CONTENT_TYPE_ALBUM'])
  for (const item of collect(root, 'lockupViewModel')) {
    if (!isObject(item) || !AS_PLAYLIST.has(String(item.contentType))) continue
    const id = typeof item.contentId === 'string' ? item.contentId : undefined
    if (!id) continue
    const cover = findFirst(item.contentImage, 'url')
    out.push({
      id,
      title: lockupTitle(item),
      subtitle: [lockupBadge(item), ...lockupRows(item)].filter(Boolean).join(' · '),
      cover: typeof cover === 'string' ? cover : undefined,
    })
  }
  // m.youtube.com's shelves are made of these, and they carry the playlist id
  // only inside their browse target, prefixed with the VL that `browse` wants
  // and a caller here does not.
  for (const item of collect(root, 'compactStationRenderer')) {
    if (!isObject(item)) continue
    const browseId = findFirst(item.navigationEndpoint, 'browseId')
    const id = typeof browseId === 'string' && browseId.startsWith('VL') ? browseId.slice(2) : undefined
    if (!id) continue
    out.push({
      id,
      title: text(item.title),
      subtitle: text(item.videoCountText),
      cover: pickThumb(item.thumbnail),
    })
  }
  for (const key of ['gridPlaylistRenderer', 'playlistRenderer', 'compactPlaylistRenderer']) {
    for (const item of collect(root, key)) {
      if (!isObject(item) || typeof item.playlistId !== 'string') continue
      const seed = watchVideoId(item)
      out.push({
        id: item.playlistId,
        title: text(item.title),
        subtitle: text(item.videoCountText) || text(item.videoCountShortText),
        cover: seed ? thumbnail(seed) : undefined,
      })
    }
  }
  const seen = new Set<string>()
  return out.filter((p) => !seen.has(p.id) && seen.add(p.id))
}

/**
 * The titled rows of a feed, in the order they are meant to be read.
 *
 * A response that has none is not an error — most screens are one flat list —
 * so the caller falls back to `tracks` rather than showing nothing.
 */
export function shelves(root: unknown): Shelf[] {
  const out: Shelf[] = []
  for (const key of ['richShelfRenderer', 'shelfRenderer']) {
    for (const shelf of collect(root, key)) {
      if (!isObject(shelf)) continue
      // `contents` on the modern renderer, `content` on the older one, which
      // wraps its items in a horizontal list.
      const items = shelf.contents ?? shelf.content
      const inside = tracks(items)
      const lists = playlists(items)
      if (inside.length === 0 && lists.length === 0) continue
      out.push({ title: text(shelf.title), tracks: inside, playlists: lists })
    }
  }
  return out
}

/** The token that asks for the next page, in either of the forms YouTube emits. */
export function continuationToken(root: unknown): string | undefined {
  for (const item of collect(root, 'continuationItemRenderer')) {
    const token = findFirst(item, 'token')
    if (typeof token === 'string' && token) return token
  }
  for (const key of ['nextContinuationData', 'nextRadioContinuationData']) {
    for (const data of collect(root, key)) {
      if (isObject(data) && typeof data.continuation === 'string' && data.continuation) {
        return data.continuation
      }
    }
  }
  return undefined
}

/** Drops repeats while keeping the first occurrence, which is list order. */
export function dedupe(list: readonly Track[]): Track[] {
  const seen = new Set<string>()
  return list.filter((t) => !seen.has(t.videoId) && seen.add(t.videoId))
}
