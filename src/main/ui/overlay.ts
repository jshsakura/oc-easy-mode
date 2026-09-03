import { t } from '../../shared/i18n.ts'
import { youtubeIsDark } from '../store.ts'
import { h, icon, type IconName } from './dom.ts'

export interface MenuItem {
  label: string
  icon?: IconName
  danger?: boolean
  onSelect: () => void
}

let openMenu: HTMLElement | null = null
/** Takes the open menu's dismissal listeners back off the document. */
let releaseMenu: (() => void) | null = null

export function closeMenu(): void {
  releaseMenu?.()
  releaseMenu = null
  openMenu?.remove()
  openMenu = null
}

/** A popover anchored to the element that was clicked. `'-'` draws a divider. */
export function showMenu(root: ShadowRoot, anchor: HTMLElement, items: Array<MenuItem | '-'>): void {
  closeMenu()
  const isLight = !youtubeIsDark()
  try {
    (root.host as HTMLElement).classList.toggle('light', isLight)
  } catch {}
  const menu = h(
    'div',
    { class: `menu ${isLight ? 'light' : ''}`.trim(), role: 'menu' },
    items.map((it) =>
      it === '-'
        ? h('hr')
        : h(
            'button',
            {
              role: 'menuitem',
              style: it.danger ? 'color: var(--red)' : undefined,
              onclick: () => {
                closeMenu()
                it.onSelect()
              },
            },
            it.icon && icon(it.icon, 18),
            it.label,
          ),
    ),
  )
  root.appendChild(menu)
  openMenu = menu
  // On a narrow screen it is a sheet along the bottom rather than a popover.
  //
  // Anchored to its button, a menu opened from the player's action row has
  // nowhere to go but up — over the transport, which is what it was covering:
  // the play button sat behind the list of choices. Full width at the foot of
  // the screen it covers nothing that matters and every item is a full line
  // for a thumb.
  const narrow = Math.min(window.innerWidth, window.screen.width) < 900
  if (narrow) {
    menu.classList.add('sheetMenu')
  } else {
    const r = anchor.getBoundingClientRect()
    const w = menu.offsetWidth
    const hgt = menu.offsetHeight
    let x = r.right - w
    let y = r.bottom + 4
    if (x < 8) x = 8
    if (y + hgt > window.innerHeight - 8) y = r.top - hgt - 4
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
  }
  // Dismissal listens on the document, not on this shadow root.
  //
  // The menu lives in the overlay root; everything a person would click to
  // dismiss it — a row, the sidebar, the player bar — lives in the *other*
  // one. An event that starts in one shadow tree never reaches a listener
  // bound to another, so the root-bound version simply never fired and the
  // menu stayed open until something else re-rendered.
  //
  // The listeners are given to closeMenu to remove rather than removing only
  // themselves when they fire. A menu that opens another menu — 재생 속도 does —
  // closes the first during the click, and a listener that outlived its own
  // menu would read the *next* press as an outside click and shut the second
  // menu before anything could be chosen from it. Measured: the submenu never
  // took a selection, and the press appeared to do nothing at all.
  let live = true
  const off = (ev: Event) => {
    if (ev.composedPath().includes(menu)) return
    closeMenu()
  }
  // Escape closes it too, and must not reach the shell's twice-to-exit.
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return
    ev.stopPropagation()
    closeMenu()
  }
  releaseMenu = () => {
    live = false
    document.removeEventListener('pointerdown', off, true)
    document.removeEventListener('keydown', onKey, true)
  }
  // A tick late, so the press that opened the menu is not also the press that
  // dismisses it.
  setTimeout(() => {
    if (!live) return
    document.addEventListener('pointerdown', off, true)
    document.addEventListener('keydown', onKey, true)
  })
}

export interface Choice {
  id: string
  label: string
  sub?: string
}

/**
 * A picker with an inline "new" field. Resolves with the chosen id, with
 * `{ create: text }` for a new one, or null when dismissed.
 */
export function pick(
  root: ShadowRoot,
  title: string,
  choices: Choice[],
  newPlaceholder: string,
): Promise<string | { create: string } | null> {
  return new Promise((resolve) => {
    const done = (v: string | { create: string } | null) => {
      scrim.remove()
      resolve(v)
    }
    const input = h('input', { placeholder: newPlaceholder, type: 'text' })
    const create = () => {
      const v = input.value.trim()
      if (v) done({ create: v })
    }
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') create()
      if (ev.key === 'Escape') done(null)
    })
    const scrim = h(
      'div',
      { class: 'scrim', onclick: (ev) => ev.target === scrim && done(null) },
      h(
        'div',
        { class: 'modal', role: 'dialog' },
        h('h3', null, title),
        h(
          'div',
          { class: 'list' },
          choices.length === 0 && h('div', { class: 'empty', style: 'padding: 16px' }, t('재생목록이 없습니다.')),
          choices.map((c) =>
            h(
              'button',
              { onclick: () => done(c.id) },
              icon('library', 18),
              h('div', { style: 'min-width:0' }, h('div', null, c.label), c.sub && h('div', { class: 'sub' }, c.sub)),
            ),
          ),
        ),
        h('div', { class: 'new' }, input, h('button', { class: 'btn primary', onclick: create }, icon('plus', 16), t('만들기'))),
      ),
    )
    root.appendChild(scrim)
    input.focus()
  })
}

/** Yes/no. Resolves true on confirm. */
export function confirm(root: ShadowRoot, message: string, yes = t('삭제')): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (v: boolean) => {
      scrim.remove()
      resolve(v)
    }
    const scrim = h(
      'div',
      { class: 'scrim', onclick: (ev) => ev.target === scrim && done(false) },
      h(
        'div',
        { class: 'modal', role: 'alertdialog' },
        h('h3', null, message),
        h(
          'div',
          { class: 'new', style: 'justify-content:flex-end; border:0' },
          h('button', { class: 'btn ghost', onclick: () => done(false) }, t('취소')),
          h('button', { class: 'btn danger', onclick: () => done(true) }, yes),
        ),
      ),
    )
    root.appendChild(scrim)
  })
}

let toastHost: HTMLElement | null = null

export function toast(root: ShadowRoot, message: string, bad = false): void {
  if (!toastHost || !toastHost.isConnected) {
    toastHost = h('div', { class: 'toasts' })
    root.appendChild(toastHost)
  }
  const el = h('div', { class: bad ? 'toast bad' : 'toast' }, message)
  toastHost.appendChild(el)
  setTimeout(() => el.remove(), bad ? 5000 : 2600)
}
