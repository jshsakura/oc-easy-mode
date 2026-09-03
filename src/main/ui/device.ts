// Phone or desktop.
//
// **YouTube already decided, and says so in the hostname.** `m.youtube.com` is
// the mobile site; it is served to phones and to nothing else that matters. So
// the first question is free.
//
// The screen answers the rest — a desktop browser pointed at the mobile site,
// or a phone that was served the desktop one. **Not the user agent:** Orion on
// iPhone reports a desktop Mac Chrome UA, measured on the device by the sibling
// extension, so the one case UA sniffing must get right is the one it gets
// wrong. **Not the viewport:** a window dragged narrow is not a phone, and a
// phone held sideways is 844 wide while still being a phone. The screen's short
// side is the same in either orientation.

export type ScreenKind = 'phone' | 'desktop'

/** Above every phone (an iPhone Pro Max is 440) and below every tablet (744). */
export const PHONE_SHORT_SIDE = 500

/** Pure, so a test can name real devices instead of driving a browser. */
export function screenKind(host: string, width: number, height: number): ScreenKind {
  if (host === 'm.youtube.com') return 'phone'
  return Math.min(width, height) <= PHONE_SHORT_SIDE ? 'phone' : 'desktop'
}

export function thisScreen(): ScreenKind {
  return screenKind(location.hostname, window.screen.width, window.screen.height)
}
