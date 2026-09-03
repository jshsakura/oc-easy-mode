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

type IconItem = string | { d: string; fill?: boolean; noStroke?: boolean }

/** Inline SVG icons: 24-unit grid, refined 1.75px client line strokes. */
export function icon(name: keyof typeof PATHS, size = 20): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.75')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')

  const def = PATHS[name]
  const list = (Array.isArray(def) ? def : [def]) as readonly IconItem[]
  for (const item of list) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    if (typeof item === 'string') {
      path.setAttribute('d', item)
    } else {
      path.setAttribute('d', item.d)
      if (item.fill) path.setAttribute('fill', 'currentColor')
      if (item.noStroke) path.setAttribute('stroke', 'none')
    }
    svg.appendChild(path)
  }
  return svg
}

const PATHS = {
  play: [{ d: 'M6 4.5a1 1 0 0 1 1.5-.86l13 7.5a1 1 0 0 1 0 1.72l-13 7.5A1 1 0 0 1 6 19.5z', fill: true, noStroke: true }],
  pause: [{ d: 'M6 5h3.5v14H6z', fill: true, noStroke: true }, { d: 'M14.5 5h3.5v14h-3.5z', fill: true, noStroke: true }],
  next: ['M5 4.5l10 7.5-10 7.5V4.5z', 'M19 5v14'],
  prev: ['M19 4.5l-10 7.5 10 7.5V4.5z', 'M5 5v14'],
  shuffle: ['M16 3h5v5', 'M4 20l17-17', 'M21 16v5h-5', 'M15 15l6 6', 'M4 4l5 5'],
  repeat: ['M17 2l4 4-4 4', 'M3 11v-1a4 4 0 0 1 4-4h14', 'M7 22l-4-4 4-4', 'M21 13v1a4 4 0 0 1-4 4H3'],
  repeatOne: ['M17 2l4 4-4 4', 'M3 11v-1a4 4 0 0 1 4-4h14', 'M7 22l-4-4 4-4', 'M21 13v1a4 4 0 0 1-4 4H3', 'M11 10h1v4'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
  queue: ['M4 6h16', 'M4 11h10', 'M4 16h7', { d: 'M17 14l5 3-5 3v-6z', fill: true, noStroke: true }],
  library: ['M4 6h16', 'M4 11h11', 'M4 16h8', 'M19 13v5a2 2 0 1 1-2-2h2'],
  radio: ['M12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M16.24 7.76a6 6 0 0 1 0 8.49', 'M7.76 16.24a6 6 0 0 1 0-8.49', 'M19.07 4.93a10 10 0 0 1 0 14.14', 'M4.93 19.07a10 10 0 0 1 0-14.14'],
  more: [{ d: 'M12 12m-1.25 0a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 1 0-2.5 0', fill: true, noStroke: true }, { d: 'M12 5m-1.25 0a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 1 0-2.5 0', fill: true, noStroke: true }, { d: 'M12 19m-1.25 0a1.25 1.25 0 1 0 2.5 0 1.25 1.25 0 1 0-2.5 0', fill: true, noStroke: true }],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  down: 'M6 9l6 6 6-6',
  close: ['M18 6L6 18', 'M6 6l12 12'],
  back: ['M19 12H5', 'M12 19l-7-7 7-7'],
  leave: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  volume: ['M11 5L6 9H2v6h4l5 4V5z', 'M15.54 8.46a5 5 0 0 1 0 7.07', 'M19.07 4.93a10 10 0 0 1 0 14.14'],
  mute: ['M11 5L6 9H2v6h4l5 4V5z', 'M23 9l-6 6', 'M17 9l6 6'],
  video: ['M15 10l5-3v10l-5-3v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2z'],
  videoOff: ['M1 1l22 22', 'M15 10.5l5-3v10l-2.5-1.5', 'M10 6h3a2 2 0 0 1 2 2v3', 'M2 8a2 2 0 0 1 2-2h1', 'M2 16a2 2 0 0 0 2 2h10a2 2 0 0 0 1.5-.7'],
  expand: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  plus: ['M12 5v14', 'M5 12h14'],
  trash: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  check: 'M20 6L9 17l-5-5',
  external: ['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'M15 3h6v6', 'M10 14L21 3'],
  note: ['M9 18V5l12-2v13', 'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 'M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2v2', 'M12 20v2', 'M4.93 4.93l1.41 1.41', 'M17.66 17.66l1.41 1.41', 'M2 12h2', 'M20 12h2', 'M6.34 17.66l-1.41 1.41', 'M19.07 4.93l-1.41 1.41'],
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  auto: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 2v20'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  subs: ['M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z', 'M6 2h12', { d: 'M10 11l5 3-5 3v-6z', fill: true, noStroke: true }],
  history: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
} as const

export type IconName = keyof typeof PATHS
