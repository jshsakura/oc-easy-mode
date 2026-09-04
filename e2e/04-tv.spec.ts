// The television shape: shelves, a grid, and arrow keys that move between them.

import { expect, test } from '@playwright/test'
import { app, open } from './fixture.ts'

const WATCH = 'https://www.youtube.com/watch?v=BzYnNdJhZQw'

test('탐색 comes back as titled shelves, signed out', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await ui.locator('.nav', { hasText: '탐색' }).click()

    const shelves = ui.locator('.shelf:not([aria-hidden])')
    await expect(shelves.first()).toBeVisible()
    expect(await shelves.count()).toBeGreaterThan(3)
    // Each shelf is a titled row of cards.
    expect((await shelves.first().locator('h3').textContent())?.trim().length).toBeGreaterThan(0)
    expect(await shelves.first().locator('.tile:not([aria-hidden])').count()).toBeGreaterThan(2)
  } finally {
    await h.close()
  }
})

test('opening a shelf card opens that playlist', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await ui.locator('.nav', { hasText: '탐색' }).click()
    const card = ui.locator('.shelf .tile:not([aria-hidden])').first()
    await expect(card).toBeVisible()
    const name = (await card.locator('.t').textContent())?.trim() ?? ''

    await card.click()
    await expect(ui.locator('.head h2')).toHaveText(name)
    await expect(ui.locator('.row:not([aria-hidden])').first()).toBeVisible()
  } finally {
    await h.close()
  }
})

test('a track list comes back as rows', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await ui.locator('.nav', { hasText: '검색' }).click()
    await ui.locator('.searchbox input').fill('lofi')
    await ui.locator('.searchbox input').press('Enter')
    await expect(ui.locator('.rows .row:not([aria-hidden])').first()).toBeVisible()

    // The wall of thumbnails is not covered here, and cannot be: since the
    // mode switch was taken out, the shape follows the screen — YouTube's own
    // feeds (홈, 구독, 시청 기록) are the video-shaped ones, and every one of
    // them is empty without an account. This suite is signed out.
    await expect(ui.locator('.grid')).toHaveCount(0)
  } finally {
    await h.close()
  }
})

test('arrow keys move focus, and Enter opens what is focused', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await ui.locator('.nav', { hasText: '검색' }).click()
    await ui.locator('.searchbox input').fill('아이유 밤편지')
    await ui.locator('.searchbox input').press('Enter')
    await expect(ui.locator('.row:not([aria-hidden])').first()).toBeVisible()

    const focused = () =>
      h.page.evaluate(() => {
        const root = document.querySelector('oc-easy-mode')!.shadowRoot!
        const el = root.activeElement as HTMLElement | null
        return el ? `${el.className}|${el.textContent?.slice(0, 24) ?? ''}` : null
      })

    // Down out of the search field, through the toolbar, and into the rows.
    await ui.locator('.searchbox input').focus()
    let landed = ''
    for (let i = 0; i < 8 && !landed.includes('row'); i++) {
      await h.page.keyboard.press('ArrowDown')
      landed = (await focused()) ?? ''
    }
    expect(landed).toContain('row')

    // Enter plays it, and the bar agrees.
    await h.page.keyboard.press('Enter')
    await expect(ui.locator('.bar .now .t')).not.toHaveText('재생 중인 항목 없음')
  } finally {
    await h.close()
  }
})

test('left from the first card reaches the sidebar', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await ui.locator('.nav', { hasText: '탐색' }).click()
    // Wait for the shelves to settle: focusing an element that a redraw is
    // about to replace loses the focus and the press with it.
    //
    // The first shelf, not the fourth. How many YouTube sends back is its
    // business and it varies — this failed twice in a row on a run that
    // returned three, which says nothing about arrow keys.
    await expect(ui.locator('.shelf:not([aria-hidden])').first()).toBeVisible()
    await expect(ui.locator('.shelf .tile:not([aria-hidden])').first()).toBeVisible()

    await ui.locator('.shelf .tile:not([aria-hidden])').first().focus()
    await h.page.keyboard.press('ArrowLeft')

    const inSidebar = await h.page.evaluate(() => {
      const root = document.querySelector('oc-easy-mode')!.shadowRoot!
      const el = root.activeElement
      return el !== null && root.querySelector('.side')!.contains(el)
    })
    expect(inSidebar).toBe(true)
  } finally {
    await h.close()
  }
})
