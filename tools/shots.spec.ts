import { chromium, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const DIST = resolve(import.meta.dirname, '../dist')
const OUT = process.env.SHOT_DIR ?? '.'

test.describe.configure({ timeout: 180_000 })

test('client shots', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'oc-shot-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`, '--lang=ko-KR', '--autoplay-policy=no-user-gesture-required'],
    viewport: { width: 1440, height: 900 },
    // Korean, pinned below. Not cosmetic: these pictures sit on a Korean page,
    // and a shot of an English UI puts two languages on one screen. The app
    // follows YouTube's own hl, which is not ours to assume.
    //
    // The theme is YouTube's own preference and cannot be asked for from here:
    // colorScheme, the PREF cookie and setting the `dark` attribute were all
    // measured and none of them moved it, so these come out light.
    colorScheme: 'dark',
  })
  const page = context.pages()[0] ?? (await context.newPage())
  await page.addInitScript(() => {
    try {
      localStorage.setItem('oc-easy-mode:on', '1')
      localStorage.setItem('oc-easy-mode:state', JSON.stringify({ lang: 'ko' }))
    } catch {}
  })
  await page.goto('https://www.youtube.com/watch?v=BzYnNdJhZQw', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const ui = page.locator('oc-easy-mode')
  await ui.locator('.shelf .tile').first().waitFor()
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${OUT}/shot-explore.png` })

  await ui.locator('.shelf .tile').first().click()
  await ui.locator('.row').first().waitFor()
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${OUT}/shot-list.png` })
  await context.close()
})
