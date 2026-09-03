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
