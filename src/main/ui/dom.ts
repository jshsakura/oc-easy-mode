// A hand-rolled element builder. Small enough to read in one sitting, which is
// the whole reason it is not a framework.

type Child = Node | string | number | null | undefined | false | Child[]

type Props = Record<string, unknown> & {
  class?: string
  style?: string
  onclick?: (ev: MouseEvent) => void
  oninput?: (ev: Event) => void
  onkeydown?: (ev: KeyboardEvent) => void
  onchange?: (ev: Event) => void
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue
      if (k === 'class') el.className = String(v)
      else if (k === 'style') el.setAttribute('style', String(v))
      else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2), v as EventListener)
      } else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v
      else el.setAttribute(k, String(v))
    }
  }
  append(el, children)
  return el
}

function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue
    if (Array.isArray(c)) append(el, c)
    else if (c instanceof Node) el.appendChild(c)
    else el.appendChild(document.createTextNode(String(c)))
  }
}

/** Empties an element and fills it with new children. */
export function replace(el: HTMLElement, ...children: Child[]): void {
  el.textContent = ''
  append(el, children)
}

/**
 * The product's mark, as SVG.
 *
 * The same three layers scripts/make-icons.py draws for the shipped icons —
 * purple tile, dark circle, peach play triangle — and the same sampled
 * colours, so the thing in the sidebar is the thing in the toolbar. Inline
 * rather than the packaged image: this file runs in the MAIN world, where
 * there is no chrome.runtime to ask for an extension URL.
 */
export function mark(size = 20): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('aria-hidden', 'true')
  // **Built node by node, never with innerHTML.** YouTube enforces Trusted
  // Types, so an innerHTML assignment throws — and this runs during mount, so
  // the throw took the entire app with it: no host, no shadow root, a blank
  // page and nothing in the console but "This document requires 'TrustedHTML'
  // assignment". Nothing in this file may assign markup as a string.
  const ns = 'http://www.w3.org/2000/svg'
  const tile = document.createElementNS(ns, 'rect')
  tile.setAttribute('width', '24')
  tile.setAttribute('height', '24')
  tile.setAttribute('rx', '5.3')
  tile.setAttribute('fill', '#7e4dc5')
  const disc = document.createElementNS(ns, 'circle')
  disc.setAttribute('cx', '12')
  disc.setAttribute('cy', '12')
  disc.setAttribute('r', '7.9')
  disc.setAttribute('fill', '#181825')
  const glyph = document.createElementNS(ns, 'path')
  glyph.setAttribute('d', 'M9.9 7.9 16.4 12l-6.5 4.1z')
  glyph.setAttribute('fill', '#fab387')
  svg.append(tile, disc, glyph)
  return svg
}

/** Inline SVG icons: 24-unit grid, current color. */
export function icon(name: keyof typeof PATHS, size = 20): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', PATHS[name])
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

const PATHS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zm8 0h4v14h-4z',
  next: 'M6 6l8.5 6L6 18zM16 6h2v12h-2z',
  prev: 'M18 6l-8.5 6L18 18zM6 6h2v12H6z',
  shuffle: 'M10.6 9.2 7.4 6H3V4h5.2l3.8 3.8-1.4 1.4zM17 4h4v4l-1.5-1.5-3.1 3.1-1.4-1.4 3.1-3.1zm4 12v4h-4l1.6-1.6-3.1-3.1 1.4-1.4 3.1 3.1zM3 18h4.4L18 7.4 19.4 8.8 8.2 20H3z',
  repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z',
  repeatOne: 'M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2zm-4-2V9h-1l-2 1v1h1.5v4z',
  search: 'M10 3a7 7 0 1 0 4.2 12.6l4.6 4.6 1.4-1.4-4.6-4.6A7 7 0 0 0 10 3zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  queue: 'M3 6h13v2H3zm0 4h13v2H3zm0 4h9v2H3zm15-2v6l5-3z',
  library: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5z',
  radio: 'M3.2 6.2 18.6 1l.7 1.9L8 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8c0-.8.5-1.5 1.2-1.8zM7 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7-6h6v2h-6zm0-4h6v2h-6z',
  more: 'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  menu: 'M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z',
  down: 'M12 15.4 5.6 9 7 7.6l5 5 5-5L18.4 9z',
  close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z',
  back: 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z',
  leave: 'M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5v-2H5V5h5zm7.6 4L16.2 8.4 18.8 11H9v2h9.8l-2.6 2.6 1.4 1.4 5-5z',
  volume: 'M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z',
  mute: 'M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.5 2.5V12zM19 12a7 7 0 0 1-1.5 4.3l1.5 1.5A9 9 0 0 0 21 12a9 9 0 0 0-7-8.8v2.1A7 7 0 0 1 19 12zM4.3 3 3 4.3 6.7 8H3v6h4l5 5v-6.7l4.3 4.3a7 7 0 0 1-2.3 1.2v2.1a9 9 0 0 0 3.7-1.8l2 2 1.3-1.3zM12 4 9.9 6.1 12 8.2z',
  video: 'M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11z',
  videoOff: 'M21 6.5l-4 4V7a1 1 0 0 0-1-1H9.8l11.2 11.2zM3.3 2 2 3.3 3.7 5H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12l4.7 4.7 1.3-1.3z',
  expand: 'M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z',
  trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
  external: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2zM14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3z',
  note: 'M12 3v10.6A4 4 0 1 0 14 17V7h4V3z',
  sun: 'M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM11 1h2v3h-2zm0 19h2v3h-2zM3.5 4.9 4.9 3.5l2.1 2.1-1.4 1.4zm13.5 13.5 1.4-1.4 2.1 2.1-1.4 1.4zM1 11h3v2H1zm19 0h3v2h-3zM5.6 18.4 3.5 20.5l1.4 1.4 2.1-2.1zM18.4 5.6l2.1-2.1 1.4 1.4-2.1 2.1z',
  moon: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z',
  auto: 'M12 2a10 10 0 1 0 0 20zm0 2v16a8 8 0 0 0 0-16z',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3a15 15 0 0 0-1.2-5.3A8 8 0 0 1 18.9 11zM12 4.2c.7 1 1.5 2.9 1.8 6.8h-3.6c.3-3.9 1.1-5.8 1.8-6.8zM5.1 11a8 8 0 0 1 4.2-5.3A15 15 0 0 0 8.1 11zm0 2h3a15 15 0 0 0 1.2 5.3A8 8 0 0 1 5.1 13zM12 19.8c-.7-1-1.5-2.9-1.8-6.8h3.6c-.3 3.9-1.1 5.8-1.8 6.8zm2.7-1.5a15 15 0 0 0 1.2-5.3h3a8 8 0 0 1-4.2 5.3z',
  home: 'M12 3 2 12h3v8h6v-6h2v6h6v-8h3z',
  subs: 'M6 2h12v2H6zM4 6h16v2H4zm0 4h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zm6 2.5v7l6-3.5z',
  history: 'M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.1 5l-1.5 1.4A9 9 0 1 0 13 3zm-1 5v5l4.3 2.5.7-1.2-3.5-2.1V8z',
} as const

export type IconName = keyof typeof PATHS
