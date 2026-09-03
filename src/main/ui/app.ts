// The shell around the views: sidebar, player bar, and the slot YouTube's own
// player is placed into.
//
// The slot is one element that is never re-rendered, only re-classed. That is
// deliberate: the player is positioned over it by the page-level stylesheet,
// and a slot that came and went would make the video jump every time a list
// redrew.

import { t, tn } from '../../shared/i18n.ts'
import { thumbnail } from '../parse.ts'
import type { Engine } from '../engine.ts'
import type { Shell } from '../shell.ts'
import type { VideoLayout } from '../store.ts'
import { youtubeIsDark, type Mode } from '../store.ts'
import { narrowNow } from './device.ts'
import { h, icon, mark, replace } from './dom.ts'
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
  // A strip of its own across the top, on a narrow screen only.
  //
  // **It exists because the video used to eat the chrome.** The drawer button
  // and the mode switch were fixed to the top corners and the stage was fixed
  // to the top of the screen, and the player is drawn above the whole app —
  // it has to be, or our panels would cover the picture. So in 영상 mode the
  // video landed squarely on top of both, and there was no way to open the
  // menu or get back to 음악 without knowing about Escape. Given a row of its
  // own, the header is above the stage rather than under it, and cannot be
  // covered by anything.
  const top = h('div', { class: 'top' })
  const app = h('div', { class: narrowNow() ? 'app narrow' : 'app' }, top, side, main, slot, bar)

  // Light or dark follows YouTube, and nothing else. There is no switch: the
  // page underneath already has one, and two switches for one question is a
  // way to end up looking at a light panel over a dark page.
  //
  // YouTube says which it is with an attribute on the root element, and can
  // change it while we are up, so it is watched rather than read once.
  function applyTheme(): void {
    app.classList.toggle('light', !youtubeIsDark())
  }

  /**
   * The theme button, which changes **YouTube's** setting rather than keeping
   * one of our own.
   *
   * The user's call, and the right one: two switches for one question is how
   * you end up with a light panel over a dark page. So there is still no
   * theme of ours — this presses YouTube's, and the observer above notices the
   * attribute change and repaints us with it. The choice outlives the mode,
   * which is the point of pressing it.
   *
   * The attribute is what YouTube reads right now; f6's 0x400 bit in the PREF
   * cookie is what it reads on the next page. Both, or the page snaps back.
   */
  function setYouTubeDark(on: boolean): void {
    const root = document.documentElement
    if (on) root.setAttribute('dark', '')
    else root.removeAttribute('dark')
    try {
      const raw = document.cookie.split('; ').find((c) => c.startsWith('PREF='))?.slice(5) ?? ''
      const pref = new URLSearchParams(raw)
      const f6 = Number.parseInt(pref.get('f6') ?? '0', 16) || 0
      pref.set('f6', ((on ? f6 | 0x400 : f6 & ~0x400) >>> 0).toString(16))
      document.cookie = `PREF=${pref.toString()}; domain=.youtube.com; path=/; max-age=63072000`
    } catch {
      // A browser that will not take the cookie still gets the attribute, and
      // the choice lasts as long as the page does.
    }
  }

  function themeButton(): HTMLElement {
    const dark = youtubeIsDark()
    return h(
      'button',
      {
        class: 'nav themeRow',
        'data-nav': '',
        onclick: () => {
          setYouTubeDark(!youtubeIsDark())
          drawSide()
        },
      },
      icon(dark ? 'sun' : 'moon', 18),
      h('span', null, dark ? t('밝게') : t('어둡게')),
    )
  }
  const themeWatch = new MutationObserver(applyTheme)
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] })

  // The drawer has to be above the picture while it is out, and the picture is
  // drawn above the app — so the shell puts it back down for as long as the
  // drawer is open. Without this the video covered the top of the drawer in
  // 영상 mode and the first two rows could not be pressed.
  const setDrawer = (open: boolean) => {
    app.classList.toggle('drawer-open', open)
    shell.cover(open)
  }
  const closeDrawer = () => setDrawer(false)
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
  // Where you have been, so a swipe has somewhere to go. Capped, because this
  // is a back gesture and not a session log.
  const trail: View[] = []

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
      if (nameOf(view) !== nameOf(ctx.view)) {
        trail.push(ctx.view)
        if (trail.length > 20) trail.shift()
      }
      ctx.view = view
      engine.setView(nameOf(view))
      engine.setMode(modeFor(view))
      setLayout(pictureNow())
      app.classList.remove('sheet-open')
      drawTop()
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

  // Two groups, because seven destinations in one column is a list to read
  // rather than a menu to glance at. The first four are YouTube's own screens;
  // the last three are the listener's, and a heading says which is which.
  const NAV: Array<{ view: View; label: string; icon: Parameters<typeof icon>[0]; section?: string }> = [
    { view: { kind: 'explore' }, label: t('둘러보기'), icon: 'radio' },
    { view: { kind: 'search', query: '' }, label: t('검색'), icon: 'search' },
    { view: { kind: 'home' }, label: t('홈'), icon: 'home' },
    { view: { kind: 'subs' }, label: t('구독'), icon: 'subs' },
    { view: { kind: 'history' }, label: t('시청 기록'), icon: 'history', section: t('내 라이브러리') },
    { view: { kind: 'playlists' }, label: t('내 재생목록'), icon: 'library' },
    { view: { kind: 'queue' }, label: t('대기열'), icon: 'queue' },
  ]

  /**
   * Which shape a screen's lists take.
   *
   * There is no switch any more — the user's decision: "영상과 음악모드 이거
   * 구분하지말자 홈가면 그냥 영상모드인거고", and 구독 with it. So the screen
   * says it. YouTube's own feeds are video and are drawn as a wall of
   * thumbnails; everything else is a list of tracks.
   */
  function modeFor(view: View): Mode {
    return view.kind === 'home' || view.kind === 'subs' || view.kind === 'history' ? 'video' : 'music'
  }

  /**
   * The override, in the sidebar where it was asked for.
   *
   * The screen sets the shape on the way in; this changes it for the screen
   * you are on and stays until you go somewhere else. So the common case needs
   * no press, and a list you would rather see as thumbnails is one press away.
   */
  function modeToggle(): HTMLElement {
    const on = engine.state.mode === 'video'
    return h(
      'button',
      {
        class: on ? 'modeToggle on' : 'modeToggle',
        'data-nav': '',
        role: 'switch',
        'aria-checked': on ? 'true' : 'false',
        onclick: () => {
          engine.setMode(on ? 'music' : 'video')
          setLayout(pictureNow())
          drawSide()
        },
      },
      icon(on ? 'video' : 'note', 16),
      h('span', { class: 'lbl' }, t('영상 모드')),
      h('span', { class: 'sw' }, h('span', { class: 'knob' })),
    )
  }

  // The header carries the way into the drawer and the name of the screen.
  //
  // It said "Easy Mode" before, which the drawer says too — the same words
  // twice on one screen — while the screen's own name was set in 22px type
  // below it, taking a band of a phone's height to say one word. The header
  // had the room and the content did not.
  function drawTop(): void {
    // No glyph beside the name. The header is a strip with one button and one
    // word on it; a second mark in that space reads as clutter, not as help.
    replace(
      top,
      menuButton,
      h('div', { class: 'name' }, titleOf(ctx.view)),
    )
  }

  function drawSide(): void {
    replace(
      side,
      h(
        'div',
        { class: 'brand' },
        mark(20),
        h('span', null, 'Easy Mode'),
        h('div', { class: 'spacer' }),
        // Only ever visible in the drawer. Reaching the scrim means reaching
        // across the screen, and a drawer with no close button reads as stuck.
        h(
          'button',
          { class: 'drawerClose', 'data-nav': '', title: t('닫기'), 'aria-label': t('닫기'), onclick: closeDrawer },
          icon('close', 18),
        ),
      ),
      modeToggle(),
      NAV.map((item) => [
        item.section && h('h4', null, item.section),
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
      ]),
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
      themeButton(),
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
  /** Paints how much of a slider is behind the thumb. */
  const fill = (el: HTMLInputElement, ratio: number) => {
    el.style.setProperty('--p', `${Math.max(0, Math.min(1, ratio)) * 100}%`)
  }
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
    fill(seek, Number(seek.value) / 1000)
    if (d > 0) elapsed.textContent = clock((Number(seek.value) / 1000) * d)
  })

  const menuButton = h('button', {
    class: 'drawerToggle',
    'data-nav': '',
    title: t('메뉴'),
    'aria-label': t('메뉴'),
    onclick: () => setDrawer(!app.classList.contains('drawer-open')),
  }, icon('menu', 20))

  const nowThumb = h('div', { class: 'thumb' })
  const nowTitle = h('div', { class: 't' }, t('재생 중인 항목 없음'))
  const nowBy = h('div', { class: 'b' })
  const playButton = h('button', { class: 'big', 'data-nav': '', title: t('재생 / 일시정지') }, icon('play', 20))
  playButton.addEventListener('click', () => engine.toggle())

  const prevButton = h('button', { class: 'pv', 'data-nav': '', title: t('이전') }, icon('prev', 20))
  prevButton.addEventListener('click', () => engine.prev())
  const nextButton = h('button', { class: 'nx', 'data-nav': '', title: t('다음') }, icon('next', 20))
  nextButton.addEventListener('click', () => engine.next())
  const shuffleButton = h('button', { class: 'sh', 'data-nav': '', title: t('셔플') }, icon('shuffle', 18))
  shuffleButton.addEventListener('click', () => {
    engine.setShuffle(!engine.state.shuffle)
    drawBar()
  })
  const repeatButton = h('button', { class: 'rp', 'data-nav': '', title: t('반복') }, icon('repeat', 18))
  repeatButton.addEventListener('click', () => {
    engine.cycleRepeat()
    drawBar()
  })

  const volume = h('input', { type: 'range', class: 'vol', min: '0', max: '100', value: String(engine.state.volume) })
  volume.addEventListener('input', () => {
    fill(volume, Number(volume.value) / 100)
    engine.setVolume(Number(volume.value))
  })
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

  // ── The bar, and the full player it becomes on a phone ───────────────────
  //
  // **One set of controls, two layouts.** A phone has no room for a track, a
  // transport, a seek bar and four buttons on one line, and every attempt to
  // fit them made the bar a row of stamps. So on a narrow screen the bar shows
  // the track and two buttons, with the progress drawn as a hairline along its
  // top edge, and tapping it opens the same element full-screen with
  // everything on it. Rearranged entirely in CSS, so there is no second player
  // to keep in step and nothing extra to wire.
  const sheetClose = h(
    'button',
    { class: 'sheetClose', 'data-nav': '', title: t('내리기'), 'aria-label': t('내리기'), onclick: () => setSheet(false) },
    icon('down', 22),
  )
  const now = h('div', { class: 'now' }, nowThumb, h('div', { class: 'nowText' }, nowTitle, nowBy))
  // The track itself is the handle: a phone opens the player by tapping what
  // is playing, which is what every music app has taught. It is a button on a
  // narrow screen only — on a desktop the bar is already showing everything,
  // and a click that did nothing visible would only puzzle.
  now.addEventListener('click', () => {
    if (app.classList.contains('narrow') && !app.classList.contains('sheet-open')) setSheet(true)
  })

  bar.append(
    sheetClose,
    now,
    h(
      'div',
      { class: 'center' },
      h('div', { class: 'ctl' }, shuffleButton, prevButton, playButton, nextButton, repeatButton),
      h('div', { class: 'seek' }, elapsed, seek, total),
    ),
    h('div', { class: 'right' }, videoButton, queueButton, muteButton, volume),
  )

  function setSheet(open: boolean): void {
    app.classList.toggle('sheet-open', open)
    if (open) sheetClose.focus()
  }

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
    fill(volume, engine.state.volume / 100)
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
      const ratio = p.duration > 0 ? p.current / p.duration : 0
      seek.value = String(Math.round(ratio * 1000))
      fill(seek, ratio)
    }
  }

  // ── Wiring ───────────────────────────────────────────────────────────────

  // Rotating a phone, or dragging a window, changes the answer.
  const onResize = () => {
    const narrow = narrowNow()
    if (narrow === app.classList.contains('narrow')) return
    app.classList.toggle('narrow', narrow)
    // A remote should not be able to land on the track block where tapping it
    // does nothing, and must be able to where it opens the player.
    if (narrow) now.setAttribute('data-nav', '')
    else now.removeAttribute('data-nav')
    if (!narrow) {
      setDrawer(false)
      app.classList.remove('sheet-open')
    }
  }
  window.addEventListener('resize', onResize)

  // Escape closes the player, then the drawer. The second Escape within a
  // second still leaves the mode — that is shell.ts, on the document in the
  // capture phase, and nothing here consumes the key.
  const onEscape = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return
    if (app.classList.contains('sheet-open')) app.classList.remove('sheet-open')
    else if (app.classList.contains('drawer-open')) closeDrawer()
  }

  document.addEventListener('keydown', onEscape)
  // Adding a viewport meta reflows the page; on some engines that lands
  // without a resize event, so the first two frames are checked directly.
  requestAnimationFrame(onResize)
  setTimeout(onResize, 300)

  // ── Swipe back ───────────────────────────────────────────────────────────
  //
  // A phone expects the edge swipe to go back, and here it could not: the app
  // never changes the URL — that is the promise that leaving is a deletion —
  // so the browser's own gesture has no history of ours to walk and would take
  // the whole page off YouTube instead.
  //
  // **It only starts within 24px of the left edge.** A swipe that could start
  // anywhere would fight the shelves, which are horizontal scrollers, and the
  // seek bar. That is also where a phone teaches people to start it.
  let swipeX = 0
  let swipeY = 0
  let swiping = false
  const onTouchStart = (ev: TouchEvent) => {
    const t = ev.touches[0]
    if (!t || !app.classList.contains('narrow')) return
    swiping = t.clientX <= 24
    swipeX = t.clientX
    swipeY = t.clientY
  }
  const onTouchMove = (ev: TouchEvent) => {
    if (!swiping) return
    const t = ev.touches[0]
    if (!t) return
    if (Math.abs(t.clientY - swipeY) > 44) {
      swiping = false
      return
    }
    if (t.clientX - swipeX < 70) return
    swiping = false
    goBack()
  }
  const onTouchEnd = () => {
    swiping = false
  }

  /** Closes what is on top, else steps back through the screens. */
  function goBack(): void {
    if (app.classList.contains('sheet-open')) return setSheet(false)
    if (app.classList.contains('drawer-open')) return closeDrawer()
    const previous = trail.pop()
    if (!previous) return
    // Not ctx.go: that would push the screen we are leaving onto the trail and
    // the gesture would walk between two screens forever.
    ctx.view = previous
    engine.setView(nameOf(previous))
    drawTop()
    drawSide()
    void render(ctx, main)
    main.scrollTop = 0
  }

  app.addEventListener('touchstart', onTouchStart, { passive: true })
  app.addEventListener('touchmove', onTouchMove, { passive: true })
  app.addEventListener('touchend', onTouchEnd, { passive: true })

  // ── Typing ───────────────────────────────────────────────────────────────
  //
  // **YouTube eats letters out of our search box.** Its shortcuts live on the
  // document — c for captions, k for play/pause, m for mute, f, j, l, i, t, o,
  // and the digits for seeking — and it decides whether to swallow a key by
  // looking at the event's target. Our input is in a shadow root, so by the
  // time the event reaches the document it has been retargeted to the host
  // element: not a text field as far as YouTube can tell, so it takes the key
  // and calls preventDefault. Typing 'c' did nothing at all.
  //
  // Stopped here, at the app, on the way up — before the document ever sees
  // it. shell.ts's panic key and the remote both listen in the capture phase,
  // which runs first, so neither loses anything.
  // **The first tap is what makes playback possible on iOS.**
  //
  // WebKit lets script drive a media element only after a gesture has started
  // that element at least once, and loadVideoById is asynchronous — by the
  // time it has a source, the activation that asked for it is spent, so the
  // track sits there loaded and paused. Playing and immediately pausing the
  // element that is already there costs nothing visible and hands over the
  // permission for the rest of the session. Once.
  let unlocked = false
  const unlockOnFirstTouch = () => {
    if (unlocked) return
    unlocked = true
    const el = document.querySelector('video')
    if (!el || !el.paused) return
    void Promise.resolve(el.play())
      .then(() => el.pause())
      .catch(() => {
        unlocked = false
      })
  }
  app.addEventListener('pointerdown', unlockOnFirstTouch, { capture: true })

  const onKeyInField = (ev: KeyboardEvent) => {
    const el = ev.composedPath()[0] as HTMLElement | undefined
    if (!el) return
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) ev.stopPropagation()
  }
  for (const type of ['keydown', 'keypress', 'keyup'] as const) {
    app.addEventListener(type, onKeyInField)
  }

  const offRemote = installRemote(shell.root, shell.overlay)

  // The picture is up while something is playing and gone when nothing is —
  // asked for in those words ("재생할때는 위쪽에 플레이어 보여주고"), and it
  // answers the question the lists cannot: whether what you are hearing is a
  // video or a song. Choosing 구석에 두기 or 소리만 듣기 from the bar still
  // wins until the next track.
  /**
   * Where the picture goes when something is playing.
   *
   * A phone gets the stage: there is nowhere to float on 390 pixels, and a
   * window over the list is a window over the thing you are reading. A desktop
   * gets the stage on the screens that are about pictures and the corner
   * window on a track list, which is what the room is for.
   */
  function pictureNow(): VideoLayout {
    if (!engine.current) return 'hidden'
    if (engine.state.mode === 'video') return 'stage'
    // Music: a corner window where there is room for one, and nothing at all
    // on a phone. Leaving the stage up with the switch off was the bug —
    // pressing it has to change something.
    return narrowNow() ? 'hidden' : 'corner'
  }

  let showing = engine.current?.videoId
  const offChange = engine.subscribe(() => {
    const id = engine.current?.videoId
    if (id !== showing) {
      showing = id
      setLayout(pictureNow())
    }
    drawBar()
    if (ctx.view.kind === 'queue') ctx.reload()
  })
  const offTick = engine.onTick(drawTick)

  applyTheme()
  if (narrowNow()) now.setAttribute('data-nav', '')
  drawTop()
  drawSide()
  drawBar()
  drawTick()
  engine.setMode(modeFor(ctx.view))
  setLayout(pictureNow())
  void render(ctx, main)

  // The sidebar's playlist list arrives late and is not worth blocking on.
  void ctx.refreshPlaylists().then(drawSide).catch(() => {})

  return {
    ctx,
    destroy() {
      themeWatch.disconnect()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('keydown', onEscape)
      offRemote()
      offChange()
      offTick()
    },
  }
}

/** What the header calls the screen. The same words the sidebar uses. */
function titleOf(view: View): string {
  switch (view.kind) {
    case 'explore':
      return t('둘러보기')
    case 'search':
      return t('검색')
    case 'home':
      return t('홈')
    case 'subs':
      return t('구독')
    case 'history':
      return t('시청 기록')
    case 'playlists':
      return t('내 재생목록')
    case 'queue':
      return t('대기열')
    case 'playlist':
      return view.title
  }
}

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
