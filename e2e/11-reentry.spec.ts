// Leaving the mode with a dialog open, and coming back to a working app.
//
// **Every dialog drawn outside overlay.ts holds module state.** It takes a
// place in the count that tells the shortcuts, the remote and the panic key to
// stand aside, and it puts a listener on the document to catch Escape. Both
// live for as long as the module does, which is longer than the app: the mode
// can be switched off while a dialog is up, and nothing about that unwinds
// them. The app comes back with every shortcut dead and Escape twice no longer
// leaving, and there is nothing on screen to say why.
//
// The cure is one line per dialog in mountApp's destroy, and it is the kind of
// line that is easy to forget when the fourth dialog is written. So all three
// are checked here, through one helper, and a fourth belongs in the list.
//
// The mode is switched the way the toolbar switch does it: a set-config
// message to the isolated world. That is the honest path and, unlike a reload,
// it leaves the module state standing, which is the whole thing being tested.
//
// **These start with the mode off.** There are two switches into this product:
// the config in chrome.storage, which the toolbar owns, and a key in the
// page's own storage, which the fixture normally sets so a test lands straight
// in the app. Only the first of them turns the mode back *off*, so a test that
// came in through the second watched set-config do nothing at all.

import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, open } from './fixture.ts'

const fixture = readFileSync(join(import.meta.dirname, 'fixtures', 'search-channel-ids.json'), 'utf8')

type Page = import('@playwright/test').Page

/** The toolbar switch's own path: write the setting, let the bridge tell the page. */
const flip = (page: Page, musicMode: boolean) =>
  page.evaluate((on) => {
    window.postMessage({ ns: 'oc-easy-mode', type: 'set-config', patch: { musicMode: on } }, location.origin)
  }, musicMode)

const shuffleNow = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('oc-easy-mode:state') ?? '{}').shuffle === true)

/**
 * Opens one dialog, leaves the mode with it open, comes back, and checks the
 * app still answers.
 *
 * The shortcut is read off stored state rather than off the screen: what is
 * being asked is whether the press reached the engine, and a glyph can be
 * bright for other reasons.
 */
async function survivesReentry(page: Page, openDialog: (page: Page) => Promise<void>): Promise<void> {
  const ui = app(page)
  await expect(ui.locator('.app')).toBeVisible()
  await openDialog(page)

  // Out with it still up, then back in.
  await flip(page, false)
  await expect(page.locator('oc-easy-mode')).toHaveCount(0)
  await flip(page, true)
  await expect(ui.locator('.app')).toBeVisible()

  // The shortcuts reach the engine again.
  const before = await shuffleNow(page)
  await page.keyboard.press('s')
  await expect.poll(() => shuffleNow(page), { timeout: 5000 }).toBe(!before)

  // And twice-to-leave leaves, which it cannot while something still counts
  // itself as open.
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(page.locator('oc-easy-mode')).toHaveCount(0)
}

async function serveFeeds(page: Page): Promise<void> {
  await page.route('**/youtubei/v1/{browse,search}*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: fixture }))
}

/**
 * The app, entered through the switch the toolbar uses.
 *
 * The language is pinned here rather than by the fixture, which only does it
 * on the path this one deliberately avoids. These tests read Korean labels.
 */
async function enterThroughConfig(page: Page): Promise<void> {
  await serveFeeds(page)
  await page.evaluate(() => {
    try {
      localStorage.setItem('oc-easy-mode:state', JSON.stringify({ lang: 'ko' }))
    } catch {
      /* a browser that refuses storage will answer in YouTube's language */
    }
  })
  await flip(page, true)
  await expect(app(page).locator('.app')).toBeVisible({ timeout: 60_000 })
}

test('the channel checklist does not outlive the mode', async () => {
  const h = await open('https://www.youtube.com/', false)
  try {
    await enterThroughConfig(h.page)
    await survivesReentry(h.page, async (page) => {
      const ui = app(page)
      await ui.locator('.nav', { hasText: '구독' }).click()
      await ui.locator('.chanFilter').click()
      await expect(page.locator('oc-easy-mode-overlay').locator('.channelRow').first()).toBeVisible()
    })
  } finally {
    await h.close()
  }
})

test('the search panel does not outlive the mode', async () => {
  const h = await open('https://www.youtube.com/', false)
  try {
    await enterThroughConfig(h.page)
    await survivesReentry(h.page, async (page) => {
      const ui = app(page)
      await ui.locator('.nav', { hasText: '검색' }).click()
      await expect(page.locator('oc-easy-mode-overlay').locator('.modal.search')).toBeVisible()
    })
  } finally {
    await h.close()
  }
})

test('the equalizer dialog does not outlive the mode', async () => {
  const h = await open('https://www.youtube.com/', false)
  try {
    await enterThroughConfig(h.page)
    await survivesReentry(h.page, async (page) => {
      const ui = app(page)
      const over = page.locator('oc-easy-mode-overlay')
      // Through the ⋯ menu: the bar's own equalizer button is drawn only on a
      // phone with the player open.
      await ui.locator('.bar .right .mr').click()
      await over.locator('.menu button', { hasText: '이퀄라이저' }).click()
      // Opened, not switched on. Turning it on builds the graph, which is a
      // different thing from the dialog holding the modal count.
      await expect(over.locator('.modal.equalizer')).toBeVisible()
    })
  } finally {
    await h.close()
  }
})
