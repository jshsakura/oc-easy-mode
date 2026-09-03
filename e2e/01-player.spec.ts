// The product: our UI, YouTube's player, one queue between them.

import { expect, test } from '@playwright/test'
import { app, open } from './fixture.ts'

const WATCH = 'https://www.youtube.com/watch?v=BzYnNdJhZQw'

test('search returns tracks, and choosing one drives the page\'s player', async () => {
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
    expect(title.length).toBeGreaterThan(0)

    await first.locator('.meta').click()
    // The bar says what the queue says.
    await expect(ui.locator('.bar .now .t')).toHaveText(title)
    // And YouTube's own player agrees, without the page having navigated.
    await expect
      .poll(async () =>
        h.page.evaluate(() => {
          const p = document.getElementById('movie_player') as { getVideoData?: () => { title?: string } } | null
          return p?.getVideoData?.().title ?? ''
        }),
      )
      .not.toBe('')
    expect(h.page.url()).toContain('BzYnNdJhZQw')
  } finally {
    await h.close()
  }
})

test('the player is placed over the slot, and the slot moves with the layout', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()

    const rects = async () =>
      h.page.evaluate(() => {
        const host = document.querySelector('oc-easy-mode')!
        const slot = host.shadowRoot!.querySelector('.slot')!.getBoundingClientRect()
        const player = document.getElementById('movie_player')!.getBoundingClientRect()
        return { slot: [slot.x, slot.y, slot.width, slot.height], player: [player.x, player.y, player.width, player.height] }
      })

    await expect
      .poll(async () => {
        const r = await rects()
        return r.slot.every((v, i) => Math.abs(v - r.player[i]!) < 2)
      })
      .toBe(true)

    const corner = (await rects()).slot
    // Switch to the big layout and the player follows.
    // The menu lives in the second host, above the video rather than under it.
    await ui.locator('.right button[title="화면 위치"]').click()
    await h.page.locator('oc-easy-mode-overlay').locator('.menu button', { hasText: '크게 보기' }).click()
    await expect
      .poll(async () => {
        const r = await rects()
        return r.slot[2]! > corner[2]! + 100 && r.slot.every((v, i) => Math.abs(v - r.player[i]!) < 2)
      })
      .toBe(true)
  } finally {
    await h.close()
  }
})

test('the queue advances and the mode survives it', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await ui.locator('.nav', { hasText: '검색' }).click()
    await ui.locator('.searchbox input').fill('lofi')
    await ui.locator('.searchbox input').press('Enter')
    await expect(ui.locator('.row').first()).toBeVisible()

    await ui.locator('.toolbar button', { hasText: '전체 재생' }).click()
    const firstTitle = await ui.locator('.bar .now .t').textContent()

    await ui.locator('.ctl button[title="다음"]').click()
    await expect(ui.locator('.bar .now .t')).not.toHaveText(firstTitle ?? '')

    // Still in our UI, still one host, YouTube still hidden.
    await expect(ui.locator('.app')).toBeVisible()
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(1)
  } finally {
    await h.close()
  }
})
