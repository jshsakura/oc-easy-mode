// The queue and the hand that plays it.
//
// One object owns the persisted state, the reference to YouTube's player and
// the rules of what plays after what. The UI reads from it and calls into it;
// it never touches the player itself.

import { State, disableAutonav, videoIdInUrl, type YtPlayer } from './player.ts'
import type { Track } from './parse.ts'
import { load, save, setQuickOn, type Mode, type Persisted, type Repeat, type VideoLayout } from './store.ts'

export type Listener = () => void

export interface Position {
  current: number
  duration: number
  playing: boolean
  buffering: boolean
}

export class Engine {
  state: Persisted = load()
  player: YtPlayer | null = null
  private listeners = new Set<Listener>()
  private tickListeners = new Set<Listener>()
  private tickTimer: number | undefined
  position: Position = { current: 0, duration: 0, playing: false, buffering: false }
  /** The last track we asked the player for. Guards against a stale ENDED. */
  private loading: string | undefined

  /** Subscribe to queue and settings changes. Returns the unsubscribe. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /** Subscribe to the twice-a-second position tick. */
  onTick(fn: Listener): () => void {
    this.tickListeners.add(fn)
    return () => this.tickListeners.delete(fn)
  }

  private changed(): void {
    save(this.state)
    for (const fn of this.listeners) fn()
  }

  get current(): Track | undefined {
    return this.state.queue[this.state.index]
  }

  // ── The player ────────────────────────────────────────────────────────────

  attach(player: YtPlayer): void {
    if (this.player === player) return
    this.player = player
    player.addEventListener('onStateChange', this.onStateChange)
    disableAutonav()
    setTimeout(disableAutonav, 2000)
    this.applyVolume()
    this.adoptPlaying()
    this.tickTimer = window.setInterval(this.tick, 500)
    this.tick()
    this.changed()
  }

  detach(): void {
    if (this.player) this.player.removeEventListener('onStateChange', this.onStateChange)
    this.player = null
    if (this.tickTimer) clearInterval(this.tickTimer)
    this.tickTimer = undefined
  }

  /**
   * Makes the queue agree with what the page is playing.
   *
   * After our own navigation the URL is the current track and nothing happens.
   * Anything else (the mode switched on mid-video, a back button, YouTube's own
   * navigation) means the page is playing something the queue did not choose,
   * and the person chose it, so the queue adopts it rather than overriding it.
   */
  adoptPlaying(): void {
    const p = this.player
    if (!p) return
    const playing = videoIdInUrl() ?? p.getVideoData()?.video_id
    if (!playing) return
    if (this.current?.videoId === playing) return
    const at = this.state.queue.findIndex((t) => t.videoId === playing)
    if (at >= 0) {
      this.state.index = at
      return
    }
    const data = p.getVideoData()
    const track: Track = {
      videoId: playing,
      title: data?.title || playing,
      byline: data?.author || '',
      duration: '',
      unavailable: false,
    }
    this.state.queue.splice(this.state.index + 1, 0, track)
    this.state.index += 1
  }

  private onStateChange = (raw: unknown): void => {
    const s = typeof raw === 'number' ? raw : Number((raw as { data?: unknown })?.data ?? raw)
    if (s === State.Ended) {
      // A stale ENDED from the previous video can arrive right after loadVideoById.
      if (this.loading && this.player?.getVideoData()?.video_id !== this.loading) return
      this.ended()
    }
    this.tick()
  }

  private tick = (): void => {
    const p = this.player
    if (!p) return
    const s = p.getPlayerState()
    this.position = {
      current: p.getCurrentTime() || 0,
      duration: p.getDuration() || 0,
      playing: s === State.Playing || s === State.Buffering,
      buffering: s === State.Buffering,
    }
    for (const fn of this.tickListeners) fn()
  }

  private applyVolume(): void {
    const p = this.player
    if (!p) return
    p.setVolume(this.state.volume)
    if (this.state.volume > 0 && p.isMuted()) p.unMute()
  }

  /**
   * Lets WebKit play under script, once, from inside a gesture.
   *
   * On iOS a media element may only be started by script after a user gesture
   * has started it at least once. `loadVideoById` does its work asynchronously,
   * so the `playVideo()` that follows it runs a beat later with the activation
   * already spent — and the video sits there, loaded and paused, which is
   * exactly the report from the phone. Playing the element that is *already*
   * loaded is synchronous, happens inside the gesture that asked for a track,
   * and is what grants the element the permission for the rest of the session.
   *
   * Costs a few milliseconds of the outgoing video on the first press and
   * nothing at all after that. Chromium and Gecko never needed it.
   */
  private unlocked = false
  private unlockPlayback(): void {
    if (this.unlocked) return
    const el = document.querySelector('video')
    if (!el) return
    this.unlocked = true
    void Promise.resolve(el.play()).catch(() => {
      this.unlocked = false
    })
  }

  /** Points the player at the current track, navigating if there is no player yet. */
  private load(): void {
    const track = this.current
    if (!track) return
    this.loading = track.videoId
    if (this.player) {
      this.unlockPlayback()
      this.player.loadVideoById(track.videoId)
      this.player.playVideo()
    } else {
      setQuickOn(true)
      save(this.state)
      location.assign(`/watch?v=${track.videoId}`)
    }
  }

  // ── Transport ─────────────────────────────────────────────────────────────

  toggle(): void {
    const p = this.player
    if (!p) {
      this.load()
      return
    }
    const s = p.getPlayerState()
    if (s === State.Playing || s === State.Buffering) p.pauseVideo()
    else {
      this.unlockPlayback()
      p.playVideo()
    }
  }

  seek(seconds: number): void {
    this.player?.seekTo(seconds, true)
    this.tick()
  }

  setVolume(v: number): void {
    this.state.volume = Math.max(0, Math.min(100, Math.round(v)))
    this.applyVolume()
    this.changed()
  }

  private ended(): void {
    if (this.state.repeat === 'one') {
      this.player?.seekTo(0, true)
      this.player?.playVideo()
      return
    }
    this.next()
  }

  next(): void {
    const q = this.state.queue
    if (q.length === 0) return
    let i = this.state.index + 1
    // Skip rows the source marked unplayable rather than stalling on them.
    while (i < q.length && q[i]!.unavailable) i++
    if (i >= q.length) {
      if (this.state.repeat !== 'all') return
      i = 0
    }
    this.state.index = i
    this.load()
    this.changed()
  }

  prev(): void {
    // Standard behaviour: early in a track, go back; otherwise restart it.
    if (this.position.current > 3 || this.state.index <= 0) {
      this.seek(0)
      return
    }
    this.state.index -= 1
    this.load()
    this.changed()
  }

  jumpTo(index: number): void {
    if (index < 0 || index >= this.state.queue.length) return
    this.state.index = index
    this.load()
    this.changed()
  }

  // ── The queue ─────────────────────────────────────────────────────────────

  /** Replaces the queue and starts at `index`. */
  play(tracks: Track[], index = 0): void {
    if (tracks.length === 0) return
    this.state.queue = this.state.shuffle ? shuffled(tracks, index) : tracks.slice()
    this.state.index = this.state.shuffle ? 0 : index
    this.load()
    this.changed()
  }

  /** Puts the tracks right after the current one, and plays the first. */
  playNow(tracks: Track[]): void {
    this.playNext(tracks)
    this.state.index += 1
    this.load()
    this.changed()
  }

  playNext(tracks: Track[]): void {
    if (tracks.length === 0) return
    this.state.queue.splice(this.state.index + 1, 0, ...tracks)
    if (this.state.index < 0) this.state.index = -1
    this.changed()
  }

  enqueue(tracks: Track[]): void {
    if (tracks.length === 0) return
    this.state.queue.push(...tracks)
    this.changed()
  }

  /**
   * Takes one row out.
   *
   * Removing the row that is playing moves on to whatever slid into its place,
   * because the alternative is a player whose track is not in the list — which
   * reads as a bug every time. Removing anything else leaves the music alone.
   */
  removeAt(index: number): void {
    const q = this.state.queue
    if (index < 0 || index >= q.length) return
    const wasCurrent = index === this.state.index
    q.splice(index, 1)
    if (index < this.state.index) this.state.index -= 1
    if (wasCurrent) {
      if (q.length === 0) this.state.index = -1
      else {
        this.state.index = Math.min(index, q.length - 1)
        this.load()
      }
    }
    this.changed()
  }

  clear(): void {
    const cur = this.current
    this.state.queue = cur ? [cur] : []
    this.state.index = cur ? 0 : -1
    this.changed()
  }

  setRepeat(mode: Repeat): void {
    this.state.repeat = mode
    this.changed()
  }

  cycleRepeat(): void {
    const order: Repeat[] = ['off', 'all', 'one']
    this.setRepeat(order[(order.indexOf(this.state.repeat) + 1) % order.length]!)
  }

  /** Shuffles what is still to come; what has played keeps its order. */
  setShuffle(on: boolean): void {
    this.state.shuffle = on
    if (on && this.state.queue.length > this.state.index + 1) {
      const head = this.state.queue.slice(0, this.state.index + 1)
      const tail = this.state.queue.slice(this.state.index + 1)
      this.state.queue = head.concat(shuffled(tail, -1))
    }
    this.changed()
  }

  setLang(lang: 'ko' | 'en'): void {
    this.state.lang = lang
    save(this.state)
  }

  setMode(mode: Mode): void {
    this.state.mode = mode
    this.changed()
  }

  setVideo(layout: VideoLayout): void {
    this.state.video = layout
    this.changed()
  }

  /**
   * Remembers where the UI was. Written down but not announced: the navigation
   * that caused it is already drawing the new screen, and telling the
   * subscribers would make it draw twice.
   */
  setView(view: string): void {
    this.state.view = view
    save(this.state)
  }
}

/** Fisher–Yates over a copy; `keepFirst` (if valid) is moved to the front unshuffled. */
function shuffled(tracks: readonly Track[], keepFirst: number): Track[] {
  const out = tracks.slice()
  let first: Track | undefined
  if (keepFirst >= 0 && keepFirst < out.length) first = out.splice(keepFirst, 1)[0]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return first ? [first, ...out] : out
}
