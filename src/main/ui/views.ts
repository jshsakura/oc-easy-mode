// The screens. Each one renders into a container it is given and owns its own
// loading, so a slow request never blocks the player bar or the sidebar.

import * as api from '../api.ts'
import { thumbnail, type Playlist, type Track } from '../parse.ts'
import { h, icon, replace } from './dom.ts'
import { explain, type Ctx, type View } from './ctx.ts'
import { confirm, showMenu } from './overlay.ts'
import { removeFromPlaylistItem, row, startRadio } from './rows.ts'

/** Draws `view` into `main`. Returns once the first paint is done. */
export async function render(ctx: Ctx, main: HTMLElement): Promise<void> {
  const view = ctx.view
  switch (view.kind) {
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

  const more = h('button', { class: 'btn ghost', style: 'margin: 16px auto 0; display: flex' }, '더 보기')
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
    replace(rows, all.map((t, i) => row(ctx, t, { index: i + 1, onPlay: () => ctx.engine.play(all, i) })))
    if (page.continuation) rows.appendChild(more)
  }

  draw()
  return rows
}

// ── Search ─────────────────────────────────────────────────────────────────

async function search(ctx: Ctx, main: HTMLElement, query: string): Promise<void> {
  const input = h('input', {
    type: 'search',
    placeholder: '노래, 영상, 채널 검색',
    value: query,
    autocomplete: 'off',
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
          h('button', { class: 'btn primary', onclick: () => ctx.engine.play(page.tracks, 0) }, icon('play', 16), '전체 재생'),
          h('button', { class: 'btn', onclick: () => { ctx.engine.enqueue(page.tracks); ctx.say(`${page.tracks.length}곡을 대기열에 넣었습니다.`) } }, icon('plus', 16), '대기열에 추가'),
          h('button', { class: 'btn', onclick: () => void ctx.addToPlaylist(page.tracks) }, icon('library', 16), '재생목록에 추가'),
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
    replace(
      main,
      h('h2', null, title),
      h(
        'div',
        { class: 'toolbar' },
        h('button', { class: 'btn primary', onclick: () => ctx.engine.play(page.tracks, 0) }, icon('play', 16), '전체 재생'),
        h('button', { class: 'btn', onclick: () => { ctx.engine.enqueue(page.tracks); ctx.say(`${page.tracks.length}개를 대기열에 넣었습니다.`) } }, icon('plus', 16), '대기열에 추가'),
      ),
      listOf(ctx, page),
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
    { class: 'card', onclick: () => ctx.go({ kind: 'playlist', id: p.id, title: p.title }) },
    h(
      'div',
      { class: 'cover', style: p.coverVideoId ? `background-image: url(${thumbnail(p.coverVideoId)})` : '' },
      !p.coverVideoId && icon('library', 28),
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
    const menuButton = h('button', { class: 'btn ghost' }, icon('more', 18))
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
        h('div', null, h('h2', { style: 'margin-bottom:4px' }, title), h('div', { class: 'sub' }, `${tracks.length}곡`)),
      ),
      h(
        'div',
        { class: 'toolbar' },
        h('button', { class: 'btn primary', onclick: () => ctx.engine.play(tracks, 0) }, icon('play', 16), '재생'),
        h('button', { class: 'btn', onclick: () => { ctx.engine.setShuffle(true); ctx.engine.play(tracks, 0) } }, icon('shuffle', 16), '셔플 재생'),
        tracks[0] && h('button', { class: 'btn', onclick: () => void startRadio(ctx, tracks[0]!) }, icon('radio', 16), '라디오'),
        menuButton,
      ),
      tracks.length === 0
        ? h('div', { class: 'empty' }, '비어 있는 재생목록입니다.')
        : h(
            'div',
            { class: 'rows' },
            tracks.map((t, i) =>
              row(ctx, t, {
                index: i + 1,
                onPlay: () => ctx.engine.play(tracks, i),
                extra: ['-', removeFromPlaylistItem(ctx, id, t)],
              }),
            ),
          ),
    )
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
      q.length > 0 && h('button', { class: 'btn', onclick: () => void ctx.addToPlaylist(q) }, icon('library', 16), '재생목록으로 저장'),
      q.length > 0 && h('button', { class: 'btn ghost', onclick: () => { ctx.engine.clear(); ctx.reload() } }, icon('trash', 16), '비우기'),
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
