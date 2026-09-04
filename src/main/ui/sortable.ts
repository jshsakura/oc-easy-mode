// Dragging a row to a new place.
//
// **Attached to the list, not built into the row.** The rows are made in
// rows.ts and used by half a dozen screens; only two of them can be reordered.
// Listening on the container keeps the gesture where the ordering lives, and
// it means a redraw can replace every row without anything to reattach.
//
// The gesture starts differently on the two kinds of pointer, because they
// mean different things by holding still:
//
//   mouse   a press and a few pixels of travel is a drag, and nothing else
//           was going to happen anyway
//   touch   a press is a tap, a vertical drag is a scroll and a horizontal one
//           is the swipe that reveals a row's buttons. So a drag has to be
//           asked for: hold still for a moment, and only then does the row
//           come up. Until it does, the finger is doing what it always did.

/** How long a finger must rest on a row before it picks it up. */
const HOLD_MS = 320

/** How far a mouse travels before a press becomes a drag. */
const SLOP_PX = 4

/** How far a finger may drift during the hold and still be holding. */
const HOLD_SLOP_PX = 10

export interface SortableOptions {
  /** The children that can move. Anything else in the list stays put. */
  rowSelector: string
  /** Indices are counted among matching children only. */
  onMove(from: number, to: number): void
}

/** Starts listening. Returns the way to stop. */
export function makeSortable(container: HTMLElement, opts: SortableOptions): () => void {
  let dragging: HTMLElement | null = null
  let held: number | undefined
  let startY = 0
  let originY = 0
  let fromIndex = -1
  let toIndex = -1
  let line: HTMLElement | null = null
  let pointerId = -1

  const rows = (): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>(opts.rowSelector))

  const cleanup = (): void => {
    clearTimeout(held)
    held = undefined
    if (dragging) {
      dragging.classList.remove('dragging')
      dragging.style.transform = ''
      if (pointerId >= 0 && dragging.hasPointerCapture?.(pointerId)) {
        dragging.releasePointerCapture(pointerId)
      }
    }
    container.classList.remove('sorting')
    line?.remove()
    line = null
    dragging = null
    fromIndex = -1
    toIndex = -1
    pointerId = -1
  }

  /**
   * Where the row would land, and the line that says so.
   *
   * Measured against the middles of the rows it is passing, which is what a
   * drop between two rows means. The line is drawn at the boundary rather than
   * on a row, because a highlighted row reads as "this one is chosen" and the
   * question here is "where does it go".
   */
  const aim = (y: number): void => {
    const all = rows()
    let target = all.length - 1
    for (let i = 0; i < all.length; i++) {
      const box = all[i]!.getBoundingClientRect()
      if (y < box.top + box.height / 2) {
        target = i
        break
      }
    }
    // Lifting the row out first is what makes the index mean the same thing
    // here as it does in the engine's move.
    toIndex = target > fromIndex ? target - 1 : target
    if (!line) {
      line = document.createElement('div')
      line.className = 'dropLine'
      container.appendChild(line)
    }
    const box = all[target]!.getBoundingClientRect()
    const host = container.getBoundingClientRect()
    const above = y < box.top + box.height / 2
    line.style.top = `${(above ? box.top : box.bottom) - host.top}px`
  }

  const begin = (row: HTMLElement, y: number): void => {
    dragging = row
    fromIndex = rows().indexOf(row)
    toIndex = fromIndex
    originY = y
    row.classList.add('dragging')
    container.classList.add('sorting')
    aim(y)
  }

  const onDown = (ev: PointerEvent): void => {
    if (ev.button !== undefined && ev.button > 0) return
    const target = ev.target as HTMLElement | null
    // Not from a control. The buttons in a row are the row's own actions and
    // pressing one is not a grab.
    if (target?.closest('button, input, a')) return
    const row = target?.closest<HTMLElement>(opts.rowSelector)
    if (!row || !container.contains(row)) return

    startY = ev.clientY
    pointerId = ev.pointerId
    if (ev.pointerType === 'touch') {
      held = setTimeout(() => {
        held = undefined
        begin(row, startY)
        row.setPointerCapture?.(pointerId)
      }, HOLD_MS) as unknown as number
    } else {
      // The mouse waits for travel instead, decided in onMove.
      dragging = null
      fromIndex = rows().indexOf(row)
      container.dataset['pending'] = String(fromIndex)
      row.setPointerCapture?.(pointerId)
    }
  }

  const onPointerMove = (ev: PointerEvent): void => {
    if (ev.pointerId !== pointerId) return
    const travelled = Math.abs(ev.clientY - startY)

    if (held !== undefined) {
      // Still deciding whether this is a hold. A finger that has moved is
      // scrolling or swiping, and the list must not steal that.
      if (travelled > HOLD_SLOP_PX) cleanup()
      return
    }

    if (!dragging && container.dataset['pending'] !== undefined) {
      if (travelled < SLOP_PX) return
      const row = rows()[Number(container.dataset['pending'])]
      delete container.dataset['pending']
      if (!row) return
      begin(row, ev.clientY)
    }
    if (!dragging) return

    ev.preventDefault()
    dragging.style.transform = `translateY(${ev.clientY - originY}px)`
    aim(ev.clientY)
  }

  const onUp = (ev: PointerEvent): void => {
    if (ev.pointerId !== pointerId && pointerId !== -1) return
    delete container.dataset['pending']
    const from = fromIndex
    const to = toIndex
    const moved = dragging !== null
    cleanup()
    if (moved && from >= 0 && to >= 0 && from !== to) opts.onMove(from, to)
  }

  container.addEventListener('pointerdown', onDown)
  container.addEventListener('pointermove', onPointerMove)
  container.addEventListener('pointerup', onUp)
  container.addEventListener('pointercancel', onUp)

  return () => {
    cleanup()
    container.removeEventListener('pointerdown', onDown)
    container.removeEventListener('pointermove', onPointerMove)
    container.removeEventListener('pointerup', onUp)
    container.removeEventListener('pointercancel', onUp)
  }
}
