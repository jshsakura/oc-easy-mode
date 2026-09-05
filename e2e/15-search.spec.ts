// What the search panel offers besides answers: suggestions while typing, the
// queries this browser asked before, and the kinds of result that are not a
// video.
//
// **The suggestion endpoint is served from here rather than from Google.** It
// is a live autocomplete: what it answers for a prefix changes by the day and
// by the country the request leaves from, so an assertion on its contents is
// an assertion about the news. The request that reaches it is checked instead,
// which is the part this product is responsible for. Everything else in this
// file talks to the real YouTube, the way the rest of the suite does.

import { expect, test, type Page } from '@playwright/test'
import { app, open, overlay } from './fixture.ts'
import { channels as parseChannels } from '../src/main/parse.ts'

const WATCH = 'https://www.youtube.com/watch?v=BzYnNdJhZQw'

/** What `client=firefox` answers with: the query, then the suggestions. */
const SUGGESTIONS = ['아이유', '아이유 노래모음', '아이유 스물셋', '아이유 밤편지']

/** Answers the autocomplete, and remembers the URL it was asked at. */
async function serveSuggestions(page: Page): Promise<string[]> {
  const asked: string[] = []
  await page.route('**/complete/search*', async (route) => {
    asked.push(route.request().url())
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript; charset=UTF-8',
      body: JSON.stringify(['아이유', SUGGESTIONS, [], {}]),
    })
  })
  return asked
}

/** Opens the panel from the sidebar and returns the overlay root. */
async function openPanel(page: Page) {
  const ui = app(page)
  await expect(ui.locator('.app')).toBeVisible({ timeout: 60_000 })
  await ui.locator('.nav', { hasText: '검색' }).click()
  const over = overlay(page)
  await expect(over.locator('.modal.search')).toBeVisible()
  return over
}

/**
 * Reloads with the mode still on.
 *
 * The harness's "switched on" flag is cleared by the background's answer once
 * the app is up (see 01-player), so a bare reload comes back as plain YouTube
 * for a reason that has nothing to do with what is being tested here.
 */
async function reload(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('oc-easy-mode:on', '1')
    } catch {}
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
}

// ── The parser, without a browser ──────────────────────────────────────────

test('a channel row reads as a name, a handle and a count', () => {
  const res = {
    contents: [
      {
        channelRenderer: {
          channelId: 'UCSJ4gkVC6NrvII8umztf0Ow',
          title: { simpleText: 'Lofi Girl' },
          // Swapped at the source: the handle is under subscriberCountText and
          // the subscriber count under videoCountText. Measured 2026-09-05.
          subscriberCountText: { simpleText: '@LofiGirl' },
          videoCountText: { simpleText: '14.8M subscribers' },
          thumbnail: { thumbnails: [{ url: '//yt3.ggpht.com/x=s176', width: 176, height: 176 }] },
        },
      },
      { channelRenderer: { title: { simpleText: 'no id, not a channel' } } },
    ],
  }
  const [one, ...rest] = parseChannels(res)
  expect(rest).toEqual([])
  expect(one!.id).toBe('UCSJ4gkVC6NrvII8umztf0Ow')
  expect(one!.title).toBe('Lofi Girl')
  expect(one!.subtitle).toBe('@LofiGirl · 14.8M subscribers')
  // Protocol-relative on the mobile client, and unusable as it stands.
  expect(one!.avatar).toBe('https://yt3.ggpht.com/x=s176')
})

// ── Suggestions ────────────────────────────────────────────────────────────

test('typing a prefix brings suggestions under the field', async () => {
  const h = await open(WATCH)
  try {
    const asked = await serveSuggestions(h.page)
    const over = await openPanel(h.page)
    await over.locator('.searchbox input').fill('아이유')

    const rows = over.locator('.suggestRow')
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBe(SUGGESTIONS.length)
    await expect(rows.first()).toHaveText(SUGGESTIONS[0]!)

    // The request that was actually sent, which is the part that is ours.
    expect(asked.length).toBeGreaterThan(0)
    const url = new URL(asked[asked.length - 1]!)
    expect(url.host).toBe('suggestqueries-clients6.youtube.com')
    expect(url.searchParams.get('client')).toBe('firefox')
    expect(url.searchParams.get('ds')).toBe('yt')
    expect(url.searchParams.get('q')).toBe('아이유')

    // The down arrow walks out of the field and into the list: the remote
    // needs no rule of its own, only the data-nav every row carries.
    //
    // Pressed until it lands rather than once. The page under the panel is
    // still alive and can take the focus while the panel is opening, and an
    // arrow press with nothing focused only picks the field back up, which is
    // remote.ts doing exactly what it says it does.
    await expect
      .poll(async () => {
        await h.page.keyboard.press('ArrowDown')
        return h.page.evaluate(
          () => document.querySelector('oc-easy-mode-overlay')?.shadowRoot?.activeElement?.className ?? '',
        )
      })
      .toContain('suggestRow')

    // And choosing one asks it.
    await rows.nth(1).click()
    await expect(over.locator('.searchbox input')).toHaveValue(SUGGESTIONS[1]!)
    await expect(over.locator('.suggestRow')).toHaveCount(0)
  } finally {
    await h.close()
  }
})

// ── Recent searches ────────────────────────────────────────────────────────

test('a query asked on purpose is still there after a reload, and can be dropped', async () => {
  const h = await open(WATCH)
  try {
    await serveSuggestions(h.page)
    const over = await openPanel(h.page)
    const box = over.locator('.searchbox input')
    await box.fill('아이유')
    await box.press('Enter')
    await expect(over.locator('.rows .row:not([aria-hidden])').first()).toBeVisible()

    await reload(h.page)
    const again = await openPanel(h.page)
    const remembered = again.locator('.recentGo')
    await expect(remembered.first()).toHaveText('아이유')

    // An empty field is never remembered, however many times it is asked.
    const box2 = again.locator('.searchbox input')
    await box2.fill('')
    await box2.press('Enter')
    await expect(remembered).toHaveCount(1)

    // The ✕ takes one off, and it stays off across a reload.
    await again.locator('.recentDrop').first().click()
    await expect(again.locator('.recentGo')).toHaveCount(0)
    await reload(h.page)
    const third = await openPanel(h.page)
    await expect(third.locator('.recentGo')).toHaveCount(0)
    await expect(third.locator('.empty')).toBeVisible()
  } finally {
    await h.close()
  }
})

test('지우기 forgets all of them at once', async () => {
  const h = await open(WATCH)
  try {
    await h.page.evaluate(() =>
      localStorage.setItem('oc-easy-mode:searches', JSON.stringify(['아이유', 'lofi', '뉴진스'])),
    )
    await reload(h.page)
    const over = await openPanel(h.page)
    await expect(over.locator('.recentGo')).toHaveCount(3)

    await over.locator('.searchClear').click()
    await expect(over.locator('.recentGo')).toHaveCount(0)
    expect(await h.page.evaluate(() => localStorage.getItem('oc-easy-mode:searches'))).toBeNull()
  } finally {
    await h.close()
  }
})

// ── The other kinds of result ──────────────────────────────────────────────

test('a playlist among the answers opens the playlist', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    const over = await openPanel(h.page)
    const box = over.locator('.searchbox input')
    await box.fill('아이유 노래모음')
    await box.press('Enter')

    // Playlists wear a thumbnail, channels wear a round avatar.
    const list = over.locator('.kindRow:has(.thumb)').first()
    await expect(list).toBeVisible()
    const name = (await list.locator('.ttl').textContent())?.trim() ?? ''
    expect(name.length).toBeGreaterThan(0)

    await list.click()
    // The panel is gone and the screen underneath is that playlist.
    await expect(over.locator('.modal.search')).toHaveCount(0)
    await expect(ui.locator('.head h2')).toHaveText(name)
    await expect(ui.locator('.row:not([aria-hidden])').first()).toBeVisible()
  } finally {
    await h.close()
  }
})

test('a channel among the answers asks for that channel by name', async () => {
  const h = await open(WATCH)
  try {
    const over = await openPanel(h.page)
    const box = over.locator('.searchbox input')
    await box.fill('아이유')
    await box.press('Enter')

    // There is no channel screen, so a channel is a search for its name.
    const channel = over.locator('.kindRow:has(.avatar)').first()
    await expect(channel).toBeVisible()
    const name = (await channel.locator('.ttl').textContent())?.trim() ?? ''
    await channel.click()
    await expect(box).toHaveValue(name)
    await expect(over.locator('.rows .row:not([aria-hidden])').first()).toBeVisible()
  } finally {
    await h.close()
  }
})
