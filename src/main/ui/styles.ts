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
  /* shadcn/ui — default theme, dark */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-hover: oklch(0.86 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-hover: oklch(0.32 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-hover: oklch(0.63 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);

  /* One surface. The sidebar, the bar and the page are the same colour and are
     told apart by a single hairline, not by three shades of grey. Only things
     that float — a menu, a dialog, the corner window — sit on --popover. */
  --hover: oklch(1 0 0 / 6%);
  --shadow: 0 16px 40px oklch(0 0 0 / 45%);
  --ease: .15s ease;

  /* --radius: 0.625rem, in px for the reason at the top of this file */
  /* Two radii. Controls take the small one, artwork and panels the large. */
  --radius-md: 8px;
  --radius-lg: 12px;
}
* { box-sizing: border-box; }

.app {
  --bar: 84px;
  --side: 244px;

  position: fixed; inset: 0; z-index: 2147482000;
  display: grid; grid-template-columns: var(--side) 1fr; grid-template-rows: 1fr var(--bar);
  background: var(--background); color: var(--foreground);
  font: 14px/1.4285714 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo',
        'Noto Sans KR', 'Malgun Gothic', sans-serif;
  -webkit-font-smoothing: antialiased;
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
  background: var(--background); border-right: 1px solid var(--border);
  padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
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
.main { overflow-y: auto; padding: 32px 32px 40px; min-width: 0; }
.main h2 { margin: 0 0 20px; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
.main h3 { margin: 24px 0 8px; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.sub { color: var(--muted-foreground); font-size: 14px; }
.empty { color: var(--muted-foreground); padding: 56px 0; text-align: center; font-size: 14px; }
.err { color: var(--destructive); font-size: 14px; padding: 16px 0 20px; }

.searchbox {
  display: flex; gap: 10px; align-items: center;
  height: 40px; padding: 0 12px; margin-bottom: 24px;
  border: 1px solid var(--border); border-radius: var(--radius-md);
  transition: border-color var(--ease);
}
.searchbox:focus-within { border-color: var(--ring); }
.searchbox input { flex: 1; height: 100%; background: none; border: 0; outline: 0; font-size: 14px; }
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
  aspect-ratio: 16/9; border-radius: var(--radius-lg);
  background: var(--secondary) center/cover;
  display: flex; align-items: center; justify-content: center; color: var(--muted-foreground);
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

.head { display: flex; gap: 24px; align-items: flex-end; margin-bottom: 24px; }
.head .cover {
  width: 176px; aspect-ratio: 1; flex: none;
  border-radius: var(--radius-lg); background: var(--secondary) center/cover;
}

/* ── The slot YouTube's player is positioned over ────────────────────────── */
.slot { position: fixed; pointer-events: none; border-radius: var(--radius-lg); background: oklch(0.145 0 0); }
.slot.hidden { display: none; }
.slot.corner { right: 24px; bottom: calc(var(--bar) + 24px); width: 280px; aspect-ratio: 16/9; box-shadow: var(--shadow); }
.slot.stage { left: var(--side); top: 0; right: 0; width: auto; height: min(46vh, 520px); border-radius: 0; }
.app.has-stage .main { padding-top: calc(min(46vh, 520px) + 28px); }
.app.has-corner .main { padding-bottom: 220px; }

/* ── Player bar ──────────────────────────────────────────────────────────── */
.bar {
  grid-column: 1 / -1; background: var(--background); border-top: 1px solid var(--border);
  display: grid; grid-template-columns: minmax(200px, 1fr) minmax(320px, 2fr) minmax(200px, 1fr);
  align-items: center; padding: 0 16px; gap: 16px;
}
.now { display: flex; align-items: center; gap: 14px; min-width: 0; }
.now .thumb { width: 52px; height: 52px; flex: none; border-radius: var(--radius-md); background: var(--secondary) center/cover; }
.now .t { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.now .b { color: var(--muted-foreground); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
  border: 1px solid var(--border); border-radius: var(--radius-md); outline: 0; font-size: 14px;
  transition: border-color var(--ease);
}
.modal .new input:focus { border-color: var(--ring); }

.toasts {
  position: fixed; left: 50%; bottom: calc(var(--bar) + 24px); transform: translateX(-50%);
  z-index: 2147483120; display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.toast {
  padding: 12px 18px; border-radius: var(--radius-md); font-size: 14px;
  background: var(--popover); color: var(--popover-foreground);
  border: 1px solid var(--border); box-shadow: var(--shadow);
}
.toast.bad { color: var(--destructive); }

/* ── Phone ───────────────────────────────────────────────────────────────
   A phone is not a narrow desktop. The sidebar becomes a drawer rather than a
   64px rail of unlabelled icons stuck to the edge, the bar gives the seek its
   own row, and the lists lose the columns there is no width for. Which layout
   applies is decided in device.ts, from the viewport — the only thing that
   knows. Orion on iPhone reports a desktop user agent, is served the desktop
   site, and may report desktop screen metrics with it, so every other signal
   calls the phone a PC. A desktop window dragged this narrow gets the drawer
   too, which is what it should have had anyway. */
.drawerScrim, .drawerToggle { display: none; }

.app.narrow {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr auto;
  --bar: auto;
}
.narrow .side {
  position: fixed; left: 0; top: 0; bottom: 0; width: 284px; z-index: 20;
  background: var(--background); border-right: 1px solid var(--border);
  transform: translateX(-100%); transition: transform .22s ease;
  padding: calc(16px + env(safe-area-inset-top)) 10px calc(16px + env(safe-area-inset-bottom));
}
.app.narrow.drawer-open .side { transform: none; }
.narrow .drawerScrim {
  display: block; position: fixed; inset: 0; z-index: 15;
  background: oklch(0 0 0 / 60%); opacity: 0; pointer-events: none;
  transition: opacity .22s ease;
}
.narrow.drawer-open .drawerScrim { opacity: 1; pointer-events: auto; }
.narrow .drawerToggle { display: inline-flex; flex: none; }

.narrow .main {
  grid-column: 1;
  padding: calc(16px + env(safe-area-inset-top)) 16px 28px;
}
.narrow .main h2 { font-size: 21px; margin-bottom: 14px; }
.narrow .shelf { margin-bottom: 24px; }
.narrow .shelf h3 { font-size: 15px; }
/* Two cards and a slice of a third. A row that ends flush with the screen
   looks like the end of the row, and nobody swipes it. */
.narrow .tile { width: 40vw; max-width: 184px; }
.narrow .shelfRow { gap: 12px; }
.narrow .grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 18px 12px; }
.narrow .cards { grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); }
.narrow .searchbox { margin-bottom: 16px; }

/* No room for an index or a duration; the title and who made it are the row. */
.narrow .row { grid-template-columns: 56px 1fr 32px; gap: 10px; min-height: 60px; }
.narrow .row .idx, .narrow .row .dur { display: none; }
.narrow .row .thumb { width: 56px; height: 32px; }
.narrow .row { padding: 8px 4px; }
.narrow .row .more { opacity: 1; }

.narrow .bar {
  grid-template-columns: 1fr auto; grid-template-rows: auto auto;
  padding: 6px 14px calc(12px + env(safe-area-inset-bottom)); gap: 4px 12px;
  align-items: center;
}
/* Seek across the top, then the track and its controls along the bottom —
   the track is the last thing on the screen, which is where a thumb is. */
.narrow .seek { grid-row: 1; grid-column: 1 / -1; max-width: none; }
.narrow .now { grid-row: 2; grid-column: 1; gap: 12px; }
.narrow .now .thumb { width: 48px; height: 48px; border-radius: var(--radius-md); }
.narrow .now .t { font-size: 15px; }
.narrow .center { grid-row: 2; grid-column: 2; gap: 0; }
.narrow .ctl { gap: 2px; }
.narrow .ctl button { width: 42px; height: 42px; }
.narrow .ctl .big { width: 46px; height: 46px; }
.narrow .right { display: none; }
/* Shuffle and repeat live in the drawer's reach, not in forty pixels of bar. */
.narrow .ctl > button:first-child, .narrow .ctl > button:last-child { display: none; }

.narrow .slot.corner { right: 12px; bottom: 132px; width: 152px; }
.app.narrow.has-corner .main { padding-bottom: 148px; }
.narrow .slot.stage { left: 0; height: 34vh; }
.app.narrow.has-stage .main { padding-top: calc(34vh + 16px); }

.narrow .menu { min-width: 200px; }
.narrow .modal { width: calc(100vw - 32px); }

`
