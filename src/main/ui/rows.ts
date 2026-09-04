// One track row, and the menu behind its three dots. Every list in the app is
// made of these, so the actions on a track are defined once.

import { t } from '../../shared/i18n.ts'
import * as api from '../api.ts'
import { thumbnail, type Track } from '../parse.ts'
import { h, icon, type IconName } from './dom.ts'
import { clock, explain, type Ctx } from './ctx.ts'
import { confirm, showMenu, type MenuItem } from './overlay.ts'

export interface RowOptions {
  /** 1-based number shown at the left. Omitted for search results. */
  index?: number
  /** Plays this row: usually "play the whole list from here". */
  onPlay(): void
  /**
   * Extra items at the end of the menu, e.g. "remove from this playlist".
   *
   * A function, and given the row, because the actions that go here are the
   * ones that act on the row itself: taking a track out of a playlist should
   * take that row off the screen, not re-fetch the screen.
   */
  extra?: (row: HTMLElement) => Array<MenuItem | '-'>
  /**
   * The one-press action, shown beside the menu.
   *
   * Putting a track into a playlist, or taking it out, was two presses and a
   * submenu — open ⋯, find the item, and for a removal answer a dialog as
   * well. Those are the two things done most often to a row, so they get a
   * button. The menu keeps its versions for everything else.
   */
  quick?: { icon: IconName; title: string; run(row: HTMLElement): void }
}

export function row(ctx: Ctx, track: Track, opts: RowOptions): HTMLElement {
  const playing = ctx.engine.current?.videoId === track.videoId
  const classes = ['row', playing ? 'now' : '', track.unavailable ? 'dead' : ''].filter(Boolean).join(' ')

  const menuButton = h('button', { class: 'more', title: t('더보기'), 'aria-label': t('더보기'), 'data-nav': '' }, icon('more', 18))
  const openMenu = (ev: Event, el: HTMLElement) => {
    ev.stopPropagation()
    showMenu(ctx.overlay, menuButton, [
      { label: t('지금 재생'), icon: 'play', onSelect: () => ctx.engine.playNow([track]) },
      { label: t('다음에 재생'), icon: 'queue', onSelect: () => { ctx.engine.playNext([track]); ctx.say(t('다음에 재생합니다.')) } },
      { label: t('대기열에 추가'), icon: 'plus', onSelect: () => { ctx.engine.enqueue([track]); ctx.say('대기열에 넣었습니다.') } },
      '-',
      { label: t('이 곡으로 라디오'), icon: 'radio', onSelect: () => void startRadio(ctx, track) },
      { label: t('재생목록에 추가'), icon: 'library', onSelect: () => void ctx.addToPlaylist([track]) },
      '-',
      { label: t('유튜브에서 열기'), icon: 'external', onSelect: () => window.open(`https://www.youtube.com/watch?v=${track.videoId}`, '_blank') },
      ...(opts.extra?.(el) ?? []),
    ])
  }

  const open = () => {
    if (track.unavailable) return ctx.say(t('재생할 수 없는 항목입니다.'), true)
    opts.onPlay()
  }

  // An empty cell when there is no quick action, so every row in a list keeps
  // the same columns and the menus stay in one vertical line.
  // Its own class, not the menu's. Sharing `.more` put two of them in a row
  // and every locator that meant "the menu" then meant "either button".
  const quickButton = opts.quick
    ? h('button', { class: 'quick', 'data-nav': '', title: opts.quick.title, 'aria-label': opts.quick.title }, icon(opts.quick.icon, 18))
    : h('span')
  if (opts.quick) {
    quickButton.addEventListener('click', (ev) => {
      ev.stopPropagation()
      opts.quick!.run(el)
    })
  }

  // One handler on the row rather than one per part: the whole row is the
  // target, which is also what makes it work under a remote control.
  // data-id names the track the element is, so a view can take this one row
  // out of the screen again without redrawing anything to find it.
  const el = h(
    'div',
    { class: classes, 'data-nav': '', 'data-id': track.videoId, tabindex: '0', role: 'button', onclick: open },
    h(
      'div',
      { class: 'idx' },
      playing
        ? h('span', { class: 'eq' }, h('i'), h('i'), h('i'))
        : opts.index !== undefined
          ? String(opts.index)
          : '',
    ),
    h('div', {
      class: 'thumb',
      style: `background-image: url(${thumbnail(track.videoId)})`,
    }),
    h(
      'div',
      { class: 'meta' },
      h('div', { class: 'title', title: track.title }, track.title || track.videoId),
      h('div', { class: 'by' }, track.unavailable ? t('재생할 수 없음') : track.byline),
    ),
    h('div', { class: 'dur' }, track.duration),
    quickButton,
    menuButton,
  )
  menuButton.addEventListener('click', (ev) => openMenu(ev, el))
  return el
}

/** Replaces the queue with a mix built around one track. */
export async function startRadio(ctx: Ctx, track: Track): Promise<void> {
  try {
    ctx.say(t('라디오를 만드는 중…'))
    const page = await api.mix(ctx.cfg, track.videoId)
    if (page.tracks.length === 0) return ctx.say(t('이 곡으로는 라디오를 만들 수 없습니다.'), true)
    ctx.engine.play(page.tracks, 0)
    ctx.go({ kind: 'queue' })
    ctx.say(`${page.tracks.length}곡으로 라디오를 시작합니다.`)
  } catch (err) {
    ctx.say(explain(err), true)
  }
}

/**
 * Takes a row off the screen without redrawing the screen.
 *
 * The row is pinned to the height it currently has, then collapsed to nothing,
 * so the rows below it slide up instead of jumping. Written as inline style
 * rather than a class because the animation belongs to this one action and to
 * nothing else on the page.
 *
 * Removal happens on the transition's end rather than on a timer, so the two
 * can never disagree — with a fallback timer for the browsers and settings
 * where a transition never runs and therefore never ends. Hence the guard: the
 * row must not be removed twice.
 */
function collapse(row: HTMLElement, done: () => void): void {
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    row.remove()
    done()
  }
  row.addEventListener('transitionend', finish, { once: true })

  const height = row.getBoundingClientRect().height
  row.style.height = `${height}px`
  row.style.overflow = 'hidden'
  row.style.transition = 'height .18s ease, opacity .18s ease, padding .18s ease'
  // Read once so the browser has a height to animate away from; setting both
  // in the same frame would be one style change and no transition at all.
  void row.offsetHeight
  row.style.height = '0'
  row.style.opacity = '0'
  row.style.paddingTop = '0'
  row.style.paddingBottom = '0'
  setTimeout(finish, 400)
}

/**
 * The menu item a playlist view adds to each of its rows.
 *
 * `onRemoved` is called once YouTube has agreed and the row has gone, and is
 * where the view puts its own house in order: the count in the header, the
 * array the play buttons hold, the numbers down the left. Redrawing the view
 * would do all of that for free and was what this used to do — but it also
 * threw the screen away and put "가져오는 중…" in its place for as long as the
 * playlist took to fetch again, which is a strange thing to show someone who
 * just deleted one row of it.
 */
/**
 * Takes the track out and takes the row with it. No question asked.
 *
 * The menu's version asks first, because a menu is a considered place. The row
 * button is the opposite: it exists to be one press, and a dialog would make
 * it two. Putting the track back is one press as well, which is what makes
 * that safe.
 */
export async function removeFromPlaylistNow(
  ctx: Ctx,
  playlistId: string,
  track: Track,
  row: HTMLElement,
  onRemoved: () => void,
): Promise<void> {
  try {
    await api.removeFromPlaylist(ctx.cfg, playlistId, track)
    ctx.say(t('재생목록에서 뺐습니다.'))
    collapse(row, onRemoved)
  } catch (err) {
    ctx.say(explain(err), true)
  }
}

export function removeFromPlaylistItem(
  ctx: Ctx,
  playlistId: string,
  track: Track,
  row: HTMLElement,
  onRemoved: () => void,
): MenuItem {
  return {
    label: t('이 재생목록에서 제거'),
    icon: 'trash',
    danger: true,
    onSelect: async () => {
      if (!(await confirm(ctx.overlay, `'${track.title}'을(를) 재생목록에서 뺄까요?`, t('빼기')))) return
      try {
        await api.removeFromPlaylist(ctx.cfg, playlistId, track)
        ctx.say(t('재생목록에서 뺐습니다.'))
        collapse(row, onRemoved)
      } catch (err) {
        ctx.say(explain(err), true)
      }
    },
  }
}

export { clock }
