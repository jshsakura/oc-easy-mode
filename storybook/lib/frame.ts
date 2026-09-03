// The workbench's stand-in for shell.ts.
//
// The product mounts TWO shadow hosts into YouTube's page: one for the app and
// a twin for the floating layers (menus, modals, toasts), each injected with
// the same STYLES string — the design tokens live on `:host`, so a root
// without its own copy of the stylesheet is a transparent root. The frame
// reproduces exactly that shape, which is why a menu opened from a story
// really does float above the content instead of being styled next to it.

import type { Decorator } from '@storybook/html'
import { setStoredTheme } from '../../src/main/store.ts'
import { h } from '../../src/main/ui/dom.ts'
import { STYLES } from '../../src/main/ui/styles.ts'

export interface FrameOptions {
  /**
   * `fullscreen`: the story sets parameters.layout='fullscreen' and the
   * Storybook viewport IS the device screen — .app keeps its real fixed/dvh
   * layout. `inline` (default): a small override sheet makes .app a
   * component-scale panel for stories about one part.
   */
  mode?: 'fullscreen' | 'inline'
  /** The phone layout. In the product device.ts decides this; stories force the class. */
  narrow?: boolean
  /** Light theme on BOTH hosts, the way app.ts's applyTheme does it. */
  light?: boolean
}

export interface Frame {
  /** Light-DOM holder for the two hosts; this is what the story returns to. */
  wrapper: HTMLElement
  /** The .app element inside the app shadow root. */
  app: HTMLDivElement
  main: HTMLDivElement
  /** Present but detached in inline mode — a component story has no shell. */
  top: HTMLDivElement
  side: HTMLDivElement
  slot: HTMLDivElement
  bar: HTMLDivElement
  /** Menus, modals and toasts land here, above the app as in the product. */
  overlay: ShadowRoot
}

/**
 * Never a network image: rows and covers draw ytimg URLs that the workbench
 * must not depend on. `!important`, because the real code sets them as inline
 * style and only an important declaration beats that.
 */
const IMAGE_FIX = `
.thumb, .cover { background: linear-gradient(135deg, #3a2a5e, #1e1e28) !important; }
`

/** Only in inline mode: the app is a canvas for one component, not a screen. */
const INLINE_CSS = `
.app {
  position: relative;
  width: 100%;
  min-height: 560px;
  height: auto;
  grid-template-columns: 1fr;
  grid-template-rows: auto;
}
.slot { display: none !important; }
`

let current: Frame | null = null

/** The frame the decorator built around the story that is rendering now. */
export function frame(): Frame {
  if (!current) throw new Error('frame(): no frame yet — is the frame decorator installed?')
  return current
}

function sheet(text: string): HTMLStyleElement {
  const el = document.createElement('style')
  el.textContent = text
  return el
}

export function createFrame(opts: FrameOptions): Frame {
  // showMenu() and toast()'s palette follow youtubeIsDark(), which reads the
  // stored theme first. Pinning it makes floating layers always agree with
  // the story's frame instead of following this browser's OS preference.
  setStoredTheme(opts.light ? 'light' : 'dark')

  const wrapper = h('div')
  const appHost = h('div', { style: 'display:block' })
  const overlayHost = h('div', { style: 'display:block' })
  wrapper.append(appHost, overlayHost)

  if (opts.light) {
    appHost.classList.add('light')
    overlayHost.classList.add('light')
  }

  const appShadow = appHost.attachShadow({ mode: 'open' })
  const overlayShadow = overlayHost.attachShadow({ mode: 'open' })

  // app.ts assembles the shell in this order: top, side, main, slot, bar, then
  // the drawer scrim. The same order here keeps every width query and grid
  // placement in STYLES behaving as it does in the product.
  const top = h('div', { class: 'top' })
  const side = h('div', { class: 'side' })
  const main = h('div', { class: 'main' })
  const slot = h('div', { class: 'slot' })
  const bar = h('div', { class: 'bar' })
  const scrim = h('div', { class: 'drawerScrim' })
  const classes = ['app', opts.narrow ? 'narrow' : '', opts.light ? 'light' : ''].filter(Boolean).join(' ')
  const app =
    opts.mode === 'fullscreen'
      ? h('div', { class: classes }, top, side, main, slot, bar, scrim)
      : h('div', { class: classes }, main)

  appShadow.append(sheet(STYLES), sheet(IMAGE_FIX))
  if (opts.mode !== 'fullscreen') appShadow.append(sheet(INLINE_CSS))
  appShadow.append(app)
  overlayShadow.append(sheet(STYLES))

  return { wrapper, app, main, top, side, slot, bar, overlay: overlayShadow }
}

/** Story args that toggle .app state classes — the product's app states, live. */
const CLASS_ARGS: ReadonlyArray<readonly [arg: string, cls: string]> = [
  ['drawerOpen', 'drawer-open'],
  ['sheetOpen', 'sheet-open'],
  ['lyricsOpen', 'lyrics-open'],
  ['hasStage', 'has-stage'],
]

function isFrameOptions(v: unknown): v is FrameOptions {
  if (typeof v !== 'object' || v === null) return false
  return 'mode' in v || 'narrow' in v || 'light' in v
}

function frameOptionsOf(parameters: Record<string, unknown>): FrameOptions {
  const raw = parameters['frame']
  return isFrameOptions(raw) ? raw : {}
}

export const frameDecorator: Decorator = (story, context) => {
  const f = createFrame(frameOptionsOf(context.parameters))
  current = f
  for (const [arg, cls] of CLASS_ARGS) {
    if (context.args?.[arg]) f.app.classList.add(cls)
  }
  const content = story()
  // A fullscreen story may render itself straight into f.main (the queue view
  // does); appending f.main to itself would throw, so that case passes through.
  if (content !== f.main) f.main.append(content)
  return f.wrapper
}
