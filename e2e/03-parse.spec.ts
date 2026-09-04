// The parser, against a real search response.
//
// The fixture is a live YouTube result with the fields the parser never reads
// stripped out: three ordinary videos, a shelf of two Shorts, and one row that
// looks like a video but links to `/shorts/`, which is how the feeds smuggle
// them in. Nothing here is hand-written, so a change in YouTube's shapes shows
// up as a failure rather than as a fixture that still agrees with itself.

import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tracks } from '../src/main/parse.ts'

const read = (name: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8')) as never

const fixture = read('search-with-shorts.json')
const expected = read('search-with-shorts.expected.json') as unknown as {
  keep: string[]
  dropShortsUrl: string
}

test('Shorts never reach a list, in either of the shapes they arrive in', () => {
  const got = tracks(fixture)
  expect(got.map((t) => t.videoId)).toEqual(expected.keep)
  expect(got.map((t) => t.videoId)).not.toContain(expected.dropShortsUrl)
})

test('and the ordinary rows keep what a list needs to show', () => {
  const [first] = tracks(fixture)
  expect(first?.title.length).toBeGreaterThan(0)
  expect(first?.byline.length).toBeGreaterThan(0)
  expect(first?.duration).toMatch(/^\d+:\d{2}/)
})

// ── Channel ids ────────────────────────────────────────────────────────────
//
// A cut of a live search: six rows from three channels, four of them the same
// one, which is the shape a subscription filter has to work on.

const channels = read('search-channel-ids.json')
const channelsExpected = read('search-channel-ids.expected.json') as unknown as {
  rows: Array<{ videoId: string; byline: string; channelId: string }>
}

test('a row carries the channel that published it, not just its name', () => {
  const got = tracks(channels)
  expect(got.map((t) => t.videoId)).toEqual(channelsExpected.rows.map((r) => r.videoId))
  expect(got.map((t) => t.channelId)).toEqual(channelsExpected.rows.map((r) => r.channelId))
  // Every one of them, because a filter that silently loses the id on some
  // rows would leak those rows past it.
  expect(got.every((t) => (t.channelId ?? '').startsWith('UC'))).toBe(true)
})

test('and the same channel keeps one id across its rows', () => {
  const got = tracks(channels)
  const byName = new Map<string, Set<string>>()
  for (const t of got) {
    if (!t.channelId) continue
    ;(byName.get(t.byline) ?? byName.set(t.byline, new Set()).get(t.byline)!).add(t.channelId)
  }
  // Names are not identity, but within one response they should agree: an id
  // that wandered per row would put one channel into the picker several times.
  for (const [, ids] of byName) expect(ids.size).toBe(1)
  expect(new Set(got.map((t) => t.channelId)).size).toBe(3)
})
