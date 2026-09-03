// The one component every list is made of: the real row(), with the real menu
// behind its three dots. Default rows, the playing row with its eq bars, the
// unplayable row, and the playlist row — at PC width and at phone width,
// where the width query drops the number and the duration.
import type { Meta, StoryObj } from '@storybook/html'
import { h, icon } from '../../src/main/ui/dom.ts'
import { row } from '../../src/main/ui/rows.ts'
import { makeCtx, makeTrack, makeTracks, SAMPLE_PLAYLISTS, StubEngine } from '../lib/stub.ts'

const meta = {
  title: 'Rows',
  render: () => board(),
} satisfies Meta

export default meta
type Story = StoryObj

function board(): HTMLElement {
  const tracks = makeTracks(6)
  // index 2: the third row is the one playing — glass pane, bold title, eq bars.
  const ctx = makeCtx({ engine: new StubEngine({ queue: tracks.slice(), index: 2 }) })
  return h(
    'div',
    { class: 'rows' },
    h('h3', null, '보통 행 · 지금 재생 중(.now) · 재생할 수 없음(.dead)'),
    tracks.map((track, i) => row(ctx, track, { index: i + 1, onPlay: () => ctx.say(track.title) })),
    row(ctx, makeTrack({ title: '사라진 영상', byline: '재생할 수 없음', unavailable: true }), {
      index: tracks.length + 1,
      onPlay: () => {},
    }),
    h('h3', { style: 'margin-top:32px' }, '재생목록 행 — .plrow'),
    SAMPLE_PLAYLISTS.map((p) =>
      h(
        'div',
        { class: 'row plrow', 'data-nav': '', tabindex: '0', role: 'button', onclick: () => ctx.say(p.title) },
        h('div', { class: 'thumb' }),
        h('div', { class: 'meta' }, h('div', { class: 'title', title: p.title }, p.title), h('div', { class: 'by' }, p.subtitle)),
        icon('back', 16),
      ),
    ),
    h('div', { class: 'sub', style: 'margin-top:20px' }, '⋯ 버튼을 누르면 실제 메뉴가 오버레이 루트에 뜹니다'),
  )
}

export const PC: Story = { name: 'PC 너비' }
export const Phone: Story = {
  name: '폰 너비',
  parameters: { viewport: { defaultViewport: 'phone' } },
}
export const Light: Story = { name: '밝은 테마', parameters: { frame: { light: true } } }
