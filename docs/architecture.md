# Architecture

What RenewTube does on the page, and the measured facts the design rests on.
Everything here was checked against live youtube.com; dates mark when.

## Two scripts, one shadow root

The manifest injects two content scripts at `document_start` on
`https://*.youtube.com/*` (never `music.youtube.com`):

- `isolated.js` runs in the extension's isolated world. It holds the
  on/off flag in `chrome.storage` and relays it to the page.
- `main.js` runs in the page's world (`world: "MAIN"`). It is the whole
  application: the engine, the API calls, the screens.

The screens live in a shadow root on a custom element (`oc-easy-mode`), with
a twin (`oc-easy-mode-overlay`) for menus, dialogs, toasts and the search
panel, which sit above the video. Element tags, storage keys and the message
namespace are stable identifiers and are never renamed.

**Orion ignores `world: "MAIN"`** and silently loads the file into the
isolated world instead, where neither `ytcfg` nor the player's methods exist.
So `main.js` checks `chrome.runtime.id`: defined means the isolated world, and
it stops; `isolated.js`, hearing nothing within half a second, injects the
same file with a `<script>` tag. That tag must be `async = true`. With
`async = false` it joins the document's ordered script list and every script
YouTube inserts after it waits on ours; the player freezes. `e2e/02-orion`
reproduces the path with a build whose `world` key is removed.

## YouTube's DOM is not edited

RenewTube adds exactly one stylesheet and two hosts. It never moves, removes
or edits a YouTube node. The page is hidden with `visibility`, the player is
made visible again and placed with `position: fixed` over RenewTube's stage.
Leaving is therefore a deletion of two nodes, with nothing to restore and
nothing that can fail halfway. Three ways out: the toolbar switch (or the
sidebar's exit), **Esc twice within a second** (caught in the capture phase,
so it works even when the UI is broken), and a watchdog that lets go if the
screen has not appeared in eight seconds. A single Esc is left alone: it
closes menus and leaves inputs, and taking it would make a new trap.

On YouTube's own account and settings pages (`/account…`,
`/view_all_settings…`) the extension declines to mount at all, and comes back
on the next page that is YouTube proper.

## YouTube as the backend

Lists come from the page's own `youtubei/v1`, called with the page's `ytcfg`
and the page's cookies, with `SAPISIDHASH` as proof when signed in. The public
Data API is not used: one playlist insert costs 50 of a 10,000-unit daily
quota, which is 200 tracks a day for everyone combined.

Responses are read by **renderer name, never by path** (`src/main/parse.ts`).
Paths differ per screen and change without notice; renderer names are what
YouTube's own clients branch on and move rarely.

Signed out, personal feeds return 200 with an empty page rather than an
error, so "signed out" is decided from the cookie jar, not from the response.
Search, music and the TV menu work signed out; subscriptions, history,
playlists and Your videos need a session.

### Clients the page borrows

The call layer can wear another client's name over the same origin and
cookies (`src/main/innertube.ts`):

| client | why |
|---|---|
| `WEB` | m.youtube.com's own client returns 20 tracks of a playlist and no continuation; the desktop client returns all of them |
| `WEB_REMIX` | YouTube Music's home, for the Music screen's shelves |
| `TVHTML5` | the TV's genre feeds (`FEtopics_sports`, `_live`, `_gaming`, `_news`, `_movies`, `_podcasts`) answer only this client; the same ids from `WEB` are 400 (2026-09-05). They answer in `tileRenderer` shelves whose title sits in a `headerRenderer` |

There is no feed for Shorts (`FEshorts` is 400 to every client, and the TV
guide lists no such line) and no browse id for YouTube Kids; the Kids screen is
a curated set of Korean children's channels, one shelf each, every one checked
to answer signed out.

### Shorts never appear

Search asks for videos only. Feeds can mix Shorts into the same rows, so a
row is dropped when it carries a `reelWatchEndpoint` or links to `/shorts/`
(`isShort`). `e2e/03-parse` holds a fixture cut from a real response with a
Shorts shelf and a row that looks like a video but goes to `/shorts/`.

## The player is asked, not trusted

`#movie_player.getPlayerState()` reports Unstarted while the element is
plainly playing, and can stay there for a whole load. Everything that matters
asks the `<video>` element instead: whether sound is coming out, when a track
ended, what the rate is. Anything the player owns (rate, quality, mute) is
written to the element too and re-asserted on a half-second tick, because the
player resets them at moments of its own.

## Phone or desktop

Not by user agent: Orion on an iPhone reports a desktop Mac Chrome UA, which
would misclassify exactly the device this runs on. Two tests
(`src/main/ui/device.ts`): the host is `m.youtube.com`, which is YouTube's own
verdict; otherwise the screen's short side is 500px or less, which describes
the device rather than the window and does not change when the phone turns.

On a phone the sidebar becomes a drawer, the bar has two lines, rows drop the
number and duration, dialogs are sheets along the bottom, and music mode hides
the picture because a 288px corner has nowhere to go on a 390px screen.
m.youtube.com sends the same shelves as different renderers
(`compactStationRenderer`, `compactVideoRenderer`); the parser reads both.

## The remote

Arrow keys move focus by one rule on every screen: go to the element that is
ahead in the pressed direction and least to the side (distance along the axis
plus three times the distance across it). Any element with `data-nav` is
reachable, so a new screen needs no navigation code of its own. Keys are
caught at the document, because a freshly redrawn screen has lost focus to
`body`, and the arrows must not reach YouTube's player, where they would
seek.

## Design tokens

The stylesheet (`src/main/ui/styles.ts`) carries shadcn/ui's token set by
value, light and dark, and hand-written recipes for buttons, inputs, cards,
menus, dialogs and sliders. `rem` is not used: it would follow the page's root
font size, and this sheet lives inside YouTube. Hover colours are explicit.
No blended gradients, no particles; the one soft thing is the blurred artwork
of what is playing, behind the panes.

## Tests

`e2e/` runs Playwright's Chromium with the extension loaded against live
youtube.com, signed out. `npm test` builds first; `npx playwright test` alone
runs the previous build, which looks like a 90-second timeout when the tree
has moved. Skeleton rows wear the real class names, so locators use
`:not([aria-hidden])`. Real WebKit cannot load the extension, but a screen can
be checked in it by capturing the shadow root's markup into a file with
`<template shadowrootmode="open">` and opening that in Playwright's webkit.
