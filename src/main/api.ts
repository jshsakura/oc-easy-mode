// What the player asks YouTube for, as questions rather than endpoints.
//
// Every function here is one or a few InnerTube calls plus a parser. The
// endpoints are the ones youtube.com itself uses for the same screens, so the
// request shapes are copied from the page rather than invented.

import { call, hasSession, InnertubeError } from './innertube.ts'
import {
  continuationToken,
  playlists as parsePlaylists,
  shelves as parseShelves,
  tracks as parseTracks,
  dedupe,
  type Playlist,
  type Shelf,
  type Track,
} from './parse.ts'
import type { YtCfg } from './ytcfg.ts'

export interface Page {
  tracks: Track[]
  /**
   * The response's titled rows, when it had any. A screen with shelves is laid
   * out like a television's; one without falls back to the flat list above.
   */
  shelves: Shelf[]
  /** Pass back to `more()` for the next page; undefined at the end. */
  continuation?: string
  /** Which endpoint the continuation belongs to. */
  endpoint: 'search' | 'browse' | 'next'
}

// Search filter "type: video", protobuf-encoded the way the page sends it.
// Without it a query returns channels and playlists mixed in with the songs.
const VIDEOS_ONLY = 'EgIQAQ%3D%3D'

export async function search(cfg: YtCfg, query: string): Promise<Page> {
  const res = await call(cfg, 'search', { query, params: VIDEOS_ONLY })
  return { tracks: parseTracks(res), shelves: [], continuation: continuationToken(res), endpoint: 'search' }
}

/** A mix seeded from one video: the page's own "radio" for it. */
export async function mix(cfg: YtCfg, videoId: string): Promise<Page> {
  const res = await call(cfg, 'next', { videoId, playlistId: `RD${videoId}` })
  return { tracks: parseTracks(res), shelves: [], continuation: continuationToken(res), endpoint: 'next' }
}

/** The next page of any of the above. */
export async function more(cfg: YtCfg, page: Page): Promise<Page> {
  if (!page.continuation) return { tracks: [], shelves: [], endpoint: page.endpoint }
  const res = await call(cfg, page.endpoint, { continuation: page.continuation })
  return { tracks: parseTracks(res), shelves: [], continuation: continuationToken(res), endpoint: page.endpoint }
}

/** The signed-in user's playlists. Throws an `auth` error when signed out. */
export async function myPlaylists(cfg: YtCfg): Promise<Playlist[]> {
  if (!hasSession()) throw new InnertubeError('signed out', 'auth', 401)
  const res = await call(cfg, 'browse', { browseId: 'FEplaylist_aggregation' })
  let list = parsePlaylists(res)
  let token = continuationToken(res)
  for (let i = 0; token && i < 10; i++) {
    const next = await call(cfg, 'browse', { continuation: token })
    list = list.concat(parsePlaylists(next))
    token = continuationToken(next)
  }
  return list
}

/** Every track of one playlist, following continuations. */
export async function playlistTracks(cfg: YtCfg, playlistId: string, limit = 1000): Promise<Track[]> {
  const res = await call(cfg, 'browse', { browseId: `VL${playlistId}` })
  let list = parseTracks(res)
  let token = continuationToken(res)
  while (token && list.length < limit) {
    const next = await call(cfg, 'browse', { continuation: token })
    const got = parseTracks(next)
    if (got.length === 0) break
    list = dedupe(list.concat(got))
    token = continuationToken(next)
  }
  return list
}

export async function createPlaylist(cfg: YtCfg, title: string, videoIds: string[] = []): Promise<string> {
  const res = await call(cfg, 'playlist/create', { title, videoIds, privacyStatus: 'PRIVATE' })
  const id = res.playlistId
  if (typeof id !== 'string') throw new InnertubeError('playlist/create returned no id', 'shape')
  return id
}

export async function deletePlaylist(cfg: YtCfg, playlistId: string): Promise<void> {
  await call(cfg, 'playlist/delete', { playlistId })
}

export async function addToPlaylist(cfg: YtCfg, playlistId: string, videoIds: string[]): Promise<void> {
  await call(cfg, 'browse/edit_playlist', {
    playlistId,
    actions: videoIds.map((addedVideoId) => ({ action: 'ACTION_ADD_VIDEO', addedVideoId })),
  })
}

/** Removes one slot when the row said which, otherwise every copy of the video. */
export async function removeFromPlaylist(cfg: YtCfg, playlistId: string, track: Track): Promise<void> {
  const action = track.setVideoId
    ? { action: 'ACTION_REMOVE_VIDEO', setVideoId: track.setVideoId }
    : { action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID', removedVideoId: track.videoId }
  await call(cfg, 'browse/edit_playlist', { playlistId, actions: [action] })
}

/** The feeds the page itself shows: home, subscriptions, history. Signed-in only for the last two. */
export type FeedId = 'FEwhat_to_watch' | 'FEsubscriptions' | 'FEhistory'

export async function feed(cfg: YtCfg, browseId: FeedId): Promise<Page> {
  // Subscriptions and history are personal; signed out they come back as an
  // empty page rather than an error, which would read as "you watch nothing".
  if (browseId !== 'FEwhat_to_watch' && !hasSession()) {
    throw new InnertubeError('signed out', 'auth', 401)
  }
  const res = await call(cfg, 'browse', { browseId })
  return {
    tracks: parseTracks(res),
    shelves: parseShelves(res),
    continuation: continuationToken(res),
    endpoint: 'browse',
  }
}

/**
 * The screen that is never empty.
 *
 * YouTube's own home needs a watch history to say anything — signed out, and
 * signed in on a fresh account, it answers with "start by searching" and no
 * feed at all (measured 2026-09-03). That is a poor front door for something
 * meant to feel like a television.
 *
 * This is YouTube's Music channel, which anyone can browse and which comes
 * back as nine titled shelves of playlists and albums. It is a browse of an
 * ordinary channel, so nothing about it is private or personal — which is
 * exactly why it always works.
 */
const MUSIC_CHANNEL = 'UC-9-kyTW8ZkZNDHQJ6FgpwQ'

export async function explore(cfg: YtCfg): Promise<Page> {
  const res = await call(cfg, 'browse', { browseId: MUSIC_CHANNEL })
  return { tracks: parseTracks(res), shelves: parseShelves(res), endpoint: 'browse' }
}
