// The search box and the action row beneath it, exactly as views.ts's
// search() assembles them: the glyph, the 16px input (WebKit zooms on less),
// and the toolbar of .btn actions every list screen carries.
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import { h, icon } from '../../src/main/ui/dom.ts'
import { makeCtx } from '../lib/stub.ts'

const meta = {
  title: 'Searchbox',
  render: () => box(),
} satisfies Meta

export default meta
type Story = StoryObj

function box(): HTMLElement {
  const ctx = makeCtx()
  const input = h('input', {
    type: 'search',
    placeholder: t('노래, 영상, 채널 검색'),
    value: '한강',
    autocomplete: 'off',
    'data-nav': '',
  })
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') ctx.say(input.value)
  })
  return h(
    'div',
    null,
    h('h2', null, t('검색')),
    h('div', { class: 'searchbox' }, icon('search', 20), input),
    h(
      'div',
      { class: 'toolbar' },
      h('button', { class: 'btn primary', 'data-nav': '', onclick: () => ctx.say(t('전체 재생')) }, icon('play', 16), t('전체 재생')),
      h('button', { class: 'btn', 'data-nav': '', onclick: () => ctx.say(t('대기열에 넣었습니다.')) }, icon('plus', 16), t('대기열에 추가')),
      h('button', { class: 'btn', 'data-nav': '', onclick: () => void ctx.addToPlaylist([]) }, icon('library', 16), t('재생목록에 추가')),
      h('button', { class: 'btn ghost', 'data-nav': '' }, icon('more', 16), t('더 보기')),
    ),
    h('div', { class: 'sub' }, 'Enter 를 치면 실제 toast() 로 알립니다'),
  )
}

export const Filled: Story = { name: '채워진 상태' }

export const Empty: Story = {
  name: '비어 있는 상태',
  render: () => {
    const el = box()
    const input = el.querySelector('input')
    if (input) input.value = ''
    return el
  },
}

export const Phone: Story = {
  name: '폰 너비',
  parameters: { viewport: { defaultViewport: 'phone' } },
}

export const Light: Story = { name: '밝은 테마', parameters: { frame: { light: true } } }
