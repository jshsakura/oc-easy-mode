// Everything a story needs to drive the real UI code: an Engine with a player
// the story poses, believable tracks, a ytcfg, and a Ctx whose overlay is the
// frame's real overlay root. Stories hand these to the actual row(), render()
// and overlay functions. Nothing here re-implements a view, and since
// 2026-09-04 nothing here re-implements the transport either.

import { t, tn } from '../../src/shared/i18n.ts'
import { Engine } from '../../src/main/engine.ts'
import type { Playlist, Track } from '../../src/main/parse.ts'
import { State, type YtPlayer } from '../../src/main/player.ts'
import type { Persisted } from '../../src/main/store.ts'
import type { Ctx, View } from '../../src/main/ui/ctx.ts'
import { pick, toast } from '../../src/main/ui/overlay.ts'
import type { YtCfg } from '../../src/main/ytcfg.ts'
import { frame } from './frame.ts'

/** What a story can say is true of the player. Everything is optional and sticky. */
export interface Pose {
  /** Seconds elapsed. Also restarts the clock from there. */
  at?: number
  /**
   * Track length in seconds. Zero means "not known yet", which is also the
   * default, and a length that is not known can never be reached: a posed
   * track only ends on its own once a story has said how long it is.
   */
  duration?: number
  /** Whether sound is coming out. This is the flag `sounding()` reads. */
  playing?: boolean
  /** The player is fetching. Shows the transport's waiting state. */
  buffering?: boolean
  /**
   * A load that has been asked for and has not arrived.
   *
   * The player refuses to name the track while this is set, which is precisely
   * what leaves the product's own `loading` in place. It is the window a pause
   * used to fall into and do nothing, so a story about the transport during a
   * load has to be able to stand in it.
   */
  loading?: boolean
  /** The element reached the end. The queue advances on the next tick. */
  ended?: boolean
  /**
   * A wait that has already outlasted the transport's patience.
   *
   * The product measures this itself: it remembers when a wait began and calls
   * it a stall six seconds later. A story cannot sit for six seconds, and the
   * clock it measures against is the engine's own private field, so this
   * back-dates the start rather than working the rule out a second time. The
   * result is checked on the way out, so if that field is ever renamed the
   * story fails loudly instead of quietly showing the wrong glyph.
   */
  stalled?: boolean
}

/**
 * How far back a posed stall is dated.
 *
 * Only has to be longer than the product's own threshold, which is why no
 * exact number is copied from it: the assertion in pose() is what keeps the
 * two in step, not this constant.
 */
const STALL_BACKDATE_MS = 30_000

/**
 * The player the workbench poses, and the video underneath it.
 *
 * Both are real nodes in the document because the product goes looking for
 * them as nodes: it finds the video with `document.querySelector('video')` and
 * it asks the player for its `classList` when it checks for an advert. An
 * object literal would send the shipped code down a different path here than
 * it takes in the page, which is the whole failing this replaces.
 *
 * The video decodes nothing. Its `paused`, `ended`, `currentTime` and
 * `duration` are redefined over the real element, so `sounding()` reads the
 * story's answer exactly the way it reads YouTube's.
 */
class Posed {
  readonly player: YtPlayer
  readonly video: HTMLVideoElement

  private base = 0
  private since = 0
  private length = 0
  private paused = true
  private stopped = false
  private buffering = false
  private held = false
  private id = ''
  private asked = ''
  private rate = 1
  private volume = 100
  private muted = false

  constructor() {
    const video = document.createElement('video')
    Object.defineProperties(video, {
      paused: { get: () => this.paused },
      ended: { get: () => this.finished() },
      duration: { get: () => this.length },
      currentTime: { get: () => this.clock(), set: (v: number) => this.seek(v) },
      play: { value: () => { this.resume(); return Promise.resolve() } },
      pause: { value: () => this.hold() },
    })
    this.video = video

    // A div, not the object: adShowing() reads classList off the player, and
    // the workbench never puts an advert class on it, so the advert path is
    // permanently false here. Anything about adverts has to be judged in the
    // page, not at the workbench.
    const player = document.createElement('div') as unknown as HTMLElement & YtPlayer
    Object.assign(player, {
      loadVideoById: (v: string | { videoId: string }) => {
        this.asked = typeof v === 'string' ? v : v.videoId
        this.base = 0
        this.since = performance.now()
        this.stopped = false
        // A load lands at once unless the story is holding one open.
        if (!this.held) this.id = this.asked
      },
      playVideo: () => this.resume(),
      pauseVideo: () => this.hold(),
      seekTo: (seconds: number) => this.seek(seconds),
      getCurrentTime: () => this.clock(),
      getDuration: () => this.length,
      getPlayerState: () => this.reportedState(),
      // Nameless while a load is in the air. The product compares this against
      // what it asked for, and a name it never gave is how it knows the load
      // has not landed.
      getVideoData: () => ({ video_id: this.id, title: this.id, author: '' }),
      getVolume: () => this.volume,
      setVolume: (v: number) => { this.volume = v },
      setPlaybackRate: (r: number) => { this.rate = r },
      getPlaybackRate: () => this.rate,
      isMuted: () => this.muted,
      mute: () => { this.muted = true },
      unMute: () => { this.muted = false },
      addEventListener: () => {},
      removeEventListener: () => {},
    })
    this.player = player
    document.body.append(video, player)
  }

  /**
   * The clock, run off the wall rather than a timer of its own.
   *
   * The engine already ticks twice a second and reads this; a second timer
   * would only be another thing to leak. A posed position that is playing
   * therefore moves, which is the point: a progress bar that never advances
   * cannot be judged.
   */
  private clock(): number {
    if (this.paused || this.held) return this.base
    const at = this.base + (performance.now() - this.since) / 1000
    return this.length > 0 ? Math.min(at, this.length) : at
  }

  private finished(): boolean {
    if (this.stopped) return true
    return this.length > 0 && this.clock() >= this.length
  }

  private reportedState(): number {
    if (this.finished()) return State.Ended
    // Unstarted is what a player that has not got there yet answers, and it is
    // what keeps the product's `loading` set.
    if (this.held) return State.Unstarted
    if (this.buffering) return State.Buffering
    return this.paused ? State.Paused : State.Playing
  }

  private resume(): void {
    if (!this.paused) return
    this.since = performance.now()
    this.paused = false
  }

  private hold(): void {
    if (this.paused) return
    this.base = this.clock()
    this.paused = true
  }

  private seek(seconds: number): void {
    this.base = Math.max(0, seconds)
    this.since = performance.now()
    this.stopped = false
  }

  set(pose: Pose): void {
    if (pose.duration !== undefined) this.length = Math.max(0, pose.duration)
    if (pose.loading !== undefined) {
      this.held = pose.loading
      // A load that is let go lands on whatever was last asked for.
      if (!this.held && this.asked) this.id = this.asked
    }
    if (pose.buffering !== undefined) this.buffering = pose.buffering
    if (pose.at !== undefined) this.seek(pose.at)
    if (pose.playing !== undefined) {
      if (pose.playing) this.resume()
      else this.hold()
    }
    if (pose.ended !== undefined) this.stopped = pose.ended
  }

  get at(): number {
    return this.clock()
  }

  remove(): void {
    this.video.remove()
    this.player.remove()
  }
}

/**
 * The engines this workbench has built, so their clocks can be stopped.
 *
 * `attach()` starts a tick the product never stops, because in the page there
 * is one Engine for the life of the tab. A workbench builds one per story into
 * an iframe that outlives them all, so without this the intervals pile up and
 * every dead engine keeps polling a video that has been thrown away. Building
 * one retires the ones before it.
 */
const live = new Set<StubEngine>()

/**
 * The real Engine with a player it can be told about.
 *
 * `extends`, not `implements`: Engine keeps its listener set and its load()
 * private, and private members make the class nominally typed, so nothing but
 * a subclass can sit in a Ctx.
 *
 * **It overrides no transport.** It used to override seven methods to keep
 * load() from navigating, and the cost was that the workbench answered
 * differently from the product in all twelve behaviours measured on
 * 2026-09-04: the progress bar never moved because tick() leaves early without
 * a player, play() ignored shuffle, seek() did nothing, and play-pause-play
 * left a track paused. A workbench that disagrees with the product about
 * whether something is playing cannot be used to judge how playing should
 * look. Attaching a player instead means load() has somewhere to go, and every
 * transport method below it is the shipped one.
 */
export class StubEngine extends Engine {
  private readonly posed = new Posed()

  constructor(state: Partial<Persisted> = {}) {
    super()
    this.state = { ...this.state, ...state }
    for (const other of live) other.detach()
    live.clear()
    live.add(this)
    this.attach(this.posed.player)
  }

  /**
   * Says what is true of the player, and lets the product work out the rest.
   *
   * The story never sets `position`. It poses the player, the shipped tick()
   * reads it, and whatever the transport then shows is what the product would
   * have shown. That is the only arrangement in which the workbench is
   * evidence.
   *
   * Nothing is posed by default, so an engine handed a queue sits at zero and
   * still, exactly as it did before, and a story that wants nothing to move
   * simply does not ask for it.
   */
  pose(pose: Pose): this {
    this.posed.set(pose.stalled === undefined ? pose : { ...pose, buffering: pose.buffering ?? pose.stalled })
    if (pose.stalled !== undefined) {
      // tick() keeps a start it already has (`bufferingSince ?? Date.now()`),
      // so a back-dated one survives and the stall reads as long over.
      const clock = this as unknown as { bufferingSince: number | undefined }
      clock.bufferingSince = pose.stalled ? Date.now() - STALL_BACKDATE_MS : undefined
    }
    // seek() is the product's own "and look again": it moves the player and
    // ticks. Posing a position is a seek, so this needs no way into the
    // private clock.
    this.seek(this.posed.at)
    if (pose.stalled !== undefined && this.position.stalled !== pose.stalled) {
      throw new Error('pose({ stalled }) no longer reaches the engine, so the workbench would show the wrong glyph')
    }
    return this
  }

  detach(): void {
    super.detach()
    live.delete(this)
    this.posed.remove()
  }
}

// ── Believable Korean data ──────────────────────────────────────────────────

const SONGS: ReadonlyArray<readonly [title: string, by: string]> = [
  ['한강에서', '새벽밴드'],
  ['느린 손님', '문 봉우리'],
  ['여름의 끝에서', '파도 소리'],
  ['밤은 길고', '달빛 피아노'],
  ['창밖의 비', '커피집 여주인'],
  ['낡은 자전거', '동네 형들'],
  ['별 헤는 밤', '은하수'],
  ['다시 겨울', '함박눈'],
]

const LENGTHS = ['3:41', '4:02', '2:58', '5:16', '3:24', '4:45', '3:09', '6:02']

let made = 0

export function makeTrack(partial: Partial<Track> = {}): Track {
  const i = made++
  const song = SONGS[i % SONGS.length]!
  return {
    videoId: `sb${String(i).padStart(3, '0')}`,
    title: song[0],
    byline: song[1],
    duration: LENGTHS[i % LENGTHS.length] ?? '3:33',
    unavailable: false,
    ...partial,
  }
}

export function makeTracks(n: number): Track[] {
  return Array.from({ length: n }, () => makeTrack())
}

export const SAMPLE_PLAYLISTS: Playlist[] = [
  { id: 'pl-drive', title: '야간 드라이브', subtitle: '24곡' },
  { id: 'pl-code', title: '코딩 BGM', subtitle: '120곡' },
  { id: 'pl-ballad', title: '감성 발라드', subtitle: '45곡' },
]

/** A minimal structural cfg, per ytcfg.ts — enough shape for api calls to be *called*, never fetched here. */
export function makeCfg(): YtCfg {
  return {
    apiKey: undefined,
    context: { client: { clientName: 'WEB', clientVersion: '2.20260901.01.00', hl: 'ko', gl: 'KR' } },
    clientName: 'WEB',
    clientVersion: '2.20260901.01.00',
    visitorData: 'stub-visitor-data',
    sessionIndex: 0,
    hl: 'ko',
  }
}

export type CtxOverrides = Partial<Omit<Ctx, 'engine'>> & { engine?: StubEngine }

/**
 * A Ctx satisfying the real interface, wired to the frame: `overlay` is the
 * frame's real overlay ShadowRoot and `say` is the real toast().
 */
export function makeCtx(overrides: CtxOverrides = {}): Ctx {
  const overlay = frame().overlay
  // The story's engine, or one of our own. Never both: building an engine
  // retires the one before it, so a throwaway default built *after* the
  // story's would quietly detach the very engine about to be used, leaving it
  // with no player and a load() that navigates the workbench away.
  const engine = overrides.engine ?? new StubEngine()
  const ctx: Ctx = {
    engine,
    cfg: makeCfg(),
    overlay,
    view: { kind: 'queue' },
    playlists: [],
    go(view: View) {
      ctx.view = view
    },
    reload() {},
    say(message: string, bad?: boolean) {
      toast(overlay, message, bad)
    },
    async refreshPlaylists() {
      ctx.playlists = SAMPLE_PLAYLISTS
    },
    async addToPlaylist(tracks: Track[]) {
      const chosen = await pick(
        overlay,
        t('재생목록에 추가'),
        SAMPLE_PLAYLISTS.map((p) => ({ id: p.id, label: p.title, sub: p.subtitle })),
        t('새 재생목록 이름'),
      )
      if (!chosen) return
      const name =
        typeof chosen === 'string'
          ? SAMPLE_PLAYLISTS.find((p) => p.id === chosen)?.title ?? t('재생목록')
          : chosen.create
      ctx.say(`${name} · ${tn('곡', tracks.length)}`)
    },
  }
  return { ...ctx, ...overrides }
}
