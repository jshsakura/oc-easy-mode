// Loads the built extension into a real Chromium and opens YouTube.
//
// Headed-in-headless via the new headless mode, because MV3 content scripts in
// the MAIN world are not delivered by the old one.

import { chromium, type BrowserContext, type Page } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const DIST = resolve(import.meta.dirname, '../dist')

export interface Harness {
  context: BrowserContext
  page: Page
  close(): Promise<void>
}

/** Opens `url` with the mode already switched on, unless `on` is false. */
export async function open(url: string, on = true): Promise<Harness> {
  const profile = mkdtempSync(join(tmpdir(), 'oc-tube-mode-'))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`, '--lang=ko-KR'],
  })
  const page = context.pages()[0] ?? (await context.newPage())
  if (on) {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('oc-tube-mode:on', '1')
      } catch {
        /* first-run about:blank has no storage; the real page will */
      }
    })
  }
  // Live YouTube over a home line: generous, because a slow first byte is not
  // a failing product.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  return {
    context,
    page,
    async close() {
      await context.close()
      rmSync(profile, { recursive: true, force: true })
    },
  }
}

/** The app's shadow root, as a locator that pierces it. */
export function app(page: Page) {
  return page.locator('oc-tube-mode')
}
