// One call to youtube.com's private API, authenticated when there is a session.
//
// **Why this and not the public Data API.** Adding one track through
// YouTube Data API v3 costs 50 quota units against a daily budget of 10,000,
// which is 200 tracks a day for the whole extension's user base combined. A
// playlist copy would hit the wall on its first run. The private endpoint the
// page itself uses has no such budget, because it is the page's own traffic.
//
// The trade is stability: this is an internal API, and a change at YouTube can
// break it. Everything downstream of here is written to fail loudly and
// partially rather than corrupt anything. The writes are playlist edits the
// user asked for by name, and each one is a single reversible action.
//
// **Authentication.** The cookie alone is not enough. Google requires a proof
// header, SAPISIDHASH, that hashes a timestamp together with the SAPISID cookie
// and the origin. It exists precisely so that a same-site request cannot be
// forged by a third-party page that merely rides the cookie jar, which means it
// must be computable from JavaScript on the origin — and it is, from the page's
// own world, which is where this runs.

import type { YtCfg } from './ytcfg.ts'

// The proof header is bound to the origin, so the page talks to its own API.
const ORIGIN = location.origin
const BASE = `${ORIGIN}/youtubei/v1/`

/** Thrown for anything the caller may want to report differently per cause. */
export class InnertubeError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'request' | 'shape',
    readonly status?: number,
  ) {
    super(message)
    this.name = 'InnertubeError'
  }
}

function cookie(name: string): string | undefined {
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=')
    if (eq > 0 && part.slice(0, eq) === name) return part.slice(eq + 1)
  }
  return undefined
}

async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Builds the Authorization header.
 *
 * Three cookies can carry the identity and Google names the hash after
 * whichever one produced it. Which of them is present depends on the browser's
 * third-party cookie settings, so all of the ones that exist are sent — the
 * header takes a space-separated list, and the server uses the first it can
 * verify. Sending only SAPISIDHASH is the usual cause of a copy that works in
 * one browser and 401s in another.
 */
async function authorization(): Promise<string | undefined> {
  const pairs: Array<[string, string]> = []
  const sources: Array<[string, string]> = [
    ['SAPISID', 'SAPISIDHASH'],
    ['__Secure-1PAPISID', 'SAPISID1PHASH'],
    ['__Secure-3PAPISID', 'SAPISID3PHASH'],
  ]
  const ts = Math.floor(Date.now() / 1000)
  for (const [cookieName, scheme] of sources) {
    const value = cookie(cookieName)
    if (!value) continue
    pairs.push([scheme, `${ts}_${await sha1Hex(`${ts} ${value} ${ORIGIN}`)}`])
  }
  // Signed out is a normal state here: search, mixes and public playlists
  // work without a session, only the user's own library needs one.
  if (pairs.length === 0) return undefined
  return pairs.map(([scheme, hash]) => `${scheme} ${hash}`).join(' ')
}

/**
 * Whether this browser is signed in to YouTube.
 *
 * Asked of the cookie jar rather than of a response, because a signed-out
 * personal feed comes back 200 with an empty page rather than an error, and
 * "empty" and "not yours to see" deserve different words.
 */
export function hasSession(): boolean {
  return ['SAPISID', '__Secure-1PAPISID', '__Secure-3PAPISID'].some((name) => cookie(name) !== undefined)
}

/**
 * Which client this call claims to be.
 *
 * `page` is the honest answer and the default. The other two are the page's own
 * cookies and origin wearing a different client's name, which is a thing
 * InnerTube allows and youtube.com itself does — the desktop site asks the
 * music backend the same way.
 */
export type Client = 'page' | 'web' | 'music' | 'tv'

/** Name, version and header number for each. */
const CLIENTS: Record<Exclude<Client, 'page'>, { name: string; version: string; number: string }> = {
  // The version is pinned because there is nowhere to read a valid WEB version
  // from on a mobile page. It ages: when YouTube stops accepting it the call
  // fails, and the caller falls back to the page's own client, which is worse
  // but never broken.
  web: { name: 'WEB', version: '2.20250901.00.00', number: '1' },
  // YouTube Music's client. Same origin, same cookies, different backend.
  music: { name: 'WEB_REMIX', version: '1.20250901.01.00', number: '67' },
  // The television's client. The genre feeds a TV shows in its menu, the
  // FEtopics_* browse ids, answer only to this name: the same ids from a WEB
  // context are 400 (measured 2026-09-05, signed out). Same origin, same
  // cookies, a different shape of answer (tileRenderer; see parse.ts).
  tv: { name: 'TVHTML5', version: '7.20250901.10.00', number: '7' },
}

/** The page's own context, or it wearing another client's name. */
function contextFor(cfg: YtCfg, as: Client): Record<string, unknown> {
  if (as === 'page') return cfg.context
  const client = (cfg.context.client ?? {}) as Record<string, unknown>
  return {
    ...cfg.context,
    client: { ...client, clientName: CLIENTS[as].name, clientVersion: CLIENTS[as].version },
  }
}

export type Json = Record<string, unknown>

/**
 * Why a call ever borrows another client's name.
 *
 * m.youtube.com's own client returns **twenty** tracks of a playlist and no
 * continuation token at all — there is no second page to ask for, so a 99-track
 * playlist arrives as 20 and nothing can be done about it from that client.
 * The same request with a WEB context, from the same origin and the same
 * cookies, returns 99 and a token. Measured 2026-09-03.
 */

/**
 * POSTs one InnerTube endpoint and returns the parsed body.
 *
 * `body` is merged over the page's own context, so a caller only ever writes
 * the fields specific to its request.
 */
export async function call(cfg: YtCfg, endpoint: string, body: Json, as: Client = 'page'): Promise<Json> {
  const url = new URL(endpoint, BASE)
  url.searchParams.set('prettyPrint', 'false')
  if (cfg.apiKey) url.searchParams.set('key', cfg.apiKey)

  const clientName = as === 'page' ? cfg.clientName : CLIENTS[as].number
  const clientVersion = as === 'page' ? cfg.clientVersion : CLIENTS[as].version
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Origin': ORIGIN,
    'X-Goog-AuthUser': String(cfg.sessionIndex),
    'X-YouTube-Client-Name': clientName,
    'X-YouTube-Client-Version': clientVersion,
  }
  if (cfg.visitorData) headers['X-Goog-Visitor-Id'] = cfg.visitorData
  const auth = await authorization()
  if (auth) headers.Authorization = auth

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ context: contextFor(cfg, as), ...body }),
  })

  if (!res.ok) {
    // 401/403 here is nearly always a stale or missing session rather than a
    // malformed request, and the two want very different advice.
    const kind = res.status === 401 || res.status === 403 ? 'auth' : 'request'
    throw new InnertubeError(`${endpoint} → ${res.status}`, kind, res.status)
  }

  const json = (await res.json()) as Json
  return json
}
