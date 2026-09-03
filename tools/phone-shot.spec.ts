import { chromium, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const DIST = resolve(import.meta.dirname, '../dist')
const OUT = process.env.SHOT_DIR ?? '.'

test('phone shot', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'oc-shot-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`, '--lang=ko-KR'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = context.pages()[0] ?? (await context.newPage())
  await page.addInitScript(() => {
    try { localStorage.setItem('oc-easy-mode:on', '1') } catch {}
  })
  await page.goto('https://m.youtube.com/watch?v=BzYnNdJhZQw', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(9000)
  await page.screenshot({ path: `${OUT}/phone-explore.png` })

  const ui = page.locator('oc-easy-mode')
  await ui.locator('.drawerToggle').click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/phone-drawer.png` })
  await context.close()
})
