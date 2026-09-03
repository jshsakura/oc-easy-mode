// The phone. Orion on an iPhone is where this extension actually lives, and a
// phone is not a narrow desktop: YouTube serves m.youtube.com there, and the
// sidebar has to become a drawer rather than a rail of unlabelled icons.

import { chromium, expect, test, type BrowserContext } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { screenKind } from '../src/main/ui/device.ts'

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

test('the screen decides, and a desktop user agent does not fool it', () => {
  expect(screenKind('m.youtube.com', 1512, 982)).toBe('phone')
  expect(screenKind('www.youtube.com', 390, 844)).toBe('phone')
  // A phone held sideways is still a phone.
  expect(screenKind('www.youtube.com', 844, 390)).toBe('phone')
  // A desktop window dragged narrow is not.
  expect(screenKind('www.youtube.com', 1512, 982)).toBe('desktop')
})

test('it runs on m.youtube.com and lays itself out for a phone', async () => {
  const { context, page } = await phone()
  try {
    await page.goto('https://m.youtube.com/watch?v=BzYnNdJhZQw', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    const ui = page.locator('oc-easy-mode')
    await expect(ui.locator('.app.on-phone')).toBeVisible()

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

test('music mode on a phone shows no floating picture', async () => {
  const { context, page } = await phone()
  try {
    await page.goto('https://m.youtube.com/watch?v=BzYnNdJhZQw', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await expect(page.locator('oc-easy-mode').locator('.app.on-phone')).toBeVisible()
    // A 288px window has nowhere to float on a 390px screen; it would sit on
    // top of the list. The bar's artwork is the picture here.
    await expect(page.locator('oc-easy-mode').locator('.slot')).toHaveClass(/hidden/)
  } finally {
    await context.close()
  }
})
