// The product: our UI, YouTube's player, one queue between them.

import { expect, test } from '@playwright/test'
import { app, open, searchFor } from './fixture.ts'

const WATCH = 'https://www.youtube.com/watch?v=BzYnNdJhZQw'

test('search returns tracks, and choosing one drives the page\'s player', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()

    const over = await searchFor(h.page, '아이유 밤편지')
    const first = over.locator('.row:not([aria-hidden])').first()

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
    const over = await searchFor(h.page, 'lofi')
    await over.locator('.row:not([aria-hidden])').first().click()

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
    const over = await searchFor(h.page, 'lofi')
    await over.locator('.searchAct', { hasText: '전체 재생' }).click()
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

test('arriving on a watch page plays nothing until play is pressed', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    // The page's own autoplay was stopped, and stays stopped.
    await expect.poll(() => h.page.evaluate(() => document.querySelector('video')?.paused ?? null), { timeout: 15_000 }).toBe(true)
    await h.page.waitForTimeout(3000)
    expect(await h.page.evaluate(() => document.querySelector('video')?.paused)).toBe(true)
    // The track is in the bar, waiting for the press.
    await expect(ui.locator('.bar .now .t')).not.toHaveText('재생 중인 항목 없음')
    await ui.locator('.ctl button[title="재생 / 일시정지"]').click()
    await expect.poll(() => h.page.evaluate(() => document.querySelector('video')?.paused), { timeout: 15_000 }).toBe(false)
  } finally {
    await h.close()
  }
})

test('an arrival of our own is allowed to play', async () => {
  // A track pressed where there is no player navigates to its page and
  // leaves this mark behind; the page that arrives reads it and lets the
  // video go. The mark is set the way load() sets it.
  const h = await open(WATCH, true)
  try {
    // The harness's quick flag is cleared by the background's answer once the
    // app is up (see 10-equalizer); set again for the load that follows.
    await h.page.addInitScript(() => {
      try {
        localStorage.setItem('oc-easy-mode:on', '1')
      } catch {}
    })
    await h.page.evaluate(() => localStorage.setItem('oc-easy-mode:arriving', 'BzYnNdJhZQw'))
    await h.page.reload({ waitUntil: 'domcontentloaded' })
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible({ timeout: 60_000 })
    await expect.poll(() => h.page.evaluate(() => { const v = document.querySelector('video'); return v ? !v.paused && v.currentTime > 0 : null }), { timeout: 30_000 }).toBe(true)
    // And the mark is spent.
    expect(await h.page.evaluate(() => localStorage.getItem('oc-easy-mode:arriving'))).toBeNull()
  } finally {
    await h.close()
  }
})

test('the mute button silences the video element, and hands the level back', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()

    // Playing first. The engine writes our mute onto the element again on
    // every tick while there is sound, so a press over a stopped player would
    // never exercise the path that actually keeps a phone quiet.
    await expect(ui.locator('.bar .now .t')).not.toHaveText('재생 중인 항목 없음')
    await ui.locator('.ctl button[title="재생 / 일시정지"]').click()
    await expect
      .poll(() => h.page.evaluate(() => document.querySelector('video')?.paused), { timeout: 30_000 })
      .toBe(false)

    // The element decides whether anything is heard; the player's own answer
    // is asked for as well, because on some builds the two disagree and that
    // disagreement is the bug this guards.
    const sound = () =>
      h.page.evaluate(() => {
        const el = document.querySelector('video')
        const p = document.getElementById('movie_player') as { isMuted?: () => boolean } | null
        let api: boolean | null = null
        try {
          api = p?.isMuted?.() ?? null
        } catch {
          api = null
        }
        return { el: el ? el.muted : null, api }
      })
    expect(await sound()).toEqual({ el: false, api: false })

    const mute = ui.locator('.bar .right button[title="음소거"]')
    await mute.click()
    await expect.poll(sound).toEqual({ el: true, api: true })

    await mute.click()
    await expect.poll(sound).toEqual({ el: false, api: false })
    // Back to the level it was at rather than to a number chosen by the
    // button: the same action as the m key, not a second one beside it.
    expect(await h.page.evaluate(() => JSON.parse(localStorage.getItem('oc-easy-mode:state') ?? '{}').volume)).toBeGreaterThan(0)
  } finally {
    await h.close()
  }
})
