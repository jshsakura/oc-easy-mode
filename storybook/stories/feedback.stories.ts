// How every screen says "wait", "empty", "gone wrong" and "done": the busy
// state reconstructed with the real h(), the error line fed by the real
// explain(), the empty-state pattern, and the real toast() in both tones —
// which lands in the frame's overlay root, exactly as in the product.
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import { explain } from '../../src/main/ui/ctx.ts'
import { h, icon } from '../../src/main/ui/dom.ts'
import { toast } from '../../src/main/ui/overlay.ts'
import { skHead, skRow, skShelf } from '../../src/main/ui/views.ts'
import { frame } from '../lib/frame.ts'

const meta = {
  title: 'Feedback',
  render: () => board(),
} satisfies Meta

export default meta
type Story = StoryObj

/** views.ts's private nothing(): a glyph says the screen arrived and there is nothing in it. */
function nothing(text: string, glyph: Parameters<typeof icon>[0]): HTMLElement {
  return h('div', { class: 'empty' }, icon(glyph, 34), h('div', null, text))
}

function board(): HTMLElement {
  const f = frame()
  return h(
    'div',
    null,
    h('h3', null, '기다림 — 스켈레톤 (skRow · skShelf · skHead, 실제 views.ts 것)'),
    h('div', { style: 'border:1px dashed var(--border); border-radius:var(--radius-md); margin-bottom:12px' }, skRow(), skRow(), skRow()),
    h('div', { style: 'border:1px dashed var(--border); border-radius:var(--radius-md); margin-bottom:12px; padding:16px' }, skShelf()),
    h('div', { style: 'border:1px dashed var(--border); border-radius:var(--radius-md); margin-bottom:36px; padding:16px' }, skHead()),
    h('h3', null, '빈 화면 — .empty + 글리프'),
    h(
      'div',
      { style: 'border:1px dashed var(--border); border-radius:var(--radius-md); margin-bottom:36px' },
      nothing(t('대기열이 비어 있습니다.'), 'queue'),
    ),
    h('h3', null, '오류 — .err (실제 explain())'),
    h('div', { class: 'err', style: 'margin-bottom:36px' }, explain(new Error('stub failure'))),
    h('h3', null, '알림 — 실제 toast(), 오버레이 루트로'),
    h(
      'div',
      { class: 'toolbar' },
      h(
        'button',
        {
          class: 'btn primary',
          onclick: () => {
            toast(f.overlay, t('대기열에 넣었습니다.'))
          },
        },
        icon('check', 16),
        '보통 알림',
      ),
      h(
        'button',
        {
          class: 'btn danger',
          onclick: () => {
            toast(f.overlay, t('재생할 수 없는 항목입니다.'), true)
          },
        },
        icon('close', 16),
        '나쁜 알림',
      ),
      h('span', { class: 'sub' }, '오버레이 루트 위에 뜹니다 — 제품과 같은 자리'),
    ),
  )
}

export const All: Story = { name: '기다림 · 빈 화면 · 오류 · 알림' }
export const Light: Story = { name: '밝은 테마', parameters: { frame: { light: true } } }
