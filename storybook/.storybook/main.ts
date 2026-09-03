// Storybook config for the HTML+Vite framework. The workbench renders plain
// DOM built by the extension's own helpers, so the html renderer — not React —
// is the right one.
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/html-vite'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts'],
  framework: { name: '@storybook/html-vite', options: {} },
  // The real UI lives in ../src, outside this package's root; Vite's dev
  // server only serves files inside an allowed directory unless told.
  viteFinal(config) {
    config.server ??= {}
    config.server.fs ??= {}
    config.server.fs.allow = [fileURLToPath(new URL('..', import.meta.url))]
    return config
  },
}

export default config
