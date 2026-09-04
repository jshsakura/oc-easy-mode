// The answers the workbench gives instead of the network.
//
// Two things the shell reaches for on its own are fetches: the words, which
// come from a player call and then LRCLIB, and the heart, which is a write to
// youtube.com. A workbench cannot have either, and it should not sit spinning
// where the product would have drawn something.
//
// So they are answered rather than blocked. The product's own parsing runs on
// a real LRC body and a real player response, and the heart gets the 401 a
// signed-out browser gets, which is a state the design has to cover: it is
// what everyone sees before they sign in.

/** A synced lyric, in the format LRCLIB actually returns. */
const LRC = [
  '[00:12.30]가로등 아래서 너를 처음 봤지',
  '[00:18.90]그날 밤바람은 아직도 기억나',
  '[00:25.10]한강이 보이는 이 길에서',
  '[00:31.80]우리 다시 만날 수 있을까',
  '[00:38.40]밤은 길고 노래는 끝나가는데',
  '[00:45.00]다시 겨울이 오면',
].join('\n')

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/**
 * Whether the workbench is answering for the network.
 *
 * Installed once and left in place: stories come and go in one iframe, and a
 * stub that was uninstalled between them would let a late lyric request from
 * the story before reach the real internet.
 */
let installed = false

export function stubNetwork(): void {
  if (installed) return
  installed = true
  const real = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    // The words. The product asks the player for the title and channel, then
    // asks LRCLIB with them, and parses whatever comes back.
    if (url.includes('/youtubei/v1/player')) {
      return json({ videoDetails: { title: '밤은 길고', author: '달빛 피아노' }, captions: {} })
    }
    if (url.includes('lrclib.net/api/get')) return json({ syncedLyrics: LRC, plainLyrics: null })
    if (url.includes('lrclib.net/api/search')) return json([{ syncedLyrics: LRC, plainLyrics: null }])

    // The heart. Signed out is the honest answer here, and the toast it
    // produces is a screen the design has to have.
    if (url.includes('/youtubei/v1/like/')) return json({ error: 'workbench is signed out' }, 401)
    if (url.includes('/youtubei/v1/next')) return json({})

    // Anything else is the workbench's own assets.
    if (url.startsWith('/') || url.startsWith(location.origin) || url.startsWith('data:') || url.startsWith('blob:')) {
      return real(input as RequestInfo, init)
    }
    return json({ error: `workbench refused ${url}` }, 404)
  }
}
