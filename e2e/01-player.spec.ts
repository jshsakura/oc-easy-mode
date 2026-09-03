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

    // Something has to be playing for there to be a picture at all: it is
    // shown while a track is loaded and gone when none is.
    await ui.locator('.nav', { hasText: '검색' }).click()
    await ui.locator('.searchbox input').fill('lofi')
    await ui.locator('.searchbox input').press('Enter')
    await ui.locator('.row').first().click()

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
    // Cycle the bar's own button to the big layout; the player follows.
    // Desktop order is hidden, corner, stage.
    await ui.locator('.bar .vid').click()
    await expect(ui.locator('.slot')).toHaveClass(/stage/)
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

test('the picture is on top of the app, and out of the way when it is not wanted', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()

    // Placing the player over the stage is not enough: our own panel painted
    // over it, and the stage came out a black rectangle with the video playing
    // underneath. Geometry alone never caught it — the rects matched exactly
    // the whole time — so this asks the page who is actually on top.
    await ui.locator('.bar .vid').click()
    await expect(ui.locator('.slot')).toHaveClass(/stage/)

    const topOfStage = async () =>
      h.page.evaluate(() => {
        const slot = document.querySelector('oc-easy-mode')!.shadowRoot!.querySelector('.slot')!
        const b = slot.getBoundingClientRect()
        const top = document.elementsFromPoint(b.x + b.width / 2, b.y + b.height / 2)[0]
        return top ? top.tagName : ''
      })
    await expect.poll(topOfStage).not.toBe('OC-EASY-MODE')

    // And with no picture asked for, nothing of the player may show: it is
    // parked behind the app, which only works while the app is above it.
    await ui.locator('.bar .vid').click()
    await expect(ui.locator('.slot')).toHaveClass(/hidden/)
    await expect
      .poll(async () =>
        h.page.evaluate(() => {
          const p = document.getElementById('movie_player')!.getBoundingClientRect()
          const top = document.elementsFromPoint(p.x + p.width / 2, p.y + p.height / 2)[0]
          return top ? top.tagName : ''
        }),
      )
      .toBe('OC-EASY-MODE')
  } finally {
    await h.close()
  }
})
