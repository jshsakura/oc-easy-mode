import { chromium, test } from '@playwright/test'

const OUT = process.env.SHOT_DIR ?? '.'

test('page shot', async () => {
  const browser = await chromium.launch({ channel: 'chromium' })
  for (const scheme of ['dark', 'light'] as const) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, colorScheme: scheme })
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
    await page.screenshot({ path: `${OUT}/page-${scheme}.png`, fullPage: true })
    await page.close()
  }
  await browser.close()
})
