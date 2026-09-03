// The things that work when YouTube will not: a history without a session, and
// the controls the phone shows with its screen off.

import { expect, test } from '@playwright/test'
import { app, open } from './fixture.ts'

const WATCH = 'https://www.youtube.com/watch?v=BzYnNdJhZQw'

test('what was played comes back under 최근 감상, signed out', async () => {
  const h = await open(WATCH)
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

    await ui.locator('.nav', { hasText: '최근 감상' }).click()
    // The row it was played from, now on a screen YouTube would leave empty.
    await expect(ui.locator('.rows .row .title').first()).toHaveText(title)

    // Written down where a reload will find it. Asserted at the storage rather
    // than by reloading, because the harness fakes "switched on" in
    // localStorage alone: the real config arrives from chrome.storage a moment
    // later saying off, and a reloaded test page would come back as plain
    // YouTube for reasons that have nothing to do with the history.
    const stored = await h.page.evaluate(() =>
      JSON.parse(localStorage.getItem('oc-easy-mode:history') ?? '[]') as Array<{ title: string }>,
    )
    expect(stored.length).toBeGreaterThan(0)
    expect(stored[0]!.title).toBe(title)
  } finally {
    await h.close()
  }
})

test('the media session describes our track, and keeps describing it', async () => {
  const h = await open(WATCH)
  try {
    await expect(app(h.page).locator('.app')).toBeVisible()
    const read = () =>
      h.page.evaluate(() => ({
        title: navigator.mediaSession.metadata?.title ?? '',
        art: navigator.mediaSession.metadata?.artwork?.length ?? 0,
      }))

    // Three artwork sizes is the tell that the metadata is ours: YouTube sets
    // one. It has to still be ours after the page has had time to take it back.
    await expect.poll(read, { timeout: 30_000 }).toMatchObject({ art: 3 })
    await h.page.waitForTimeout(6000)
    const later = await read()
    expect(later.art).toBe(3)
    expect(later.title.length).toBeGreaterThan(0)
  } finally {
    await h.close()
  }
})

test('the shortcuts drive the player, and stay out of the search box', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()

    // Typing first, because every one of these letters is also a shortcut and
    // the box has to win. This is the bug that ate "c" once already.
    await ui.locator('.nav', { hasText: '검색' }).click()
    const box = ui.locator('.searchbox input')
    // The view focuses its own field as it finishes rendering. Typing before
    // that lands drops the first few keys — a race in the test, not in the
    // product: typed into a settled box, all eight of these arrive every time.
    await expect(box).toBeFocused()
    await box.fill('')
    await box.pressSequentially('smkjlv 아이유', { delay: 30 })
    await expect(box).toHaveValue('smkjlv 아이유')

    // Now with the focus off the box, the same letters are controls.
    await box.fill('아이유 밤편지')
    await box.press('Enter')
    const first = ui.locator('.row').first()
    await expect(first).toBeVisible()
    await first.locator('.meta').click()

    // Counted rather than watched. Whether a video actually starts in a
    // headless run is the browser's decision, and the question here is only
    // whether the key reaches the player at all.
    await h.page.evaluate(() => {
      const w = window as unknown as { __calls: string[] }
      const p = document.getElementById('movie_player') as unknown as Record<string, (...a: unknown[]) => unknown>
      w.__calls = []
      for (const name of ['playVideo', 'pauseVideo']) {
        const real = p[name]!.bind(p)
        p[name] = (...a: unknown[]) => {
          w.__calls.push(name)
          return real(...a)
        }
      }
    })
    const calls = () => h.page.evaluate(() => (window as unknown as { __calls: string[] }).__calls)

    // Off the box, which is the whole difference between a letter and a
    // control. Blurred rather than clicked somewhere else: a click has to land
    // on something, and everything on this page does something when clicked.
    await box.evaluate((el: HTMLElement) => el.blur())
    await h.page.keyboard.press('k')
    await expect.poll(async () => (await calls()).length, { timeout: 10_000 }).toBe(1)
    await h.page.keyboard.press('k')
    await expect.poll(async () => (await calls()).length, { timeout: 10_000 }).toBe(2)

    // m silences without losing the level it was at.
    const volume = () => h.page.evaluate(() => JSON.parse(localStorage.getItem('oc-easy-mode:state') ?? '{}').volume)
    const before = await volume()
    await h.page.keyboard.press('m')
    await expect.poll(volume).toBe(0)
    await h.page.keyboard.press('m')
    await expect.poll(volume).toBe(before)

    // s and r are toggles the queue remembers.
    await h.page.keyboard.press('s')
    await expect.poll(() => h.page.evaluate(() => JSON.parse(localStorage.getItem('oc-easy-mode:state') ?? '{}').shuffle)).toBe(true)
    await h.page.keyboard.press('r')
    await expect.poll(() => h.page.evaluate(() => JSON.parse(localStorage.getItem('oc-easy-mode:state') ?? '{}').repeat)).toBe('all')
  } finally {
    await h.close()
  }
})

test('speed reaches the player, and the sleep timer arms and disarms', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    const over = h.page.locator('oc-easy-mode-overlay')
    await expect(ui.locator('.app')).toBeVisible()

    // Something has to be playing for a rate to mean anything.
    await ui.locator('.nav', { hasText: '검색' }).click()
    await ui.locator('.searchbox input').fill('아이유 밤편지')
    await ui.locator('.searchbox input').press('Enter')
    const first = ui.locator('.row').first()
    await expect(first).toBeVisible()
    const title = (await first.locator('.title').textContent())?.trim() ?? ''
    await first.locator('.meta').click()
    // That the engine took the track, not that the browser chose to start it:
    // whether a video actually plays in a headless run is the browser's call,
    // and a rate does not need playback to be set.
    await expect(ui.locator('.bar .now .t')).toHaveText(title)

    await ui.locator('.bar .right .mr').click()
    await over.locator('.menu button', { hasText: '재생 속도' }).click()
    await over.locator('.menu button', { hasText: '1.5x' }).click()

    // The player itself, not just our own record of it.
    await expect
      .poll(() =>
        h.page.evaluate(() => {
          const p = document.getElementById('movie_player') as { getPlaybackRate?: () => number } | null
          return p?.getPlaybackRate?.() ?? 0
        }),
      )
      .toBe(1.5)
    expect(await h.page.evaluate(() => JSON.parse(localStorage.getItem('oc-easy-mode:state') ?? '{}').rate)).toBe(1.5)

    // The timer arms, says so on the button, and can be taken back off.
    await ui.locator('.bar .right .mr').click()
    await over.locator('.menu button', { hasText: '수면 예약' }).click()
    await over.locator('.menu button', { hasText: '30분 뒤 정지' }).click()
    await expect(ui.locator('.bar .right .mr')).toHaveClass(/on/)

    await ui.locator('.bar .right .mr').click()
    await over.locator('.menu button', { hasText: '수면 예약' }).first().click()
    await over.locator('.menu button', { hasText: '수면 예약 끄기' }).click()
    // Speed is still 1.5x, so the button stays lit for that reason alone.
    await ui.locator('.bar .right .mr').click()
    await over.locator('.menu button', { hasText: '재생 속도' }).click()
    await over.locator('.menu button', { hasText: '보통' }).click()
    await expect(ui.locator('.bar .right .mr')).not.toHaveClass(/on/)
  } finally {
    await h.close()
  }
})

test('nothing reaches the player through a menu or a dialog', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    const over = h.page.locator('oc-easy-mode-overlay')
    await expect(ui.locator('.app')).toBeVisible()

    await ui.locator('.nav', { hasText: '검색' }).click()
    await ui.locator('.searchbox input').fill('아이유 밤편지')
    await ui.locator('.searchbox input').press('Enter')
    const first = ui.locator('.row').first()
    await expect(first).toBeVisible()
    await first.locator('.meta').click()

    const settings = () =>
      h.page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('oc-easy-mode:state') ?? '{}')
        return { shuffle: s.shuffle, repeat: s.repeat }
      })
    const before = await settings()

    // A row's menu open. s and r are shortcuts and must not act behind it.
    await first.locator('.more').click()
    await expect(over.locator('.menu')).toBeVisible()
    await h.page.keyboard.press('s')
    await h.page.keyboard.press('r')
    expect(await settings()).toEqual(before)

    // Escape closes the menu and does not count towards leaving the mode.
    await h.page.keyboard.press('Escape')
    await expect(over.locator('.menu')).toHaveCount(0)
    await expect(ui.locator('.app')).toBeVisible()

    // A dialog is the same, and it can be dismissed with Escape at all, which
    // it could not before.
    await ui.locator('.nav', { hasText: '최근 감상' }).click()
    await ui.locator('.toolbar button', { hasText: '기록 지우기' }).click()
    await expect(over.locator('.modal')).toBeVisible()
    await h.page.keyboard.press('s')
    expect(await settings()).toEqual(before)
    await h.page.keyboard.press('Escape')
    await expect(over.locator('.modal')).toHaveCount(0)
    // Dismissed, not confirmed: the history is still there.
    await expect(ui.locator('.rows .row').first()).toBeVisible()
    await expect(ui.locator('.app')).toBeVisible()
  } finally {
    await h.close()
  }
})

test('space over a focused item activates it and nothing else', async () => {
  const h = await open(WATCH)
  try {
    const ui = app(h.page)
    await expect(ui.locator('.app')).toBeVisible()
    await expect(ui.locator('.nav', { hasText: '대기열' })).toBeVisible()

    // Count what reaches YouTube's player, rather than watching for playback:
    // whether a video actually starts is the browser's decision, and the
    // question here is only whether one press did two jobs.
    await h.page.evaluate(() => {
      const w = window as unknown as { __calls: string[] }
      const p = document.getElementById('movie_player') as unknown as Record<string, (...a: unknown[]) => unknown>
      w.__calls = []
      for (const name of ['playVideo', 'pauseVideo']) {
        const real = p[name]!.bind(p)
        p[name] = (...a: unknown[]) => {
          w.__calls.push(name)
          return real(...a)
        }
      }
    })

    await ui.locator('.nav', { hasText: '대기열' }).focus()
    await h.page.keyboard.press(' ')

    // The remote's job: it opened. The player's: untouched.
    await expect(ui.locator('h2').first()).toHaveText('대기열')
    expect(await h.page.evaluate(() => (window as unknown as { __calls: string[] }).__calls)).toEqual([])
  } finally {
    await h.close()
  }
})
