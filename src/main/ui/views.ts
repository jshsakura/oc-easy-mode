// The screens. Each one renders into a container it is given and owns its own
// loading, so a slow request never blocks the player bar or the sidebar.

import { t, tn } from '../../shared/i18n.ts'
import * as api from '../api.ts'
import { thumbnail, type Playlist, type Shelf, type Track } from '../parse.ts'
import { forgetHistory, history, setSubsFilter, subsFilter} from '../store.ts'
import { art, h, icon, replace } from './dom.ts'
import { explain, type Ctx, type View } from './ctx.ts'
import { confirm, showMenu } from './overlay.ts'
import { removeFromPlaylistNow, row, startRadio } from './rows.ts'
import { applyFilter, channelsOf, chooseChannels } from './channels.ts'

/**
 * Which render is the one on screen.
 *
 * Every screen here draws a skeleton, waits for YouTube, and then writes the
 * answer into `main`. Nothing stopped a *slow* screen from writing its answer
 * after the reader had already moved on: open 탐색, press 대기열 before it
 * lands, and the queue is drawn — and then the explore fetch finishes and puts
 * itself, or its error, on top of it. The reader sees a screen they left, or
 * "가져오지 못했습니다" over a queue that arrived perfectly well.
 *
 * A number rather than a comparison of views, because `reload()` re-renders
 * the same view on purpose and the older of two renders of one screen still
 * has to lose.
 */
let generation = 0

/** Whether the render holding this token is still the one being awaited. */
function current(token: number): boolean {
  return token === generation
}

/** Draws `view` into `main`. Returns once the first paint is done. */
export async function render(ctx: Ctx, main: HTMLElement): Promise<void> {
  generation += 1
  const view = ctx.view
  switch (view.kind) {
    case 'explore':
      return explore(ctx, main)
    case 'home':
      return listFeed(ctx, main, t('홈'), 'FEwhat_to_watch')
    case 'subs':
      return listFeed(ctx, main, t('구독'), 'FEsubscriptions')
    case 'history':
      return listFeed(ctx, main, t('시청 기록'), 'FEhistory')
    case 'recent':
      return recent(ctx, main)
    case 'playlists':
      return playlists(ctx, main)
    case 'playlist':
      return playlist(ctx, main, view.id, view.title)
    case 'queue':
      return queue(ctx, main)
  }
}

/**
 * An empty screen, with a mark above the sentence.
 *
 * A line of grey text in the middle of a blank panel reads as something that
 * failed to load. A glyph says the screen arrived and there is nothing in it.
 */
export function nothing(text: string, glyph: Parameters<typeof icon>[0] = 'note'): HTMLElement {
  return h('div', { class: 'empty' }, icon(glyph, 34), h('div', null, text))
}

/**
 * A list that can ask YouTube for more of itself.
 *
 * The whole list, not just the visible page, is what a row plays from — asking
 * for more mid-listen should extend the queue you would have got, not start a
 * different one — so the array is held here and the play handler closes over it.
 */
function listOf(ctx: Ctx, first: api.Page): HTMLElement {
  const rows = h('div', { class: 'rows' })
  let page = first
  let all = first.tracks

  const more = h('button', { class: 'btn ghost', 'data-nav': '', style: 'margin: 16px auto 0; display: flex' }, t('더 보기'))
  more.addEventListener('click', async () => {
    // The next page arrives as more of the same, so it is awaited as more of
    // the same: the button steps aside and the rows it is about to fetch stand
    // there in outline. A button relabelled "가져오는 중…" says a wait is
    // happening somewhere; this says where, and how much.
    const waiting = ctx.engine.state.mode === 'video'
      ? Array.from({ length: 6 }, () => skTile())
      : Array.from({ length: 4 }, () => skRow())
    more.remove()
    rows.append(...waiting)
    try {
      const next = await api.more(ctx.cfg, page)
      all = all.concat(next.tracks)
      page = next
      // draw() replaces the whole container, skeletons included.
      draw()
    } catch (err) {
      ctx.say(explain(err), true)
      for (const el of waiting) el.remove()
      rows.appendChild(more)
    }
  })

  function draw(): void {
    layout(ctx, rows, all, (track) => ({ quick: addQuick(ctx, track) }))
    if (page.continuation) rows.appendChild(more)
  }

  draw()
  relayoutOnModeChange(ctx, rows, draw)
  return rows
}

/**
 * Draws a list of tracks the way the current mode wants it: a track list in
 * music mode, a wall of thumbnails in video mode.
 */
function layout(
  ctx: Ctx,
  into: HTMLElement,
  list: Track[],
  extraFor: (t: Track) => Pick<Parameters<typeof row>[2], 'extra' | 'quick'>,
): void {
  const asGrid = ctx.engine.state.mode === 'video'
  into.className = asGrid ? 'grid' : 'rows'
  followNowPlaying(ctx, into)
  replace(
    into,
    asGrid
      ? list.map((_, i) => trackTile(ctx, list, i))
      : list.map((track, i) =>
          row(ctx, track, {
            index: i + 1,
            // Where the track *is* when pressed, not where it was when drawn:
            // a list that has had a row taken out of it has moved on.
            onPlay: () => {
              const at = list.indexOf(track)
              ctx.engine.play(list, at < 0 ? i : at)
            },
            ...extraFor(track),
          }),
        ),
  )
}

/** Containers already watching the queue, so a redraw does not stack listeners. */
const following = new WeakSet<HTMLElement>()

/**
 * Keeps the playing mark on the row that is actually playing.
 *
 * It used to be decided once, while the list was being built, and never again:
 * press a second track and the bar changed while the list went on pointing at
 * the first. On a search for one artist — where every row is a plausible
 * answer — that is the screen telling you it is playing something it is not.
 *
 * Repainted rather than redrawn, because a list is a place someone is reading
 * and scrolling; rebuilding it under them to move three bars would be a
 * heavier answer than the question deserves.
 */
function followNowPlaying(ctx: Ctx, into: HTMLElement): void {
  if (following.has(into)) return
  following.add(into)
  let marked: string | undefined | null = null
  const paint = (): void => {
    const id = ctx.engine.current?.videoId
    if (id === marked) return
    marked = id
    let n = 0
    for (const el of Array.from(into.children)) {
      if (!el.classList.contains('row')) continue
      n += 1
      const rowEl = el as HTMLElement
      const playing = rowEl.dataset.id !== undefined && rowEl.dataset.id === id
      rowEl.classList.toggle('now', playing)
      const idx = rowEl.querySelector<HTMLElement>('.idx')
      // The number gives way to the bars, and comes back when it is over.
      if (idx) replace(idx, playing ? h('span', { class: 'eq' }, h('i'), h('i'), h('i')) : String(n))
    }
  }
  paint()
  const off = ctx.engine.subscribe(() => {
    if (!into.isConnected) return off()
    paint()
  })
}

/**
 * Redraws when the mode changes, from the data already in hand.
 *
 * Switching between a list and a grid is a layout change, and asking YouTube
 * for the same rows again to perform one is both slow and rude. The
 * subscription unhooks itself the first time it fires after its element has
 * left the document, so a screen that has been navigated away from stops
 * listening without anyone having to remember to say so.
 */
function relayoutOnModeChange(ctx: Ctx, el: HTMLElement, draw: () => void): void {
  let drawn = ctx.engine.state.mode
  const off = ctx.engine.subscribe(() => {
    if (!el.isConnected) return off()
    if (ctx.engine.state.mode === drawn) return
    drawn = ctx.engine.state.mode
    draw()
  })
}

/**
 * One card. The same component for a video and for a playlist, except for the
 * shape of the artwork: a playlist or an album is square, the way every music
 * app draws a cover, and a video keeps the 16:9 of its thumbnail.
 */
/**
 * Loading, drawn as the shape of what is coming. A skeleton borrows the real
 * layout classes and puts grey blocks inside them, so when the data lands the
 * screen does not change shape — it fills in.
 */
export function skRow(): HTMLElement {
  return h(
    'div',
    { class: 'row', 'aria-hidden': 'true' },
    h('div', { class: 'idx sk', style: 'width: 14px; height: 8px; justify-self: end' }),
    h('div', { class: 'thumb sk' }),
    h('div', { class: 'meta' },
      h('div', { class: 'sk', style: 'height: 10px; width: 62%; margin-bottom: 6px' }),
      h('div', { class: 'sk', style: 'height: 8px; width: 38%' })),
    h('div', { class: 'dur sk', style: 'width: 34px; height: 8px' }),
  )
}

function skTile(): HTMLElement {
  return h(
    'div',
    { class: 'tile', style: 'background: none', 'aria-hidden': 'true' },
    h('div', { class: 'cover sk' }),
    h('div', { class: 'sk', style: 'height: 10px; width: 80%; margin: 8px 10px 0' }),
    h('div', { class: 'sk', style: 'height: 8px; width: 55%; margin: 4px 10px 10px' }),
  )
}

export function skShelf(): HTMLElement {
  return h(
    'section',
    { class: 'shelf', 'aria-hidden': 'true' },
    h('div', { class: 'sk', style: 'height: 12px; width: 180px; margin: 0 0 14px' }),
    h('div', { class: 'shelfRow' }, Array.from({ length: 6 }, () => skTile())),
  )
}

export function skHead(): HTMLElement {
  return h(
    'div',
    { class: 'head', 'aria-hidden': 'true' },
    h('div', { class: 'cover sk' }),
    h('div', { style: 'min-width: 0' },
      h('div', { class: 'sk', style: 'height: 8px; width: 60px; margin-bottom: 10px' }),
      h('div', { class: 'sk', style: 'height: 34px; width: 46%; margin-bottom: 12px' }),
      h('div', { class: 'sk', style: 'height: 8px; width: 90px' })),
  )
}

export function skRows(n: number): HTMLElement {
  return h('div', { class: 'rows' }, Array.from({ length: n }, () => skRow()))
}

/** The two buttons every feed and playlist screen carries above its list. */
function skToolbar(): HTMLElement {
  return h(
    'div',
    { class: 'toolbar', 'aria-hidden': 'true' },
    h('div', { class: 'sk', style: 'height: 36px; width: 104px' }),
    h('div', { class: 'sk', style: 'height: 36px; width: 124px' }),
  )
}

/** A feed, in whichever of the two shapes the mode is asking for. */
function skFeed(ctx: Ctx): HTMLElement {
  return ctx.engine.state.mode === 'video'
    ? h('div', { class: 'grid' }, Array.from({ length: 6 }, () => skTile()))
    : skRows(6)
}

function tile(opts: {
  cover?: string
  title: string
  sub: string
  /** Drawn on the artwork: a running time, a track count. */
  badge?: string
  square?: boolean
  /** The one-press action, drawn on the artwork. Cards had none. */
  quick?: { icon: Parameters<typeof icon>[0]; title: string; run(): void }
  onOpen(): void
}): HTMLElement {
  return h(
    'button',
    { class: opts.square ? 'tile square' : 'tile', 'data-nav': '', onclick: opts.onOpen },
    art(
      'cover',
      opts.cover,
      !opts.cover && icon('note', 26),
      opts.badge && h('span', { class: 'badge' }, opts.badge),
      h('span', { class: 'play' }, icon('play', 20)),
      // On the artwork, because a card has no spare row and this is the thing
      // the product is for. Without it, filing a track was possible from a
      // list and impossible from a card — which is every shelf on 탐색 and
      // every screen in 영상 mode.
      opts.quick &&
        (() => {
          const b = h(
            'span',
            // data-nav, or the arrow keys never reach it. It has a tabindex,
            // which is what lights it up when the card takes focus — and then
            // Enter activated the *card*, because remote.ts only moves to and
            // only presses [data-nav]. So the + appeared to be the thing being
            // pressed while the card underneath replaced the queue with the
            // whole shelf. Measured 2026-09-04.
            { class: 'tileAdd', role: 'button', tabindex: '0', 'data-nav': '', title: opts.quick!.title, 'aria-label': opts.quick!.title },
            icon(opts.quick!.icon, 16),
          )
          const go = (ev: Event) => {
            ev.stopPropagation()
            ev.preventDefault()
            opts.quick!.run()
          }
          b.addEventListener('click', go)
          b.addEventListener('keydown', (ev) => {
            if ((ev as KeyboardEvent).key === 'Enter' || (ev as KeyboardEvent).key === ' ') go(ev)
          })
          return b
        })(),
    ),
    h('div', { class: 't', title: opts.title }, opts.title),
    h('div', { class: 's' }, opts.sub),
  )
}

function trackTile(ctx: Ctx, list: Track[], i: number): HTMLElement {
  const track = list[i]!
  return tile({
    cover: thumbnail(track.videoId),
    title: track.title,
    sub: track.byline,
    badge: track.duration,
    quick: { icon: 'plus', title: t('재생목록에 넣기'), run: () => void ctx.addToPlaylist([track]) },
    onOpen: () => ctx.engine.play(list, i),
  })
}

function playlistTile(ctx: Ctx, p: Playlist): HTMLElement {
  return tile({
    cover: p.cover,
    title: p.title,
    sub: p.subtitle,
    square: true,
    onOpen: () => ctx.go({ kind: 'playlist', id: p.id, title: p.title }),
  })
}

/** A titled row that scrolls sideways. */
function shelfRow(ctx: Ctx, shelf: Shelf): HTMLElement {
  return h(
    'section',
    { class: 'shelf' },
    shelf.title && h('h3', null, shelf.title),
    h(
      'div',
      { class: 'shelfRow' },
      shelf.playlists.map((p) => playlistTile(ctx, p)),
      shelf.tracks.map((_, i) => trackTile(ctx, shelf.tracks, i)),
    ),
  )
}

/**
 * The button every ordinary row carries: put this track somewhere.
 *
 * It files into the last playlist chosen, and only asks when there is no last
 * one — which makes the first add two presses and every one after it a single
 * press. The title names the destination, so a button that files silently
 * still says where.
 */
export function addQuick(ctx: Ctx, track: Track): Parameters<typeof row>[2]['quick'] {
  return {
    icon: 'plus',
    title: t('재생목록에 넣기'),
    // Opens the picker rather than filing silently.
    //
    // It used to drop the track into whichever list was used last, which is
    // one press and the wrong one: on somebody else's playlist — where most
    // collecting actually happens — the whole point is choosing *which* of
    // your lists this belongs in, or making a new one for it. The picker is
    // also the only place a playlist can be created, so hiding it behind the
    // last choice made "start a new list from this song" unreachable from the
    // song.
    run: () => void ctx.addToPlaylist([track]),
  }
}

// ── Explore ────────────────────────────────────────────────────────────────

async function explore(ctx: Ctx, main: HTMLElement): Promise<void> {
  const token = generation
  replace(main, h('h2', null, t('탐색')), skShelf(), skShelf())
  try {
    const page = await api.explore(ctx.cfg)
    if (!current(token)) return
    if (page.shelves.length === 0 && page.tracks.length === 0) {
      return replace(main, h('h2', null, t('탐색')), nothing(t('보여줄 것이 없습니다.'), 'radio'))
    }
    replace(
      main,
      h('h2', null, t('탐색')),
      page.shelves.map((shelf) => shelfRow(ctx, shelf)),
      page.shelves.length === 0 && h('div', { class: 'grid' }, page.tracks.map((_, i) => trackTile(ctx, page.tracks, i))),
    )
  } catch (err) {
    if (!current(token)) return
    replace(main, h('h2', null, t('탐색')), h('div', { class: 'err' }, explain(err)))
  }
}

// ── Feeds ──────────────────────────────────────────────────────────────────

async function listFeed(ctx: Ctx, main: HTMLElement, title: string, id: api.FeedId): Promise<void> {
  const token = generation
  // The shape this screen actually lands in, which is not the shape it used to.
  //
  // A feed leads with its own items now — the flat grid that is your
  // subscriptions — and keeps YouTube's injected shelves underneath. The
  // skeleton was still promising two horizontal shelves, so the screen changed
  // shape when the data arrived instead of filling in, which is the one thing
  // these outlines exist to prevent. The toolbar is drawn too: it is what
  // pushes everything below it down.
  replace(main, h('h2', null, title), skToolbar(), skFeed(ctx))
  try {
    const page = await api.feed(ctx.cfg, id)
    if (!current(token)) return
    if (page.tracks.length === 0) {
      // A dead end otherwise, and 영상 mode lands here on purpose: YouTube's
      // home is empty until it knows you, so a session with no watch history
      // gets this screen and nothing to press. 탐색 always has something.
      return replace(
        main,
        h('h2', null, title),
        nothing(t('보여줄 것이 없습니다.'), 'home'),
        h(
          'div',
          { class: 'toolbar', style: 'justify-content: center' },
          h('button', { class: 'btn primary', 'data-nav': '', onclick: () => ctx.go({ kind: 'explore' }) }, icon('radio', 16), t('탐색')),
          h('button', { class: 'btn', 'data-nav': '', onclick: () => ctx.search() }, icon('search', 16), t('검색')),
        ),
      )
    }
    // The feed *and* its shelves, in that order — never the shelves instead of
    // the feed.
    //
    // YouTube injects rows of its own into a personal feed: a recommendation
    // shelf sits in the middle of your subscriptions, and the subscriptions
    // themselves are the loose grid around it. This screen used to draw the
    // shelves the moment one existed and drop the grid entirely, so 구독 came
    // out as a single sideways row of videos from channels nobody had
    // subscribed to — the feed was parsed, then thrown away. Measured
    // 2026-09-04: signed in, the response is a richGridRenderer of the
    // subscriptions with one richShelfRenderer injected beside it.
    //
    // The shelf keeps its place under the feed, because a feed that came with
    // titled rows does carry editorial structure and flattening it would lose
    // that. What it must not do is speak for the whole screen.
    //
    // Minus the tracks the shelves already hold: parseTracks collects those
    // too, and a video should not be on one screen twice.
    const shelved = new Set(page.shelves.flatMap((s) => s.tracks.map((tr) => tr.videoId)))
    const loose = page.tracks.filter((tr) => !shelved.has(tr.videoId))
    const all = loose.length > 0 ? loose : page.tracks

    // **구독 only.** 홈 and 시청 기록 are not lists of channels you chose, and
    // narrowing them by channel would be answering a question nobody asked.
    // The channels come from the rows themselves rather than from a second
    // request; see channels.ts.
    const filterable = id === 'FEsubscriptions'
    const channels = filterable ? channelsOf(all) : []
    const chosen = filterable ? subsFilter().filter((cid) => channels.some((c) => c.id === cid)) : []
    const feed = filterable ? applyFilter(all, chosen) : all

    const openChannels = async (): Promise<void> => {
      const picked = await chooseChannels(ctx.overlay, channels, chosen)
      if (picked === null) return
      setSubsFilter(picked)
      ctx.reload()
    }
    const clear = (): void => {
      setSubsFilter([])
      ctx.reload()
    }

    const toolbar = h(
      'div',
      { class: 'toolbar' },
      h('button', { class: 'btn primary', 'data-nav': '', onclick: () => ctx.engine.play(feed, 0) }, icon('play', 16), t('전체 재생')),
      h('button', { class: 'btn', 'data-nav': '', onclick: () => { ctx.engine.enqueue(feed); ctx.say(`${tn('개', feed.length)} · ${t('대기열에 넣었습니다.')}`) } }, icon('plus', 16), t('대기열에 추가')),
      // The count is on the button because a filter you cannot see is a bug
      // report: the screen is simply missing things and nothing says why.
      filterable && channels.length > 0 && h(
        'button',
        { class: chosen.length > 0 ? 'btn chanFilter on' : 'btn chanFilter', 'data-nav': '', onclick: () => void openChannels() },
        icon('subs', 16),
        t('채널'),
        chosen.length > 0 && h('span', { class: 'chanCount' }, String(chosen.length)),
      ),
    )

    // A filter that hides everything still has to leave a way back out.
    if (feed.length === 0) {
      return replace(
        main,
        h('h2', null, title),
        toolbar,
        nothing(t('고른 채널의 영상이 없습니다.'), 'subs'),
        h(
          'div',
          { class: 'toolbar', style: 'justify-content: center' },
          h('button', { class: 'btn primary', 'data-nav': '', onclick: clear }, t('필터 해제')),
        ),
      )
    }

    replace(
      main,
      h('h2', null, title),
      toolbar,
      feed.length > 0 && listOf(ctx, { ...page, tracks: feed }),
      // The shelves are YouTube's own injections and carry no channel of ours
      // to filter by, so they stand aside while a filter is on rather than
      // sitting under a narrowed feed pretending to belong to it.
      chosen.length === 0 && page.shelves.map((shelf) => shelfRow(ctx, shelf)),
    )
  } catch (err) {
    if (!current(token)) return
    replace(main, h('h2', null, title), h('div', { class: 'err' }, explain(err)))
  }
}

// ── Playlists ──────────────────────────────────────────────────────────────

async function playlists(ctx: Ctx, main: HTMLElement): Promise<void> {
  const token = generation
  replace(main, h('h2', null, t('내 재생목록')), skRows(5))
  try {
    await ctx.refreshPlaylists()
    if (!current(token)) return
    const list = ctx.playlists
    const create = h(
      'button',
      {
        class: 'btn primary',
        onclick: async () => {
          const chosen = await ctx.addToPlaylist([])
          void chosen
        },
      },
      icon('plus', 16),
      t('새 재생목록'),
    )
    replace(
      main,
      h('h2', null, t('내 재생목록')),
      h('div', { class: 'toolbar' }, create),
      list.length === 0
        ? nothing(t('재생목록이 없습니다.'), 'library')
        : h('div', { class: 'rows' }, list.map((p) => card(ctx, p))),
    )
  } catch (err) {
    if (!current(token)) return
    replace(main, h('h2', null, t('내 재생목록')), h('div', { class: 'err' }, explain(err)))
  }
}

/**
 * One playlist, as a row.
 *
 * A wall of square covers looked handsome and was the wrong shape for the job:
 * playlists are where songs are put in and taken out, and that is list work.
 * Twelve of them fit on a screen this way instead of four.
 */
function card(ctx: Ctx, p: Playlist): HTMLElement {
  return h(
    'div',
    {
      class: 'row plrow',
      'data-nav': '',
      tabindex: '0',
      role: 'button',
      onclick: () => ctx.go({ kind: 'playlist', id: p.id, title: p.title }),
    },
    art('thumb', p.cover),
    h(
      'div',
      { class: 'meta' },
      h('div', { class: 'title', title: p.title }, p.title),
      h('div', { class: 'by' }, p.subtitle),
    ),
    icon('back', 16),
  )
}

async function playlist(ctx: Ctx, main: HTMLElement, id: string, title: string): Promise<void> {
  const token = generation
  replace(
    main,
    skHead(),
    h('div', { class: 'toolbar' },
      h('div', { class: 'sk', style: 'height: 30px; width: 88px' }),
      h('div', { class: 'sk', style: 'height: 30px; width: 88px' })),
    skRows(8),
  )
  try {
    const tracks = await api.playlistTracks(ctx.cfg, id)
    // Stamped here and nowhere else: this is the one screen that knows, for
    // certain, which list a row belongs to. It travels with the track into the
    // queue, so 관심 없음 can offer to take it out of the list as well as out
    // of what is playing.
    for (const track of tracks) track.fromPlaylist = id
    if (!current(token)) return
    const cover = tracks[0]?.videoId
    const body = h('div', { class: 'rows' })
    const menuButton = h('button', { class: 'btn ghost', 'data-nav': '' }, icon('more', 18))
    menuButton.addEventListener('click', () =>
      showMenu(ctx.overlay, menuButton, [
        { label: t('대기열에 추가'), icon: 'plus', onSelect: () => { ctx.engine.enqueue(tracks); ctx.say(`${tn('곡', tracks.length)} · ${t('대기열에 넣었습니다.')}`) } },
        { label: t('유튜브에서 열기'), icon: 'external', onSelect: () => window.open(`https://www.youtube.com/playlist?list=${id}`, '_blank') },
        '-',
        {
          label: t('재생목록 삭제'),
          icon: 'trash',
          danger: true,
          onSelect: async () => {
            if (!(await confirm(ctx.overlay, `재생목록 '${title}'을(를) 삭제할까요?`))) return
            try {
              await api.deletePlaylist(ctx.cfg, id)
              ctx.say(t('삭제했습니다.'))
              await ctx.refreshPlaylists()
              ctx.go({ kind: 'playlists' })
            } catch (err) {
              ctx.say(explain(err), true)
            }
          },
        },
      ]),
    )

    // Held, because taking a track out updates it in place rather than
    // redrawing the header it sits in.
    const count = h('div', { class: 'sub' }, tn('곡', tracks.length))

    replace(
      main,
      h(
        'div',
        { class: 'head' },
        art('cover', cover ? thumbnail(cover) : undefined),
        h(
          'div',
          { style: 'min-width:0' },
          h('div', { class: 'label' }, t('재생목록')),
          h('h2', null, title),
          count,
        ),
      ),
      h(
        'div',
        { class: 'toolbar' },
        h('button', { class: 'btn primary', 'data-nav': '', onclick: () => ctx.engine.play(tracks, 0) }, icon('play', 16), t('재생')),
        h('button', { class: 'btn', 'data-nav': '', onclick: () => { ctx.engine.setShuffle(true); ctx.engine.play(tracks, 0) } }, icon('shuffle', 16), t('셔플 재생')),
        tracks[0] && h('button', { class: 'btn', 'data-nav': '', onclick: () => void startRadio(ctx, tracks[0]!) }, icon('radio', 16), t('라디오')),
        menuButton,
      ),
      tracks.length === 0 ? nothing(t('비어 있는 재생목록입니다.'), 'library') : body,
    )
    // The numbers down the left are positions, so they are wrong the moment a
    // row above them leaves. Rewritten in place rather than by redrawing:
    // the row that is playing shows bars instead of a number and must keep
    // them.
    const renumber = () => {
      let n = 0
      for (const el of Array.from(body.children)) {
        if (!el.classList.contains('row')) continue
        n += 1
        const idx = el.querySelector('.idx')
        if (idx && !idx.querySelector('.eq')) idx.textContent = String(n)
      }
    }

    const draw = () => {
      if (tracks.length === 0) {
        body.className = ''
        return replace(body, nothing(t('비어 있는 재생목록입니다.'), 'library'))
      }
      // One function, two ways in: the row's button and the menu's item both
      // put the house in order the same way afterwards.
      const gone = (track: Track) => () => {
        const at = tracks.indexOf(track)
        if (at >= 0) tracks.splice(at, 1)
        count.textContent = tn('곡', tracks.length)
        if (tracks.length === 0) draw()
        else renumber()
      }
      // **Only a playlist of one's own can have things taken out of it.**
      // 탐색 opens YouTube's own editorial playlists, and the row button
      // was offered there too — pressing it asked YouTube to edit a list
      // belonging to someone else, which it refuses, and the reader got a red
      // toast for pressing a button we drew. Reported from a phone, on a
      // 99-track list nobody here owns.
      //
      // Where the list is not ours the same slot does what every other list's
      // does: put the track somewhere that *is* ours.
      // Two signals, and the second is YouTube's own. A row that can be
      // removed arrives carrying a `setVideoId` — the handle its own remove
      // action needs — and a row that cannot does not. Measured on two lists
      // nobody here owns: 151 tracks, not one setVideoId between them. That
      // answers the question per row and keeps working when the reader's own
      // playlists have not been fetched, which our first test quietly needs.
      const mine =
        ctx.playlists.some((p) => p.id === id) || tracks.some((track) => track.setVideoId !== undefined)
      layout(ctx, body, tracks, (track) => ({
        quick: mine
          ? {
              // A bin, not a cross. A cross is what closes things; taking a
              // track out of a playlist is a deletion and should look like one.
              icon: 'trash',
              title: t('이 재생목록에서 빼기'),
              run: (rowEl) => void removeFromPlaylistNow(ctx, id, track, rowEl, gone(track)),
            }
          : addQuick(ctx, track),
        // No menu entry either way, and for two different reasons: where the
        // list is ours the X beside it already does this, and a sheet carrying
        // a second copy of the button next to it is exactly the length nobody
        // asked for; where it is not ours the action cannot succeed at all.
      }))
    }

    if (tracks.length > 0) {
      draw()
      relayoutOnModeChange(ctx, body, draw)
    }
  } catch (err) {
    if (!current(token)) return
    replace(main, h('h2', null, title), h('div', { class: 'err' }, explain(err)))
  }
}

// ── Recently played ────────────────────────────────────────────────────────

/**
 * The last fifty things this browser played.
 *
 * YouTube's own 시청 기록 needs a session, so signed out that screen is a dead
 * end — and signed out is exactly when someone has no other way back to the
 * song they heard yesterday. This is kept here instead, in this origin's own
 * storage, and never leaves the browser.
 */
function recent(ctx: Ctx, main: HTMLElement): void {
  const list = history()
  const body = h('div', { class: 'rows' })
  replace(
    main,
    h('h2', null, t('최근 감상')),
    list.length === 0
      ? nothing(t('아직 들은 것이 없습니다.'), 'history')
      : [
          h(
            'div',
            { class: 'toolbar' },
            h('button', { class: 'btn primary', 'data-nav': '', onclick: () => ctx.engine.play(list, 0) }, icon('play', 16), t('전체 재생')),
            h(
              'button',
              {
                class: 'btn ghost',
                'data-nav': '',
                onclick: async () => {
                  if (!(await confirm(ctx.overlay, t('최근 감상 기록을 지울까요?')))) return
                  forgetHistory()
                  ctx.reload()
                },
              },
              icon('trash', 16),
              t('기록 지우기'),
            ),
          ),
          body,
        ],
  )
  if (list.length === 0) return
  const draw = () => layout(ctx, body, list, (track) => ({ quick: addQuick(ctx, track) }))
  draw()
  relayoutOnModeChange(ctx, body, draw)
}

// ── Queue ──────────────────────────────────────────────────────────────────

function queue(ctx: Ctx, main: HTMLElement): void {
  const q = ctx.engine.state.queue
  replace(
    main,
    h('h2', null, t('대기열')),
    h(
      'div',
      { class: 'toolbar' },
      h('span', { class: 'sub' }, tn('개', q.length)),
      q.length > 0 && h('button', { class: 'btn', 'data-nav': '', onclick: () => void ctx.addToPlaylist(q) }, icon('library', 16), t('재생목록으로 저장')),
      // Asks first. One press was throwing away a queue that could be forty
      // tracks long with nothing to put it back.
      q.length > 0 && h(
        'button',
        {
          class: 'btn ghost',
          'data-nav': '',
          onclick: async () => {
            if (!(await confirm(ctx.overlay, t('대기열을 비울까요?'), t('비우기')))) return
            ctx.engine.clear()
            ctx.reload()
          },
        },
        icon('trash', 16),
        t('비우기'),
      ),
    ),
    q.length === 0
      ? nothing(t('대기열이 비어 있습니다.'), 'queue')
      : h(
          'div',
          { class: 'rows' },
          // Headed, because a queue's whole job is to answer two questions —
          // what is playing and what comes after it — and a flat list of forty
          // rows with one of them tinted answers neither at a glance.
          q.map((track, i) => [
            i === ctx.engine.state.index && h('h3', { class: 'queueMark' }, t('지금 재생 중')),
            i === ctx.engine.state.index + 1 && h('h3', { class: 'queueMark' }, t('다음 재생')),
            row(ctx, track, {
              index: i + 1,
              onPlay: () => ctx.engine.jumpTo(i),
              // Same idea as a playlist: what a queue row is for is leaving.
              // A bin, not a cross — a cross closes things, and this deletes
              // one. The two used to disagree between this screen and a
              // playlist, which taught the glyph to mean nothing.
              quick: {
                icon: 'trash',
                title: t('대기열에서 빼기'),
                run: () => {
                  ctx.engine.removeAt(i)
                  ctx.reload()
                },
              },
              extra: () => [
                '-',
                {
                  label: t('대기열에서 빼기'),
                  icon: 'close',
                  onSelect: () => {
                    ctx.engine.removeAt(i)
                    ctx.reload()
                  },
                },
              ],
            }),
          ]),
        ),
  )
}

export type { View }
