// The things that work when YouTube will not: a history without a session, and
// the controls the phone shows with its screen off.

import { expect, test } from '@playwright/test'
import { app, open } from './fixture.ts'

const WATCH = 'https://www.youtube.com/watch?v=BzYnNdJhZQw'

test('what was played comes back under 최근 감상, signed out', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()

    await ui.locator('.nav', { hasText: '검색' }).click()
    await ui.locator('.searchbox input').fill('아이유 밤편지')
    await ui.locator('.searchbox input').press('Enter')
    const first = ui.locator('.row').first()
    await expect(first).toBeVisible()
    const title = (await first.locator('.title').textContent())?.trim() ?? ''
    await first.locator('.meta').click()
    await expect(ui.locator('.bar .now .t')).toHaveText(title)

    await ui.locator('.nav', { hasText: '최근 감상' }).click()
    // The row it was played from, now on a screen YouTube would leave empty.
    await expect(ui.locator('.rows .row .title').first()).toHaveText(title)

    // Written down where a reload will find it. Asserted at the storage rather
    // than by reloading, because the harness fakes "switched on" in
    // localStorage alone: the real config arrives from chrome.storage a moment
    // later saying off, and a reloaded test page would come back as plain
    // YouTube for reasons that have nothing to do with the history.
    const stored = await h.page.evaluate(() =>
      JSON.parse(localStorage.getItem('oc-easy-mode:history') ?? '[]') as Array<{ title: string }>,
    )
    expect(stored.length).toBeGreaterThan(0)
    expect(stored[0]!.title).toBe(title)
  } finally {
    await h.close()
  }
})

test('the media session describes our track, and keeps describing it', async () => {
  const h = await open(WATCH)
  try {
    await expect(app(h.page).locator('.app')).toBeVisible()
    const read = () =>
      h.page.evaluate(() => ({
        title: navigator.mediaSession.metadata?.title ?? '',
        art: navigator.mediaSession.metadata?.artwork?.length ?? 0,
      }))

    // Three artwork sizes is the tell that the metadata is ours: YouTube sets
    // one. It has to still be ours after the page has had time to take it back.
    await expect.poll(read, { timeout: 30_000 }).toMatchObject({ art: 3 })
    await h.page.waitForTimeout(6000)
    const later = await read()
    expect(later.art).toBe(3)
    expect(later.title.length).toBeGreaterThan(0)
  } finally {
    await h.close()
  }
})
