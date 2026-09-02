// The one channel between the two worlds.
//
// The page world owns the product but cannot see `chrome.storage`; the
// isolated world can, and does nothing else. They talk over `window.postMessage`
// on the same window, tagged with a namespace so neither mistakes YouTube's
// own messages for ours.

export const NS = 'oc-tube-mode'

/** What survives across page loads, owned by chrome.storage.local. */
export interface Config {
  /** The switch. Off means the extension does nothing at all on the page. */
  musicMode: boolean
}

export const DEFAULT_CONFIG: Config = { musicMode: false }

export type ToMain = { ns: typeof NS; type: 'config'; config: Config }

export type ToIsolated =
  | { ns: typeof NS; type: 'get-config' }
  | { ns: typeof NS; type: 'set-config'; patch: Partial<Config> }

export function isOurs(data: unknown): data is { ns: typeof NS; type: string } {
  return (
    typeof data === 'object' && data !== null && (data as { ns?: unknown }).ns === NS
  )
}
