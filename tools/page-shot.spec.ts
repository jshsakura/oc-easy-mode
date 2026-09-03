// Photographs the site at desktop and phone widths so a design change can be
// looked at. Needs `npm run site` running next to it.

import { chromium, test } from '@playwright/test'

const OUT = process.env.SHOT_DIR ?? '.'
const SITE = 'http://localhost:4173/'

test('page shot', async () => {
  const browser = await chromium.launch({ channel: 'chromium' })
  for (const [name, vp, mobile] of [
    ['dark', { width: 1280, height: 1000 }, false],
    ['phone', { width: 390, height: 844 }, true],
  ] as const) {
    const page = await browser.newPage({ viewport: vp, colorScheme: 'dark', isMobile: mobile })
    await page.goto(SITE, { waitUntil: 'networkidle' })
    await page.screenshot({ path: `${OUT}/page-${name}.png`, fullPage: true })
    await page.close()
  }
  await browser.close()
})
