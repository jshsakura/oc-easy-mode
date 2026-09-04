// The equalizer dialog, drawn by the real openEqualizer() over the frame:
// the switch, the five bands, the booster, and the refusal it shows when a
// browser has silenced the graph.
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import { h, icon } from '../../src/main/ui/dom.ts'
import { openEqualizer } from '../../src/main/ui/equalizer.ts'
import { makeCtx } from '../lib/stub.ts'

const meta = {
  title: 'Equalizer',
  render: () => opener(),
} satisfies Meta

export default meta
type Story = StoryObj

function opener(refused = false): HTMLElement {
  try {
    if (refused) localStorage.setItem('oc-easy-mode:eq-refused', '1')
    else localStorage.removeItem('oc-easy-mode:eq-refused')
  } catch {}
  const ctx = makeCtx()
  setTimeout(() => openEqualizer(ctx))
  return h(
    'div',
    null,
    h('h2', null, t('대기열')),
    h('button', { class: 'btn', 'data-nav': '', onclick: () => openEqualizer(ctx) }, icon('eq', 16), t('이퀄라이저')),
    h('div', { class: 'sub', style: 'margin-top: 12px' }, '워크벤치에는 미디어 요소가 없어 스위치는 설정만 바꿉니다.'),
  )
}

export const Default: Story = { name: '기본' }

export const Refused: Story = {
  name: '이 브라우저에서는 안 됨',
  render: () => opener(true),
}

export const Phone: Story = {
  name: '폰 너비',
  parameters: { viewport: { defaultViewport: 'phone' } },
}
