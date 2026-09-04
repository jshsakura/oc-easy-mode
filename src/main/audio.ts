// The equalizer and the volume booster: one Web Audio graph on YouTube's
// media element, built only when asked for.
//
// **Opt-in, and self-checking, because the connection is one-way.** Handing a
// media element to `createMediaElementSource` routes its sound through the
// graph for the rest of the page's life; there is no API to give it back. On
// Chromium that is fine (measured 2026-09-04: the context keeps running in a
// hidden tab, and the sound is never CORS-silenced because the MSE source is
// same-origin). On an iPhone it may not be: WebKit has an open report of MSE
// through a source node reading as digital silence. So nothing here runs
// until the reader switches it on, and the moment it is on the graph listens
// to itself: an element that is plainly playing, unmuted and moving, while the
// analyser reads exact zeros for a second, is a browser that cannot do this.
// The switch goes off, the refusal is remembered, and the page has to be
// reloaded to get its sound back; the UI says so.
//
// **One graph per element, for the whole page.** A second source on the same
// element throws, and leaving the mode and coming back builds a new engine
// on the same page, so the nodes are kept at module level and found again
// by the element they belong to.

/** The five bands, in Hz. The classic spread: two for the low end, one for the middle, two for the top. */
export const BANDS = [60, 230, 910, 3600, 14000] as const
/** How far a band may be pushed either way, in dB. */
export const BAND_RANGE = 12
/** The booster's ceiling, as a multiplier. 3× is +9.5 dB, the point past which the limiter is doing all the work. */
export const BOOST_MAX = 3

export interface EqSettings {
  on: boolean
  /** One gain per band, in dB, in BANDS order. */
  bands: number[]
  /** 1 is unity; above it the booster is on. */
  boost: number
}

const KEY = 'oc-easy-mode:eq'
const REFUSED_KEY = 'oc-easy-mode:eq-refused'

export const FLAT: EqSettings = { on: false, bands: BANDS.map(() => 0), boost: 1 }

function load(): EqSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...FLAT, bands: [...FLAT.bands] }
    const got = JSON.parse(raw) as Partial<EqSettings>
    const bands = Array.isArray(got.bands) && got.bands.length === BANDS.length ? got.bands.map(clampBand) : [...FLAT.bands]
    return { on: got.on === true, bands, boost: clampBoost(Number(got.boost)) }
  } catch {
    return { ...FLAT, bands: [...FLAT.bands] }
  }
}

function clampBand(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(-BAND_RANGE, Math.min(BAND_RANGE, Math.round(n)))
}

function clampBoost(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(BOOST_MAX, Math.round(n * 10) / 10))
}

/** Whether this browser has already been found unable to do this. */
export function eqRefused(): boolean {
  try {
    return localStorage.getItem(REFUSED_KEY) === '1'
  } catch {
    return false
  }
}

function setRefused(yes: boolean): void {
  try {
    if (yes) localStorage.setItem(REFUSED_KEY, '1')
    else localStorage.removeItem(REFUSED_KEY)
  } catch {
    /* the verdict lasts for the page, at least */
  }
}

interface Graph {
  ctx: AudioContext
  source: MediaElementAudioSourceNode
  filters: BiquadFilterNode[]
  gain: GainNode
  limiter: DynamicsCompressorNode
  analyser: AnalyserNode
}

/** One context for the page; a second one would only compete for the device. */
let sharedCtx: AudioContext | null = null
const graphs = new WeakMap<HTMLMediaElement, Graph>()

function contextFor(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext()
    // iOS puts Web Audio in the `ambient` session, which the hardware mute
    // switch silences even while the video itself would play. Asked for as
    // playback where the API exists; it is absent in the builds tested.
    try {
      const session = (navigator as { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'playback'
    } catch {
      /* not offered here */
    }
  }
  return sharedCtx
}

/** Builds the nodes for an element, or finds the ones it already has. Throws if the element is spoken for by someone else's graph. */
function graphFor(el: HTMLMediaElement): Graph {
  const had = graphs.get(el)
  if (had) return had
  const ctx = contextFor()
  const source = ctx.createMediaElementSource(el)
  const filters = BANDS.map((hz) => {
    const f = ctx.createBiquadFilter()
    f.type = 'peaking'
    f.frequency.value = hz
    f.Q.value = 1
    f.gain.value = 0
    return f
  })
  const gain = ctx.createGain()
  // A booster with nothing after it clips at the destination; the limiter
  // catches what the gain pushes past full scale. At unity it is a straight
  // wire, so it stays in the chain whether or not the boost is on.
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -3
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.003
  limiter.release.value = 0.1
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  let head: AudioNode = source
  for (const f of filters) {
    head.connect(f)
    head = f
  }
  head.connect(gain)
  gain.connect(limiter)
  limiter.connect(analyser)
  analyser.connect(ctx.destination)
  const graph = { ctx, source, filters, gain, limiter, analyser }
  graphs.set(el, graph)
  return graph
}

/** How often the self-check listens, and how many playing-but-silent reads condemn the browser. */
const CHECK_EVERY_MS = 120
const CHECK_SILENT_READS = 8

export type AudioEvent = 'changed' | 'refused'
type Listener = (ev: AudioEvent) => void

export class AudioChain {
  settings: EqSettings = load()
  private element: HTMLMediaElement | null = null
  private graph: Graph | null = null
  private listeners = new Set<Listener>()
  private checkTimer: ReturnType<typeof setInterval> | undefined
  private onVisible = (): void => {
    if (document.visibilityState === 'visible') void this.graph?.ctx.resume().catch(() => {})
  }

  constructor() {
    document.addEventListener('visibilitychange', this.onVisible)
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(ev: AudioEvent): void {
    for (const fn of this.listeners) fn(ev)
  }

  /** Whether the reader has switched it on, and it is allowed to be. */
  get on(): boolean {
    return this.settings.on && !eqRefused()
  }

  /** Whether the graph is built and carrying the sound right now. */
  get live(): boolean {
    return this.graph !== null && this.on
  }

  /**
   * Told which element is the player's, twice a second by the engine. Wires
   * a new element the first time it is seen while the equalizer is on;
   * does nothing at all while it is off, which is the whole promise.
   */
  follow(el: HTMLMediaElement | null): void {
    if (!this.on || !el || el === this.element) return
    this.wire(el)
  }

  private wire(el: HTMLMediaElement): void {
    try {
      this.graph = graphFor(el)
    } catch {
      // Already connected to a graph that is not ours: another extension
      // got there first. Nothing can be done from here, and it is not this
      // browser's fault, so it is not remembered as a refusal.
      this.graph = null
      this.element = el
      return
    }
    this.element = el
    void this.graph.ctx.resume().catch(() => {})
    this.apply()
  }

  private apply(): void {
    const g = this.graph
    if (!g) return
    const on = this.on
    const t = g.ctx.currentTime
    g.filters.forEach((f, i) => f.gain.setTargetAtTime(on ? this.settings.bands[i] ?? 0 : 0, t, 0.02))
    g.gain.gain.setTargetAtTime(on ? this.settings.boost : 1, t, 0.02)
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.settings))
    } catch {
      /* the settings last for the page, at least */
    }
    this.emit('changed')
  }

  /**
   * Switches on. Called from a press, which is what lets a context start;
   * wires the element at once if there is one and begins listening to
   * itself. Returns false when this browser has already refused.
   */
  enable(el: HTMLMediaElement | null): boolean {
    if (eqRefused()) return false
    this.settings.on = true
    this.save()
    if (el) this.wire(el)
    else this.apply()
    this.startCheck()
    return true
  }

  /** Switches off. The graph stays, flat and at unity, because it cannot leave. */
  disable(): void {
    this.settings.on = false
    this.stopCheck()
    this.save()
    this.apply()
  }

  setBand(i: number, db: number): void {
    this.settings.bands[i] = clampBand(db)
    this.save()
    this.apply()
  }

  setBoost(x: number): void {
    this.settings.boost = clampBoost(x)
    this.save()
    this.apply()
  }

  reset(): void {
    this.settings.bands = [...FLAT.bands]
    this.settings.boost = 1
    this.save()
    this.apply()
  }

  /** Forgets a refusal, for a browser that may have grown up since. */
  retry(el: HTMLMediaElement | null): boolean {
    setRefused(false)
    return this.enable(el)
  }

  /** On the way out of the mode: the page keeps its sound as YouTube meant it. */
  release(): void {
    this.stopCheck()
    document.removeEventListener('visibilitychange', this.onVisible)
    const g = this.graph
    if (!g) return
    const t = g.ctx.currentTime
    g.filters.forEach((f) => f.gain.setTargetAtTime(0, t, 0.02))
    g.gain.gain.setTargetAtTime(1, t, 0.02)
  }

  // ── Listening to itself ───────────────────────────────────────────────────

  private startCheck(): void {
    this.stopCheck()
    let silent = 0
    let lastTime = -1
    const buf = new Float32Array(256)
    this.checkTimer = setInterval(() => {
      const g = this.graph
      const el = this.element
      if (!g || !el || !this.on) return
      // Only a read taken while sound should be coming out counts: playing,
      // moving, audible, with the context awake. Anything else is a pause,
      // not a verdict.
      const moving = el.currentTime !== lastTime
      lastTime = el.currentTime
      if (el.paused || el.ended || el.muted || el.volume === 0 || !moving || g.ctx.state !== 'running') return
      g.analyser.getFloatTimeDomainData(buf)
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] !== 0) {
          // A single non-zero sample is the whole proof.
          this.stopCheck()
          return
        }
      }
      silent += 1
      if (silent >= CHECK_SILENT_READS) this.refuse()
    }, CHECK_EVERY_MS)
  }

  private stopCheck(): void {
    if (this.checkTimer !== undefined) clearInterval(this.checkTimer)
    this.checkTimer = undefined
  }

  private refuse(): void {
    this.stopCheck()
    setRefused(true)
    this.settings.on = false
    this.save()
    this.apply()
    this.emit('refused')
  }
}
