// The artwork side of the design: the tile (16:9 for a video, square for a
// playlist or album), shelves that scroll sideways, the video-mode grid, and
// the playlist header — hand-assembled with the same classes and structure
// views.ts's private tile()/shelfRow()/playlist() use.
import type { Meta, StoryObj } from '@storybook/html'
import { t, tn } from '../../src/shared/i18n.ts'
import type { Playlist, Track } from '../../src/main/parse.ts'
import { thumbnail } from '../../src/main/parse.ts'
import { h, icon } from '../../src/main/ui/dom.ts'
import { makeTracks, SAMPLE_PLAYLISTS } from '../lib/stub.ts'

const meta = {
  title: 'Cards',
} satisfies Meta

export default meta
type Story = StoryObj

/** views.ts's tile(): artwork flush to the card's top edge, title on the card. */
function tile(opts: { cover?: string; title: string; sub: string; badge?: string; square?: boolean }): HTMLElement {
  return h(
    'button',
    { class: opts.square ? 'tile square' : 'tile', 'data-nav': '' },
    h(
      'div',
      { class: 'cover', style: opts.cover ? `background-image: url(${opts.cover})` : '' },
      !opts.cover && icon('note', 26),
      opts.badge && h('span', { class: 'badge' }, opts.badge),
      h('span', { class: 'play' }, icon('play', 20)),
    ),
    h('div', { class: 't', title: opts.title }, opts.title),
    h('div', { class: 's' }, opts.sub),
  )
}

function trackTile(track: Track): HTMLElement {
  return tile({ cover: thumbnail(track.videoId), title: track.title, sub: track.byline, badge: track.duration })
}

function playlistTile(p: Playlist): HTMLElement {
  return tile({ cover: p.cover, title: p.title, sub: p.subtitle, square: true })
}

function shelves(): HTMLElement {
  const videos = makeTracks(8)
  return h(
    'div',
    null,
    h(
      'section',
      { class: 'shelf' },
      h('h3', null, '지금 유행하는 곡'),
      h('div', { class: 'shelfRow' }, videos.map((track) => trackTile(track))),
    ),
    h(
      'section',
      { class: 'shelf' },
      h('h3', null, '추천 재생목록'),
      h('div', { class: 'shelfRow' }, SAMPLE_PLAYLISTS.map((p) => playlistTile(p))),
    ),
  )
}

function grid(): HTMLElement {
  return h('div', { class: 'grid' }, makeTracks(9).map((track) => trackTile(track)))
}

/** views.ts's playlist header: big square cover, the label, the title, the count. */
function head(): HTMLElement {
  const tracks = makeTracks(12)
  const cover = tracks[0] ? thumbnail(tracks[0].videoId) : undefined
  return h(
    'div',
    null,
    h(
      'div',
      { class: 'head' },
      h('div', { class: 'cover', style: cover ? `background-image: url(${cover})` : '' }),
      h(
        'div',
        { style: 'min-width:0' },
        h('div', { class: 'label' }, t('재생목록')),
        h('h2', null, '야간 드라이브'),
        h('div', { class: 'sub' }, tn('곡', tracks.length)),
      ),
    ),
    h(
      'div',
      { class: 'toolbar' },
      h('button', { class: 'btn primary', 'data-nav': '' }, icon('play', 16), t('재생')),
      h('button', { class: 'btn', 'data-nav': '' }, icon('shuffle', 16), t('셔플 재생')),
      h('button', { class: 'btn', 'data-nav': '' }, icon('radio', 16), t('라디오')),
    ),
  )
}

export const Shelves: Story = { name: '선반 — .shelf + .shelfRow', render: () => shelves() }
export const Grid: Story = { name: '영상 모드 격자 — .grid', render: () => grid() }
export const Head: Story = { name: '재생목록 헤더 — .head', render: () => head() }
export const HeadPhone: Story = {
  name: '재생목록 헤더 — 폰',
  parameters: { viewport: { defaultViewport: 'phone' } },
  render: () => head(),
}
export const Light: Story = { name: '밝은 테마', parameters: { frame: { light: true } }, render: () => shelves() }
