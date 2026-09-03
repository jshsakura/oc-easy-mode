// The queue and the hand that plays it.
//
// One object owns the persisted state, the reference to YouTube's player and
// the rules of what plays after what. The UI reads from it and calls into it;
// it never touches the player itself.

import { State, disableAutonav, videoIdInUrl, type YtPlayer } from './player.ts'
import type { Track } from './parse.ts'
import { load, remember, save, setQuickOn, type Mode, type Persisted, type Repeat, type Theme, type VideoLayout } from './store.ts'

export type Listener = () => void

/** How long one continuous wait may last before the transport calls it a stall. */
const STALL_AFTER_MS = 6000

export interface Position {
  current: number
  duration: number
  playing: boolean
  buffering: boolean
  /** A wait that has outlasted STALL_AFTER_MS: the transport's stop state. */
  stalled: boolean
}

export class Engine {
  state: Persisted = load()
  player: YtPlayer | null = null
  private listeners = new Set<Listener>()
  private tickListeners = new Set<Listener>()
  private tickTimer: number | undefined
  position: Position = { current: 0, duration: 0, playing: false, buffering: false, stalled: false }
  /** The load that has not landed yet: set when we ask, cleared in tick() once
   *  the player is underway on that very id. Guards against a stale ENDED,
   *  and doubles as "show a wait" for the transport in the meantime. */
  private loading: string | undefined
  /** When the current continuous wait began; undefined while not waiting. */
  private bufferingSince: number | undefined

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
    this.applyRate()
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

  /**
   * Whether sound is actually coming out, asked of the element.
   *
   * `getPlayerState()` is not reliable enough to decide on: it reports -1
   * while the video is plainly playing, with `paused` false and `currentTime`
   * climbing. Measured — and it is the reason pressing pause in the first
   * couple of seconds of a track did nothing at all. `toggle()` read the state,
   * concluded nothing was playing, and called playVideo() on a video that was
   * already playing.
   *
   * The element cannot be wrong about this, so it is the answer, and the
   * player's own state is only the fallback for when there is no element yet.
   */
  private sounding(): boolean {
    const el = document.querySelector('video')
    if (el) return !el.paused && !el.ended
    const s = this.player?.getPlayerState()
    return s === State.Playing || s === State.Buffering
  }

  private tick = (): void => {
    const p = this.player
    if (!p) return
    const s = p.getPlayerState()
    // A load is pending until the player is actually underway on the track we
    // asked for; `loading` is dropped the moment it is, so it means "this load
    // has not landed yet" and never "some load once happened". Until then the
    // state reads Unstarted or Cued and the transport would flash a play glyph
    // into the gap between pressing next and the video existing.
    if (
      this.loading !== undefined &&
      (s === State.Playing || s === State.Buffering) &&
      p.getVideoData()?.video_id === this.loading
    ) {
      this.loading = undefined
      // Whoever pressed pause while this was loading meant it.
      if (this.wantPaused) {
        this.wantPaused = false
        p.pauseVideo()
      }
      // The rate is re-applied *here*, where the load has actually landed.
      // Setting it next to loadVideoById is too early: the player resets its
      // rate as the new video becomes ready, so the speed chosen a moment
      // before would be quietly thrown away — both on the next track and on a
      // rate chosen while the current one was still loading.
      this.applyRate()
    }
    // The rate is re-asserted, not set. YouTube's player drops it back to 1 at
    // moments of its own choosing — a new video becoming ready, a quality
    // change — and applying it once at any single point loses that race
    // sooner or later. Measured: set beside loadVideoById it never survived,
    // and set when the load landed it still went missing intermittently.
    // Only asked while a speed is actually chosen, so a player left at 1 is
    // never touched.
    if (this.state.rate !== 1) {
      try {
        if (p.getPlaybackRate() !== this.state.rate) this.applyRate()
      } catch {
        // A player build without the getter keeps whatever rate it has.
      }
    }
    const pending = this.loading !== undefined && s !== State.Playing && s !== State.Paused
    // Checked here rather than on a timer of its own: this already runs twice a
    // second, and a sleep timer is not a thing that needs to be punctual to the
    // millisecond.
    if (this.sleep && 'at' in this.sleep && Date.now() >= this.sleep.at) this.fallAsleep()
    // The stall clock: a short wait is a load, and the bar says so with a pause
    // glyph the way YouTube's own does. Past STALL_AFTER_MS of one unbroken
    // wait the story changes — nothing is coming — and the transport switches
    // to stop. Any break in the wait resets the clock.
    const buffering = s === State.Buffering || pending
    this.bufferingSince = buffering ? this.bufferingSince ?? Date.now() : undefined
    const stalled = this.bufferingSince !== undefined && Date.now() - this.bufferingSince > STALL_AFTER_MS
    this.position = {
      current: p.getCurrentTime() || 0,
      duration: p.getDuration() || 0,
      playing: this.sounding(),
      buffering,
      stalled,
    }
    for (const fn of this.tickListeners) fn()
  }

  private applyVolume(): void {
    const p = this.player
    if (!p) return
    p.setVolume(this.state.volume)
    if (this.state.volume > 0 && p.isMuted()) p.unMute()
  }

  // ── Speed ─────────────────────────────────────────────────────────────────

  /**
   * Applied on every load as well as on the way in.
   *
   * The player resets its rate when it is handed a new video, so a speed chosen
   * once would quietly return to 1 at the end of the first track.
   */
  private applyRate(): void {
    try {
      this.player?.setPlaybackRate(this.state.rate)
    } catch {
      // A player build that does not take the rate keeps the one it has.
    }
  }

  setRate(rate: number): void {
    this.state.rate = rate
    this.applyRate()
    this.changed()
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────

  /**
   * When to stop by itself: a wall-clock time, the end of this track, or never.
   *
   * Deliberately not persisted. A timer is set for tonight, and finding it
   * still armed tomorrow — or, worse, firing in the middle of the afternoon
   * because a tab was reopened — is the kind of surprise this feature exists to
   * avoid.
   */
  sleep: { at: number } | { atTrackEnd: true } | undefined

  sleepIn(minutes: number): void {
    this.sleep = { at: Date.now() + minutes * 60_000 }
    this.changed()
  }

  sleepAfterTrack(): void {
    this.sleep = { atTrackEnd: true }
    this.changed()
  }

  cancelSleep(): void {
    this.sleep = undefined
    this.changed()
  }

  /** Minutes left, rounded up, or undefined when nothing is set by the clock. */
  sleepLeft(): number | undefined {
    if (!this.sleep || !('at' in this.sleep)) return undefined
    return Math.max(0, Math.ceil((this.sleep.at - Date.now()) / 60_000))
  }

  /** Stops where it stands, rather than at the start of the next track. */
  private fallAsleep(): void {
    this.sleep = undefined
    if (this.position.playing) this.player?.pauseVideo()
    this.changed()
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
    this.wantPaused = false
    remember(track)
    if (this.player) {
      this.unlockPlayback()
      this.player.loadVideoById(track.videoId)
      this.player.playVideo()
      this.applyRate()
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
    if (this.sounding()) {
      p.pauseVideo()
      // A pause during a load has to outlive the load. `load()` asked the
      // player to play, and the player obeys that when the video becomes
      // ready — so without this the track starts anyway a second later and the
      // press looks ignored, which is exactly how it looked.
      this.wantPaused = true
    } else {
      this.wantPaused = false
      this.unlockPlayback()
      p.playVideo()
    }
  }

  /** Set when someone pauses a track that has not finished loading. */
  private wantPaused = false

  seek(seconds: number): void {
    this.player?.seekTo(seconds, true)
    this.tick()
  }

  setVolume(v: number): void {
    this.state.volume = Math.max(0, Math.min(100, Math.round(v)))
    this.applyVolume()
    this.changed()
  }

  /**
   * Silences without forgetting the level.
   *
   * Volume zero is how this player mutes — there is one slider and it is the
   * truth — so unmuting has to remember what it was before, or every mute is
   * followed by hunting for the level again.
   */
  private beforeMute = 0
  toggleMute(): void {
    if (this.state.volume > 0) {
      this.beforeMute = this.state.volume
      this.setVolume(0)
    } else {
      this.setVolume(this.beforeMute || 100)
    }
  }

  private ended(): void {
    if (this.sleep && 'atTrackEnd' in this.sleep) {
      this.sleep = undefined
      this.changed()
      return
    }
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

  setTheme(theme: Theme): void {
    this.state.theme = theme
    save(this.state)
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
