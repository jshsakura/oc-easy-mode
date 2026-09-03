// Everything a story needs to drive the real UI code: an Engine with no
// player behind it, believable tracks, a ytcfg, and a Ctx whose overlay is the
// frame's real overlay root. Stories hand these to the actual row(), render()
// and overlay functions — nothing here re-implements a view.

import { t, tn } from '../../src/shared/i18n.ts'
import { Engine, type Listener } from '../../src/main/engine.ts'
import type { Playlist, Track } from '../../src/main/parse.ts'
import type { Persisted } from '../../src/main/store.ts'
import type { Ctx, View } from '../../src/main/ui/ctx.ts'
import { pick, toast } from '../../src/main/ui/overlay.ts'
import type { YtCfg } from '../../src/main/ytcfg.ts'
import { frame } from './frame.ts'

/**
 * The real Engine with nothing attached to it.
 *
 * `extends`, not `implements`: Engine keeps its listener set and its load()
 * private, and private members make the class nominally typed — nothing but a
 * subclass can sit in a Ctx. Subclassing is also the honest stub, because the
 * app before the first video *is* an Engine with no player. The overrides
 * below replace only the moves that would hand a track to YouTube's player or
 * navigate the page (the product's private load()); everything else — the
 * queue math in enqueue/playNext/clear, the settings, the shuffle — runs the
 * shipped code.
 */
export class StubEngine extends Engine {
  /** Subscribed beside the real set, so both notification paths fire once each. */
  private own = new Set<Listener>()

  constructor(state: Partial<Persisted> = {}) {
    super()
    this.state = { ...this.state, ...state }
  }

  subscribe(fn: Listener): () => void {
    this.own.add(fn)
    const off = super.subscribe(fn)
    return () => {
      this.own.delete(fn)
      off()
    }
  }

  /** The workbench's changed(): the product's is private. */
  private announce(): void {
    for (const fn of this.own) fn()
  }

  toggle(): void {
    this.position = { ...this.position, playing: !this.position.playing, buffering: false }
    this.announce()
  }

  next(): void {
    const q = this.state.queue
    if (q.length === 0) return
    let i = this.state.index + 1
    while (i < q.length && q[i]!.unavailable) i++
    if (i >= q.length) {
      if (this.state.repeat !== 'all') return
      i = 0
    }
    this.state.index = i
    this.announce()
  }

  prev(): void {
    if (this.position.current > 3 || this.state.index <= 0) {
      this.position = { ...this.position, current: 0 }
      this.announce()
      return
    }
    this.state.index -= 1
    this.announce()
  }

  jumpTo(index: number): void {
    if (index < 0 || index >= this.state.queue.length) return
    this.state.index = index
    this.announce()
  }

  play(tracks: Track[], index = 0): void {
    if (tracks.length === 0) return
    this.state.queue = tracks.slice()
    this.state.index = index
    this.announce()
  }

  playNow(tracks: Track[]): void {
    if (tracks.length === 0) return
    this.state.queue.splice(this.state.index + 1, 0, ...tracks)
    this.state.index += 1
    this.announce()
  }

  /**
   * The queue math of the product's removeAt, minus the load: in the workbench
   * there is no player to hand the next track to, so the queue simply moves on.
   */
  removeAt(index: number): void {
    const q = this.state.queue
    if (index < 0 || index >= q.length) return
    const wasCurrent = index === this.state.index
    q.splice(index, 1)
    if (index < this.state.index) this.state.index -= 1
    if (wasCurrent) this.state.index = q.length === 0 ? -1 : Math.min(index, q.length - 1)
    this.announce()
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
  const ctx: Ctx = {
    engine: new StubEngine(),
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
