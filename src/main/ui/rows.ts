// One track row, and the menu behind its three dots. Every list in the app is
// made of these, so the actions on a track are defined once.

import { t } from '../../shared/i18n.ts'
import * as api from '../api.ts'
import { thumbnail, type Track } from '../parse.ts'
import { h, icon } from './dom.ts'
import { clock, explain, type Ctx } from './ctx.ts'
import { confirm, showMenu, type MenuItem } from './overlay.ts'

export interface RowOptions {
  /** 1-based number shown at the left. Omitted for search results. */
  index?: number
  /** Plays this row: usually "play the whole list from here". */
  onPlay(): void
  /** Extra items at the end of the menu, e.g. "remove from this playlist". */
  extra?: Array<MenuItem | '-'>
}

export function row(ctx: Ctx, track: Track, opts: RowOptions): HTMLElement {
  const playing = ctx.engine.current?.videoId === track.videoId
  const classes = ['row', playing ? 'now' : '', track.unavailable ? 'dead' : ''].filter(Boolean).join(' ')

  const menuButton = h('button', { class: 'more', title: t('더보기'), 'aria-label': t('더보기'), 'data-nav': '' }, icon('more', 18))
  menuButton.addEventListener('click', (ev) => {
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
      ...(opts.extra ?? []),
    ])
  })

  const open = () => {
    if (track.unavailable) return ctx.say(t('재생할 수 없는 항목입니다.'), true)
    opts.onPlay()
  }

  // One handler on the row rather than one per part: the whole row is the
  // target, which is also what makes it work under a remote control.
  return h(
    'div',
    { class: classes, 'data-nav': '', tabindex: '0', role: 'button', onclick: open },
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
    menuButton,
  )
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

/** The menu item a playlist view adds to each of its rows. */
export function removeFromPlaylistItem(ctx: Ctx, playlistId: string, track: Track): MenuItem {
  return {
    label: t('이 재생목록에서 제거'),
    icon: 'trash',
    danger: true,
    onSelect: async () => {
      if (!(await confirm(ctx.overlay, `'${track.title}'을(를) 재생목록에서 뺄까요?`, t('빼기')))) return
      try {
        await api.removeFromPlaylist(ctx.cfg, playlistId, track)
        ctx.say(t('재생목록에서 뺐습니다.'))
        ctx.reload()
      } catch (err) {
        ctx.say(explain(err), true)
      }
    },
  }
}

export { clock }
