// The shell's stylesheet, as a string for the shadow root.
//
// **This is shadcn/ui, ported rather than installed.** shadcn ships React
// components styled with Tailwind classes, and neither can come along: this UI
// is a few hundred lines of plain DOM inside a content script's shadow root,
// where a Tailwind build and a React runtime would be more machinery than the
// entire product. What actually carries the look is the token set and the
// component recipes, and both are portable.
//
// So the tokens below are shadcn's default dark theme, copied value for value
// from its theming reference — background, card, popover, primary, secondary,
// muted, accent, destructive, border, input, ring, and the sidebar group. The
// rules underneath are its component recipes written out longhand: button and
// its variants, input, card, dropdown-menu, dialog, slider, separator.
//
// Two deliberate departures:
//
//   - **px, never rem.** `rem` resolves against the *page's* root font size,
//     and this stylesheet lives inside YouTube. `--radius: 0.625rem` becomes
//     10px here so a site that scales its root does not resize our UI.
//   - **explicit hover colours** instead of Tailwind's `/90` opacity suffixes,
//     which are compiled, not CSS.
//
// The page-level rules that hide YouTube live in shell.ts, because they have
// to apply outside the shadow root.

export const STYLES = `
/* The tokens belong to the shadow root, not to one element inside it. Menus,
   dialogs and toasts are drawn in a second root with no .app around them, and
   a popover that inherits no --popover is a transparent popover. */
:host {
  all: initial;
  /* Taken from the sibling extension (oc-ad-bye-pass, src/ui/styles.css) so
     the two read as one author's work rather than two products that happen to
     be installed together. Same greys, same purple, same weights. */
  /* Three values far enough apart to be three surfaces. The first attempt put
     #0c0e11, #121419 and #16181c next to each other, which is one colour as
     far as an eye is concerned. */
  --ground: #06070a;
  --side-panel: #101318;
  --panel: #1a1e25;
  --background: #1a1e25;
  --foreground: #eceef2;
  --muted-foreground: #9aa0aa;
  --secondary: #262b33;
  --secondary-hover: #2f353f;
  --border: #333945;
  --popover: #232830;
  --popover-foreground: #eceef2;
  --primary: #9d6ee0;
  --primary-hover: #ac82e6;
  --primary-foreground: #ffffff;
  --destructive: #f38ba8;
  --ring: #9d6ee0;

  /* One surface. The sidebar, the bar and the page are the same colour and are
     told apart by a single hairline, not by three shades of grey. Only things
     that float — a menu, a dialog, the corner window — sit on --popover. */
  --hover: rgba(255, 255, 255, .07);
  --shadow: 0 16px 40px rgba(0, 0, 0, .45);
  --ease: .15s ease;

  /* --radius: 0.625rem, in px for the reason at the top of this file */
  /* Two radii. Controls take the small one, artwork and panels the large. */
  --radius-md: 8px;
  --radius-lg: 12px;
}
* { box-sizing: border-box; }

/* Light, for when YouTube is light or the reader asks for it. The sibling
   extension's light palette, so the two match in either mode. */
.app.light {
  --ground: #dfe1e6;
  --side-panel: #f2f3f5;
  --panel: #ffffff;
  --background: #ffffff;
  --foreground: #16181c;
  --muted-foreground: #63676f;
  --secondary: #eceef2;
  --secondary-hover: #e2e4e9;
  --border: #dcdfe5;
  --popover: #ffffff;
  --popover-foreground: #16181c;
  --primary: #7e4dc5;
  --primary-hover: #8f61d0;
  --primary-foreground: #ffffff;
  --destructive: #d63b5e;
  --ring: #7e4dc5;
  --hover: rgba(0, 0, 0, .05);
  --shadow: 0 16px 40px rgba(0, 0, 0, .16);
}

.app {
  --bar: 84px;
  --side: 244px;
  --gap: 8px;

  /* Two panels floating on a darker ground, with the player bar across the
     bottom. This is what separates an application from a web page: the chrome
     is a frame the content sits inside, not a strip of the document. */
  /* Height is set from the visual viewport in app.ts; see the note there.
     bottom is deliberately not set, so nothing fights that measurement.
     No backticks anywhere in this file: it is one template literal. */
  position: fixed; top: 0; left: 0; right: 0; z-index: 2147482000;
  display: grid;
  grid-template-columns: var(--side) 1fr; grid-template-rows: 1fr var(--bar);
  gap: var(--gap); padding: var(--gap);
  background: var(--ground); color: var(--foreground);
  font: 14px/1.4285714 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo',
        'Noto Sans KR', 'Malgun Gothic', sans-serif;
  -webkit-font-smoothing: antialiased;
  /* Korean is written with spaces, but the engine treats it like Chinese and
     breaks between any two characters — "브라우 / 저에", "업데이트 확 / 인".
     keep-all moves the break to the spaces that are already there. Anything
     holding a URL sets overflow-wrap: anywhere back on for itself.
     (No backticks in this file: the whole stylesheet is a template literal.) */
  word-break: keep-all;
}

button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
button:disabled { opacity: .5; pointer-events: none; }
input { font: inherit; color: inherit; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--secondary); border-radius: 999px; border: 3px solid var(--background); }
::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }

/* One hover, everywhere something can be pressed. */
.nav:hover, .mode:hover, .exit:hover, .row:hover, .tile:hover, .card:hover,
.menu button:hover, .modal .list button:hover, .ctl button:hover,
.right button:hover, .row .more:hover, .drawerToggle:hover, .btn.ghost:hover {
  background: var(--hover);
}

/* Focus ring — shadcn's: 3px of ring at half strength, and no outline of the
   browser's own. This is also the cursor when the app is driven by arrow keys. */
[data-nav]:focus { outline: none; }
[data-nav]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
  border-radius: var(--radius-md);
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.side {
  /* Darker than the content and edged, so the two are plainly two things.
     Equal fills separated by nothing read as one wide column. */
  background: var(--side-panel); border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 12px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
}
.brand {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 8px 16px; font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
}
.modes {
  display: flex; gap: 2px; border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 2px; margin: 0 0 12px;
}
.mode {
  flex: 1; padding: 6px 0; border-radius: 6px;
  font-size: 13px; font-weight: 500; color: var(--muted-foreground);
  transition: color var(--ease), background var(--ease);
}
.mode.on { background: var(--secondary); color: var(--foreground); }
.nav {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  padding: 8px 10px; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 500; color: var(--muted-foreground);
  transition: color var(--ease), background var(--ease);
}
.nav:hover, .nav.on { color: var(--foreground); }
.nav.on { background: var(--secondary); }
.side h4 { margin: 20px 10px 4px; font-size: 12px; font-weight: 500; color: var(--muted-foreground); }
.side .pl {
  font-size: 13px; font-weight: 400; padding: 6px 10px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
}
.side .spacer { flex: 1; }
.exit {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 8px 10px; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 500; color: var(--muted-foreground);
  transition: color var(--ease), background var(--ease);
}
.exit:hover { color: var(--foreground); }

/* ── Main ────────────────────────────────────────────────────────────────── */
.main {
  background: var(--panel); border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow-y: auto; padding: 28px 28px 48px; min-width: 0;
}
.main h2 { margin: 0 0 20px; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
.main h3 { margin: 24px 0 8px; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.sub { color: var(--muted-foreground); font-size: 14px; }
.label { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 10px; }
.empty { color: var(--muted-foreground); padding: 56px 0; text-align: center; font-size: 14px; }
.err { color: var(--destructive); font-size: 14px; padding: 16px 0 20px; }

.searchbox {
  display: flex; gap: 10px; align-items: center;
  height: 40px; padding: 0 12px; margin-bottom: 24px;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  transition: border-color var(--ease);
}
.searchbox:focus-within { border-color: var(--ring); }
/* 16px, and not a pixel less.
   WebKit on iPhone zooms the page in when an input smaller than 16px takes
   focus, and it does not zoom back out. Tapping the search box swallowed the
   whole screen. Nothing else in the UI has to be 16px; this does. */
.searchbox input { flex: 1; height: 100%; background: none; border: 0; outline: 0; font-size: 16px; }
.searchbox input::placeholder { color: var(--muted-foreground); }
.searchbox svg { color: var(--muted-foreground); flex: none; }

.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0 0 24px; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 36px; padding: 0 16px; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 500; white-space: nowrap;
  border: 1px solid var(--border); color: var(--foreground);
  transition: background var(--ease), color var(--ease), border-color var(--ease);
}
.btn:hover { background: var(--hover); }
.btn.primary { background: var(--primary); color: var(--primary-foreground); border-color: transparent; }
.btn.primary:hover { background: var(--primary-hover); }
.btn.ghost { border-color: transparent; color: var(--muted-foreground); }
.btn.ghost:hover { color: var(--foreground); }
.btn.danger { color: var(--destructive); }
.btn.danger:hover { background: var(--destructive); color: var(--background); border-color: transparent; }

/* ── Track rows ──────────────────────────────────────────────────────────── */
.rows { display: flex; flex-direction: column; }
.row {
  display: grid; grid-template-columns: 24px 56px 1fr auto 32px;
  align-items: center; gap: 16px; padding: 8px;
  border-radius: var(--radius-md); cursor: pointer;
  transition: background var(--ease);
}
.row.now { background: var(--secondary); }
.row.dead { opacity: .4; }
.row .idx { color: var(--muted-foreground); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
.row .thumb { width: 56px; height: 32px; border-radius: 4px; background: var(--secondary) center/cover; }
.row .meta { min-width: 0; }
.row .title { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .by { color: var(--muted-foreground); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .dur { color: var(--muted-foreground); font-size: 13px; font-variant-numeric: tabular-nums; }
.row .more {
  width: 32px; height: 32px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted-foreground); opacity: .5;
  transition: background var(--ease), color var(--ease), opacity var(--ease);
}
.row:hover .more, .row.now .more, .row .more:focus-visible { opacity: 1; }
.row .more:hover { color: var(--foreground); }

/* ── Artwork ─────────────────────────────────────────────────────────────── */
/* No frame around a picture. The artwork is the object; a border around it is
   one more line for the eye to resolve and it buys nothing. */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 24px 16px; }
.card, .tile { text-align: left; border-radius: var(--radius-md); transition: background var(--ease); }
.card .cover, .tile .cover {
  position: relative; aspect-ratio: 16/9; border-radius: var(--radius-lg);
  background: var(--secondary) center/cover;
  display: flex; align-items: center; justify-content: center; color: var(--muted-foreground);
}
/* Sits on the artwork and appears on hover or focus, like every music client.
   It is decoration only — the whole card is the button. */
.cover .play {
  position: absolute; right: 10px; bottom: 10px;
  width: 40px; height: 40px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  background: var(--primary); color: var(--primary-foreground);
  box-shadow: var(--shadow);
  opacity: 0; transform: translateY(6px);
  transition: opacity var(--ease), transform var(--ease);
}
.card:hover .play, .tile:hover .play,
.card:focus-visible .play, .tile:focus-visible .play { opacity: 1; transform: none; }
/* A finger cannot hover. On a touch screen the button is simply there. */
@media (hover: none) {
  .cover .play { opacity: 1; transform: none; width: 34px; height: 34px; }
}

/* The running time, where every video player puts it. */
.cover .badge {
  position: absolute; left: 8px; bottom: 8px;
  padding: 2px 6px; border-radius: 4px;
  background: oklch(0 0 0 / 72%); color: oklch(0.985 0 0);
  font-size: 11.5px; font-weight: 500; font-variant-numeric: tabular-nums;
}
.cards .card .cover, .tile.square .cover { aspect-ratio: 1; }
.card .t, .tile .t { margin-top: 10px; font-size: 14px; font-weight: 500; }
.card .t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tile .t { line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card .s, .tile .s { margin-top: 2px; color: var(--muted-foreground); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.shelf { margin-bottom: 36px; }
.shelf h3 { margin: 0 0 14px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.shelfRow { display: flex; gap: 16px; overflow-x: auto; padding: 0 0 12px; scroll-snap-type: x proximity; }
.tile { width: 176px; flex: none; scroll-snap-align: start; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(212px, 1fr)); gap: 28px 16px; }
.grid .tile { width: auto; }

.head { display: flex; gap: 28px; align-items: flex-end; margin-bottom: 28px; }
.head .cover {
  width: 208px; aspect-ratio: 1; flex: none;
  border-radius: var(--radius-lg); background: var(--secondary) center/cover;
  box-shadow: var(--shadow);
}
.head h2 { font-size: clamp(28px, 4vw, 44px); line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 10px; }
.head .sub { font-size: 14px; }

/* ── The slot YouTube's player is positioned over ────────────────────────── */
.slot { position: fixed; pointer-events: none; border-radius: var(--radius-lg); background: #000; }
.slot.hidden { display: none; }
.slot.corner {
  right: var(--gap); bottom: calc(var(--bar) + var(--gap)); width: 280px;
  aspect-ratio: 16/9; box-shadow: var(--shadow);
}
/* The stage was 46vh with the list pushed down by the same amount, so on a
   900px window more than half the content panel was video and the list got a
   sliver. A player that shows one and a half rows is not showing a list. */
.slot.stage {
  left: calc(var(--side) + var(--gap) * 2); top: var(--gap);
  right: var(--gap); width: auto; height: min(34vh, 340px);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
.app.has-stage .main { padding-top: calc(min(34vh, 340px) + 20px); }
.app.has-corner .main { padding-bottom: 220px; }

/* ── The utility cluster, top right over the content ─────────────────────── */
.utils {
  position: absolute; z-index: 6;
  top: calc(var(--gap) + 18px); right: calc(var(--gap) + 20px);
  display: flex; gap: 2px;
}
.utils button {
  width: 34px; height: 34px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted-foreground);
  transition: background var(--ease), color var(--ease);
}
.utils button:hover { background: var(--hover); color: var(--foreground); }

/* ── Player bar ──────────────────────────────────────────────────────────── */
.bar {
  grid-column: 1 / -1; background: transparent;
  display: grid; grid-template-columns: minmax(200px, 1fr) minmax(320px, 2fr) minmax(200px, 1fr);
  align-items: center; padding: 0; gap: 16px;
}
.now { display: flex; align-items: center; gap: 14px; min-width: 0; }
.now .thumb {
  width: 56px; height: 56px; flex: none; border-radius: var(--radius-md);
  background: var(--secondary) center/cover;
}
.now .t {
  font-size: 15px; font-weight: 500; line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.now .b {
  margin-top: 2px; color: var(--muted-foreground); font-size: 13px; line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.center { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ctl { display: flex; align-items: center; gap: 4px; }
.ctl button, .right button, .drawerToggle {
  width: 36px; height: 36px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted-foreground);
  transition: background var(--ease), color var(--ease);
}
.ctl button:hover, .right button:hover, .drawerToggle:hover { color: var(--foreground); }
.ctl button.on, .right button.on { color: var(--foreground); }
.ctl .big { background: var(--primary); color: var(--primary-foreground); border-radius: 999px; }
.ctl .big:hover { background: var(--primary-hover); color: var(--primary-foreground); }
.seek {
  display: flex; align-items: center; gap: 12px; width: 100%; max-width: 620px;
  font-size: 12px; color: var(--muted-foreground); font-variant-numeric: tabular-nums;
}
.seek input { flex: 1; }
.right { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.right .vol { width: 84px; margin-left: 4px; }

input[type=range] {
  -webkit-appearance: none; appearance: none;
  height: 4px; border-radius: 999px; background: var(--secondary); outline: 0; cursor: pointer;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 12px; height: 12px; border-radius: 999px; background: var(--foreground);
}

/* ── Menu, dialog, toast — the only things that float ────────────────────── */
.menu {
  position: fixed; z-index: 2147483100; min-width: 208px; padding: 4px;
  background: var(--popover); color: var(--popover-foreground);
  border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow);
}
.menu button {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  padding: 8px 10px; border-radius: 6px; font-size: 14px;
  color: var(--foreground); transition: background var(--ease);
}
.menu hr { border: 0; border-top: 1px solid var(--border); margin: 4px -4px; }

.scrim {
  position: fixed; inset: 0; z-index: 2147483090;
  background: oklch(0 0 0 / 70%); display: flex; align-items: center; justify-content: center;
}
.modal {
  width: 420px; max-height: 72vh; display: flex; flex-direction: column;
  background: var(--popover); color: var(--popover-foreground);
  border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow);
}
.modal h3 { margin: 0; padding: 22px 22px 12px; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
.modal .list { overflow-y: auto; padding: 0 14px 8px; }
.modal .list button {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  padding: 8px 10px; border-radius: var(--radius-md); font-size: 14px;
  transition: background var(--ease);
}
.modal .new { display: flex; gap: 8px; padding: 14px 22px 22px; }
.modal .new input {
  flex: 1; height: 36px; padding: 0 12px; background: transparent;
  border: 1px solid var(--border); border-radius: var(--radius-md); outline: 0;
  font-size: 16px; /* see .searchbox input */
  transition: border-color var(--ease);
}
.modal .new input:focus { border-color: var(--ring); }

.toasts {
  position: fixed; left: 50%; bottom: calc(var(--bar) + var(--gap) + 12px); transform: translateX(-50%);
  z-index: 2147483120; display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.toast {
  padding: 12px 18px; border-radius: var(--radius-md); font-size: 14px;
  background: var(--popover); color: var(--popover-foreground);
  border: 1px solid var(--border); box-shadow: var(--shadow);
}
.toast.bad { color: var(--destructive); }

/* ── Responsive ──────────────────────────────────────────────────────────
   Three steps. Between them nothing is squeezed: each step gives something up
   instead of making everything narrower.
   
   Plain media queries, deliberately. The app is position:fixed with inset 0,
   so its width IS the viewport's — a container query measures the same number
   by a longer route. It also cost an hour: a container cannot style itself,
   and moving the container to the shadow host does not work either, because
   all:initial makes the host inline and an inline element cannot be a size
   container. Every phone rule was being ignored in silence.
   
   The earlier objection to media queries was about detecting the *device* from
   the viewport, which is a different question and still a bad idea. Asking
   whether there is room for a sidebar is exactly what a width query is for. */
.drawerScrim, .drawerToggle { display: none; }

/* The volume slider is the first thing that can go; the button stays. */
@media (max-width: 1240px) {
  .right .vol { display: none; }
}

/* Then the sidebar gives up width, and the shelf cards get smaller so three
   still fit rather than two and a sliver. */
@media (max-width: 1080px) {
  .app { --side: 208px; }
  .main { padding: 24px 22px 44px; }
  .tile { width: 158px; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(172px, 1fr)); gap: 22px 14px; }
  .head .cover { width: 168px; }
  .row { grid-template-columns: 24px 52px 1fr auto 32px; gap: 12px; }
}

/* Below this the sidebar cannot be a column at all, and becomes a drawer. */
@media (max-width: 860px) {
  /* ── The phone is not a narrow desktop ──────────────────────────────────
     A drawer is a desktop idea. A phone music app puts its destinations on a
     bottom tab bar under the thumb, gives the list the whole width, and keeps
     the playing track directly above the tabs. That is the shape here. */
  .app {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto auto;
    gap: 0; padding: 0;
    --bar: auto;
  }

  .main {
    grid-column: 1; grid-row: 1;
    border: 0; border-radius: 0; background: var(--panel);
    padding: calc(16px + env(safe-area-inset-top)) 16px 20px;
  }
  .main h2 { font-size: 22px; margin-bottom: 16px; }

  /* Row two: the playing track, full width, right above the tabs. */
  .bar {
    grid-column: 1; grid-row: 2;
    grid-template-columns: 1fr auto; grid-template-rows: auto auto;
    background: var(--side-panel); border-top: 1px solid var(--border);
    padding: 8px 14px 10px; gap: 6px 12px; align-items: center;
  }
  .seek { grid-row: 1; grid-column: 1 / -1; max-width: none; }
  .now { grid-row: 2; grid-column: 1; gap: 12px; }
  .now .thumb { width: 46px; height: 46px; }
  .now .t { font-size: 15px; }
  .center { grid-row: 2; grid-column: 2; gap: 0; }
  .ctl { gap: 2px; }
  .ctl button { width: 40px; height: 40px; }
  .ctl .big { width: 44px; height: 44px; }
  .ctl > button:first-child, .ctl > button:last-child { display: none; }
  .right { display: none; }

  /* Row three: the tab bar. The sidebar becomes it — same buttons, laid on
     their side, labels under the icons. */
  .side {
    grid-column: 1; grid-row: 3;
    flex-direction: row; align-items: stretch;
    background: var(--side-panel); border: 0; border-top: 1px solid var(--border);
    border-radius: 0; overflow: visible;
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
    gap: 0;
  }
  /* Seven things fit across a phone; ten do not. The destinations and the way
     out stay; theme and language are desktop conveniences and follow YouTube
     on their own here. */
  .side .brand, .side h4, .side .pl, .side .spacer, .side .util { display: none; }
  /* Eight destinations across a phone leaves no room for eight labels, and a
     truncated label is worse than none. Icons carry it; the one you are on
     says its name. */
  .nav, .exit {
    flex: 1 1 0; min-width: 0;
    flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    padding: 7px 2px; border-radius: var(--radius-md);
    font-size: 10px; font-weight: 500; text-align: center;
  }
  .nav svg, .exit svg { width: 22px; height: 22px; }
  .nav span, .exit span { display: none; }
  .nav.on span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .nav.on { background: transparent; color: var(--primary); }
  .nav:hover, .exit:hover { background: transparent; }

  /* The two that are not destinations sit apart: the mode switch floats over
     the top-right of the list, and leaving is the last tab. */
  /* Not a destination, so it does not belong in the tab bar. It rides at the
     top of the list instead, where the eye already is. */
  .utils { top: calc(12px + env(safe-area-inset-top)); right: 12px; }
  .modes {
    position: absolute; top: calc(12px + env(safe-area-inset-top)); right: 88px;
    z-index: 5; margin: 0; width: auto; min-width: 124px;
    background: var(--side-panel); border-color: var(--border);
  }
  .mode { font-size: 12px; padding: 5px 12px; }
  .main { position: relative; }
  .main h2 { padding-right: 224px; }
  .exit {
    flex: 1 1 0; min-width: 0;
    flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    padding: 6px 2px; font-size: 10.5px;
  }
  .exit svg { width: 21px; height: 21px; }

  /* Lists lose the columns there is no width for. */
  .row { grid-template-columns: 52px 1fr 32px; gap: 12px; padding: 8px 4px; }
  .row .idx, .row .dur { display: none; }
  .row .thumb { width: 52px; height: 30px; }
  .shelf { margin-bottom: 26px; }
  .shelf h3 { font-size: 15px; margin-bottom: 10px; }
  .shelfRow { gap: 12px; }
  .tile { width: 40vw; max-width: 176px; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 20px 12px; }
  .cards { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 20px 12px; }
  .head { flex-direction: column; align-items: flex-start; gap: 16px; }
  .head .cover { width: 160px; }
  .searchbox { margin-bottom: 16px; }

  /* The picture has nowhere to float on 390 pixels, so in music mode there
     is none; in video mode it caps the list rather than covering it. */
  .slot.corner { display: none; }
  .app.has-corner .main { padding-bottom: 20px; }
  .slot.stage { left: 0; right: 0; top: 0; height: min(28vh, 230px); border-radius: 0; }
  .app.has-stage .main { padding-top: calc(min(28vh, 230px) + 14px); }

  .menu { min-width: 200px; }
  .modal { width: calc(100vw - 28px); }
  .toasts { bottom: 150px; }
}
`
