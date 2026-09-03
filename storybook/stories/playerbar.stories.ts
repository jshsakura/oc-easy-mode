// The player bar in all its layouts — one set of controls, arranged by CSS.
// Desktop .bar with a filled seek (style="--p: 42%") and .vid.on in .right;
// the phone's compact bar with the seek along the bottom edge; the opened
// full player; and the words pane. Markup mirrors app.ts's bar assembly.
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import { render } from '../../src/main/ui/views.ts'
import { fillBar, fillSide, fillTop, type BarOptions } from '../lib/shellbits.ts'
import { frame } from '../lib/frame.ts'
import { makeCtx, makeTrack, makeTracks, StubEngine } from '../lib/stub.ts'

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

const LYRICS = [
  '가로등 아래서 너를 처음 봤지',
  '그날 밤바람은 아직도 기억나',
  '한강이 보이는 이 길에서',
  '우리 다시 만날 수 있을까',
  '밤은 길고 노래는 끝나가는데',
  '다시 겨울이 오면',
]

/** A believable screen behind the bar: the queue view, drawn by the real render(). */
function fillScreen(f: ReturnType<typeof frame>, index = 3): void {
  const tracks = makeTracks(8)
  const ctx = makeCtx({ engine: new StubEngine({ queue: tracks, index }) })
  ctx.reload = () => {
    void render(ctx, f.main)
  }
  fillSide(f.side, { active: 'queue', dark: !f.app.classList.contains('light') })
  fillTop(f.top, t('대기열'))
  void render(ctx, f.main)
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

const FULLSCREEN = {
  layout: 'fullscreen',
  frame: { mode: 'fullscreen' },
  viewport: { defaultViewport: 'pc' },
} as const

const desktop: StoryObj<BarArgs> = {
  name: 'PC — 탐색 막대 찬 채로',
  args: { ...ARGS },
  parameters: FULLSCREEN,
  render: (args) => {
    const f = frame()
    fillScreen(f)
    const track = makeTrack({ title: '여름의 끝에서', byline: '파도 소리' })
    fillBar(f.bar, {
      current: track,
      playing: args.playing,
      buffering: args.buffering,
      ratio: args.ratio,
      volume: args.volume,
      shuffle: args.shuffle,
      repeat: 'all',
      video: 'corner',
    })
    return f.main
  },
}

const desktopPaused: StoryObj<BarArgs> = {
  name: 'PC — 멈춤 · 음소거 · 화면 끔',
  args: { ...ARGS, playing: false, volume: 0 },
  parameters: FULLSCREEN,
  render: (args) => {
    const f = frame()
    fillScreen(f)
    fillBar(f.bar, {
      playing: args.playing,
      ratio: args.ratio,
      volume: args.volume,
      video: 'hidden',
      repeat: 'off',
    })
    return f.main
  },
}

const buffering: StoryObj<BarArgs> = {
  name: 'PC — 가져오는 중 (일시정지 모양)',
  args: { ...ARGS, buffering: true },
  parameters: FULLSCREEN,
  render: (args) => {
    const f = frame()
    fillScreen(f)
    fillBar(f.bar, { current: makeTrack(), buffering: args.buffering, ratio: 0.1, volume: args.volume, video: 'hidden' })
    return f.main
  },
}

const stalled: StoryObj<BarArgs> = {
  name: 'PC — 오래 걸림 (정지)',
  args: { ...ARGS, buffering: true, stalled: true },
  parameters: FULLSCREEN,
  render: (args) => {
    const f = frame()
    fillScreen(f)
    fillBar(f.bar, { current: makeTrack(), buffering: args.buffering, stalled: args.stalled, ratio: 0.1, volume: args.volume, video: 'hidden' })
    return f.main
  },
}

const light: StoryObj<BarArgs> = {
  name: '밝은 테마',
  args: { ...ARGS },
  parameters: { ...FULLSCREEN, frame: { mode: 'fullscreen', light: true } },
  render: (args) => {
    const f = frame()
    fillScreen(f)
    fillBar(f.bar, { current: makeTrack(), playing: args.playing, ratio: args.ratio, volume: args.volume, video: 'corner' })
    return f.main
  },
}

const phone: StoryObj<BarArgs> = {
  name: '폰 — 컴팩트 바',
  args: { ...ARGS, ratio: 0.68 },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', narrow: true },
    viewport: { defaultViewport: 'phone' },
  },
  render: (args) => {
    const f = frame()
    fillScreen(f, 5)
    fillBar(f.bar, {
      current: makeTrack({ title: '밤은 길고', byline: '달빛 피아노' }),
      playing: args.playing,
      ratio: args.ratio,
      volume: args.volume,
      video: 'hidden',
    })
    return f.main
  },
}

const phoneLandscape: StoryObj<BarArgs> = {
  name: '폰 가로 — 컴팩트 바',
  args: { ...ARGS, ratio: 0.3 },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', narrow: true },
    viewport: { defaultViewport: 'phoneLandscape' },
  },
  render: (args) => {
    const f = frame()
    fillScreen(f, 5)
    fillBar(f.bar, { current: makeTrack(), playing: args.playing, ratio: args.ratio, volume: args.volume, video: 'stage' })
    return f.main
  },
}

const sheet: StoryObj<BarArgs> = {
  name: '풀 플레이어 — sheet-open',
  args: { ...ARGS, sheetOpen: true, ratio: 0.55 },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', narrow: true },
    viewport: { defaultViewport: 'phone' },
  },
  render: (args) => {
    const f = frame()
    fillScreen(f, 5)
    fillBar(f.bar, {
      current: makeTrack({ title: '별 헤는 밤', byline: '은하수' }),
      playing: args.playing,
      ratio: args.ratio,
      volume: args.volume,
      shuffle: true,
      repeat: 'one',
      video: 'hidden',
    })
    return f.main
  },
}

const sheetLyrics: StoryObj<BarArgs> = {
  name: '풀 플레이어 — 가사 열림',
  args: { ...ARGS, sheetOpen: true, lyricsOpen: true, ratio: 0.55 },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', narrow: true },
    viewport: { defaultViewport: 'phone' },
  },
  render: (args) => {
    const f = frame()
    fillScreen(f, 5)
    fillBar(f.bar, {
      current: makeTrack({ title: '별 헤는 밤', byline: '은하수' }),
      playing: args.playing,
      ratio: args.ratio,
      volume: args.volume,
      lyrics: LYRICS,
      lyricsOpen: args.lyricsOpen,
      video: 'hidden',
    })
    return f.main
  },
}

const sheetStage: StoryObj<BarArgs> = {
  name: '풀 플레이어 — 영상 아래 (has-stage)',
  args: { ...ARGS, sheetOpen: true, hasStage: true, ratio: 0.55 },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', narrow: true },
    viewport: { defaultViewport: 'phone' },
  },
  render: (args) => {
    const f = frame()
    fillScreen(f, 5)
    fillBar(f.bar, {
      current: makeTrack({ title: '별 헤는 밤', byline: '은하수' }),
      playing: args.playing,
      ratio: args.ratio,
      volume: args.volume,
      video: 'stage',
    })
    return f.main
  },
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
