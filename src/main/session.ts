// The lock screen, the watch face and the button on the headphones.
//
// `navigator.mediaSession` is what a phone shows when the screen is off and
// what a bluetooth remote talks to. YouTube sets it up for itself, which is
// nearly right and wrong in the one way that matters: its "next" is YouTube's
// autoplay, not this queue. So the same handlers are set again, pointing at the
// engine.
//
// **The handlers are page-global and YouTube replaces them.** They belong to
// the document, not to us, and the page re-asserts its own every time it starts
// a video — so setting them once at mount holds until the first track change
// and then quietly stops working. They are re-asserted on a timer instead.
// Cheap: assigning a handler is a property write, and there are eight of them.

import type { Engine } from './engine.ts'
import { thumbnail } from './parse.ts'

/**
 * How often to take the handlers back.
 *
 * Two seconds is under the time it takes to reach for a phone and over the
 * time YouTube needs to finish stealing them, which is the whole requirement.
 */
const REASSERT_MS = 2000

/** How far the two-arrow buttons jump when the remote does not say. */
const SKIP_SECONDS = 10

/**
 * Artwork, in the sizes a lock screen picks between.
 *
 * `maxresdefault` does not exist for every video and 404s silently when it
 * does not, which is why the smaller two are offered alongside it rather than
 * instead of it: the browser takes the largest that loads.
 */
function artwork(videoId: string): MediaImage[] {
  return [
    { src: thumbnail(videoId), sizes: '320x180', type: 'image/jpeg' },
    { src: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' },
    { src: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, sizes: '1280x720', type: 'image/jpeg' },
  ]
}

/**
 * Points the operating system's media controls at this queue.
 *
 * Returns the teardown, which gives the page back what it had: leaving our
 * handlers on a document we no longer own would send a headphone button into
 * an engine that has stopped listening.
 */
export function bindMediaSession(engine: Engine): () => void {
  const session = navigator.mediaSession as MediaSession | undefined
  if (!session) return () => {}

  const play = () => {
    if (!engine.position.playing) engine.toggle()
  }
  const pause = () => {
    if (engine.position.playing) engine.toggle()
  }
  const skip = (by: number, offset?: number) => {
    const to = engine.position.current + by * (offset || SKIP_SECONDS)
    const end = engine.position.duration || Number.MAX_SAFE_INTEGER
    engine.seek(Math.max(0, Math.min(end, to)))
  }

  const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ['play', play],
    ['pause', pause],
    ['stop', pause],
    ['previoustrack', () => engine.prev()],
    ['nexttrack', () => engine.next()],
    ['seekbackward', (d) => skip(-1, d.seekOffset)],
    ['seekforward', (d) => skip(1, d.seekOffset)],
    ['seekto', (d) => d.seekTime !== undefined && engine.seek(d.seekTime)],
  ]

  const claim = () => {
    for (const [action, handler] of handlers) {
      // An action the browser has never heard of throws rather than being
      // ignored, and one unsupported action must not cost the other seven.
      try {
        session.setActionHandler(action, handler)
      } catch {
        /* not supported here */
      }
    }
  }

  /**
   * The metadata object we last put there, kept so we can tell ours from
   * YouTube's.
   *
   * Rewriting only when the track changes is not enough: YouTube sets its own
   * metadata continuously, so ours survives until the page next feels like it
   * and is then replaced for good — measured, and the tell was the artwork
   * dropping from three sizes to one. Identity is the exact test for "is what
   * is on the lock screen still the object we made", and it costs a comparison.
   */
  let mine: MediaMetadata | null = null
  let shown: string | undefined

  const draw = (): void => {
    const track = engine.current
    if (!track) {
      shown = undefined
      mine = null
      session.metadata = null
      session.playbackState = 'none'
      return
    }
    if (shown !== track.videoId || session.metadata !== mine) {
      shown = track.videoId
      mine = new MediaMetadata({
        title: track.title || track.videoId,
        artist: track.byline,
        artwork: artwork(track.videoId),
      })
      session.metadata = mine
    }
    session.playbackState = engine.position.playing ? 'playing' : 'paused'
  }

  const position = (): void => {
    const { current, duration } = engine.position
    // A scrubber the OS draws from numbers that do not make sense throws, and
    // half a second of drift puts `current` past `duration` at the end of every
    // track.
    if (!Number.isFinite(duration) || duration <= 0) return
    try {
      session.setPositionState({
        duration,
        position: Math.max(0, Math.min(duration, current)),
        playbackRate: 1,
      })
    } catch {
      /* the numbers moved under us; the next tick carries the correction */
    }
  }

  claim()
  draw()
  const offChange = engine.subscribe(draw)
  const offTick = engine.onTick(() => {
    draw()
    position()
  })
  // Taking them back from YouTube, which sets its own on every video it starts.
  const timer = window.setInterval(claim, REASSERT_MS)

  return () => {
    clearInterval(timer)
    offChange()
    offTick()
    for (const [action] of handlers) {
      try {
        session.setActionHandler(action, null)
      } catch {
        /* see claim() */
      }
    }
    session.metadata = null
    session.playbackState = 'none'
  }
}
