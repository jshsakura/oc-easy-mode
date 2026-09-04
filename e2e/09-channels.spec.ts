// The subscription filter: choosing channels narrows 구독, and clearing it
// puts everything back.
//
// **The feed is served from a fixture rather than from the account.** 구독
// needs a session and this browser has none: signed out the endpoint answers
// with nothing at all, which is what the safety suite checks for. So the
// browse is intercepted and answered with a cut of a live response, six rows
// from three channels. That makes the screen deterministic as well as
// reachable: a filter test whose row counts depend on what a real account
// happens to be subscribed to today is a test that fails for the wrong reason.

import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, open } from './fixture.ts'
import { channelsOf, applyFilter } from '../src/main/ui/channels.ts'
import { tracks as parseTracks } from '../src/main/parse.ts'

const fixture = readFileSync(join(import.meta.dirname, 'fixtures', 'search-channel-ids.json'), 'utf8')

/** Answers the subscriptions browse, and only that one, with the fixture. */
async function serveSubs(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/youtubei/v1/browse*', async (route) => {
    const body = route.request().postData() ?? ''
    if (!body.includes('FEsubscriptions')) return route.fallback()
    await route.fulfill({ status: 200, contentType: 'application/json', body: fixture })
  })
}

// ── The rule itself, without a browser ─────────────────────────────────────

const parsed = parseTracks(JSON.parse(fixture) as never)

test('the channel list is built from the feed, most prolific first', () => {
  const list = channelsOf(parsed)
  expect(list.length).toBe(3)
  expect(list[0]!.count).toBeGreaterThanOrEqual(list[1]!.count)
  expect(list.reduce((n, c) => n + c.count, 0)).toBe(parsed.length)
  expect(list.every((c) => c.id.startsWith('UC') && c.name.length > 0)).toBe(true)
})

test('an empty filter is no filter, and a chosen one keeps only its channels', () => {
  expect(applyFilter(parsed, [])).toHaveLength(parsed.length)
  const [first] = channelsOf(parsed)
  const only = applyFilter(parsed, [first!.id])
  expect(only).toHaveLength(first!.count)
  expect(only.every((t) => t.channelId === first!.id)).toBe(true)
  // A channel nobody published to leaves the screen empty rather than full.
  expect(applyFilter(parsed, ['UCnotarealchannelid'])).toHaveLength(0)
})

// ── And on the screen ──────────────────────────────────────────────────────

test('choosing a channel narrows the feed, and clearing it brings the rest back', async () => {
  const h = await open('https://www.youtube.com/')
  try {
    await serveSubs(h.page)
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await ui.locator('.nav', { hasText: '구독' }).click()

    const rows = ui.locator('.row:not([aria-hidden])')
    await expect(rows).toHaveCount(parsed.length)

    // Open the checklist and keep only the channel with the most rows.
    await ui.locator('.chanFilter').click()
    const picker = h.page.locator('oc-easy-mode-overlay').locator('.channelRow')
    await expect(picker.first()).toBeVisible()
    await expect(picker).toHaveCount(3)
    const biggest = channelsOf(parsed)[0]!
    await picker.first().click()
    await h.page.locator('oc-easy-mode-overlay').locator('.btn.primary', { hasText: '적용' }).click()

    await expect(rows).toHaveCount(biggest.count)
    // And the button says a filter is on, so a short screen is explained.
    await expect(ui.locator('.chanFilter .chanCount')).toHaveText('1')

    // Clearing puts the feed back.
    await ui.locator('.chanFilter').click()
    await h.page.locator('oc-easy-mode-overlay').locator('.btn.ghost', { hasText: '필터 해제' }).click()
    await expect(rows).toHaveCount(parsed.length)
    await expect(ui.locator('.chanFilter .chanCount')).toHaveCount(0)
  } finally {
    await h.close()
  }
})

test('nothing reaches the player while the checklist is open', async () => {
  const h = await open('https://www.youtube.com/')
  try {
    await serveSubs(h.page)
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await ui.locator('.nav', { hasText: '구독' }).click()
    await expect(ui.locator('.row:not([aria-hidden])').first()).toBeVisible()

    await ui.locator('.chanFilter').click()
    await expect(h.page.locator('oc-easy-mode-overlay').locator('.channelRow').first()).toBeVisible()
    // s and r drive shuffle and repeat when nothing is open. With a dialog up
    // they belong to the dialog, and the settings behind it must not move.
    const before = await h.page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('oc-easy-mode:state') ?? '{}')
      return { shuffle: !!s.shuffle, repeat: s.repeat ?? 'off' }
    })
    await h.page.keyboard.press('s')
    await h.page.keyboard.press('r')
    await h.page.waitForTimeout(300)
    const after = await h.page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('oc-easy-mode:state') ?? '{}')
      return { shuffle: !!s.shuffle, repeat: s.repeat ?? 'off' }
    })
    expect(after).toEqual(before)
  } finally {
    await h.close()
  }
})
