// The floating glass layers, all drawn by the real overlay code into the
// frame's overlay root: showMenu() anchored to a button (its own positioning,
// its own dismissal), the same menu as a phone's bottom sheet, and confirm().
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import { h } from '../../src/main/ui/dom.ts'
import { confirm, showMenu, type MenuItem } from '../../src/main/ui/overlay.ts'
import { frame } from '../lib/frame.ts'
import { makeCtx, makeTrack } from '../lib/stub.ts'

const meta = {
  title: 'Floating',
} satisfies Meta

export default meta
type Story = StoryObj

/** The menu rows.ts puts behind a track's ⋯ — icons, a divider, a danger line. */
function trackMenu(): Array<MenuItem | '-'> {
  const ctx = makeCtx()
  const track = makeTrack()
  return [
    { label: t('지금 재생'), icon: 'play', onSelect: () => ctx.say(t('다음에 재생합니다.')) },
    { label: t('다음에 재생'), icon: 'queue', onSelect: () => ctx.say(t('다음에 재생합니다.')) },
    { label: t('대기열에 추가'), icon: 'plus', onSelect: () => ctx.say(t('대기열에 넣었습니다.')) },
    '-',
    { label: t('이 곡으로 라디오'), icon: 'radio', onSelect: () => ctx.say(t('라디오를 만드는 중…')) },
    { label: t('재생목록에 추가'), icon: 'library', onSelect: () => void ctx.addToPlaylist([track]) },
    '-',
    { label: t('유튜브에서 열기'), icon: 'external', onSelect: () => ctx.say('youtube.com') },
    { label: t('대기열에서 빼기'), icon: 'close', onSelect: () => ctx.say(t('대기열이 비어 있습니다.'), true) },
  ]
}

function menuAnchor(label: string, open: (btn: HTMLButtonElement) => void): HTMLElement {
  const btn = h('button', { class: 'btn' }, label)
  btn.addEventListener('click', () => open(btn))
  return h(
    'div',
    { style: 'display:flex; gap:12px; align-items:center; padding: 80px 24px' },
    btn,
    h('span', { class: 'sub' }, '누르면 오버레이 루트에 실제 showMenu()'),
  )
}

const popover: Story = {
  name: '메뉴 — showMenu()',
  render: () => {
    const f = frame()
    return menuAnchor('⋯ 메뉴 열기', (btn) => {
      showMenu(f.overlay, btn, trackMenu())
    })
  },
}

const sheet: Story = {
  name: '메뉴 — 폰 바닥판 (sheetMenu)',
  parameters: { viewport: { defaultViewport: 'phone' } },
  render: () => {
    const f = frame()
    return menuAnchor('⋯ 메뉴 열기', (btn) => {
      showMenu(f.overlay, btn, trackMenu())
    })
  },
}

const dialog: Story = {
  name: '확인 대화상자 — confirm()',
  render: () => {
    const f = frame()
    const ctx = makeCtx()
    return h(
      'div',
      { style: 'display:flex; gap:12px; align-items:center; padding: 80px 24px' },
      h(
        'button',
        {
          class: 'btn danger',
          onclick: () => {
            void confirm(f.overlay, `'${makeTrack().title}'을(를) 재생목록에서 뺄까요?`, t('빼기')).then((yes) => {
              if (yes) ctx.say(t('재생목록에서 뺐습니다.'))
            })
          },
        },
        t('빼기'),
      ),
      h(
        'button',
        {
          class: 'btn',
          onclick: () => {
            void confirm(f.overlay, t('최근 감상 기록을 지울까요?')).then((yes) => {
              if (yes) ctx.say(t('삭제했습니다.'))
            })
          },
        },
        t('기록 지우기'),
      ),
      h('span', { class: 'sub' }, 'scrim 을 누르면 취소'),
    )
  },
}

const light: Story = {
  name: '메뉴 — 밝은 테마',
  parameters: { frame: { light: true } },
  render: () => {
    const f = frame()
    return menuAnchor('⋯ 메뉴 열기', (btn) => {
      showMenu(f.overlay, btn, trackMenu())
    })
  },
}

export const Popover = popover
export const Sheet = sheet
export const Dialog = dialog
export const Light = light
