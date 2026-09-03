// How wide the UI actually is, and what kind of screen it is on.
//
// **Two different questions, and mixing them was the bug.**
//
// The in-page UI needs to know whether the sidebar *fits*, and only the
// viewport can answer that. `innerWidth` is the real width of the page, and it
// is right whatever the browser claims to be. That matters here more than
// anywhere: Orion on iPhone reports a desktop Mac Chrome UA, is served the
// desktop site, and can report desktop screen metrics with it — so a check
// built on the user agent, the hostname, or `screen` calls a phone a PC and
// leaves the sidebar as a 64px rail welded to the edge, which is exactly what
// it did.
//
// The popup cannot use the viewport, for the opposite reason: it has no window
// to fill. A desktop popup is sized *from* its document, so asking its width
// what width to be is circular, and on a phone the sheet is sized by the
// system. There the screen is the only honest signal, and its short side is
// the same in either orientation.

/** Below this, the sidebar does not fit beside the content. */
export const NARROW_MAX = 900

/** Above every phone (an iPhone Pro Max is 440) and below every tablet (744). */
export const PHONE_SHORT_SIDE = 500

export type ScreenKind = 'phone' | 'desktop'

/** For the in-page UI: is there room for a sidebar? */
export function isNarrow(width: number): boolean {
  return width < NARROW_MAX
}

export function narrowNow(): boolean {
  return isNarrow(window.innerWidth)
}

/** For the popup, which has no viewport worth asking. Pure, so tests can name devices. */
export function screenKind(width: number, height: number): ScreenKind {
  return Math.min(width, height) <= PHONE_SHORT_SIDE ? 'phone' : 'desktop'
}

/** Stamps the answer on <html> so a stylesheet can branch on it. */
export function applyScreenKind(): ScreenKind {
  const kind = screenKind(window.screen.width, window.screen.height)
  document.documentElement.classList.add(`on-${kind}`)
  return kind
}
