// Orion, which is where this extension is actually used, ignores the manifest's
// `world: "MAIN"`. These run against a build with that key stripped, which is
// the same thing from the extension's side.

import { expect, test } from '@playwright/test'
import { app, open, orionFlavour } from './fixture.ts'

const ORION = orionFlavour()

test('the copy that lands in the wrong world stays quiet, and the right one is injected', async () => {
  const h = await open('https://www.youtube.com/watch?v=BzYnNdJhZQw', true, ORION)
  try {
    // It comes up at all, which means something reached the page's own world.
    await expect(app(h.page).locator('.app')).toBeVisible()

    // Exactly one UI: the isolated copy refused rather than drawing a second.
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(1)

    // And the injected element does not stay in YouTube's head.
    expect(
      await h.page.evaluate(() => document.querySelectorAll('script[src*="main.js"]').length),
    ).toBe(0)
  } finally {
    await h.close()
  }
})

test('and the product works from there: search, play, leave', async () => {
  const h = await open('https://www.youtube.com/watch?v=BzYnNdJhZQw', true, ORION)
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

    // The way out works here too. What YouTube looks like afterwards is
    // 00-safety's job; having played something, leaving navigates to the track
    // that is playing, and racing that reload proves nothing about injection.
    await h.page.keyboard.press('Escape')
    await h.page.keyboard.press('Escape')
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(0)
  } finally {
    await h.close()
  }
})
