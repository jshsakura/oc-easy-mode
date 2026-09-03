// The screens. Each one renders into a container it is given and owns its own
// loading, so a slow request never blocks the player bar or the sidebar.

import * as api from '../api.ts'
import { thumbnail, type Playlist, type Shelf, type Track } from '../parse.ts'
import { h, icon, replace } from './dom.ts'
import { explain, type Ctx, type View } from './ctx.ts'
import { confirm, showMenu } from './overlay.ts'
import { removeFromPlaylistItem, row, startRadio } from './rows.ts'

/** Draws `view` into `main`. Returns once the first paint is done. */
export async function render(ctx: Ctx, main: HTMLElement): Promise<void> {
  const view = ctx.view
  switch (view.kind) {
    case 'explore':
      return explore(ctx, main)
    case 'search':
      return search(ctx, main, view.query)
    case 'home':
      return listFeed(ctx, main, '홈', 'FEwhat_to_watch')
    case 'subs':
      return listFeed(ctx, main, '구독', 'FEsubscriptions')
    case 'history':
      return listFeed(ctx, main, '시청 기록', 'FEhistory')
    case 'playlists':
      return playlists(ctx, main)
    case 'playlist':
      return playlist(ctx, main, view.id, view.title)
    case 'queue':
      return queue(ctx, main)
  }
}

function busy(text = '가져오는 중…'): HTMLElement {
  return h('div', { class: 'empty' }, text)
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

  const more = h('button', { class: 'btn ghost', 'data-nav': '', style: 'margin: 16px auto 0; display: flex' }, '더 보기')
  more.addEventListener('click', async () => {
    more.textContent = '가져오는 중…'
    more.disabled = true
    try {
      const next = await api.more(ctx.cfg, page)
      all = all.concat(next.tracks)
      page = next
      draw()
    } catch (err) {
      ctx.say(explain(err), true)
      more.textContent = '더 보기'
      more.disabled = false
    }
  })

  function draw(): void {
    layout(ctx, rows, all, () => ({}))
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
  extraFor: (t: Track) => { extra?: Parameters<typeof row>[2]['extra'] },
): void {
  const asGrid = ctx.engine.state.mode === 'video'
  into.className = asGrid ? 'grid' : 'rows'
  replace(
    into,
    asGrid
      ? list.map((_, i) => trackTile(ctx, list, i))
      : list.map((t, i) =>
          row(ctx, t, { index: i + 1, onPlay: () => ctx.engine.play(list, i), ...extraFor(t) }),
        ),
  )
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
function tile(opts: {
  cover?: string
  title: string
  sub: string
  /** Drawn on the artwork: a running time, a track count. */
  badge?: string
  square?: boolean
  onOpen(): void
}): HTMLElement {
  return h(
    'button',
    { class: opts.square ? 'tile square' : 'tile', 'data-nav': '', onclick: opts.onOpen },
    h(
      'div',
      { class: 'cover', style: opts.cover ? `background-image: url(${opts.cover})` : '' },
      !opts.cover && icon('note', 26),
      opts.badge && h('span', { class: 'badge' }, opts.badge),
      h('span', { class: 'play' }, icon('play', 20)),
    ),
    h('div', { class: 't', title: opts.title }, opts.title),
    h('div', { class: 's' }, opts.sub),
  )
}

function trackTile(ctx: Ctx, list: Track[], i: number): HTMLElement {
  const t = list[i]!
  return tile({
    cover: thumbnail(t.videoId),
    title: t.title,
    sub: t.byline,
    badge: t.duration,
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

// ── Explore ────────────────────────────────────────────────────────────────

async function explore(ctx: Ctx, main: HTMLElement): Promise<void> {
  replace(main, h('h2', null, '둘러보기'), busy())
  try {
    const page = await api.explore(ctx.cfg)
    if (page.shelves.length === 0 && page.tracks.length === 0) {
      return replace(main, h('h2', null, '둘러보기'), h('div', { class: 'empty' }, '보여줄 것이 없습니다.'))
    }
    replace(
      main,
      h('h2', null, '둘러보기'),
      page.shelves.map((shelf) => shelfRow(ctx, shelf)),
      page.shelves.length === 0 && h('div', { class: 'grid' }, page.tracks.map((_, i) => trackTile(ctx, page.tracks, i))),
    )
  } catch (err) {
    replace(main, h('h2', null, '둘러보기'), h('div', { class: 'err' }, explain(err)))
  }
}

// ── Search ─────────────────────────────────────────────────────────────────

async function search(ctx: Ctx, main: HTMLElement, query: string): Promise<void> {
  const input = h('input', {
    type: 'search',
    placeholder: '노래, 영상, 채널 검색',
    value: query,
    autocomplete: 'off',
    'data-nav': '',
  })
  const results = h('div')
  const box = h('div', { class: 'searchbox' }, icon('search', 20), input)
  replace(main, h('h2', null, '검색'), box, results)

  const run = async (q: string) => {
    if (!q.trim()) return replace(results, h('div', { class: 'empty' }, '무엇을 들을까요?'))
    replace(results, busy())
    try {
      const page = await api.search(ctx.cfg, q.trim())
      if (page.tracks.length === 0) return replace(results, h('div', { class: 'empty' }, '결과가 없습니다.'))
      replace(
        results,
        h(
          'div',
          { class: 'toolbar' },
          h('button', { class: 'btn primary', 'data-nav': '', onclick: () => ctx.engine.play(page.tracks, 0) }, icon('play', 16), '전체 재생'),
          h('button', { class: 'btn', 'data-nav': '', onclick: () => { ctx.engine.enqueue(page.tracks); ctx.say(`${page.tracks.length}곡을 대기열에 넣었습니다.`) } }, icon('plus', 16), '대기열에 추가'),
          h('button', { class: 'btn', 'data-nav': '', onclick: () => void ctx.addToPlaylist(page.tracks) }, icon('library', 16), '재생목록에 추가'),
        ),
        listOf(ctx, page),
      )
    } catch (err) {
      replace(results, h('div', { class: 'err' }, explain(err)))
    }
  }

  input.addEventListener('keydown', (ev) => {
    if ((ev as KeyboardEvent).key !== 'Enter') return
    const q = input.value
    ctx.go({ kind: 'search', query: q })
  })
  input.focus()
  await run(query)
}

// ── Feeds ──────────────────────────────────────────────────────────────────

async function listFeed(ctx: Ctx, main: HTMLElement, title: string, id: api.FeedId): Promise<void> {
  replace(main, h('h2', null, title), busy())
  try {
    const page = await api.feed(ctx.cfg, id)
    if (page.tracks.length === 0) {
      return replace(main, h('h2', null, title), h('div', { class: 'empty' }, '보여줄 것이 없습니다.'))
    }
    // A feed that came with its own titled rows keeps them. YouTube's home is
    // shaped that way when there is a history behind it, and flattening it
    // would throw away the only editorial structure on the screen.
    replace(
      main,
      h('h2', null, title),
      h(
        'div',
        { class: 'toolbar' },
        h('button', { class: 'btn primary', 'data-nav': '', onclick: () => ctx.engine.play(page.tracks, 0) }, icon('play', 16), '전체 재생'),
        h('button', { class: 'btn', 'data-nav': '', onclick: () => { ctx.engine.enqueue(page.tracks); ctx.say(`${page.tracks.length}개를 대기열에 넣었습니다.`) } }, icon('plus', 16), '대기열에 추가'),
      ),
      page.shelves.length > 0 ? page.shelves.map((shelf) => shelfRow(ctx, shelf)) : listOf(ctx, page),
    )
  } catch (err) {
    replace(main, h('h2', null, title), h('div', { class: 'err' }, explain(err)))
  }
}

// ── Playlists ──────────────────────────────────────────────────────────────

async function playlists(ctx: Ctx, main: HTMLElement): Promise<void> {
  replace(main, h('h2', null, '내 재생목록'), busy())
  try {
    await ctx.refreshPlaylists()
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
      '새 재생목록',
    )
    replace(
      main,
      h('h2', null, '내 재생목록'),
      h('div', { class: 'toolbar' }, create),
      list.length === 0
        ? h('div', { class: 'empty' }, '재생목록이 없습니다.')
        : h('div', { class: 'cards' }, list.map((p) => card(ctx, p))),
    )
  } catch (err) {
    replace(main, h('h2', null, '내 재생목록'), h('div', { class: 'err' }, explain(err)))
  }
}

function card(ctx: Ctx, p: Playlist): HTMLElement {
  return h(
    'button',
    { class: 'card', 'data-nav': '', onclick: () => ctx.go({ kind: 'playlist', id: p.id, title: p.title }) },
    h(
      'div',
      { class: 'cover', style: p.cover ? `background-image: url(${p.cover})` : '' },
      !p.cover && icon('library', 28),
      h('span', { class: 'play' }, icon('play', 20)),
    ),
    h('div', { class: 't', title: p.title }, p.title),
    h('div', { class: 's' }, p.subtitle),
  )
}

async function playlist(ctx: Ctx, main: HTMLElement, id: string, title: string): Promise<void> {
  replace(main, h('h2', null, title), busy())
  try {
    const tracks = await api.playlistTracks(ctx.cfg, id)
    const cover = tracks[0]?.videoId
    const body = h('div', { class: 'rows' })
    const menuButton = h('button', { class: 'btn ghost', 'data-nav': '' }, icon('more', 18))
    menuButton.addEventListener('click', () =>
      showMenu(ctx.overlay, menuButton, [
        { label: '대기열에 추가', icon: 'plus', onSelect: () => { ctx.engine.enqueue(tracks); ctx.say(`${tracks.length}곡을 대기열에 넣었습니다.`) } },
        { label: '유튜브에서 열기', icon: 'external', onSelect: () => window.open(`https://www.youtube.com/playlist?list=${id}`, '_blank') },
        '-',
        {
          label: '재생목록 삭제',
          icon: 'trash',
          danger: true,
          onSelect: async () => {
            if (!(await confirm(ctx.overlay, `재생목록 '${title}'을(를) 삭제할까요?`))) return
            try {
              await api.deletePlaylist(ctx.cfg, id)
              ctx.say('삭제했습니다.')
              await ctx.refreshPlaylists()
              ctx.go({ kind: 'playlists' })
            } catch (err) {
              ctx.say(explain(err), true)
            }
          },
        },
      ]),
    )

    replace(
      main,
      h(
        'div',
        { class: 'head' },
        h('div', { class: 'cover', style: cover ? `background-image: url(${thumbnail(cover)})` : '' }),
        h(
          'div',
          { style: 'min-width:0' },
          h('div', { class: 'label' }, '재생목록'),
          h('h2', null, title),
          h('div', { class: 'sub' }, `${tracks.length}곡`),
        ),
      ),
      h(
        'div',
        { class: 'toolbar' },
        h('button', { class: 'btn primary', 'data-nav': '', onclick: () => ctx.engine.play(tracks, 0) }, icon('play', 16), '재생'),
        h('button', { class: 'btn', 'data-nav': '', onclick: () => { ctx.engine.setShuffle(true); ctx.engine.play(tracks, 0) } }, icon('shuffle', 16), '셔플 재생'),
        tracks[0] && h('button', { class: 'btn', 'data-nav': '', onclick: () => void startRadio(ctx, tracks[0]!) }, icon('radio', 16), '라디오'),
        menuButton,
      ),
      tracks.length === 0 ? h('div', { class: 'empty' }, '비어 있는 재생목록입니다.') : body,
    )
    if (tracks.length > 0) {
      const draw = () => layout(ctx, body, tracks, (t) => ({ extra: ['-', removeFromPlaylistItem(ctx, id, t)] }))
      draw()
      relayoutOnModeChange(ctx, body, draw)
    }
  } catch (err) {
    replace(main, h('h2', null, title), h('div', { class: 'err' }, explain(err)))
  }
}

// ── Queue ──────────────────────────────────────────────────────────────────

function queue(ctx: Ctx, main: HTMLElement): void {
  const q = ctx.engine.state.queue
  replace(
    main,
    h('h2', null, '대기열'),
    h(
      'div',
      { class: 'toolbar' },
      h('span', { class: 'sub' }, `${q.length}개`),
      q.length > 0 && h('button', { class: 'btn', 'data-nav': '', onclick: () => void ctx.addToPlaylist(q) }, icon('library', 16), '재생목록으로 저장'),
      q.length > 0 && h('button', { class: 'btn ghost', 'data-nav': '', onclick: () => { ctx.engine.clear(); ctx.reload() } }, icon('trash', 16), '비우기'),
    ),
    q.length === 0
      ? h('div', { class: 'empty' }, '대기열이 비어 있습니다.')
      : h(
          'div',
          { class: 'rows' },
          q.map((t, i) =>
            row(ctx, t, {
              index: i + 1,
              onPlay: () => ctx.engine.jumpTo(i),
              extra: [
                '-',
                {
                  label: '대기열에서 빼기',
                  icon: 'close',
                  onSelect: () => {
                    ctx.engine.removeAt(i)
                    ctx.reload()
                  },
                },
              ],
            }),
          ),
        ),
  )
}

export type { View }
