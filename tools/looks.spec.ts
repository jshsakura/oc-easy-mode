import { chromium, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const DIST = resolve(import.meta.dirname, '../dist')
const OUT = process.env.SHOT_DIR ?? '.'

async function shoot(name: string, vp: { width: number; height: number }, mobile: boolean, light: boolean) {
  const profile = mkdtempSync(join(tmpdir(), 'oc-look-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`, '--lang=ko-KR'],
    viewport: vp,
    isMobile: mobile,
    hasTouch: mobile,
  })
  const page = context.pages()[0] ?? (await context.newPage())
  await page.addInitScript((wantLight) => {
    try {
      localStorage.setItem('oc-easy-mode:on', '1')
      if (wantLight) {
        localStorage.setItem('oc-easy-mode:state', JSON.stringify({ theme: 'light' }))
      }
    } catch {}
  }, light)
  await page.goto('https://www.youtube.com/watch?v=BzYnNdJhZQw', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.locator('oc-easy-mode').locator('.shelf .tile').first().waitFor({ timeout: 60_000 })
  await page.waitForTimeout(5000)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  await context.close()
}

test('looks', async () => {
  await shoot('look-dark', { width: 1440, height: 900 }, false, false)
  await shoot('look-light', { width: 1440, height: 900 }, false, true)
  await shoot('look-phone', { width: 390, height: 844 }, true, false)
})
