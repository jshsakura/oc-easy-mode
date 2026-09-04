// The equalizer: a graph that is not there until it is asked for, that the
// sound then really passes through, and that finds out for itself when a
// browser silences it.

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { app, open, overlay, searchFor, type Harness } from './fixture.ts'

const WATCH = 'https://www.youtube.com/watch?v=BzYnNdJhZQw'
const EQ = 'oc-easy-mode:eq'
const REFUSED = 'oc-easy-mode:eq-refused'

/** Starts a track and waits until the element is actually moving. */
async function playing(h: Harness): Promise<void> {
  const over = await searchFor(h.page, '아이유 밤편지')
  await over.locator('.row:not([aria-hidden])').first().locator('.meta').click()
  await expect(over.locator('.modal.search')).toHaveCount(0)
  await expect.poll(() => h.page.evaluate(() => document.querySelector('video')?.currentTime ?? 0), { timeout: 60_000 }).toBeGreaterThan(1)
}

/** Counts every AudioContext the page makes from now on. In the page's own world, which is where main.js runs. */
async function countContexts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __ctx: number; AudioContext: typeof AudioContext }
    const Real = w.AudioContext
    w.__ctx = 0
    w.AudioContext = class extends Real {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args)
        w.__ctx += 1
      }
    }
  })
}
const contexts = (page: Page) => page.evaluate(() => (window as unknown as { __ctx: number }).__ctx)
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key)

async function openDialog(h: Harness) {
  const ui = app(h.page)
  const over = overlay(h.page)
  await ui.locator('.bar .right .mr').click()
  await over.locator('.menu button', { hasText: '이퀄라이저' }).click()
  await expect(over.locator('.modal.equalizer')).toBeVisible()
  return over
}

test('the graph is built only when switched on, and the sound then passes through it', async () => {
  const h = await open(WATCH)
  try {
    await playing(h)
    await countContexts(h.page)
    // Playing, and nothing built: that is the promise to the browser that
    // cannot take a graph back.
    expect(await contexts(h.page)).toBe(0)

    const over = await openDialog(h)
    const toggle = over.locator('.eqSwitch .btn')
    await expect(toggle).toHaveText('꺼짐')
    await toggle.click()
    await expect(toggle).toHaveText('켜짐')
    expect(await contexts(h.page)).toBe(1)
    expect(JSON.parse((await stored(h.page, EQ)) ?? '{}').on).toBe(true)

    // The element is spoken for now: a second graph on it is refused by the
    // browser itself, which is the proof that ours is the one carrying the
    // sound.
    const second = await h.page.evaluate(() => {
      try {
        new AudioContext().createMediaElementSource(document.querySelector('video')!)
        return 'connected'
      } catch (err) {
        return (err as Error).name
      }
    })
    expect(second).toBe('InvalidStateError')

    // A band moves the sound at once and is remembered.
    const band = over.locator('.eqRow input').first()
    await band.evaluate((el: HTMLInputElement) => {
      el.value = '6'
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await expect(over.locator('.eqRow .val').first()).toHaveText('+6 dB')
    expect(JSON.parse((await stored(h.page, EQ)) ?? '{}').bands[0]).toBe(6)

    // Listening to itself found sound, so nothing was refused and the music
    // is still moving.
    await h.page.waitForTimeout(2500)
    expect(await stored(h.page, REFUSED)).toBeNull()
    expect(JSON.parse((await stored(h.page, EQ)) ?? '{}').on).toBe(true)
    const t1 = await h.page.evaluate(() => document.querySelector('video')!.currentTime)
    await expect.poll(() => h.page.evaluate(() => document.querySelector('video')!.currentTime)).toBeGreaterThan(t1)

    // Escape closes it and is spent on it; the menu then says it is on.
    await h.page.keyboard.press('Escape')
    await expect(over.locator('.modal.equalizer')).toHaveCount(0)
    await expect(app(h.page).locator('.app')).toBeVisible()
    await app(h.page).locator('.bar .right .mr').click()
    await expect(over.locator('.menu button', { hasText: '이퀄라이저' })).toContainText('켜짐')
  } finally {
    await h.close()
  }
})

test('a browser that silences the graph is refused, told, and reloaded', async () => {
  const h = await open(WATCH)
  try {
    await playing(h)
    // What an iPhone might do: the element plays, and the graph hears nothing.
    await h.page.evaluate(() => {
      AnalyserNode.prototype.getFloatTimeDomainData = function (arr: Float32Array) {
        arr.fill(0)
      }
    })

    // The harness switches the mode on through localStorage alone, and the
    // background's own answer (off, in a fresh profile) clears that flag the
    // moment the app is up. A real profile has the toolbar's answer in
    // chrome.storage and comes back on its own; here the flag is set again
    // for the load that is about to happen.
    await h.page.addInitScript(() => {
      try {
        localStorage.setItem('oc-easy-mode:on', '1')
      } catch {}
    })
    const over = await openDialog(h)
    const reloaded = h.page.waitForEvent('load', { timeout: 20_000 })
    await over.locator('.eqSwitch .btn').click()
    await expect(over.locator('.toast.bad')).toContainText('소리가 나지 않아', { timeout: 15_000 })
    // One look, taken at once: the page reloads itself a moment after the
    // toast, and three separate round trips would race it.
    const after = await h.page.evaluate(() => ({
      refused: localStorage.getItem('oc-easy-mode:eq-refused'),
      on: (JSON.parse(localStorage.getItem('oc-easy-mode:eq') ?? '{}') as { on?: boolean }).on,
      told: document.querySelector('oc-easy-mode-overlay')!.shadowRoot!.querySelector('.eqRefused') !== null,
    }))
    expect(after).toEqual({ refused: '1', on: false, told: true })

    // Only a reload brings the sound back, so the page does that itself.
    await reloaded
    await expect(app(h.page).locator('.app')).toBeVisible({ timeout: 60_000 })
    const again = await openDialog(h)
    await expect(again.locator('.eqRefused')).toBeVisible()
    await expect(again.locator('.eqSwitch .btn')).toBeDisabled()
  } finally {
    await h.close()
  }
})
