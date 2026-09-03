// The queue screen, drawn by the real render() with the stub ctx's view set
// to { kind: 'queue' } — queue() itself is not exported, and that is the
// product's own way in. Eight tracks with the fourth playing, so both
// headings (지금 재생 중 / 다음 재생) show. Interactive: jumping with a row and
// removing through the ⋯ menu mutate the stub and re-render, like app.ts's
// subscription does.
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import type { Track } from '../../src/main/parse.ts'
import { render } from '../../src/main/ui/views.ts'
import { fillBar, fillSide, fillTop } from '../lib/shellbits.ts'
import { frame } from '../lib/frame.ts'
import { makeCtx, makeTracks, StubEngine } from '../lib/stub.ts'

const meta = {
  title: 'Queue',
} satisfies Meta

export default meta

interface QueueArgs {
  count: number
  index: number
}

function play(args: QueueArgs): HTMLElement {
  const f = frame()
  const engine = new StubEngine({ queue: tracksFor(args), index: args.index })
  const ctx = makeCtx({ engine })
  const draw = () => {
    void render(ctx, f.main)
  }
  ctx.reload = draw
  engine.subscribe(draw)
  fillSide(f.side, { active: 'queue', dark: !f.app.classList.contains('light') })
  fillTop(f.top, t('대기열'))
  fillBar(f.bar, { current: engine.current, playing: true, ratio: 0.42, volume: 70, video: 'hidden' })
  draw()
  return f.main
}

function tracksFor(args: QueueArgs): Track[] {
  return makeTracks(Math.max(0, args.count))
}

const filled: StoryObj<QueueArgs> = {
  name: 'PC — 8곡, 4번째 재생 중',
  args: { count: 8, index: 3 },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen' },
    viewport: { defaultViewport: 'pc' },
  },
  render: play,
}

const tablet: StoryObj<QueueArgs> = {
  name: '태블릿 — 서랍 배치',
  args: { count: 8, index: 3 },
  parameters: {
    layout: 'fullscreen',
    // 834 < NARROW_MAX(900): on a real tablet device.ts stamps the narrow
    // class, so the tablet story forces it too.
    frame: { mode: 'fullscreen', narrow: true },
    viewport: { defaultViewport: 'tablet' },
  },
  render: play,
}

const phone: StoryObj<QueueArgs> = {
  name: '폰 — 컴팩트 바',
  args: { count: 8, index: 3 },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', narrow: true },
    viewport: { defaultViewport: 'phone' },
  },
  render: play,
}

const light: StoryObj<QueueArgs> = {
  name: '밝은 테마',
  args: { count: 8, index: 3 },
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
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen' },
    viewport: { defaultViewport: 'pc' },
  },
  render: play,
}

export const Filled = filled
export const Tablet = tablet
export const Phone = phone
export const Light = light
export const Empty = empty
