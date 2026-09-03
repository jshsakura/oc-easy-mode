// The shell around the views: sidebar, player bar, and the slot YouTube's own
// player is placed into.
//
// The slot is one element that is never re-rendered, only re-classed. That is
// deliberate: the player is positioned over it by the page-level stylesheet,
// and a slot that came and went would make the video jump every time a list
// redrew.

import { getLang, setLang, t, tn, type Lang } from '../../shared/i18n.ts'
import { thumbnail } from '../parse.ts'
import type { Engine } from '../engine.ts'
import type { Shell } from '../shell.ts'
import type { VideoLayout } from '../store.ts'
import { layoutFor, youtubeIsDark, type Theme } from '../store.ts'
import { narrowNow } from './device.ts'
import { h, icon, replace } from './dom.ts'
import { STYLES } from './styles.ts'
import { clock, type Ctx, type View } from './ctx.ts'
import { showMenu, toast } from './overlay.ts'
import { installRemote } from './remote.ts'
import { render } from './views.ts'

export interface AppOptions {
  shell: Shell
  engine: Engine
  /** Leaves the mode: the one thing this UI promises always works. */
  exit(): void
  /** Everything a view needs that the app does not own. */
  ctx: Omit<Ctx, 'view' | 'go' | 'reload' | 'say' | 'overlay'>
}

export function mountApp(opts: AppOptions): { ctx: Ctx; destroy(): void } {
  const { shell, engine } = opts

  const main = h('div', { class: 'main' })
  const slot = h('div', { class: 'slot' })
  const side = h('div', { class: 'side' })
  const bar = h('div', { class: 'bar' })
  // The sidebar is a column when there is room beside the content and a drawer
  // when there is not. Decided by the viewport, which is the only thing that
  // knows — see device.ts.
  const app = h('div', { class: narrowNow() ? 'app narrow' : 'app' }, side, main, slot, bar)

  // Light or dark: what the reader chose, else whatever YouTube is set to.
  function applyTheme(): void {
    const dark = engine.state.theme === 'auto' ? youtubeIsDark() : engine.state.theme === 'dark'
    app.classList.toggle('light', !dark)
  }

  const closeDrawer = () => app.classList.remove('drawer-open')
  const scrim = h('div', { class: 'drawerScrim', onclick: closeDrawer })
  app.appendChild(scrim)

  const style = document.createElement('style')
  style.textContent = STYLES
  shell.root.append(style, app)

  const overlayStyle = document.createElement('style')
  overlayStyle.textContent = STYLES
  shell.overlay.append(overlayStyle)

  // ── Context ──────────────────────────────────────────────────────────────

  // Delegating rather than spreading, because `playlists` is filled in after
  // mount: a spread would freeze today's empty array into the sidebar forever.
  const ctx: Ctx = {
    engine: opts.ctx.engine,
    cfg: opts.ctx.cfg,
    get playlists() {
      return opts.ctx.playlists
    },
    refreshPlaylists: () => opts.ctx.refreshPlaylists(),
    addToPlaylist: (tracks) => opts.ctx.addToPlaylist(tracks),
    overlay: shell.overlay,
    view: viewFromName(engine.state.view),
    go(view) {
      ctx.view = view
      engine.setView(nameOf(view))
      drawSide()
      void render(ctx, main)
      main.scrollTop = 0
    },
    reload() {
      void render(ctx, main)
    },
    say(message, bad) {
      toast(shell.overlay, message, bad)
    },
  }

  // ── Sidebar ──────────────────────────────────────────────────────────────

  const NAV: Array<{ view: View; label: string; icon: Parameters<typeof icon>[0] }> = [
    { view: { kind: 'explore' }, label: t('둘러보기'), icon: 'radio' },
    { view: { kind: 'search', query: '' }, label: t('검색'), icon: 'search' },
    { view: { kind: 'home' }, label: t('홈'), icon: 'home' },
    { view: { kind: 'subs' }, label: t('구독'), icon: 'subs' },
    { view: { kind: 'history' }, label: t('시청 기록'), icon: 'history' },
    { view: { kind: 'playlists' }, label: t('내 재생목록'), icon: 'library' },
    { view: { kind: 'queue' }, label: t('대기열'), icon: 'queue' },
  ]

  function drawSide(): void {
    const mode = engine.state.mode
    replace(
      side,
      h('div', { class: 'brand' }, icon('note', 20), h('span', null, 'Easy Mode')),
      h(
        'div',
        { class: 'modes' },
        (['music', 'video'] as const).map((m) =>
          h(
            'button',
            {
              class: mode === m ? 'mode on' : 'mode',
              'data-nav': '',
              onclick: () => {
                engine.setMode(m)
                setLayout(layoutFor(m))
                drawSide()
                drawBar()
              },
            },
            m === 'music' ? t('음악') : t('영상'),
          ),
        ),
      ),
      NAV.map((item) =>
        h(
          'button',
          {
            class: nameOf(item.view) === nameOf(ctx.view) ? 'nav on' : 'nav',
            'data-nav': '',
            onclick: () => {
              closeDrawer()
              ctx.go(item.view)
            },
          },
          icon(item.icon, 18),
          h('span', null, item.label),
        ),
      ),
      ctx.playlists.length > 0 && h('h4', null, t('재생목록')),
      ctx.playlists.slice(0, 30).map((p) =>
        h(
          'button',
          {
            class: 'nav pl',
            'data-nav': '',
            title: p.title,
            onclick: () => {
              closeDrawer()
              ctx.go({ kind: 'playlist', id: p.id, title: p.title })
            },
          },
          p.title,
        ),
      ),
      h('div', { class: 'spacer' }),
      h(
        'button',
        {
          class: 'nav',
          'data-nav': '',
          title: t('테마'),
          onclick: () => {
            const order: Theme[] = ['auto', 'light', 'dark']
            engine.setTheme(order[(order.indexOf(engine.state.theme) + 1) % order.length]!)
            applyTheme()
            drawSide()
          },
        },
        icon(engine.state.theme === 'light' ? 'sun' : engine.state.theme === 'dark' ? 'moon' : 'auto', 18),
        h('span', null, `${t('테마')} · ${THEME_LABEL[engine.state.theme]}`),
      ),
      h(
        'button',
        {
          class: 'nav',
          'data-nav': '',
          title: 'ko / en',
          onclick: () => {
            const next: Lang = getLang() === 'ko' ? 'en' : 'ko'
            setLang(next)
            engine.setLang(next)
            drawSide()
            drawBar()
            ctx.reload()
          },
        },
        icon('globe', 18),
        h('span', null, getLang() === 'ko' ? '한국어' : 'English'),
      ),
      h(
        'button',
        { class: 'exit', 'data-nav': '', title: 'Esc × 2', onclick: opts.exit },
        icon('back', 18),
        h('span', null, t('이지 모드 종료')),
      ),
    )
  }

  // ── The player slot ──────────────────────────────────────────────────────

  function setLayout(layout: VideoLayout): void {
    engine.setVideo(layout)
    slot.className = `slot ${layout}`
    app.classList.toggle('has-stage', layout === 'stage')
    app.classList.toggle('has-corner', layout === 'corner')
    shell.place(layout === 'hidden' ? null : slot)
    drawBar()
  }

  // ── Player bar ───────────────────────────────────────────────────────────

  const seek = h('input', { type: 'range', min: '0', max: '1000', value: '0' })
  const elapsed = h('span', null, '0:00')
  const total = h('span', null, '0:00')
  let scrubbing = false
  seek.addEventListener('pointerdown', () => (scrubbing = true))
  const commit = () => {
    const d = engine.position.duration
    if (d > 0) engine.seek((Number(seek.value) / 1000) * d)
    scrubbing = false
  }
  seek.addEventListener('pointerup', commit)
  seek.addEventListener('change', commit)
  seek.addEventListener('input', () => {
    const d = engine.position.duration
    if (d > 0) elapsed.textContent = clock((Number(seek.value) / 1000) * d)
  })

  const menuButton = h('button', {
    class: 'drawerToggle',
    'data-nav': '',
    title: t('메뉴'),
    'aria-label': t('메뉴'),
    onclick: () => app.classList.toggle('drawer-open'),
  }, icon('queue', 20))

  const nowThumb = h('div', { class: 'thumb' })
  const nowTitle = h('div', { class: 't' }, t('재생 중인 항목 없음'))
  const nowBy = h('div', { class: 'b' })
  const playButton = h('button', { class: 'big', 'data-nav': '', title: t('재생 / 일시정지') }, icon('play', 20))
  playButton.addEventListener('click', () => engine.toggle())

  const prevButton = h('button', { 'data-nav': '', title: t('이전') }, icon('prev', 20))
  prevButton.addEventListener('click', () => engine.prev())
  const nextButton = h('button', { 'data-nav': '', title: t('다음') }, icon('next', 20))
  nextButton.addEventListener('click', () => engine.next())
  const shuffleButton = h('button', { 'data-nav': '', title: t('셔플') }, icon('shuffle', 18))
  shuffleButton.addEventListener('click', () => {
    engine.setShuffle(!engine.state.shuffle)
    drawBar()
  })
  const repeatButton = h('button', { 'data-nav': '', title: t('반복') }, icon('repeat', 18))
  repeatButton.addEventListener('click', () => {
    engine.cycleRepeat()
    drawBar()
  })

  const volume = h('input', { type: 'range', class: 'vol', min: '0', max: '100', value: String(engine.state.volume) })
  volume.addEventListener('input', () => engine.setVolume(Number(volume.value)))
  const muteButton = h('button', { 'data-nav': '', title: t('음소거') }, icon('volume', 18))
  muteButton.addEventListener('click', () => {
    const on = engine.state.volume === 0
    engine.setVolume(on ? 70 : 0)
    volume.value = String(engine.state.volume)
    drawBar()
  })

  const videoButton = h('button', { 'data-nav': '', title: t('화면 위치') }, icon('video', 18))
  videoButton.addEventListener('click', () =>
    showMenu(shell.overlay, videoButton, [
      { label: t('크게 보기'), icon: 'expand', onSelect: () => setLayout('stage') },
      { label: t('구석에 두기'), icon: 'video', onSelect: () => setLayout('corner') },
      { label: t('소리만 듣기'), icon: 'videoOff', onSelect: () => setLayout('hidden') },
    ]),
  )

  const queueButton = h('button', { 'data-nav': '', title: t('대기열') }, icon('queue', 18))
  queueButton.addEventListener('click', () => ctx.go({ kind: 'queue' }))

  bar.append(
    h('div', { class: 'now' }, menuButton, nowThumb, h('div', { style: 'min-width:0' }, nowTitle, nowBy)),
    h(
      'div',
      { class: 'center' },
      h('div', { class: 'ctl' }, shuffleButton, prevButton, playButton, nextButton, repeatButton),
      h('div', { class: 'seek' }, elapsed, seek, total),
    ),
    h('div', { class: 'right' }, videoButton, queueButton, muteButton, volume),
  )

  function drawBar(): void {
    const track = engine.current
    nowTitle.textContent = track ? track.title : t('재생 중인 항목 없음')
    nowBy.textContent = track ? track.byline : ''
    nowThumb.style.backgroundImage = track ? `url(${thumbnail(track.videoId)})` : ''
    shuffleButton.classList.toggle('on', engine.state.shuffle)
    repeatButton.classList.toggle('on', engine.state.repeat !== 'off')
    replace(repeatButton, icon(engine.state.repeat === 'one' ? 'repeatOne' : 'repeat', 18))
    repeatButton.title = { off: t('반복 안 함'), all: t('전체 반복'), one: t('한 곡 반복') }[engine.state.repeat]
    replace(muteButton, icon(engine.state.volume === 0 ? 'mute' : 'volume', 18))
    replace(videoButton, icon(engine.state.video === 'hidden' ? 'videoOff' : 'video', 18))
    videoButton.classList.toggle('on', engine.state.video === 'stage')
    prevButton.disabled = engine.state.queue.length === 0
    nextButton.disabled = engine.state.queue.length === 0
  }

  function drawTick(): void {
    const p = engine.position
    replace(playButton, icon(p.playing ? 'pause' : 'play', 20))
    total.textContent = clock(p.duration)
    if (!scrubbing) {
      elapsed.textContent = clock(p.current)
      seek.value = String(p.duration > 0 ? Math.round((p.current / p.duration) * 1000) : 0)
    }
  }

  // ── Wiring ───────────────────────────────────────────────────────────────

  // Rotating a phone, or dragging a window, changes the answer.
  const onResize = () => {
    const narrow = narrowNow()
    if (narrow === app.classList.contains('narrow')) return
    app.classList.toggle('narrow', narrow)
    if (!narrow) app.classList.remove('drawer-open')
  }
  window.addEventListener('resize', onResize)
  // Adding a viewport meta reflows the page; on some engines that lands
  // without a resize event, so the first two frames are checked directly.
  requestAnimationFrame(onResize)
  setTimeout(onResize, 300)

  const offRemote = installRemote(shell.root, shell.overlay)

  const offChange = engine.subscribe(() => {
    drawBar()
    if (ctx.view.kind === 'queue') ctx.reload()
  })
  const offTick = engine.onTick(drawTick)

  applyTheme()
  drawSide()
  drawBar()
  drawTick()
  setLayout(engine.state.video)
  void render(ctx, main)

  // The sidebar's playlist list arrives late and is not worth blocking on.
  void ctx.refreshPlaylists().then(drawSide).catch(() => {})

  return {
    ctx,
    destroy() {
      window.removeEventListener('resize', onResize)
      offRemote()
      offChange()
      offTick()
    },
  }
}

const THEME_LABEL: Record<Theme, string> = { auto: '자동', light: '밝게', dark: '어둡게' }

/** The view name that survives a reload, and its way back. */
function nameOf(view: View): string {
  return view.kind === 'playlist' ? `playlist:${view.id}:${view.title}` : view.kind
}

function viewFromName(name: string): View {
  if (name.startsWith('playlist:')) {
    const rest = name.slice('playlist:'.length)
    const cut = rest.indexOf(':')
    if (cut > 0) return { kind: 'playlist', id: rest.slice(0, cut), title: rest.slice(cut + 1) }
  }
  switch (name) {
    case 'explore':
    case 'home':
    case 'subs':
    case 'history':
    case 'playlists':
    case 'queue':
      return { kind: name }
    default:
      return { kind: 'search', query: '' }
  }
}
