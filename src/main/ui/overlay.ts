import { t } from '../../shared/i18n.ts'
import { youtubeIsDark } from '../store.ts'
import { narrowNow } from './device.ts'
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
/** How many dialogs are up. A number rather than a flag because one can open another. */
let openModals = 0

/**
 * Whether anything is floating over the app.
 *
 * Asked by the keyboard shortcuts and by the panic key, both of which listen on
 * the document and would otherwise act straight through whatever is on top of
 * it — s shuffling the queue behind an open menu, Escape counting towards
 * leaving the mode while a dialog waits for an answer. Measured: it did both.
 */
export function overlayIsOpen(): boolean {
  return openMenu !== null || openModals > 0
}

/**
 * Counts a dialog drawn by another file as one of the open ones, so the
 * shortcuts, the remote and the panic key treat it the way they treat these.
 * Returns the release, which is safe to call twice.
 */
export function holdModal(): () => void {
  openModals += 1
  let held = true
  return () => {
    if (!held) return
    held = false
    openModals -= 1
  }
}

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
              style: it.danger ? 'color: var(--destructive)' : undefined,
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
  // Measured before it is placed, and placed before it is seen.
  //
  // A fixed element with no left or top of its own lays out where it happens
  // to fall — the corner of the overlay root — so the menu appeared there for
  // one frame and then jumped to the button. That flicker is what reads as
  // the menu moving about.
  menu.style.visibility = 'hidden'
  root.appendChild(menu)
  openMenu = menu
  // On a narrow screen it is a sheet along the bottom rather than a popover.
  //
  // Anchored to its button, a menu opened from the player's action row has
  // nowhere to go but up — over the transport, which is what it was covering:
  // the play button sat behind the list of choices. Full width at the foot of
  // the screen it covers nothing that matters and every item is a full line
  // for a thumb.
  //
  // **narrowNow(), not a width of our own.** The first version asked
  // window.screen.width < 900 and every desktop on Windows display scaling
  // past 200% answered yes — screen.width is CSS pixels, so a 2560 panel at
  // 300% reports 853 — and every menu on a wide monitor came out a full-width
  // sheet. The app already has the honest answer: this is the same judgment
  // that lays out the whole UI as narrow, and the menu can never disagree
  // with the layout it floats over.
  const narrow = narrowNow()
  if (narrow) {
    menu.classList.add('sheetMenu')
  } else {
    const r = anchor.getBoundingClientRect()
    const w = menu.offsetWidth
    const hgt = menu.offsetHeight
    // Under the button and aligned to its right edge, then pushed back inside
    // the window on both axes. Only the left edge was being kept in; a menu
    // opened from a button near the right edge of a narrow window ran off it,
    // and one flipped above a button near the top ran off that.
    const x = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))
    let y = r.bottom + 4
    if (y + hgt > window.innerHeight - 8) y = r.top - hgt - 4
    y = Math.max(8, Math.min(y, window.innerHeight - hgt - 8))
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
  }
  menu.style.visibility = ''
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
 * The title, and the way out beside it.
 *
 * A dialog that fills the screen has no outside to press, so the backdrop —
 * which is how a card-shaped dialog is dismissed — is not reachable, and Escape
 * is not a key a phone has. Measured on the playlist picker: full screen, no
 * cross, nothing to do but choose. So the heading is a band with a close button
 * in it, the same shape the opened player uses.
 */
function modalHead(title: string, close: () => void): HTMLElement {
  return h(
    'div',
    { class: 'modalHead' },
    h('h3', null, title),
    h(
      'button',
      { class: 'modalClose', 'data-nav': '', title: t('닫기'), 'aria-label': t('닫기'), onclick: close },
      icon('close', 20),
    ),
  )
}

/**
 * A dialog fills a phone.
 *
 * A 420px card floating in the middle of a 390px screen is a card with fifteen
 * pixels of scrim either side of it — the shape of a desktop dialog on a device
 * that has no desktop. On a narrow screen the question takes the whole screen,
 * the way the player sheet does, and for the same reason: it is the only thing
 * being asked. Decided by narrowNow() rather than a width of our own, so the
 * dialog can never disagree with the layout it is drawn over.
 */
function modalClass(): string {
  return narrowNow() ? 'modal full' : 'modal'
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
    let closed = false
    const done = (v: string | { create: string } | null) => {
      if (closed) return
      closed = true
      openModals -= 1
      document.removeEventListener('keydown', onEscape, true)
      scrim.remove()
      resolve(v)
    }
    // On the document, not on the field: Escape has to close the dialog from
    // wherever the focus happens to be, and it must not travel on to the
    // shell's twice-to-leave.
    const onEscape = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      ev.stopPropagation()
      ev.preventDefault()
      done(null)
    }
    const input = h('input', { placeholder: newPlaceholder, type: 'text' })
    const create = () => {
      const v = input.value.trim()
      if (v) done({ create: v })
    }
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') create()
    })
    const scrim = h(
      'div',
      { class: 'scrim', onclick: (ev) => ev.target === scrim && done(null) },
      h(
        'div',
        { class: modalClass(), role: 'dialog' },
        modalHead(title, () => done(null)),
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
    openModals += 1
    document.addEventListener('keydown', onEscape, true)
    input.focus()
  })
}

/** Yes/no. Resolves true on confirm. */
export function confirm(root: ShadowRoot, message: string, yes = t('삭제')): Promise<boolean> {
  return new Promise((resolve) => {
    let closed = false
    const done = (v: boolean) => {
      if (closed) return
      closed = true
      openModals -= 1
      document.removeEventListener('keydown', onEscape, true)
      scrim.remove()
      resolve(v)
    }
    // It had none at all: the only ways out were the two buttons and the
    // backdrop, and Escape went past it to the shell's twice-to-leave instead.
    const onEscape = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      ev.stopPropagation()
      ev.preventDefault()
      done(false)
    }
    const scrim = h(
      'div',
      { class: 'scrim', onclick: (ev) => ev.target === scrim && done(false) },
      h(
        'div',
        { class: modalClass(), role: 'alertdialog' },
        modalHead(message, () => done(false)),
        h(
          'div',
          { class: 'new', style: 'justify-content:flex-end; border:0' },
          h('button', { class: 'btn ghost', onclick: () => done(false) }, t('취소')),
          h('button', { class: 'btn danger', onclick: () => done(true) }, yes),
        ),
      ),
    )
    root.appendChild(scrim)
    openModals += 1
    document.addEventListener('keydown', onEscape, true)
    // The safe answer takes the focus, so Enter cannot delete anything.
    scrim.querySelector<HTMLElement>('.btn.ghost')?.focus()
  })
}

let toastHost: HTMLElement | null = null

export function toast(root: ShadowRoot, message: string, bad = false): void {
  if (!toastHost || !toastHost.isConnected) {
    toastHost = h('div', { class: 'toasts' })
    root.appendChild(toastHost)
  }
  const el = h(
    'div',
    { class: bad ? 'toast bad' : 'toast' },
    icon(bad ? 'close' : 'check', 16),
    h('span', null, message),
  )
  toastHost.appendChild(el)
  setTimeout(() => el.remove(), bad ? 5000 : 2600)
}
