// The queue screen, drawn by the product itself.
//
// The story builds an engine, poses its player and hands both to
// frame().mount(), which runs the real mountApp. Everything visible after
// that — the sidebar, the header, the bar, the rows and which row is marked
// as playing — is the shipped code reading the shipped state. Interactive:
// jumping with a row and removing through the ⋯ menu go through the real
// transport, and the screen follows because app.ts subscribes to the engine.
import type { Meta, StoryObj } from '@storybook/html'
import type { Track } from '../../src/main/parse.ts'
import { frame } from '../lib/frame.ts'
import { makeTracks, SAMPLE_PLAYLISTS, StubEngine } from '../lib/stub.ts'

const meta = {
  title: 'Queue',
} satisfies Meta

export default meta

interface QueueArgs {
  count: number
  index: number
}

function tracksFor(args: QueueArgs): Track[] {
  return makeTracks(Math.max(0, args.count))
}

function play(args: QueueArgs): HTMLElement {
  const f = frame()
  const engine = new StubEngine({
    queue: tracksFor(args),
    index: args.index,
    volume: 70,
    video: 'hidden',
  })
  // A track a third of the way through, playing. The bar reads this off the
  // player through the product's own drawTick, so the elapsed time, the fill
  // and the pause glyph all come from one posed fact.
  //
  // Nothing is posed for an empty queue: a player that is 1:34 into a track
  // the queue does not have is not a state the product can be in, and the bar
  // would show a length for a song nobody is playing.
  if (args.index >= 0) engine.pose({ duration: 224, at: 94, playing: true })
  f.mount({ engine, view: { kind: 'queue' }, playlists: SAMPLE_PLAYLISTS })
  return f.main
}

const FULLSCREEN = { layout: 'fullscreen', frame: { mode: 'fullscreen' } } as const
const ARGS: QueueArgs = { count: 8, index: 3 }

const filled: StoryObj<QueueArgs> = {
  name: 'PC — 8곡, 4번째 재생 중',
  args: { ...ARGS },
  parameters: { ...FULLSCREEN, viewport: { defaultViewport: 'pc' } },
  render: play,
}

const tablet: StoryObj<QueueArgs> = {
  name: '태블릿 — 서랍 배치',
  args: { ...ARGS },
  parameters: {
    ...FULLSCREEN,
    // 834 is under NARROW_MAX(900), so narrowNow() calls this narrow on its
    // own. The story no longer forces the class: if the product would not
    // have gone narrow here, the workbench must not pretend it did.
    viewport: { defaultViewport: 'tablet' },
  },
  render: play,
}

const phone: StoryObj<QueueArgs> = {
  name: '폰 — 컴팩트 바',
  args: { ...ARGS },
  parameters: { ...FULLSCREEN, viewport: { defaultViewport: 'phone' } },
  render: play,
}

const light: StoryObj<QueueArgs> = {
  name: '밝은 테마',
  args: { ...ARGS },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', light: true },
    viewport: { defaultViewport: 'pc' },
  },
  render: play,
}

const empty: StoryObj<QueueArgs> = {
  name: '빈 대기열',
  args: { count: 0, index: -1 },
  parameters: { ...FULLSCREEN, viewport: { defaultViewport: 'pc' } },
  render: play,
}

export const Filled = filled
export const Tablet = tablet
export const Phone = phone
export const Light = light
export const Empty = empty
