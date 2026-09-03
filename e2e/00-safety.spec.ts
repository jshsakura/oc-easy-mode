// The promise this extension makes: YouTube is never altered, and there is
// always a way back. Everything else can be rebuilt; this cannot be broken.

import { expect, test } from '@playwright/test'
import { app, open } from './fixture.ts'

test('does nothing at all while switched off', async () => {
  const h = await open('https://www.youtube.com/', false)
  try {
    await h.page.waitForTimeout(4000)
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(0)
    await expect(h.page.locator('#oc-easy-mode')).toHaveCount(0)
    expect(await h.page.evaluate(() => document.documentElement.getAttribute('style') ?? '')).not.toContain('--oc-')
    // YouTube's own chrome is untouched.
    await expect(h.page.locator('ytd-app')).toBeVisible()
  } finally {
    await h.close()
  }
})

test('mounts exactly two nodes and touches nothing else', async () => {
  const h = await open('https://www.youtube.com/')
  try {
    await expect(app(h.page).locator('.app')).toBeVisible()
    const counts = await h.page.evaluate(() => ({
      style: document.querySelectorAll('#oc-easy-mode').length,
      host: document.querySelectorAll('oc-easy-mode').length,
      overlay: document.querySelectorAll('oc-easy-mode-overlay').length,
      // Nothing of YouTube's carries a mark of ours. (This said `oc-tube` for
      // a while after the rename, which matched nothing and checked nothing.)
      marked: document.querySelectorAll('[class*="oc-easy"], [data-oc-easy]').length,
      // Added only on a phone handed the desktop page, which has no viewport
      // meta of its own. Never here.
      viewport: document.querySelectorAll('#oc-easy-mode-viewport').length,
      ytdApp: document.querySelectorAll('ytd-app').length,
    }))
    expect(counts).toEqual({ style: 1, host: 1, overlay: 1, marked: 0, viewport: 0, ytdApp: 1 })
    // The player's position lives in our sheet, not on the page's root element.
    expect(await h.page.evaluate(() => document.documentElement.getAttribute('style') ?? '')).not.toContain('--oc-')
  } finally {
    await h.close()
  }
})

test('Escape twice puts YouTube back', async () => {
  const h = await open('https://www.youtube.com/')
  try {
    await expect(app(h.page).locator('.app')).toBeVisible()
    await h.page.keyboard.press('Escape')
    await h.page.keyboard.press('Escape')
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(0)
    await expect(h.page.locator('#oc-easy-mode')).toHaveCount(0)
    await expect(h.page.locator('ytd-app')).toBeVisible()
    expect(await h.page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden')
  } finally {
    await h.close()
  }
})

test('a single Escape is left to YouTube', async () => {
  const h = await open('https://www.youtube.com/')
  try {
    await expect(app(h.page).locator('.app')).toBeVisible()
    await h.page.keyboard.press('Escape')
    await h.page.waitForTimeout(1500)
    await h.page.keyboard.press('Escape')
    await h.page.waitForTimeout(500)
    await expect(app(h.page).locator('.app')).toBeVisible()
  } finally {
    await h.close()
  }
})

test('the sidebar button leaves too, and the flag stays off across a reload', async () => {
  const h = await open('https://www.youtube.com/')
  try {
    await expect(app(h.page).locator('.app')).toBeVisible()
    await app(h.page).locator('.exit').click()
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(0)
    expect(await h.page.evaluate(() => localStorage.getItem('oc-easy-mode:on'))).toBe('0')
  } finally {
    await h.close()
  }
})

test('the toolbar switch turns it on and off through storage', async () => {
  const h = await open('https://www.youtube.com/', false)
  try {
    await expect(h.page.locator('ytd-app')).toBeVisible()
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(0)

    // The same path the popup takes: write the setting, let the bridge tell
    // the page. Driving the popup's own DOM would test the button, not this.
    const flip = (musicMode: boolean) =>
      h.page.evaluate((on) => {
        window.postMessage({ ns: 'oc-easy-mode', type: 'set-config', patch: { musicMode: on } }, location.origin)
      }, musicMode)

    await flip(true)
    await expect(app(h.page).locator('.app')).toBeVisible()

    await flip(false)
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(0)
    await expect(h.page.locator('#oc-easy-mode')).toHaveCount(0)
    await expect(h.page.locator('ytd-app')).toBeVisible()
  } finally {
    await h.close()
  }
})

test('signed out, a personal feed says so instead of looking empty', async () => {
  const h = await open('https://www.youtube.com/')
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await ui.locator('.nav', { hasText: '구독' }).click()
    await expect(ui.locator('.err')).toContainText('로그인')
  } finally {
    await h.close()
  }
})
