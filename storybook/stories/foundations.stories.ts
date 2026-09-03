// The design tokens themselves: every surface colour as a swatch, the glass
// surfaces over a busy colourful gradient (the one story that proves the
// backdrop blur works — glass over a flat colour is just a colour), the two
// radii, and the eq bars.
import type { Meta, StoryObj } from '@storybook/html'
import { h } from '../../src/main/ui/dom.ts'

const meta = {
  title: 'Foundations',
  render: () => board(),
} satisfies Meta

export default meta
type Story = StoryObj

const SURFACES: ReadonlyArray<readonly [label: string, token: string]> = [
  ['--ground', 'var(--ground)'],
  ['--side-panel', 'var(--side-panel)'],
  ['--panel / --background', 'var(--panel)'],
  ['--secondary', 'var(--secondary)'],
  ['--border', 'var(--border)'],
  ['--primary', 'var(--primary)'],
  ['--destructive', 'var(--destructive)'],
]

function section(title: string, ...children: HTMLElement[]): HTMLElement {
  return h('section', { style: 'margin: 0 0 40px' }, h('h3', null, title), ...children)
}

function swatch(label: string, background: string, extra = ''): HTMLElement {
  return h(
    'div',
    { style: 'display:flex; flex-direction:column; gap:6px; width:120px' },
    h('div', { style: `height:48px; border-radius:8px; border:1px solid var(--border); background:${background}; ${extra}` }),
    h('div', { style: 'font-size:12px; font-family:ui-monospace,monospace; color:var(--muted-foreground)' }, label),
  )
}

/** A glass pane over whatever is behind it — the point is the blur, not the pane. */
function pane(label: string, background: string): HTMLElement {
  return h(
    'div',
    {
      style: `background:${background}; -webkit-backdrop-filter:var(--blur); backdrop-filter:var(--blur);
        border:1px solid var(--glass-line); border-radius:var(--radius-lg); padding:16px 20px; color:var(--foreground);
        box-shadow:var(--shadow); min-width:180px`,
    },
    h('div', { style: 'font-weight:600' }, label),
    h('div', { style: 'font-size:12px; font-family:ui-monospace,monospace; color:var(--muted-foreground)' }, 'backdrop-filter: var(--blur)'),
  )
}

function board(): HTMLElement {
  return h(
    'div',
    null,
    section(
      '표면 토큰',
      h(
        'div',
        { style: 'display:flex; flex-wrap:wrap; gap:14px' },
        SURFACES.map(([label, bg]) => swatch(label, bg)),
        swatch('--foreground', 'var(--background)', 'display:flex;align-items:center;justify-content:center;color:var(--foreground);font-size:12px'),
        swatch('--muted-foreground', 'var(--background)', 'display:flex;align-items:center;justify-content:center;color:var(--muted-foreground);font-size:12px'),
      ),
    ),
    section(
      '글래스 — 바쁜 배경 위에서',
      h(
        'div',
        {
          style: `position:relative; display:flex; flex-wrap:wrap; gap:20px; align-items:flex-start; padding:36px; border-radius:var(--radius-lg);
            background:
              radial-gradient(80% 90% at 15% 20%, #ffb703 0%, transparent 55%),
              radial-gradient(70% 80% at 85% 15%, #ef476f 0%, transparent 60%),
              radial-gradient(90% 100% at 80% 85%, #4361ee 0%, transparent 60%),
              radial-gradient(60% 70% at 25% 90%, #06d6a0 0%, transparent 55%),
              repeating-linear-gradient(45deg, #1b1b2f 0 18px, #16213e 18px 36px);`,
        },
        h('div', { style: 'display:flex; flex-direction:column; gap:12px' }, pane('--glass', 'var(--glass)'), pane('--glass-strong', 'var(--glass-strong)')),
        h(
          'div',
          { style: 'display:flex; flex-direction:column; gap:12px' },
          h(
            'div',
            { class: 'menu', style: 'position:static; display:flex; flex-direction:column; min-width:190px' },
            h('button', null, '실제 .menu'),
            h('hr'),
            h('button', { style: 'color: var(--destructive)' }, '위험 항목'),
          ),
          h('div', { class: 'toast' }, '실제 .toast'),
          h('div', { class: 'toast bad' }, '실제 .toast.bad'),
        ),
      ),
    ),
    section(
      '반지름과 에코 바',
      h(
        'div',
        { style: 'display:flex; flex-wrap:wrap; gap:20px; align-items:center' },
        h('div', { style: 'width:120px; height:64px; background:var(--secondary); border:1px solid var(--glass-line); border-radius:var(--radius-md)' }),
        h('div', { style: 'width:120px; height:64px; background:var(--secondary); border:1px solid var(--glass-line); border-radius:var(--radius-lg)' }),
        h(
          'div',
          { class: 'row now', style: 'display:inline-flex; align-items:center; gap:16px; padding:14px 20px' },
          h('span', { class: 'eq' }, h('i'), h('i'), h('i')),
          h('span', { style: 'color:var(--muted-foreground); font-size:13px' }, '.row.now 안의 .eq'),
        ),
        h('span', { class: 'eq', style: 'transform:scale(1.6); transform-origin:left center' }, h('i'), h('i'), h('i')),
      ),
    ),
  )
}

export const Tokens: Story = { name: '토큰 · 글래스 · 반지름' }
export const Light: Story = { name: '밝은 테마', parameters: { frame: { light: true } } }
