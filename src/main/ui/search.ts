// Search, as a question asked over the screen rather than a screen of its own.
//
// It used to be a destination: the sidebar took you to a page, you typed,
// pressed Enter, and the answer replaced whatever you had been looking at.
// Now 검색 in the header or the sidebar opens a panel over the current
// screen. The field and its answers appear there, choosing one plays it and
// puts the panel away, and the screen underneath is exactly as it was. That
// is how a television's search works: it interrupts, it does not relocate.
//
// The answers are always rows, whatever the mode. This is a picker, and a
// picker is read down a list; a wall of thumbnails in a 640px panel would be
// two tiles wide and forty tiles tall.

import { t, tn } from '../../shared/i18n.ts'
import * as api from '../api.ts'
import type { Track } from '../parse.ts'
import { narrowNow } from './device.ts'
import { h, icon, replace } from './dom.ts'
import { explain, type Ctx } from './ctx.ts'
import { holdModal } from './overlay.ts'
import { row } from './rows.ts'
import { addQuick, nothing, skRow, skRows } from './views.ts'

/** How long the field waits after the last keystroke before asking YouTube. */
const SETTLE_MS = 350

/** The one panel that can be open, and the way to close it. */
let closeOpen: (() => void) | null = null

/** Closes the panel if it is open. */
export function closeSearch(): void {
  closeOpen?.()
}

/**
 * Opens the panel, with `query` already in the field and being looked up.
 *
 * Opening it twice is one panel: the second press puts the caret back in the
 * field instead of stacking a second dialog over the first.
 */
export function openSearch(ctx: Ctx, query = ''): void {
  if (closeOpen) {
    ctx.overlay.querySelector<HTMLInputElement>('.modal.search input')?.focus()
    return
  }

  const input = h('input', {
    type: 'search',
    placeholder: t('노래, 영상, 채널 검색'),
    value: query,
    autocomplete: 'off',
    'data-nav': '',
  })
  const body = h('div', { class: 'searchBody' })
  const panel = h(
    'div',
    { class: narrowNow() ? 'modal search full' : 'modal search', role: 'dialog', 'aria-label': t('검색') },
    h(
      'div',
      { class: 'searchHead' },
      h('div', { class: 'searchbox' }, icon('search', 20), input),
      h(
        'button',
        { class: 'modalClose', 'data-nav': '', title: t('닫기'), 'aria-label': t('닫기'), onclick: () => close() },
        icon('close', 20),
      ),
    ),
    body,
  )
  // data-remote: the arrows walk this panel the way they walk the app.
  const scrim = h('div', { class: 'scrim searchScrim', 'data-remote': '', onclick: (ev) => ev.target === scrim && close() }, panel)

  const release = holdModal()
  let settle: ReturnType<typeof setTimeout> | undefined
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    closeOpen = null
    release()
    clearTimeout(settle)
    document.removeEventListener('keydown', onEscape, true)
    scrim.remove()
  }
  closeOpen = close

  // Escape closes the panel, and only the panel: it must not travel on to the
  // shell's twice-to-leave. But not while something is open *over* the panel,
  // a row's menu or the playlist picker, because that Escape is theirs.
  const onEscape = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return
    const floating = ctx.overlay.querySelectorAll('.menu, .scrim')
    if (floating[floating.length - 1] !== scrim) return
    ev.stopPropagation()
    ev.preventDefault()
    close()
  }

  // ── Asking ───────────────────────────────────────────────────────────────

  /**
   * The query the rows on screen answer, so retyping it asks nothing. Cleared
   * when the answer was an error or nothing, so that Enter asks again.
   */
  let shown: string | null = null
  /** Which request is the latest; an older answer arriving late is dropped. */
  let generation = 0

  async function run(raw: string): Promise<void> {
    const q = raw.trim()
    if (q === shown) return
    shown = q
    const token = ++generation
    if (!q) return replace(body, nothing(t('무엇을 들을까요?'), 'search'))
    replace(body, skRows(6))
    try {
      const page = await api.search(ctx.cfg, q)
      if (token !== generation) return
      if (page.tracks.length === 0) {
        shown = null
        return replace(body, nothing(t('결과가 없습니다.'), 'search'))
      }
      replace(body, answers(page))
    } catch (err) {
      if (token !== generation) return
      shown = null
      replace(body, h('div', { class: 'err' }, explain(err)))
    }
  }

  /**
   * The rows, with the two things done to all of them above them.
   *
   * The whole list is what a row plays from, and 더 보기 grows that list in
   * place: asking for more mid-search should extend the queue you would have
   * got, not start a different one.
   *
   * The two actions are full-width lines, not a toolbar. The remote moves to
   * whatever is ahead and least to the side, weighted three to one, and a
   * button at the left of a toolbar under a field that spans the panel is
   * far more to the side than the first row is: the arrows stepped over the
   * toolbar every time, and 전체 재생 could not be reached without a pointer.
   * A line as wide as the field is straight ahead of it.
   */
  function answers(first: api.Page): HTMLElement[] {
    let page = first
    let all: Track[] = first.tracks
    const rows = h('div', { class: 'rows' })
    const more = h('button', { class: 'btn ghost', 'data-nav': '', style: 'margin: 16px auto 0; display: flex' }, t('더 보기'))

    const play = (i: number) => {
      ctx.engine.play(all, i)
      close()
    }
    /** Appends the rows not yet drawn; the ones already there are kept. */
    let drawn = 0
    const draw = () => {
      more.remove()
      for (let i = drawn; i < all.length; i++) {
        const track = all[i]!
        rows.appendChild(row(ctx, track, { onPlay: () => play(i), quick: addQuick(ctx, track) }))
      }
      drawn = all.length
      if (page.continuation) rows.appendChild(more)
    }
    more.addEventListener('click', async () => {
      const waiting = Array.from({ length: 4 }, () => skRow())
      more.remove()
      rows.append(...waiting)
      const hadFocus = ctx.overlay.activeElement === more
      try {
        const next = await api.more(ctx.cfg, page)
        if (closed) return
        for (const el of waiting) el.remove()
        const firstNew = all.length
        all = all.concat(next.tracks)
        page = next
        draw()
        // The button that was pressed is gone from under the focus; the first
        // of what it fetched is where that focus meant to go.
        if (hadFocus) (rows.children[firstNew] as HTMLElement | undefined)?.focus({ preventScroll: true })
      } catch (err) {
        ctx.say(explain(err), true)
        for (const el of waiting) el.remove()
        rows.appendChild(more)
      }
    })
    draw()

    return [
      h('button', { class: 'searchAct', 'data-nav': '', onclick: () => play(0) }, icon('play', 18), h('span', null, t('전체 재생')), h('span', { class: 'sub' }, tn('곡', all.length))),
      h(
        'button',
        {
          class: 'searchAct',
          'data-nav': '',
          onclick: () => {
            ctx.engine.enqueue(all)
            ctx.say(`${tn('곡', all.length)} · ${t('대기열에 넣었습니다.')}`)
          },
        },
        icon('plus', 18),
        h('span', null, t('대기열에 추가')),
      ),
      rows,
    ]
  }

  // As you type, once the typing pauses; at once on Enter.
  input.addEventListener('input', () => {
    clearTimeout(settle)
    settle = setTimeout(() => void run(input.value), SETTLE_MS)
  })
  input.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return
    clearTimeout(settle)
    void run(input.value)
  })

  ctx.overlay.appendChild(scrim)
  document.addEventListener('keydown', onEscape, true)
  input.focus()
  void run(query)
}
