// The player bar in all its layouts: the desktop bar, the phone's compact bar,
// the opened full player, and the words pane.
//
// **Every one of these is the product's bar.** The story builds an engine,
// says what is true of its player, and mounts the real app; drawBar and
// drawTick do the rest. The bar used to be rebuilt here from a copy in
// shellbits.ts, and on 2026-09-04 that copy was found to be missing the heart,
// which meant the design was being judged against a bar the product does not
// ship. Nothing is rebuilt now.
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import type { Repeat, VideoLayout } from '../../src/main/store.ts'
import { frame } from '../lib/frame.ts'
import { makeTrack, makeTracks, SAMPLE_PLAYLISTS, StubEngine } from '../lib/stub.ts'

const meta = {
  title: 'PlayerBar',
} satisfies Meta

export default meta

interface BarArgs {
  playing: boolean
  buffering: boolean
  stalled: boolean
  ratio: number
  volume: number
  shuffle: boolean
  /** app state classes, toggled onto .app by the frame decorator */
  sheetOpen: boolean
  lyricsOpen: boolean
  hasStage: boolean
}

const DURATION = 224

interface Scene {
  args: BarArgs
  /** The track under the needle. The rest of the queue is filler behind it. */
  track?: ReturnType<typeof makeTrack>
  video?: VideoLayout
  repeat?: Repeat
  queue?: number
  /** Opens the words the way a person does, by pressing the button. */
  lyrics?: boolean
}

/**
 * One posed screen, drawn by the product.
 *
 * The engine carries what is remembered (volume, shuffle, repeat, where the
 * picture goes) and the pose carries what the player is doing. Neither writes
 * `position`: the shipped tick() works that out, which is the only reason the
 * bar here can be taken as evidence about the bar there.
 */
function scene(s: Scene): HTMLElement {
  const f = frame()
  const filler = makeTracks(Math.max(1, s.queue ?? 8))
  const index = Math.min(3, filler.length - 1)
  if (s.track) filler[index] = s.track
  const engine = new StubEngine({
    queue: filler,
    index,
    volume: s.args.volume,
    shuffle: s.args.shuffle,
    repeat: s.repeat ?? 'off',
    video: s.video ?? 'corner',
  })
  engine.pose({
    duration: DURATION,
    at: s.args.ratio * DURATION,
    playing: s.args.playing,
    buffering: s.args.buffering,
    ...(s.args.stalled ? { stalled: true } : {}),
  })
  f.mount({ engine, view: { kind: 'queue' }, playlists: SAMPLE_PLAYLISTS })

  if (s.lyrics) {
    // Pressed rather than posed. The pane's contents come from the product's
    // own lyrics pipeline, which the workbench answers for in net.ts, so what
    // shows up is a real LRC parsed by the real parser.
    f.bar.querySelector<HTMLElement>(`button[title="${t('가사')}"]`)?.click()
  }
  return f.main
}

const ARGS: BarArgs = {
  playing: true,
  buffering: false,
  stalled: false,
  ratio: 0.42,
  volume: 70,
  shuffle: false,
  sheetOpen: false,
  lyricsOpen: false,
  hasStage: false,
}

const PC = { layout: 'fullscreen', frame: { mode: 'fullscreen' }, viewport: { defaultViewport: 'pc' } } as const
const PHONE = { layout: 'fullscreen', frame: { mode: 'fullscreen' }, viewport: { defaultViewport: 'phone' } } as const

const desktop: StoryObj<BarArgs> = {
  name: 'PC — 탐색 막대 찬 채로',
  args: { ...ARGS },
  parameters: PC,
  render: (args) =>
    scene({ args, track: makeTrack({ title: '여름의 끝에서', byline: '파도 소리' }), repeat: 'all', video: 'corner' }),
}

const desktopPaused: StoryObj<BarArgs> = {
  name: 'PC — 멈춤 · 음소거 · 화면 끔',
  args: { ...ARGS, playing: false, volume: 0 },
  parameters: PC,
  render: (args) => scene({ args, video: 'hidden', repeat: 'off' }),
}

const buffering: StoryObj<BarArgs> = {
  name: 'PC — 가져오는 중 (일시정지 모양)',
  args: { ...ARGS, buffering: true, ratio: 0.1 },
  parameters: PC,
  render: (args) => scene({ args, video: 'hidden' }),
}

const stalled: StoryObj<BarArgs> = {
  name: 'PC — 오래 걸림 (정지)',
  args: { ...ARGS, buffering: true, stalled: true, ratio: 0.1 },
  parameters: PC,
  render: (args) => scene({ args, video: 'hidden' }),
}

const light: StoryObj<BarArgs> = {
  name: '밝은 테마',
  args: { ...ARGS },
  parameters: { ...PC, frame: { mode: 'fullscreen', light: true } },
  render: (args) => scene({ args, video: 'corner' }),
}

const phone: StoryObj<BarArgs> = {
  name: '폰 — 컴팩트 바',
  args: { ...ARGS, ratio: 0.68 },
  parameters: PHONE,
  render: (args) =>
    scene({ args, track: makeTrack({ title: '밤은 길고', byline: '달빛 피아노' }), video: 'hidden', queue: 5 }),
}

const phoneLandscape: StoryObj<BarArgs> = {
  name: '폰 가로 — 컴팩트 바',
  args: { ...ARGS, ratio: 0.3 },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen' },
    viewport: { defaultViewport: 'phoneLandscape' },
  },
  render: (args) => scene({ args, video: 'stage', queue: 5 }),
}

const sheet: StoryObj<BarArgs> = {
  name: '풀 플레이어 — sheet-open',
  args: { ...ARGS, sheetOpen: true, ratio: 0.55, shuffle: true },
  parameters: PHONE,
  render: (args) =>
    scene({ args, track: makeTrack({ title: '별 헤는 밤', byline: '은하수' }), repeat: 'one', video: 'hidden', queue: 5 }),
}

const sheetLyrics: StoryObj<BarArgs> = {
  name: '풀 플레이어 — 가사 열림',
  args: { ...ARGS, sheetOpen: true, lyricsOpen: true, ratio: 0.55 },
  parameters: PHONE,
  render: (args) =>
    scene({
      args,
      track: makeTrack({ title: '별 헤는 밤', byline: '은하수' }),
      video: 'hidden',
      queue: 5,
      lyrics: true,
    }),
}

const sheetStage: StoryObj<BarArgs> = {
  name: '풀 플레이어 — 영상 아래 (has-stage)',
  args: { ...ARGS, sheetOpen: true, hasStage: true, ratio: 0.55 },
  parameters: PHONE,
  render: (args) =>
    scene({ args, track: makeTrack({ title: '별 헤는 밤', byline: '은하수' }), video: 'stage', queue: 5 }),
}

export const Desktop = desktop
export const DesktopPaused = desktopPaused
export const Buffering = buffering
export const Stalled = stalled
export const Light = light
export const Phone = phone
export const PhoneLandscape = phoneLandscape
export const Sheet = sheet
export const SheetLyrics = sheetLyrics
export const SheetStage = sheetStage
