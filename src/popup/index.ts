// The toolbar switch. Flips `config.musicMode`; the content script on any open
// youtube.com tab reacts through storage.onChanged. If no YouTube tab is in
// front, turning the switch on opens one, since the mode has nowhere else to be.

import { DEFAULT_CONFIG, type Config } from '../shared/messages.ts'
import { applyScreenKind } from '../main/ui/device.ts'

// Before the first render: the popup is empty until this script fills it, and
// the browser sizes a desktop popup from whatever lands, so the class has to be
// in place before there is anything to size.
applyScreenKind()

const app = document.getElementById('app')!

async function read(): Promise<Config> {
  const got = await chrome.storage.local.get('config')
  return { ...DEFAULT_CONFIG, ...((got.config as Partial<Config> | undefined) ?? {}) }
}

async function render(): Promise<void> {
  const cfg = await read()
  app.innerHTML = `
    <h1>Easy Mode</h1>
    <p>유튜브 화면을 음악 플레이어로 바꿉니다. 재생은 그대로 유튜브가 합니다.</p>
    <div class="row">
      <span>음악 모드 켜기</span>
      <button class="switch" role="switch" aria-checked="${cfg.musicMode}" id="toggle"></button>
    </div>
    <p class="hint">플레이어 안의 '유튜브로 돌아가기'로도 끌 수 있습니다.</p>
  `
  document.getElementById('toggle')!.addEventListener('click', async () => {
    const next = { ...cfg, musicMode: !cfg.musicMode }
    await chrome.storage.local.set({ config: next })
    if (next.musicMode) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.url?.startsWith('https://www.youtube.com/')) {
        await chrome.tabs.create({ url: 'https://www.youtube.com/' })
      }
    }
    await render()
  })
}

void render()
