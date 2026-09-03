// The workbench's global setup: the frame decorator that mounts the app the
// way shell.ts does, and the device viewports the design is judged at.
import type { Preview } from '@storybook/html'
import { frameDecorator } from '../lib/frame.ts'

const preview: Preview = {
  decorators: [frameDecorator],
  parameters: {
    viewport: {
      viewports: {
        pc: { name: 'PC 1440×900', styles: { width: '1440px', height: '900px' } },
        tablet: { name: '태블릿 834×1112', styles: { width: '834px', height: '1112px' } },
        phone: { name: '폰 390×844', styles: { width: '390px', height: '844px' } },
        phoneLandscape: { name: '폰 가로 844×390', styles: { width: '844px', height: '390px' } },
      },
      defaultViewport: 'pc',
    },
  },
  initialGlobals: {
    viewport: { value: 'pc', isRotated: false },
  },
}

export default preview
