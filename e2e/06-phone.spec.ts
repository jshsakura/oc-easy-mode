// The phone. Orion on an iPhone is where this extension actually lives, and a
// phone is not a narrow desktop: YouTube serves m.youtube.com there, and the
// sidebar has to become a drawer rather than a rail of unlabelled icons.

import { chromium, expect, test, type BrowserContext } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { isNarrow, screenKind } from '../src/main/ui/device.ts'

// m.youtube.com is slower to hand over a first paint than the desktop site,
// and these launch a fresh profile each time.
test.describe.configure({ timeout: 180_000 })

const DIST = resolve(import.meta.dirname, '../dist')
// Orion on iPhone reports this, a desktop Mac UA — which is exactly why the
// layout is never chosen from the user agent.
const ORION_IPHONE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

async function phone(): Promise<{ context: BrowserContext; page: import('@playwright/test').Page }> {
  const profile = mkdtempSync(join(tmpdir(), 'oc-phone-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`, '--lang=ko-KR'],
    userAgent: ORION_IPHONE_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = context.pages()[0] ?? (await context.newPage())
  await page.addInitScript(() => {
    try { localStorage.setItem('oc-easy-mode:on', '1') } catch {}
  })
  return { context, page }
}

test('the layout follows the viewport, and the popup follows the screen', () => {
  // In the page: is there room beside the content? Nothing else is asked,
  // because nothing else is reliable — Orion on iPhone claims to be a desktop
  // Mac and is served the desktop site.
  expect(isNarrow(390, 390)).toBe(true)
  // The case that was wrong on the device: a 390px phone handed the desktop
  // site, which has no viewport meta, so the layout viewport is ~980.
  expect(isNarrow(980, 390)).toBe(true)
  // A desktop window dragged narrow has no room either, big monitor or not.
  expect(isNarrow(800, 2560)).toBe(true)
  expect(isNarrow(1512, 1512)).toBe(false)

  // In the popup, where there is no viewport worth asking: the screen, whose
  // short side is the same in either orientation.
  expect(screenKind(390, 844)).toBe('phone')
  expect(screenKind(844, 390)).toBe('phone')
  expect(screenKind(1512, 982)).toBe('desktop')
})

test('it runs on m.youtube.com and lays itself out narrow', async () => {
  const { context, page } = await phone()
  try {
    await page.goto('https://m.youtube.com/watch?v=BzYnNdJhZQw', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    const ui = page.locator('oc-easy-mode')
    await expect(ui.locator('.app.narrow')).toBeVisible()

    // The mobile site sends different renderers for the same shelves; the
    // parser has to know both or this screen is empty.
    await expect(ui.locator('.shelf').nth(2)).toBeVisible()
    await expect(ui.locator('.shelf .tile').first()).toBeVisible()

    // The sidebar is off-screen until asked for, and the content has the width.
    const before = await ui.locator('.side').boundingBox()
    expect(before!.x).toBeLessThan(0)
    await ui.locator('.drawerToggle').click()
    await expect.poll(async () => (await ui.locator('.side').boundingBox())!.x).toBe(0)

    // Choosing something closes it again.
    await ui.locator('.nav', { hasText: '검색' }).click()
    await expect.poll(async () => (await ui.locator('.side').boundingBox())!.x).toBeLessThan(0)
  } finally {
    await context.close()
  }
})

test('music mode on a narrow screen shows no floating picture', async () => {
  const { context, page } = await phone()
  try {
    await page.goto('https://m.youtube.com/watch?v=BzYnNdJhZQw', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await expect(page.locator('oc-easy-mode').locator('.app.narrow')).toBeVisible()
    // A 288px window has nowhere to float on a 390px screen; it would sit on
    // top of the list. The bar's artwork is the picture here.
    await expect(page.locator('oc-easy-mode').locator('.slot')).toHaveClass(/hidden/)
  } finally {
    await context.close()
  }
})
