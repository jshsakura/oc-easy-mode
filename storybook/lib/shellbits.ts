// Rebuilt slices of app.ts's shell — the bar, the sidebar and the top strip —
// with the same classes in the same order, so PlayerBar and Sidebar stories
// are the product's markup and only the engine behind them is a stub.
// app.ts is the ground truth; when it changes, this follows it.

import { t } from '../../src/shared/i18n.ts'
import type { Playlist, Track } from '../../src/main/parse.ts'
import type { Repeat } from '../../src/main/store.ts'
import type { View } from '../../src/main/ui/ctx.ts'
import { clock } from '../../src/main/ui/ctx.ts'
import { h, icon, mark, replace } from '../../src/main/ui/dom.ts'

// ── The player bar (app.ts's bar assembly + drawBar + drawTick) ─────────────

export interface BarOptions {
  current?: Track
  playing?: boolean
  /** The gap after "next" before the video exists: pause glyph, as YouTube's bar shows it. */
  buffering?: boolean
  /** A wait that has outlasted its welcome: the stop glyph. */
  stalled?: boolean
  /** 0..1 of the seek slider; paints how much is behind the thumb, as fill() does. */
  ratio?: number
  duration?: number
  volume?: number
  video?: 'hidden' | 'corner' | 'stage'
  shuffle?: boolean
  repeat?: Repeat
  /** Lyric lines; when omitted the pane is the product's "가사를 찾지 못했습니다." */
  lyrics?: string[]
  lyricsOpen?: boolean
}

/** `.bar > .sheetClose / .now / .center(.ctl + .seek) / .lyrics / .right` — app.ts's order. */
export function fillBar(bar: HTMLElement, o: BarOptions = {}): void {
  const duration = o.duration ?? 224
  const ratio = o.ratio ?? 0
  const volume = o.volume ?? 70
  const where = o.video ?? 'corner'
  const nextGlyph = { hidden: 'video', corner: 'expand', stage: 'videoOff' } as const
  const lyricAt = Math.min(2, Math.max(0, (o.lyrics?.length ?? 1) - 1))
  replace(
    bar,
    h('button', { class: 'sheetClose', 'data-nav': '', title: t('내리기'), 'aria-label': t('내리기') }, icon('down', 22)),
    h(
      'div',
      { class: 'now', 'data-nav': '' },
      h('div', { class: 'thumb' }),
      h(
        'div',
        { class: 'nowText' },
        h('div', { class: 't' }, o.current ? o.current.title : t('재생 중인 항목 없음')),
        h('div', { class: 'b' }, o.current?.byline ?? ''),
      ),
    ),
    h(
      'div',
      { class: 'center' },
      h(
        'div',
        { class: 'ctl' },
        h('button', { class: o.shuffle ? 'sh on' : 'sh', 'data-nav': '', title: t('셔플') }, icon('shuffle', 18)),
        h('button', { class: 'pv', 'data-nav': '', title: t('이전') }, icon('prev', 20)),
        o.stalled
          ? h('button', { class: 'big', 'data-nav': '', title: t('정지') }, icon('stop', 20))
          : h('button', { class: 'big', 'data-nav': '', title: t('재생 / 일시정지') }, icon(o.playing || o.buffering ? 'pause' : 'play', 20)),
        h('button', { class: 'nx', 'data-nav': '', title: t('다음') }, icon('next', 20)),
        h(
          'button',
          { class: o.repeat && o.repeat !== 'off' ? 'rp on' : 'rp', 'data-nav': '', title: t('반복') },
          icon(o.repeat === 'one' ? 'repeatOne' : 'repeat', 18),
        ),
      ),
      h(
        'div',
        { class: 'seek' },
        h('span', null, clock(ratio * duration)),
        h('input', {
          type: 'range',
          min: '0',
          max: '1000',
          value: String(Math.round(ratio * 1000)),
          style: `--p: ${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`,
        }),
        h('span', null, clock(duration)),
      ),
    ),
    h(
      'div',
      { class: 'lyrics' },
      o.lyrics && o.lyrics.length > 0
        ? o.lyrics.map((line, i) => h('button', { class: i === lyricAt ? 'lyricLine on' : 'lyricLine', 'data-nav': '' }, line))
        : h('div', { class: 'lyricsEmpty' }, t('가사를 찾지 못했습니다.')),
    ),
    h(
      'div',
      { class: 'right' },
      h('button', { class: o.lyricsOpen ? 'on' : '', 'data-nav': '', title: t('가사') }, icon('note', 18)),
      h(
        'button',
        {
          class: where === 'hidden' ? 'vid' : 'vid on',
          'data-nav': '',
          title: where === 'stage' ? t('크게 보기') : where === 'corner' ? t('구석에 두기') : t('화면 보기'),
        },
        icon(nextGlyph[where], 18),
      ),
      h('button', { 'data-nav': '', title: t('대기열') }, icon('queue', 18)),
      h('button', { 'data-nav': '', title: t('음소거') }, icon(volume === 0 ? 'mute' : 'volume', 18)),
      h('input', { type: 'range', class: 'vol', min: '0', max: '100', value: String(volume), style: `--p: ${volume}%` }),
    ),
  )
}

// ── The sidebar (app.ts's NAV + drawSide) ────────────────────────────────────

interface NavItem {
  view: View
  label: string
  icon: Parameters<typeof icon>[0]
  section?: string
}

const NAV: NavItem[] = [
  { view: { kind: 'explore' }, label: t('둘러보기'), icon: 'radio' },
  { view: { kind: 'search', query: '' }, label: t('검색'), icon: 'search' },
  { view: { kind: 'home' }, label: t('홈'), icon: 'home' },
  { view: { kind: 'subs' }, label: t('구독'), icon: 'subs' },
  { view: { kind: 'recent' }, label: t('최근 감상'), icon: 'history', section: t('내 라이브러리') },
  { view: { kind: 'history' }, label: t('시청 기록'), icon: 'history' },
  { view: { kind: 'playlists' }, label: t('내 재생목록'), icon: 'library' },
  { view: { kind: 'queue' }, label: t('대기열'), icon: 'queue' },
]

const nameOf = (view: View): string => (view.kind === 'playlist' ? `playlist:${view.id}` : view.kind)

export interface SideOptions {
  /** Which destination is the current screen, as nameOf() would say. */
  active?: string
  playlists?: Playlist[]
  /** The theme line shows the side you would switch TO. */
  dark?: boolean
}

export function fillSide(side: HTMLElement, o: SideOptions = {}): void {
  const playlists = o.playlists ?? []
  replace(
    side,
    h(
      'div',
      { class: 'brand' },
      mark(20),
      h('span', null, 'Easy Mode'),
      h('div', { class: 'spacer' }),
      h('button', { class: 'drawerClose', 'data-nav': '', title: t('닫기'), 'aria-label': t('닫기') }, icon('close', 18)),
    ),
    NAV.map((item) => [
      item.section && h('h4', null, item.section),
      h(
        'button',
        { class: nameOf(item.view) === o.active ? 'nav on' : 'nav', 'data-nav': '' },
        icon(item.icon, 18),
        h('span', null, item.label),
      ),
    ]),
    playlists.length > 0 && h('h4', null, t('재생목록')),
    playlists.map((p) => h('button', { class: 'nav pl', 'data-nav': '', title: p.title }, p.title)),
    h('div', { class: 'spacer' }),
    h('button', { class: 'nav', 'data-nav': '' }, icon(o.dark ? 'sun' : 'moon', 18), h('span', null, o.dark ? t('밝게') : t('어둡게'))),
    h(
      'button',
      { class: 'nav exit', 'data-nav': '', title: 'Esc × 2' },
      icon('leave', 18),
      h('span', null, t('유튜브로 돌아가기')),
    ),
  )
}

// ── The header strip (app.ts's drawTop — narrow screens only) ────────────────

export function fillTop(top: HTMLElement, title: string, dark = true): void {
  replace(
    top,
    h('button', { class: 'drawerToggle', 'data-nav': '', title: t('메뉴'), 'aria-label': t('메뉴') }, icon('menu', 20)),
    h('div', { class: 'name' }, title),
    h('button', { class: 'themeButton', 'data-nav': '', title: t('테마'), 'aria-label': t('테마') }, icon(dark ? 'sun' : 'moon', 18)),
  )
}
