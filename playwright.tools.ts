// The screenshot tools, which are not tests. Run with `npm run shots`; they
// write into site/ and are kept out of the suite so a design capture never
// counts as a passing build.
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tools',
  workers: 1,
  timeout: 180_000,
  reporter: [['line']],
})
