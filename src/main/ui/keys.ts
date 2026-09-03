// The keyboard, for someone across the room from the screen.
//
// The keys are YouTube's own, because they are the ones already in the hands
// this is for: k and space play, j and l jump ten seconds, m mutes. The rest
// are this player's — s for shuffle, r for repeat, v for the picture.
//
// **The arrows are not here.** They are how a remote control moves between
// rows, and a seek bound to them would fight that for as long as something was
// playing — which is most of the time. j and l already do the job.
//
// **Listened for in the capture phase, and stopped there.** YouTube's own
// handlers sit on the document and would act on the same press, so a key this
// player answers has to be taken out of the air before the page sees it —
// otherwise k pauses twice and lands back where it started.

import type { Engine } from '../engine.ts'

/** What j and l jump, which is what YouTube's own do. */
const JUMP = 10

/** Whether the press belongs to something being typed into. */
function typing(ev: KeyboardEvent): boolean {
  const el = ev.composedPath()[0] as HTMLElement | undefined
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true
}

export interface KeyActions {
  /** Cycles the picture, which is the player bar's own button. */
  toggleVideo(): void
}

export function installKeys(engine: Engine, actions: KeyActions): () => void {
  const seekBy = (by: number) => {
    const end = engine.position.duration || Number.MAX_SAFE_INTEGER
    engine.seek(Math.max(0, Math.min(end, engine.position.current + by)))
  }

  const onKey = (ev: KeyboardEvent): void => {
    // A shortcut is a bare press. Ctrl+R is a reload and Cmd+L is the address
    // bar, and taking either of those would be a theft rather than a feature.
    if (ev.ctrlKey || ev.metaKey || ev.altKey || typing(ev)) return

    const act = ((): (() => void) | undefined => {
      switch (ev.key) {
        case ' ':
        case 'k':
        case 'K':
          return () => engine.toggle()
        case 'j':
        case 'J':
          return () => seekBy(-JUMP)
        case 'l':
        case 'L':
          return () => seekBy(JUMP)
        case 's':
        case 'S':
          return () => engine.setShuffle(!engine.state.shuffle)
        case 'r':
        case 'R':
          return () => engine.cycleRepeat()
        case 'v':
        case 'V':
          return () => actions.toggleVideo()
        case 'm':
        case 'M':
          return () => engine.toggleMute()
        default:
          return undefined
      }
    })()
    if (!act) return

    ev.preventDefault()
    ev.stopPropagation()
    act()
  }

  document.addEventListener('keydown', onKey, true)
  return () => document.removeEventListener('keydown', onKey, true)
}
