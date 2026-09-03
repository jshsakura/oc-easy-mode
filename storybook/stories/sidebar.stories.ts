// The navigation column: desktop .side with its two groups, the playlists
// under their heading, the theme line and the exit line; and the same column
// as a phone drawer, out over its scrim.
import type { Meta, StoryObj } from '@storybook/html'
import { t } from '../../src/shared/i18n.ts'
import { render } from '../../src/main/ui/views.ts'
import { fillBar, fillSide, fillTop } from '../lib/shellbits.ts'
import { frame } from '../lib/frame.ts'
import { makeCtx, makeTrack, makeTracks, SAMPLE_PLAYLISTS, StubEngine } from '../lib/stub.ts'

const meta = {
  title: 'Sidebar',
} satisfies Meta

export default meta

interface SideArgs {
  /** phone only: the drawer, out over its scrim */
  drawerOpen: boolean
}

/** The queue screen behind the column, so the sidebar is judged in context. */
function fillScreen(f: ReturnType<typeof frame>): void {
  const ctx = makeCtx({ engine: new StubEngine({ queue: makeTracks(8), index: 3 }) })
  ctx.reload = () => {
    void render(ctx, f.main)
  }
  fillTop(f.top, t('대기열'))
  void render(ctx, f.main)
}

const desktop: StoryObj<SideArgs> = {
  name: 'PC — 항해 · 재생목록 · 나가기',
  args: { drawerOpen: false },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen' },
    viewport: { defaultViewport: 'pc' },
  },
  render: () => {
    const f = frame()
    fillSide(f.side, { active: 'queue', playlists: SAMPLE_PLAYLISTS, dark: true })
    fillScreen(f)
    fillBar(f.bar, { current: makeTrack(), playing: true, ratio: 0.42, volume: 70, video: 'corner' })
    return f.main
  },
}

const light: StoryObj<SideArgs> = {
  name: '밝은 테마',
  args: { drawerOpen: false },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', light: true },
    viewport: { defaultViewport: 'pc' },
  },
  render: () => {
    const f = frame()
    fillSide(f.side, { active: 'queue', playlists: SAMPLE_PLAYLISTS, dark: false })
    fillScreen(f)
    fillBar(f.bar, { current: makeTrack(), playing: true, ratio: 0.42, volume: 70, video: 'corner' })
    return f.main
  },
}

const drawer: StoryObj<SideArgs> = {
  name: '폰 — 서랍 열림',
  args: { drawerOpen: true },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', narrow: true },
    viewport: { defaultViewport: 'phone' },
  },
  render: () => {
    const f = frame()
    fillSide(f.side, { active: 'queue', playlists: SAMPLE_PLAYLISTS, dark: true })
    fillScreen(f)
    fillBar(f.bar, { current: makeTrack(), playing: true, ratio: 0.68, volume: 70, video: 'hidden' })
    return f.main
  },
}

const drawerLight: StoryObj<SideArgs> = {
  name: '폰 — 서랍 열림, 밝은 테마',
  args: { drawerOpen: true },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', narrow: true, light: true },
    viewport: { defaultViewport: 'phone' },
  },
  render: () => {
    const f = frame()
    fillSide(f.side, { active: 'queue', playlists: SAMPLE_PLAYLISTS, dark: false })
    fillScreen(f)
    fillBar(f.bar, { current: makeTrack(), playing: true, ratio: 0.68, volume: 70, video: 'hidden' })
    return f.main
  },
}

export const Desktop = desktop
export const Light = light
export const Drawer = drawer
export const DrawerLight = drawerLight
