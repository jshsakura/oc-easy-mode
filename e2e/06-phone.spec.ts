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
    try {
      localStorage.setItem('oc-easy-mode:on', '1')
      // Pin the language, the way fixture.ts does. The UI follows YouTube's own
      // hl, and a run where YouTube answers in English left this file waiting
      // for a 검색 that said Search — a three-minute timeout with nothing wrong
      // with the product.
      localStorage.setItem('oc-easy-mode:state', JSON.stringify({ lang: 'ko' }))
    } catch {}
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
    // Deliberately no wait on content: this is a test of the layout, and
    // waiting for m.youtube.com to fill three shelves made it the slowest and
    // flakiest thing in the suite. 04-tv covers the shelves.

    // The sidebar is a drawer: parked off the left edge, and the content has
    // the whole width until it is asked for.
    const app = (await ui.locator('.app').boundingBox())!
    const parked = (await ui.locator('.side').boundingBox())!
    expect(parked.x + parked.width).toBeLessThanOrEqual(0)
    const main = (await ui.locator('.main').boundingBox())!
    expect(Math.round(main.width)).toBe(Math.round(app.width))

    // The header is a row of its own, above everything the player can cover.
    const top = (await ui.locator('.top').boundingBox())!
    expect(top.y).toBe(0)
    expect(Math.round(top.width)).toBe(Math.round(app.width))
    await expect(ui.locator('.top .name')).toBeVisible()

    // Its button opens the drawer, and choosing a destination closes it.
    await ui.locator('.drawerToggle').click()
    await expect.poll(async () => (await ui.locator('.side').boundingBox())!.x).toBe(0)
    await ui.locator('.nav').filter({ hasText: '검색' }).click()
    await expect(ui.locator('.searchbox input')).toBeVisible()
    await expect
      .poll(async () => (await ui.locator('.side').boundingBox())!.x)
      .toBeLessThan(0)

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

test('the picture never covers the header', async () => {
  const { context, page } = await phone()
  try {
    await page.goto('https://m.youtube.com/watch?v=BzYnNdJhZQw', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    const ui = page.locator('oc-easy-mode')
    await expect(ui.locator('.app.narrow')).toBeVisible()

    // 영상 mode puts the picture across the top of the screen, and YouTube's
    // player is drawn above the whole app — it has to be, or our panels would
    // hide it. So anything of ours up there has to start below the stage, or
    // it is unreachable: this is how the drawer button and the mode switch
    // were both buried, leaving no way out of 영상 mode but Escape.
    // The switch also closes the drawer here, because 둘러보기 is 음악's front
    // screen and 영상 moves off it — so there is nothing left to close.
    await ui.locator('.drawerToggle').click()
    await ui.locator('.modeToggle').click()
    await expect(ui.locator('.slot')).toHaveClass(/stage/)
    await expect.poll(async () => (await ui.locator('.side').boundingBox())!.x).toBeLessThan(0)

    const top = (await ui.locator('.top').boundingBox())!
    const stage = (await ui.locator('.slot').boundingBox())!
    expect(stage.y).toBeGreaterThanOrEqual(top.y + top.height - 1)

    // And the way back is still there to be pressed — which was the whole
    // point: the video used to cover the button that opens this.
    await ui.locator('.drawerToggle').click()
    await ui.locator('.modeToggle').click()
    await expect(ui.locator('.slot')).toHaveClass(/hidden/)
  } finally {
    await context.close()
  }
})

test('the player bar opens into a full player and closes again', async () => {
  const { context, page } = await phone()
  try {
    await page.goto('https://m.youtube.com/watch?v=BzYnNdJhZQw', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    const ui = page.locator('oc-easy-mode')
    await expect(ui.locator('.app.narrow')).toBeVisible()

    // Closed, the bar is a strip at the foot with the shuffle and repeat
    // buttons put away; there is no room for them beside a track title.
    const app = (await ui.locator('.app').boundingBox())!
    const closed = (await ui.locator('.bar').boundingBox())!
    expect(closed.height).toBeLessThan(app.height / 3)
    await expect(ui.locator('.ctl .sh')).toBeHidden()

    // Tapping what is playing opens the same element full-screen, with
    // everything on it.
    await ui.locator('.bar .now').click()
    await expect(ui.locator('.ctl .sh')).toBeVisible()
    await expect(ui.locator('.right')).toBeVisible()
    const open = (await ui.locator('.bar').boundingBox())!
    expect(open.height).toBeGreaterThan(app.height / 2)

    await ui.locator('.sheetClose').click()
    await expect(ui.locator('.ctl .sh')).toBeHidden()
  } finally {
    await context.close()
  }
})
