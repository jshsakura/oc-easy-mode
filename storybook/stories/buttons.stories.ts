// Every button recipe in STYLES, at rest and in its states: the .btn set,
// the circular transport chips (off / .on), the big play button with its
// buffering ring, and the header's theme button.
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import { h, icon } from '../../src/main/ui/dom.ts'

const meta = {
  title: 'Buttons',
  render: () => board(),
} satisfies Meta

export default meta
type Story = StoryObj

function board(): HTMLElement {
  return h(
    'div',
    null,
    h(
      'section',
      { style: 'margin: 0 0 36px' },
      h('h3', null, '.btn'),
      h(
        'div',
        { class: 'toolbar', style: 'margin-bottom: 12px' },
        h('button', { class: 'btn' }, icon('plus', 16), t('대기열에 추가')),
        h('button', { class: 'btn primary' }, icon('play', 16), t('전체 재생')),
        h('button', { class: 'btn ghost' }, icon('more', 16), t('더 보기')),
        h('button', { class: 'btn danger' }, icon('trash', 16), t('삭제')),
        h('button', { class: 'btn primary', disabled: true }, icon('play', 16), t('전체 재생')),
      ),
    ),
    h(
      'section',
      { style: 'margin: 0 0 36px' },
      h('h3', null, '.ctl — 꺼짐 / 켜짐(.on)'),
      h(
        'div',
        { style: 'display:flex; flex-wrap:wrap; gap:28px; align-items:center' },
        h(
          'div',
          { class: 'ctl', style: 'gap:8px' },
          h('button', { class: 'sh', title: t('셔플') }, icon('shuffle', 18)),
          h('button', { class: 'pv', title: t('이전') }, icon('prev', 20)),
          h('button', { class: 'big' }, icon('play', 20)),
          h('button', { class: 'nx', title: t('다음') }, icon('next', 20)),
          h('button', { class: 'rp', title: t('반복 안 함') }, icon('repeat', 18)),
        ),
        h(
          'div',
          { class: 'ctl', style: 'gap:8px' },
          h('button', { class: 'sh on', title: t('셔플') }, icon('shuffle', 18)),
          h('button', { class: 'pv', title: t('이전') }, icon('prev', 20)),
          h('button', { class: 'big' }, icon('pause', 20)),
          h('button', { class: 'nx', title: t('다음') }, icon('next', 20)),
          h('button', { class: 'rp on', title: t('한 곡 반복') }, icon('repeatOne', 18)),
        ),
        h('button', { class: 'big', disabled: true }, icon('play', 20)),
      ),
      h(
        'div',
        { style: 'display:flex; flex-wrap:wrap; gap:28px; align-items:center; margin-top:20px' },
        h('span', { class: 'sub', style: 'display:inline-flex; align-items:center; gap:10px' }, '.ctl .big.buffering', h('button', { class: 'big buffering', title: t('재생 / 일시정지') })),
      ),
    ),
    h(
      'section',
      null,
      h('h3', null, '.themeButton'),
      h(
        'div',
        { style: 'display:flex; gap:12px; align-items:center' },
        h('button', { class: 'themeButton', title: t('테마'), 'aria-label': t('테마') }, icon('sun', 18)),
        h('button', { class: 'themeButton', title: t('테마'), 'aria-label': t('테마') }, icon('moon', 18)),
        h('span', { class: 'sub' }, 'header strip, 34×34'),
      ),
    ),
  )
}

export const All: Story = { name: '모든 버튼' }
export const Light: Story = { name: '밝은 테마', parameters: { frame: { light: true } } }
