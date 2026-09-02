// Entry. Decides whether the mode is on, and if it is, puts it up.
//
// The order matters and is the safety story in miniature:
//
//   1. Read the flag. Off is the default and the fast path — the script stops
//      here on a page nobody asked to change.
//   2. Mount the shell (one stylesheet, one host). YouTube is now hidden.
//   3. From here on, every failure exits rather than reports. A stuck loading
//      screen over a hidden page is worse than no extension at all.

import * as api from './api.ts'
import { Engine } from './engine.ts'
import { InnertubeError } from './innertube.ts'
import type { Playlist, Track } from './parse.ts'
import { videoIdInUrl, waitForPlayer } from './player.ts'
import { alreadyMounted, mount, type Shell } from './shell.ts'
import { save, setQuickOn } from './store.ts'
import { DEFAULT_CONFIG, NS, isOurs, type Config, type ToIsolated, type ToMain } from '../shared/messages.ts'
import { mountApp } from './ui/app.ts'
import { explain, type Ctx } from './ui/ctx.ts'
import { pick, toast } from './ui/overlay.ts'
import { waitForYtCfg } from './ytcfg.ts'

// ── The switch ─────────────────────────────────────────────────────────────
//
// Two sources say whether the mode is on, and they answer at different times.
// `localStorage` answers now, which is what a page load needs; `chrome.storage`
// answers in a few hundred milliseconds and is what the toolbar writes to.
// The fast one is a cache of the slow one, written whenever the slow one speaks.

let config: Config = { ...DEFAULT_CONFIG, musicMode: quickFlag() }
let running: Runtime | null = null

function quickFlag(): boolean {
  try {
    return localStorage.getItem('oc-tube-mode:on') === '1'
  } catch {
    return false
  }
}

function ask(msg: ToIsolated): void {
  window.postMessage(msg, location.origin)
}

window.addEventListener('message', (ev) => {
  if (ev.source !== window || !isOurs(ev.data)) return
  const msg = ev.data as ToMain
  if (msg.type !== 'config') return
  const was = config.musicMode
  config = msg.config
  setQuickOn(config.musicMode)
  if (config.musicMode && !was) void start()
  if (!config.musicMode && was) leave(false)
})

ask({ ns: NS, type: 'get-config' })

// ── Boot ───────────────────────────────────────────────────────────────────

interface Runtime {
  shell: Shell
  engine: Engine
  destroy(): void
}

let starting = false

async function start(): Promise<void> {
  if (running || starting || alreadyMounted()) return
  starting = true
  let shell: Shell | undefined
  try {
    shell = mount((reason) => {
      // The panic key and the watchdog both mean the same thing: get out now.
      leave(reason === 'panic')
      if (reason === 'watchdog') {
        console.warn('[튜브 모드] 화면을 띄우지 못해 원래 유튜브로 돌아갑니다.')
      }
    })

    const cfg = await waitForYtCfg()
    if (!cfg) throw new InnertubeError('ytcfg never appeared', 'shape')

    const engine = new Engine()
    const player = await waitForPlayer()
    if (player) engine.attach(player)

    let playlists: Playlist[] = []
    const base: Omit<Ctx, 'view' | 'go' | 'reload' | 'say' | 'overlay'> = {
      engine,
      cfg,
      get playlists() {
        return playlists
      },
      async refreshPlaylists() {
        // Throws on purpose. The screen that asked wants to say why it is
        // empty; the sidebar, which asks in the background, catches and moves on.
        playlists = []
        playlists = await api.myPlaylists(cfg)
      },
      async addToPlaylist(tracks: Track[]) {
        const chosen = await pick(
          shell!.overlay,
          tracks.length > 0 ? `${tracks.length}개를 어디에 넣을까요?` : '새 재생목록 만들기',
          playlists.map((p) => ({ id: p.id, label: p.title, sub: p.subtitle })),
          '새 재생목록 이름',
        )
        if (chosen === null) return
        try {
          if (typeof chosen === 'object') {
            await api.createPlaylist(cfg, chosen.create, tracks.map((t) => t.videoId))
            await base.refreshPlaylists()
            toast(shell!.overlay, `'${chosen.create}'을(를) 만들었습니다.`)
          } else {
            if (tracks.length === 0) return
            await api.addToPlaylist(cfg, chosen, tracks.map((t) => t.videoId))
            toast(shell!.overlay, `${tracks.length}개를 넣었습니다.`)
          }
        } catch (err) {
          toast(shell!.overlay, explain(err), true)
        }
      },
    }

    const app = mountApp({
      shell,
      engine,
      exit: () => leave(true),
      ctx: base,
    })

    running = {
      shell,
      engine,
      destroy() {
        app.destroy()
        engine.detach()
      },
    }

    if (!player) {
      toast(shell.overlay, '유튜브 플레이어를 찾지 못했습니다. 항목을 고르면 열립니다.')
    }
  } catch (err) {
    console.warn('[튜브 모드] 시작하지 못했습니다:', err)
    shell?.teardown()
    running = null
    leave(false)
  } finally {
    starting = false
  }
}

// ── Leaving ────────────────────────────────────────────────────────────────

/**
 * Puts the page back.
 *
 * `persist` is false when the switch was flipped elsewhere (the toolbar, or
 * another tab) — writing it back would fight whoever flipped it.
 *
 * The one thing that is not just "remove our two nodes": the address bar. We
 * play by telling the player what to load, which leaves the URL on whatever
 * was open when the mode started. Handing back a page whose URL and video
 * disagree is a confusing gift, so if they have drifted apart we navigate to
 * the track that is actually playing. Same video, real YouTube page.
 */
function leave(persist: boolean): void {
  const state = running
  running = null
  if (persist) {
    config = { ...config, musicMode: false }
    ask({ ns: NS, type: 'set-config', patch: { musicMode: false } })
  }
  setQuickOn(false)
  if (!state) return

  const playing = state.engine.current?.videoId
  save(state.engine.state)
  state.destroy()
  state.shell.teardown()

  if (playing && playing !== videoIdInUrl()) {
    location.assign(`https://www.youtube.com/watch?v=${playing}`)
  }
}

// ── Same-page navigation ───────────────────────────────────────────────────
//
// YouTube is a single-page app: it swaps the whole page under us without a
// reload, and takes the player with it. When that happens our reference is
// stale, so pick the new one up. `yt-navigate-finish` is the page's own signal
// and has been stable for years; the interval is the belt to its braces.

window.addEventListener('yt-navigate-finish', () => void reattach())
setInterval(() => void reattach(), 4000)

async function reattach(): Promise<void> {
  if (!running) return
  const player = await waitForPlayer(3000)
  if (player) running.engine.attach(player)
}

// A reload lands here with a queue already written down; nothing to do but let
// the flag decide, which the message handler above does. This call covers the
// case where the flag is on and chrome.storage is slow to answer.
if (config.musicMode) void start()
