// The workbench's stand-in for shell.ts.
//
// The product mounts TWO shadow hosts into YouTube's page: one for the app and
// a twin for the floating layers (menus, modals, toasts). shell.ts builds
// those, mountApp() fills them, and everything about the layout follows from
// that arrangement. The frame reproduces the arrangement and then calls the
// real mountApp, which is why a menu opened from a story really does float
// above the content instead of being styled next to it.
//
// **It used to rebuild the shell instead.** The frame hand-assembled
// top/side/main/slot/bar and shellbits.ts hand-assembled the bar's contents,
// and by 2026-09-04 the copy had drifted: the heart that had gone into `.now`
// was not in it, so the workbench was showing a player bar the product does
// not have. Nothing here rebuilds any part of the shell now.

import type { Decorator } from '@storybook/html'
import type { Engine } from '../../src/main/engine.ts'
import type { Shell } from '../../src/main/shell.ts'
import { setStoredTheme } from '../../src/main/store.ts'
import { h } from '../../src/main/ui/dom.ts'
import { mountApp } from '../../src/main/ui/app.ts'
import type { Ctx, View } from '../../src/main/ui/ctx.ts'
import { STYLES } from '../../src/main/ui/styles.ts'
import { makeCfg, SAMPLE_PLAYLISTS, StubEngine } from './stub.ts'
import { stubNetwork } from './net.ts'

export interface FrameOptions {
  /**
   * `fullscreen`: the story sets parameters.layout='fullscreen' and the
   * Storybook viewport IS the device screen, so .app keeps its real fixed/dvh
   * layout and mount() can put the whole product in it. `inline` (default): a
   * small override sheet makes .app a component-scale panel for stories about
   * one part, and there is no shell to mount.
   */
  mode?: 'fullscreen' | 'inline'
  /**
   * Kept for inline stories, which have no app to ask.
   *
   * A mounted story ignores it: the product decides with narrowNow(), which
   * reads the viewport, and the Storybook viewports the narrow stories use
   * (390 and 834) are already below its 900 threshold. The workbench should
   * not be able to claim a width the product would not.
   */
  narrow?: boolean
  /** Light theme on BOTH hosts, the way app.ts's applyTheme does it. */
  light?: boolean
}

export interface MountOptions {
  /** The engine the app drives. Poses its player; see StubEngine.pose(). */
  engine: StubEngine
  /** Which screen to open on. */
  view?: View
  /** What the sidebar lists. */
  playlists?: typeof SAMPLE_PLAYLISTS
}

export interface Frame {
  /** Light-DOM holder for the two hosts; this is what the story returns to. */
  wrapper: HTMLElement
  /** Menus, modals and toasts land here, above the app as in the product. */
  overlay: ShadowRoot
  /** The .app element. In fullscreen mode it exists only after mount(). */
  readonly app: HTMLElement
  readonly main: HTMLElement
  readonly top: HTMLElement
  readonly side: HTMLElement
  readonly slot: HTMLElement
  readonly bar: HTMLElement
  /** Runs the product's own mountApp in this frame. Fullscreen mode only. */
  mount(opts: MountOptions): Ctx
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

/** Stands in for YouTube's player, so the corner and stage layouts show something. */
const VIDEO_CSS = 'position:absolute; inset:0; background:linear-gradient(135deg,#20304a,#0d1018)'

let current: Frame | null = null

/**
 * The mount the workbench is holding, so it can be taken down.
 *
 * mountApp() listens on `window` and `document` and subscribes to the engine,
 * and hands back a destroy() for exactly that reason. In the page it is called
 * when the mode is switched off; here it has to be called when the story
 * changes, or every story leaves a live app behind listening for keys.
 */
let mounted: { destroy(): void } | null = null

/** The frame the decorator built around the story that is rendering now. */
export function frame(): Frame {
  if (!current) throw new Error('frame(): no frame yet. Is the frame decorator installed?')
  return current
}

function sheet(text: string): HTMLStyleElement {
  const el = document.createElement('style')
  el.textContent = text
  return el
}

export function createFrame(opts: FrameOptions): Frame {
  mounted?.destroy()
  mounted = null

  // showMenu() and toast()'s palette follow youtubeIsDark(), which reads the
  // stored theme first. Pinning it makes floating layers always agree with
  // the story's frame instead of following this browser's OS preference. It is
  // also what mountApp's applyTheme() reads, so the app comes up on the right
  // side without the frame having to reach in afterwards.
  setStoredTheme(opts.light ? 'light' : 'dark')
  stubNetwork()

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
  const fullscreen = opts.mode === 'fullscreen'

  // A mounted story gets nothing here: mountApp appends STYLES and the whole
  // .app itself, and a second copy of either would be a second shell.
  if (!fullscreen) {
    const main = h('div', { class: 'main' })
    const classes = ['app', opts.narrow ? 'narrow' : '', opts.light ? 'light' : ''].filter(Boolean).join(' ')
    appShadow.append(sheet(STYLES), sheet(INLINE_CSS), h('div', { class: classes }, main))
  }
  overlayShadow.append(sheet(STYLES))
  // After mountApp's own styles, so nothing can put a network image back.
  appShadow.append(sheet(IMAGE_FIX))

  const pick = (sel: string, what: string): HTMLElement => {
    const el = appShadow.querySelector<HTMLElement>(sel)
    if (!el) throw new Error(`frame(): no ${what} yet. A fullscreen story must call frame().mount() first.`)
    return el
  }

  const video = h('div', { style: VIDEO_CSS })

  const f: Frame = {
    wrapper,
    overlay: overlayShadow,
    get app() { return pick('.app', 'app') },
    get main() { return pick('.main', 'main') },
    get top() { return pick('.top', 'top strip') },
    get side() { return pick('.side', 'sidebar') },
    get slot() { return pick('.slot', 'slot') },
    get bar() { return pick('.bar', 'player bar') },

    mount(o: MountOptions): Ctx {
      if (!fullscreen) throw new Error("frame().mount() needs frame: { mode: 'fullscreen' }")
      const shell: Shell = {
        root: appShadow,
        overlay: overlayShadow,
        // The product moves YouTube's player over the slot. Here a coloured
        // block stands in, so the corner and stage layouts are something a
        // person can look at rather than an empty hole.
        place: (target) => { if (target) target.append(video); else video.remove() },
        // Both of these are about a page that is not here: cover() lowers
        // YouTube's furniture under the app, and the splash hides the page
        // while the app boots.
        cover: () => {},
        hideSplash: () => {},
        teardown: () => { appHost.remove(); overlayHost.remove() },
      }
      const engine: Engine = o.engine
      // Open *on* the story's screen rather than switching to it after.
      //
      // mountApp restores the last screen from the engine's state and starts
      // rendering it, and a story that then navigated would be racing that
      // first render: on 2026-09-04 the restored 둘러보기 lost its fetch, and
      // the error it painted landed on top of the queue the story had already
      // drawn. That race is a real one in the product too and is reported
      // separately; the workbench should not be sitting on it either way.
      //
      // The name is the view's kind, which is what app.ts stores for every
      // view that is only its kind. A view carrying more than that (a search
      // with a query, a named playlist) does not survive the round trip, so
      // it is navigated to instead. No story needs one yet.
      const simple = o.view && o.view.kind !== 'playlist' && o.view.kind !== 'search'
      if (o.view && simple) engine.state.view = o.view.kind
      const app = mountApp({
        shell,
        engine,
        exit: () => {},
        ctx: {
          engine,
          cfg: makeCfg(),
          playlists: o.playlists ?? [],
          async refreshPlaylists() {},
          async addToPlaylist() {},
        },
      })
      mounted = app
      if (o.view && !simple) app.ctx.go(o.view)
      return app.ctx
    },
  }
  current = f
  return f
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
  const content = story()
  // After the story, not before: in a mounted frame there is no .app until
  // mount() has run, and the story is what runs it.
  for (const [arg, cls] of CLASS_ARGS) {
    if (context.args?.[arg]) f.app.classList.add(cls)
  }
  // A fullscreen story draws through the app and hands back f.main to say so;
  // appending f.main to itself would throw, so that case passes through.
  if (content !== f.main) f.main.append(content)
  return f.wrapper
}
