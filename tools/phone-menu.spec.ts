import { chromium, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const DIST = resolve(import.meta.dirname, '../dist')

test('phone menu shot', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'oc-shot-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: ['--disable-extensions-except=' + DIST, '--load-extension=' + DIST, '--lang=ko-KR'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = context.pages()[0] ?? (await context.newPage())
  await page.addInitScript(() => {
    try {
      localStorage.setItem('oc-easy-mode:on', '1')
      localStorage.setItem('oc-easy-mode:theme', 'light')
    } catch {}
  })
  await page.goto('https://m.youtube.com/playlist?list=PL4fGSI1pDJn6jXS_PEoNcnw42AmumseH7', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(6000)

  // Find oc-easy-mode shadow root
  const host = page.locator('oc-easy-mode')
  await host.waitFor({ state: 'attached', timeout: 10_000 })
  await page.waitForTimeout(2000)

  // Click on the first track's more button
  const more = page.locator('oc-easy-mode .more, oc-easy-mode .row button.more').first()
  if (await more.count() > 0) {
    await more.click()
    await page.waitForTimeout(1000)
  }
  await page.screenshot({ path: 'phone-menu.png' })
  await context.close()
})
