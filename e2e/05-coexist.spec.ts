// 이지 모드 and oc-ad-bye-pass, installed together.
//
// The two are deliberately separate products: this one never blocks an ad, so
// whichever blocker the user prefers stays their choice. That only works if
// they can share a page, which is what this checks. Skipped when the sibling
// has not been built next door.

import { chromium, expect, test } from '@playwright/test'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const DIST = resolve(import.meta.dirname, '../dist')
const SIBLING = resolve(import.meta.dirname, '../../oc-ad-bye-pass/dist')

test('the ad blocker and this extension share a page', async () => {
  test.skip(!existsSync(SIBLING), 'oc-ad-bye-pass/dist 가 없습니다')

  const profile = mkdtempSync(join(tmpdir(), 'oc-both-'))
  const both = `${DIST},${SIBLING}`
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: [`--disable-extensions-except=${both}`, `--load-extension=${both}`, '--lang=ko-KR'],
  })
  try {
    const page = context.pages()[0] ?? (await context.newPage())
    await page.addInitScript(() => {
      try { localStorage.setItem('oc-easy-mode:on', '1') } catch {}
    })
    await page.goto('https://www.youtube.com/watch?v=BzYnNdJhZQw', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })

    const ui = page.locator('oc-easy-mode')
    await expect(ui.locator('.app')).toBeVisible()
    // Ours works: the shelves came back and the player is ours to drive.
    await expect(ui.locator('.shelf .tile').first()).toBeVisible()

    const state = await page.evaluate(() => ({
      // The sibling's own marker, set in the page's world when it installs.
      blocker: '__ocAdByePassInstalled' in window,
      easy: document.querySelectorAll('oc-easy-mode').length,
      player: Boolean(document.getElementById('movie_player')),
    }))
    expect(state).toEqual({ blocker: true, easy: 1, player: true })

    // And leaving still leaves: the blocker does not hold the page open.
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await expect(page.locator('oc-easy-mode')).toHaveCount(0)
    await expect(page.locator('ytd-app')).toBeVisible()
  } finally {
    await context.close()
  }
})
