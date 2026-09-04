// The navigation column: desktop .side with its two groups, the playlists
// under their heading, the theme line and the exit line; and the same column
// as a phone drawer, out over its scrim.
//
// Drawn by the product. The column, the screen behind it and the bar below it
// all come from one mountApp, so what the sidebar is judged against is the
// real thing beside it rather than a picture of it.
import type { Meta, StoryObj } from '@storybook/html'
import { frame } from '../lib/frame.ts'
import { makeTracks, SAMPLE_PLAYLISTS, StubEngine } from '../lib/stub.ts'

const meta = {
  title: 'Sidebar',
} satisfies Meta

export default meta

interface SideArgs {
  /** phone only: the drawer, out over its scrim */
  drawerOpen: boolean
}

/** The whole screen, so the sidebar is judged in context. */
function screen(video: 'corner' | 'hidden', ratio: number): HTMLElement {
  const f = frame()
  const engine = new StubEngine({ queue: makeTracks(8), index: 3, volume: 70, video })
  const duration = 224
  engine.pose({ duration, at: ratio * duration, playing: true })
  f.mount({ engine, view: { kind: 'queue' }, playlists: SAMPLE_PLAYLISTS })
  return f.main
}

const desktop: StoryObj<SideArgs> = {
  name: 'PC — 항해 · 재생목록 · 나가기',
  args: { drawerOpen: false },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen' },
    viewport: { defaultViewport: 'pc' },
  },
  render: () => screen('corner', 0.42),
}

const light: StoryObj<SideArgs> = {
  name: '밝은 테마',
  args: { drawerOpen: false },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', light: true },
    viewport: { defaultViewport: 'pc' },
  },
  render: () => screen('corner', 0.42),
}

const drawer: StoryObj<SideArgs> = {
  name: '폰 — 서랍 열림',
  args: { drawerOpen: true },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen' },
    viewport: { defaultViewport: 'phone' },
  },
  render: () => screen('hidden', 0.68),
}

const drawerLight: StoryObj<SideArgs> = {
  name: '폰 — 서랍 열림, 밝은 테마',
  args: { drawerOpen: true },
  parameters: {
    layout: 'fullscreen',
    frame: { mode: 'fullscreen', light: true },
    viewport: { defaultViewport: 'phone' },
  },
  render: () => screen('hidden', 0.68),
}

export const Desktop = desktop
export const Light = light
export const Drawer = drawer
export const DrawerLight = drawerLight
