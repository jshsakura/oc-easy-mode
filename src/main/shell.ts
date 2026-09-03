// The page-level surgery, and the promise that it can always be undone.
//
// **The invariant this whole file exists to keep: the extension owns exactly
// two nodes in the page and mutates nothing else.**
//
//   <style id="oc-easy-mode">   one stylesheet, hiding YouTube's own chrome
//   <oc-easy-mode>              one shadow host, holding all of our UI
//                               (plus its twin for menus, above the video)
//   <meta name="viewport">      only on a phone served the desktop page, which
//                               has none — see the note further down
//
// Nothing of YouTube's is moved, removed, reparented or rewritten — not one
// attribute, not one class, not one inline style. Where the player goes is a
// set of custom properties, and even those are written into a `:root` rule
// inside our own stylesheet rather than onto the page's root element, so that
// the sentence above stays literally true and a test can hold us to it. That is why leaving is not a restore: there is no saved state to
// put back, and no way for a half-finished teardown to leave the page broken.
// Removing those two nodes *is* the exit, and it cannot fail partway.
//
// YouTube's player is not moved either. It is placed by CSS alone: `visibility`
// is turned off on the app and back on for the player, and the player is put
// where our stage is with a fixed position. Both are properties on our own
// stylesheet, so both die with it.
//
// Three ways out, in case the first one is the thing that broke:
//
//   1. the button in the sidebar, and the toolbar switch
//   2. Escape twice within a second, from anywhere on the page
//   3. the watchdog, which lets go on its own if the UI never came up
//
// The mode is also off by default on every new page, and only turns itself on
// again because the previous page wrote a flag. Uninstalling, disabling, or
// simply not running is indistinguishable from plain YouTube.

const STYLE_ID = 'oc-easy-mode'
const VIEWPORT_ID = 'oc-easy-mode-viewport'
const HOST_TAG = 'oc-easy-mode'
const OVERLAY_TAG = 'oc-easy-mode-overlay'

/** Everything the shell hands back to the app, and takes away on exit. */
export interface Shell {
  /** Where the app draws. */
  root: ShadowRoot
  /** Where menus, modals and toasts draw, above the video. */
  overlay: ShadowRoot
  /** Puts YouTube's player over this element, or nowhere if null. */
  place(target: HTMLElement | null): void
  /**
   * Keeps the picture underneath the app while something of ours has to be on
   * top of it — the drawer, which slides out over the whole left edge.
   *
   * The player is drawn above the app on purpose (see the lift below), so
   * anything of ours that overlaps it is unreachable: with the drawer open in
   * 영상 mode, the video covered its first two rows. Menus and dialogs do not
   * need this, because they are drawn in the overlay host, which is above the
   * player already.
   */
  cover(on: boolean): void
  /** Removes both nodes. Safe to call twice. */
  teardown(): void
}

// Hides YouTube without hiding the player.
//
// `visibility` rather than `display`, for one reason: it is the only way to
// blank an ancestor and un-blank a descendant, and the player is a descendant
// of everything we want gone. `display: none` on `ytd-app` would take the
// player with it, and a `<video>` inside a `display: none` subtree is a video
// YouTube starts making decisions about.
//
// The page keeps scrolling underneath, so `html` gets `overflow: hidden` — the
// only rule here that touches anything but visibility and position.
// It needs no on/off guard: the stylesheet exists only while the mode does.
const HIDE_CSS = `
html { overflow: hidden !important; }
body > *:not(${HOST_TAG}):not(${OVERLAY_TAG}) { visibility: hidden !important; }
#movie_player {
  visibility: visible !important;
  position: fixed !important;
  left: var(--oc-x, 0px) !important;
  top: var(--oc-y, 0px) !important;
  width: var(--oc-w, 320px) !important;
  height: var(--oc-h, 180px) !important;
  z-index: var(--oc-z, 2147482100) !important;
  /* Taps go through it while something of ours is over it. Whatever the
     stacking works out to, the drawer has to be pressable. */
  pointer-events: var(--oc-pe, auto) !important;
  /* No radius on the video. Rounding the picture itself crops the picture —
     said twice, and rightly. Whatever frame it needs is the slot's business,
     and the slot is behind it. */
  overflow: hidden !important;
  transform: translate(var(--oc-dx, 0px), var(--oc-dy, 0px)) !important;
  transition: none !important;
}
/* The player's own chrome is fine, but its size-follows-the-page logic is not. */
#movie_player .html5-video-container,
#movie_player video {
  width: 100% !important; height: 100% !important; left: 0 !important; top: 0 !important;
}
#movie_player video { object-fit: contain !important; }

/* The sibling ad blocker's picture-in-picture button.
 *
 * It is parented to <html> rather than to <body>, and fixed at the highest
 * z-index there is, so nothing here reaches it: not the rule above that blanks
 * the page, not our own app, not the overlay. It therefore floats over Easy
 * Mode's player bar looking like one of our controls.
 *
 * It is a control for a picture, so it is shown exactly when there is one on
 * screen. --oc-pip is written by place(), which is the one place that knows.
 * The default is grid because that is the display the button sets on itself
 * inline, so putting it back puts back exactly what it had. */
#oc-abp-pip {
  display: var(--oc-pip, grid) !important;
  /* Pinned to the picture's bottom-right corner, because we are the ones who
     know where the picture is. Left alone it works out its own place from the
     video's box and lands in the middle of our stage — measured on the phone,
     switching between 음악 and 영상 parks it somewhere different each time.
     Its own right/bottom are cleared so these win.
     The dx/dy are the correction apply() feeds the player; without them this
     would sit wherever the player would have been rather than where it is. */
  left: calc(var(--oc-x, 0px) + var(--oc-dx, 0px) + var(--oc-w, 320px) - 46px) !important;
  top: calc(var(--oc-y, 0px) + var(--oc-dy, 0px) + var(--oc-h, 180px) - 46px) !important;
  right: auto !important;
  bottom: auto !important;
}

/* Our two nodes, ordered against the page rather than against each other. The
 * app sits below the player so the picture is never covered; the overlay sits
 * above it, because a menu that opens behind the video is a menu nobody can
 * read. Both hosts are inline under all: initial, and an inline box takes no
 * z-index — hence the display. */
${HOST_TAG} { display: block !important; position: relative !important; z-index: 2147482000 !important; }
${OVERLAY_TAG} { display: block !important; position: relative !important; z-index: 2147483100 !important; }
`

/**
 * Puts the two nodes in and returns the handle that takes them out.
 *
 * `onExit` is what the panic key and the watchdog call; the caller decides what
 * leaving means (it also has a queue to write down and a URL to settle).
 */
export function mount(onExit: (reason: 'panic' | 'watchdog') => void): Shell {
  const style = document.createElement('style')
  style.id = STYLE_ID
  // The empty `:root` rule comes first and is where the player's position is
  // written. Keeping it in the sheet, rather than on the element, is what lets
  // the page's own root element go untouched.
  style.textContent = `:root {}\n${HIDE_CSS}`
  ;(document.head ?? document.documentElement).appendChild(style)

  const vars =
    (style.sheet?.cssRules[0] as CSSStyleRule | undefined)?.style ??
    // A sheet that did not parse would be a browser we do not know; falling
    // back to the root element keeps the product working and only costs the
    // one guarantee, which the tests will notice.
    document.documentElement.style

  const host = document.createElement(HOST_TAG)
  const root = host.attachShadow({ mode: 'open' })
  const overlayHost = document.createElement(OVERLAY_TAG)
  const overlay = overlayHost.attachShadow({ mode: 'open' })

  // ── One more node, when the document declares no viewport ────────────────
  //
  // Orion on iPhone reports a desktop user agent, so YouTube hands it the
  // desktop page — which carries no viewport meta, because a desktop page has
  // no need of one. The phone then falls back to a ~980px layout viewport and
  // renders the whole thing at about a quarter scale. Our UI is laid out in
  // that fictional 980, so it comes out shrunken however carefully it is
  // styled.
  //
  // **No device check guards this.** The first attempt only added the meta when
  // `screen.width` looked like a phone's, and on the device that failed too:
  // a browser claiming to be a desktop can report a desktop screen to match.
  // The honest rule is simpler and needs to know nothing — a document with no
  // viewport declaration gets one. A desktop browser ignores the tag entirely,
  // so there is nothing to be wrong about.
  //
  // It is ours, it is tagged, and it goes out with everything else on exit, at
  // which point YouTube reflows back to what it had. A page that already
  // declares one is left alone; that page knows its own mind.
  const viewport = document.querySelector('meta[name="viewport"]')
    ? null
    : Object.assign(document.createElement('meta'), {
        id: VIEWPORT_ID,
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      })

  const attach = () => {
    // `document_start` can beat `<body>` into existence by a frame or two.
    if (!document.body) return requestAnimationFrame(attach)
    document.body.appendChild(host)
    document.body.appendChild(overlayHost)
    if (viewport) (document.head ?? document.documentElement).appendChild(viewport)
  }
  attach()

  // ── The panic key ────────────────────────────────────────────────────────
  //
  // Escape twice inside a second. Registered on the document in the capture
  // phase, so it fires before YouTube's own shortcut handling and before any
  // of our UI. One Escape is left alone because it closes menus and blurs
  // fields, and taking it would be its own kind of trap.
  let lastEscape = 0
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return
    const now = Date.now()
    if (now - lastEscape < 1000) {
      lastEscape = 0
      onExit('panic')
    } else {
      lastEscape = now
    }
  }
  document.addEventListener('keydown', onKey, true)

  // ── Showing the player's chrome on a touch screen ────────────────────────
  //
  // **Orion on iPhone is served the desktop page**, so the player in front of
  // the viewer is the desktop player: a click plays or pauses, and the
  // scrubber and its buttons appear on *mousemove*. A finger produces no
  // mousemove, so tapping the picture only ever played and paused it and the
  // controls could not be reached at all.
  //
  // One synthetic mousemove on the player is what it is waiting for. It shows
  // the chrome and starts YouTube's own hide timer, exactly as a mouse would.
  const wake = (ev: Event) => {
    const player = document.getElementById('movie_player')
    if (!player) return
    const target = ev.composedPath()[0] as Node | undefined
    if (!target || !player.contains(target)) return
    player.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }))
  }
  document.addEventListener('touchend', wake, { passive: true, capture: true })

  // ── The watchdog ─────────────────────────────────────────────────────────
  //
  // If the app never reports that it drew something, the page is blank and the
  // person is stuck looking at nothing. Rather than leave them there, let go.
  // `alive()` is called by the app on its first paint and on every render.
  let alive = false
  const watchdog = window.setTimeout(() => {
    if (!alive) onExit('watchdog')
  }, 8000)

  // ── Placing the player ───────────────────────────────────────────────────
  //
  // The rect is written as custom properties on the root element, so moving the
  // player is one style write and no DOM access at all.
  //
  // The correction: `position: fixed` is relative to the viewport *unless* an
  // ancestor has a transform, filter or containment, any of which makes that
  // ancestor the containing block instead. YouTube has been known to have one.
  // Rather than guess, the player is placed, measured, and the difference is
  // fed back as a translate. It settles in one frame and is re-checked whenever
  // the target moves.
  let target: HTMLElement | null = null
  let raf = 0

  // ── Making the player the thing you actually see ─────────────────────────
  //
  // Positioning the player over the stage is not enough on the desktop page.
  // **The app painted over the video whatever z-index either side was given**
  // — measured 2026-09-03: the player at 2147483000 still lost to the app at
  // 1, and the stage came out a black rectangle. That black rectangle is what
  // "영상 모드에서 재생이 안 된다" looks like from the outside; the video was
  // playing the whole time, underneath. On m.youtube.com the same code is
  // fine, which is why it went unnoticed.
  //
  // What does move it is giving every element between <body> and the player a
  // position and a z-index of its own. The chain is blanked by the rule above,
  // so lifting it shows nothing except the player itself.
  //
  // The selectors are :nth-child paths, so the page still gets no attribute,
  // no class and no inline style written onto it, and the rule lives in our
  // stylesheet, so it leaves when the sheet does.
  const LIFT = 2147482050
  const PLAYER_Z = '2147482100'
  let liftText = ''
  let liftIndex = -1

  const lift = (): void => {
    const player = document.getElementById('movie_player')
    const sheet = style.sheet
    if (!player || !sheet) return
    const steps: string[] = []
    for (let el = player.parentElement; el && el !== document.body; el = el.parentElement) {
      const parent = el.parentElement
      if (!parent) break
      const i = Array.prototype.indexOf.call(parent.children, el) + 1
      steps.unshift(`${el.tagName.toLowerCase()}:nth-child(${i})`)
    }
    if (steps.length === 0) return
    const selectors = steps.map((_, i) => `body > ${steps.slice(0, i + 1).join(' > ')}`)
    const text = `${selectors.join(', ')} { position: relative !important; z-index: ${LIFT} !important; }`
    // A page that navigated may have a different chain; anything else is the
    // same string every second, and rewriting that would be churn.
    if (text === liftText) return
    try {
      if (liftIndex >= 0) sheet.deleteRule(liftIndex)
      liftIndex = sheet.insertRule(text, sheet.cssRules.length)
      liftText = text
    } catch {
      // A selector we cannot express is a player we cannot lift; the UI still
      // works, it is the picture that suffers, and that is not worth throwing.
    }
  }

  /**
   * Puts the chain back down.
   *
   * Required whenever the picture has nowhere to be: parking the player relies
   * on the app being above it, and a lifted chain is exactly what stops that.
   * Without this, 소리만 듣기 leaves a small video in the top-left corner.
   */
  const unlift = (): void => {
    if (liftIndex < 0 || !style.sheet) return
    try {
      style.sheet.deleteRule(liftIndex)
    } catch {
      /* the sheet is going away anyway */
    }
    liftIndex = -1
    liftText = ''
  }

  const apply = () => {
    raf = 0
    if (!target) return
    if (!covered) lift()
    const want = target.getBoundingClientRect()
    if (want.width < 2 || want.height < 2) return
    vars.setProperty('--oc-x', `${Math.round(want.left)}px`)
    vars.setProperty('--oc-y', `${Math.round(want.top)}px`)
    vars.setProperty('--oc-w', `${Math.round(want.width)}px`)
    vars.setProperty('--oc-h', `${Math.round(want.height)}px`)
    const player = document.getElementById('movie_player')
    if (!player) return
    const got = player.getBoundingClientRect()
    const dx = Number.parseFloat(vars.getPropertyValue('--oc-dx') || '0')
    const dy = Number.parseFloat(vars.getPropertyValue('--oc-dy') || '0')
    const offX = want.left - got.left + dx
    const offY = want.top - got.top + dy
    if (Math.abs(offX - dx) > 0.5) vars.setProperty('--oc-dx', `${offX}px`)
    if (Math.abs(offY - dy) > 0.5) vars.setProperty('--oc-dy', `${offY}px`)
  }

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(apply)
  }

  const observer = new ResizeObserver(schedule)
  window.addEventListener('resize', schedule, true)
  // The player's own resize logic runs on a timer of its own; re-check with it.
  const settle = window.setInterval(schedule, 1000)

  const place = (next: HTMLElement | null) => {
    alive = true
    observer.disconnect()
    target = next
    // A button for a picture nobody can see is a button for nothing.
    vars.setProperty('--oc-pip', next ? 'grid' : 'none')
    if (!next) {
      // Nowhere to be: park it behind the app, still playing, never seen.
      unlift()
      vars.setProperty('--oc-z', '1')
      vars.setProperty('--oc-pe', 'none')
      vars.setProperty('--oc-x', '0px')
      vars.setProperty('--oc-y', '0px')
      vars.setProperty('--oc-w', '320px')
      vars.setProperty('--oc-h', '180px')
      return
    }
    if (!covered) vars.setProperty('--oc-z', PLAYER_Z)
    observer.observe(next)
    schedule()
  }

  // While this is true the chain stays down and the app is the top of the page.
  let covered = false
  const cover = (on: boolean): void => {
    if (covered === on) return
    covered = on
    if (on) {
      // Both, and on purpose. Taking the chain down is what lets the app be on
      // top; dropping --oc-z as well is a direct style write that does not
      // depend on the rule bookkeeping having stayed in step, and the drawer
      // has to be reachable even if it has not.
      unlift()
      vars.setProperty('--oc-z', '1')
      vars.setProperty('--oc-pe', 'none')
      // The picture is behind the app now, so its button has nothing to be
      // the button of — and being drawn above everything, it would be the one
      // thing of the player still on screen.
      vars.setProperty('--oc-pip', 'none')
    } else {
      vars.setProperty('--oc-z', PLAYER_Z)
      vars.setProperty('--oc-pe', 'auto')
      vars.setProperty('--oc-pip', 'grid')
      schedule()
    }
  }

  let gone = false
  const teardown = () => {
    if (gone) return
    gone = true
    clearTimeout(watchdog)
    clearInterval(settle)
    cancelAnimationFrame(raf)
    observer.disconnect()
    window.removeEventListener('resize', schedule, true)
    document.removeEventListener('keydown', onKey, true)
    document.removeEventListener('touchend', wake, true)
    // Removing the sheet takes the custom properties with it; there is nothing
    // to unset, which is the point.
    style.remove()
    host.remove()
    overlayHost.remove()
    viewport?.remove()
  }

  return { root, overlay, place, cover, teardown }
}

/** True when a previous run left its nodes behind, which should not happen. */
export function alreadyMounted(): boolean {
  return document.getElementById(STYLE_ID) !== null
}
