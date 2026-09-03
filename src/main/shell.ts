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
  border-radius: var(--oc-radius, 10px) !important;
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

  // ── One more node, and only on a phone that was served the desktop site ──
  //
  // Orion on iPhone reports a desktop user agent, so YouTube hands it the
  // desktop page — which carries no viewport meta, because a desktop page has
  // no need of one. The phone then falls back to a ~980px layout viewport and
  // renders the whole thing at about a quarter scale. Our UI is laid out in
  // that fictional 980, so it comes out shrunken however carefully it is
  // styled.
  //
  // The only cure is to give the document the viewport it is missing. It is
  // ours, it is tagged, and it goes out with everything else on exit — at
  // which point YouTube reflows back to what it had. A page that already
  // declares one is left alone; that page knows its own mind.
  const viewport =
    window.screen.width <= 500 && !document.querySelector('meta[name="viewport"]')
      ? Object.assign(document.createElement('meta'), {
          id: VIEWPORT_ID,
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        })
      : null

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

  const apply = () => {
    raf = 0
    if (!target) return
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
    if (!next) {
      // Nowhere to be: park it behind the app, still playing, never seen.
      vars.setProperty('--oc-z', '1')
      vars.setProperty('--oc-x', '0px')
      vars.setProperty('--oc-y', '0px')
      vars.setProperty('--oc-w', '320px')
      vars.setProperty('--oc-h', '180px')
      return
    }
    vars.setProperty('--oc-z', '2147482100')
    observer.observe(next)
    schedule()
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
    // Removing the sheet takes the custom properties with it; there is nothing
    // to unset, which is the point.
    style.remove()
    host.remove()
    overlayHost.remove()
    viewport?.remove()
  }

  return { root, overlay, place, teardown }
}

/** True when a previous run left its nodes behind, which should not happen. */
export function alreadyMounted(): boolean {
  return document.getElementById(STYLE_ID) !== null
}
