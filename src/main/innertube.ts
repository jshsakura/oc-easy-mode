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

export type Json = Record<string, unknown>

/**
 * POSTs one InnerTube endpoint and returns the parsed body.
 *
 * `body` is merged over the page's own context, so a caller only ever writes
 * the fields specific to its request.
 */
export async function call(cfg: YtCfg, endpoint: string, body: Json): Promise<Json> {
  const url = new URL(endpoint, BASE)
  url.searchParams.set('prettyPrint', 'false')
  if (cfg.apiKey) url.searchParams.set('key', cfg.apiKey)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Origin': ORIGIN,
    'X-Goog-AuthUser': String(cfg.sessionIndex),
    'X-YouTube-Client-Name': cfg.clientName,
    'X-YouTube-Client-Version': cfg.clientVersion,
  }
  if (cfg.visitorData) headers['X-Goog-Visitor-Id'] = cfg.visitorData
  const auth = await authorization()
  if (auth) headers.Authorization = auth

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ context: cfg.context, ...body }),
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
