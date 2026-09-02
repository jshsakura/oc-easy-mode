// ISOLATED world: the bridge to chrome.storage, and nothing else.
//
// Answers the page world's request for the config, forwards every change, and
// writes back the patches the page world sends (the in-page "back to YouTube"
// button is the only writer there).

import { DEFAULT_CONFIG, NS, isOurs, type Config, type ToIsolated, type ToMain } from '../shared/messages.ts'

async function readConfig(): Promise<Config> {
  const got = await chrome.storage.local.get('config')
  return { ...DEFAULT_CONFIG, ...((got.config as Partial<Config> | undefined) ?? {}) }
}

function send(config: Config): void {
  const msg: ToMain = { ns: NS, type: 'config', config }
  window.postMessage(msg, location.origin)
}

window.addEventListener('message', (ev) => {
  if (ev.source !== window || !isOurs(ev.data)) return
  const msg = ev.data as ToIsolated
  if (msg.type === 'get-config') {
    void readConfig().then(send)
  } else if (msg.type === 'set-config') {
    void readConfig().then((cur) => chrome.storage.local.set({ config: { ...cur, ...msg.patch } }))
  }
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.config) return
  send({ ...DEFAULT_CONFIG, ...((changes.config.newValue as Partial<Config> | undefined) ?? {}) })
})

// The page world may have booted first and asked into the void; answer once
// unprompted so nobody has to poll.
void readConfig().then(send)
