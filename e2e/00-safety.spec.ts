// The promise this extension makes: YouTube is never altered, and there is
// always a way back. Everything else can be rebuilt; this cannot be broken.

import { expect, test } from '@playwright/test'
import { app, open } from './fixture.ts'

const WATCH = 'https://www.youtube.com/watch?v=BzYnNdJhZQw'

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
      // Added wherever the document declares no viewport of its own, which
      // includes desktop YouTube. What matters is that it is ours and that it
      // leaves with us — the Escape test checks the second half.
      viewport: document.querySelectorAll('#oc-easy-mode-viewport').length,
      ytdApp: document.querySelectorAll('ytd-app').length,
    }))
    expect(counts).toEqual({ style: 1, host: 1, overlay: 1, marked: 0, viewport: 1, ytdApp: 1 })
    // The player's position lives in our sheet, not on the page's root element.
    expect(await h.page.evaluate(() => document.documentElement.getAttribute('style') ?? '')).not.toContain('--oc-')
  } finally {
    await h.close()
  }
})

test('nothing of YouTube shows through, even with its guide drawer open', async () => {
  const h = await open('https://www.youtube.com/')
  try {
    await expect(app(h.page).locator('.app')).toBeVisible()
    // Polymer's drawer declares visibility: visible on its own content when
    // opened, which inherited hidden cannot beat. Opened here the way the
    // page would open it, then counted: every YouTube element with a box on
    // screen that our sheet has not whitelisted, computed through shadow roots.
    await h.page.evaluate(() => {
      const drawer = document.querySelector('tp-yt-app-drawer') as { opened?: boolean } | null
      if (drawer) drawer.opened = true
    })
    await h.page.waitForTimeout(800)
    const visible = await h.page.evaluate(() => {
      let n = 0
      const walk = (root: Document | ShadowRoot) => {
        for (const el of root.querySelectorAll('*')) {
          if (el.closest('oc-easy-mode, oc-easy-mode-overlay')) continue
          if (el.shadowRoot) walk(el.shadowRoot)
          if (el.closest('#movie_player, #player-control-container, bottom-sheet-container')) continue
          const cs = getComputedStyle(el)
          if (cs.visibility !== 'visible' || cs.display === 'none') continue
          const r = el.getBoundingClientRect()
          if (r.width >= 40 && r.height >= 40) n++
        }
      }
      walk(document)
      return n
    })
    expect(visible).toBe(0)
  } finally {
    await h.close()
  }
})

/**
 * The strict check: nothing but ours is on top, anywhere on the screen.
 *
 * Not computed styles but the hit test: elementFromPoint on a grid over the
 * whole viewport must land on our host, our overlay, the player, or the
 * sibling blocker's PiP button. This catches a YouTube element that paints
 * above us for any reason at all, a z-index we did not expect, a top-layer
 * popover, a stylesheet of YouTube's that undoes our hiding, without knowing
 * the reason in advance. A Shorts row floated over the lists on a desktop
 * (2026-09-06) and the visibility census did not see it; this does.
 */
async function nothingOnTopBut(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => {
    const ok = (el: Element | null): boolean => {
      if (!el) return true // outside the document: nothing painted there
      const tag = el.tagName.toLowerCase()
      if (tag === 'oc-easy-mode' || tag === 'oc-easy-mode-overlay') return true
      if (tag === 'html' || tag === 'body') return true
      if (el.closest('#movie_player, #player-control-container, bottom-sheet-container, #oc-abp-pip')) return true
      return false
    }
    const bad: string[] = []
    const w = innerWidth, h = innerHeight
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 10; j++) {
        const x = Math.round(((i + 0.5) / 16) * w), y = Math.round(((j + 0.5) / 10) * h)
        const el = document.elementFromPoint(x, y)
        if (!ok(el) && bad.length < 8) bad.push(`${x},${y}: ${el!.tagName.toLowerCase()}#${el!.id}.${[...el!.classList].slice(0, 2).join('.')}`)
      }
    }
    return bad
  })
}

for (const [name, url] of [
  ['the home page', 'https://www.youtube.com/'],
  ['a watch page', WATCH],
  ['a playlist page', 'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI'],
  ['a search page', 'https://www.youtube.com/results?search_query=shorts'],
] as const) {
  test(`nothing of YouTube paints on top of ours on ${name}, even with the guide open`, async () => {
    const h = await open(url)
    try {
      await expect(app(h.page).locator('.app')).toBeVisible()
      await h.page.waitForTimeout(2500)
      expect(await nothingOnTopBut(h.page)).toEqual([])
      await h.page.evaluate(() => {
        const drawer = document.querySelector('tp-yt-app-drawer') as { opened?: boolean } | null
        if (drawer) drawer.opened = true
      })
      await h.page.waitForTimeout(800)
      expect(await nothingOnTopBut(h.page)).toEqual([])
    } finally {
      await h.close()
    }
  })
}

test('Escape twice puts YouTube back', async () => {
  const h = await open('https://www.youtube.com/')
  try {
    await expect(app(h.page).locator('.app')).toBeVisible()
    await h.page.keyboard.press('Escape')
    await h.page.keyboard.press('Escape')
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(0)
    await expect(h.page.locator('#oc-easy-mode')).toHaveCount(0)
    await expect(h.page.locator('#oc-easy-mode-viewport')).toHaveCount(0)
    await expect(h.page.locator('ytd-app')).toBeVisible()
    expect(await h.page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden')
  } finally {
    await h.close()
  }
})

test('leaving gives the picture its size back', async () => {
  // The player was a 320px corner window for the whole session; afterwards
  // YouTube's own layout must own it again, video and all.
  const h = await open('https://www.youtube.com/watch?v=BzYnNdJhZQw')
  try {
    await expect(app(h.page).locator('.app')).toBeVisible()
    await h.page.keyboard.press('Escape')
    await h.page.keyboard.press('Escape')
    await expect(h.page.locator('oc-easy-mode')).toHaveCount(0)
    await expect
      .poll(
        () =>
          h.page.evaluate(() => {
            const player = document.getElementById('movie_player')?.getBoundingClientRect()
            const video = document.querySelector('video')?.getBoundingClientRect()
            if (!player || !video) return 'missing'
            return Math.abs(player.width - video.width) < 4 && player.width > 400 ? 'fits' : `${Math.round(video.width)} in ${Math.round(player.width)}`
          }),
        { timeout: 10_000 },
      )
      .toBe('fits')
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
