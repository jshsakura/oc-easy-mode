// The page's own InnerTube configuration.
//
// youtube.com boots by calling `ytcfg.set({...})` from an inline script,
// and everything the private API wants — the client name and version it will
// accept, the visitor id, which account of a multi-login is active — is in
// there. Reading it beats hard-coding any of it: a client version that has
// aged out is rejected, and the page keeps its own up to date for free.
//
// This is why the content script runs in the MAIN world. From the isolated
// world `window.ytcfg` is invisible.

/** Shape of the bits used here. Everything else in ytcfg is left alone. */
export interface YtCfg {
  apiKey: string | undefined
  /** Passed back verbatim as `context` on every call. */
  context: Record<string, unknown>
  clientName: string
  clientVersion: string
  visitorData: string | undefined
  /** Index of the signed-in account in a multi-login. 0 unless switched. */
  sessionIndex: number
  /** Interface language chosen on the site, e.g. `ko`. */
  hl: string | undefined
}

interface YtCfgGlobal {
  get?: (key: string, fallback?: unknown) => unknown
  data_?: Record<string, unknown>
}

function raw(key: string): unknown {
  const cfg = (window as unknown as { ytcfg?: YtCfgGlobal }).ytcfg
  if (!cfg) return undefined
  // `get` is the supported reader; `data_` is the backing store and is there
  // even in builds where `get` has been renamed by the minifier.
  const viaGet = cfg.get?.(key)
  if (viaGet !== undefined) return viaGet
  return cfg.data_?.[key]
}

/**
 * Reads the config, or returns null while the page is still booting.
 *
 * Null is a normal outcome, not a failure: a content script at document_idle
 * can still land before ytcfg is populated on a slow load, and the caller
 * simply asks again.
 */
export function readYtCfg(): YtCfg | null {
  const context = raw('INNERTUBE_CONTEXT') as Record<string, unknown> | undefined
  const clientVersion = raw('INNERTUBE_CLIENT_VERSION') as string | undefined
  if (!context || !clientVersion) return null

  const client = (context.client ?? {}) as Record<string, unknown>

  return {
    apiKey: raw('INNERTUBE_API_KEY') as string | undefined,
    context,
    // 1 is WEB, which is what youtube.com is. Read rather than assumed,
    // because the header and the context have to agree.
    clientName: String(raw('INNERTUBE_CONTEXT_CLIENT_NAME') ?? 1),
    clientVersion,
    visitorData: (raw('VISITOR_DATA') as string | undefined) ?? (client.visitorData as string | undefined),
    sessionIndex: Number(raw('SESSION_INDEX') ?? 0) || 0,
    hl: (client.hl as string | undefined) ?? (raw('HL') as string | undefined),
  }
}

/**
 * Waits for the config to appear.
 *
 * Polling rather than an event: there is no documented signal for "ytcfg is
 * ready", and the alternative is patching the page's own setter, which is a lot
 * of intrusion for a value that arrives within a frame or two.
 */
export async function waitForYtCfg(timeoutMs = 15_000): Promise<YtCfg | null> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const cfg = readYtCfg()
    if (cfg) return cfg
    if (Date.now() > deadline) return null
    await new Promise((r) => setTimeout(r, 200))
  }
}
