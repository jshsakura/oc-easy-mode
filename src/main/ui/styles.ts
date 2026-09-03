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
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);

  /* --radius: 0.625rem, in px for the reason at the top of this file */
  --radius: 10px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 14px;
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

/* Focus ring — shadcn's: 3px of ring at half strength, and no outline of the
   browser's own. This is also the cursor when the app is driven by arrow keys. */
[data-nav]:focus { outline: none; }
[data-nav]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 5px var(--ring);
  border-radius: var(--radius-md);
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.side {
  background: var(--sidebar); color: var(--sidebar-foreground);
  border-right: 1px solid var(--sidebar-border);
  padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
}
.brand {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 8px 14px; font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
}
.modes {
  display: flex; gap: 2px; background: var(--muted); border-radius: var(--radius-md);
  padding: 3px; margin: 0 0 10px;
}
.mode {
  flex: 1; padding: 5px 0; border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 500; color: var(--muted-foreground); transition: color .15s, background .15s;
}
.mode:hover { color: var(--foreground); }
.mode.on { background: var(--background); color: var(--foreground); }
.nav {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 8px 10px; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 500; color: var(--muted-foreground);
  transition: background .15s, color .15s;
}
.nav:hover { background: var(--sidebar-accent); color: var(--sidebar-accent-foreground); }
.nav.on { background: var(--sidebar-accent); color: var(--sidebar-accent-foreground); }
.side h4 {
  margin: 16px 10px 4px; font-size: 12px; font-weight: 500;
  color: var(--muted-foreground);
}
.side .pl {
  font-size: 13px; font-weight: 400; padding: 6px 10px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
}
.side .spacer { flex: 1; }
.exit {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
  height: 36px; padding: 0 12px; border-radius: var(--radius-md);
  border: 1px solid var(--border); background: transparent;
  font-size: 14px; font-weight: 500; color: var(--foreground);
  transition: background .15s;
}
.exit:hover { background: var(--accent); }

/* ── Main ────────────────────────────────────────────────────────────────── */
.main { overflow-y: auto; padding: 28px 32px 40px; min-width: 0; }
.main h2 { margin: 0 0 18px; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
.main h3 { margin: 22px 0 8px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.sub { color: var(--muted-foreground); font-size: 14px; }
.empty { color: var(--muted-foreground); padding: 48px 0; text-align: center; font-size: 14px; }
.err {
  color: var(--destructive); font-size: 14px;
  border: 1px solid var(--border); background: var(--card);
  border-radius: var(--radius-lg); padding: 14px 16px; margin: 4px 0 18px;
}

/* Input */
.searchbox {
  display: flex; gap: 8px; align-items: center;
  height: 40px; padding: 0 12px; margin-bottom: 20px;
  background: transparent; color: var(--foreground);
  border: 1px solid var(--input); border-radius: var(--radius-md);
  transition: border-color .15s, box-shadow .15s;
}
.searchbox:focus-within { border-color: var(--ring); box-shadow: 0 0 0 3px oklch(0.556 0 0 / 50%); }
.searchbox input { flex: 1; height: 100%; background: none; border: 0; outline: 0; font-size: 14px; }
.searchbox input::placeholder { color: var(--muted-foreground); }
.searchbox svg { color: var(--muted-foreground); flex: none; }

/* Button */
.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0 0 20px; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 36px; padding: 0 16px; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 500; white-space: nowrap;
  background: var(--secondary); color: var(--secondary-foreground);
  transition: background .15s, color .15s, border-color .15s;
}
.btn:hover { background: var(--secondary-hover); }
.btn.primary { background: var(--primary); color: var(--primary-foreground); }
.btn.primary:hover { background: var(--primary-hover); }
.btn.ghost { background: transparent; color: var(--foreground); }
.btn.ghost:hover { background: var(--accent); color: var(--accent-foreground); }
.btn.danger { background: transparent; color: var(--destructive); border: 1px solid var(--border); }
.btn.danger:hover { background: var(--destructive); color: var(--foreground); border-color: transparent; }

/* ── Track rows ──────────────────────────────────────────────────────────── */
.rows { display: flex; flex-direction: column; gap: 2px; }
.row {
  display: grid; grid-template-columns: 28px 64px 1fr auto 36px;
  align-items: center; gap: 12px; padding: 6px 8px;
  border-radius: var(--radius-md); min-height: 56px; cursor: pointer;
  transition: background .15s;
}
.row:hover { background: var(--accent); }
.row.now { background: var(--accent); }
.row.dead { opacity: .5; }
.row .idx { color: var(--muted-foreground); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
.row .thumb {
  width: 64px; height: 36px; border-radius: var(--radius-sm);
  background: var(--muted) center/cover; border: 1px solid var(--border);
}
.row .meta { min-width: 0; }
.row .title { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .by { color: var(--muted-foreground); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .dur { color: var(--muted-foreground); font-size: 13px; font-variant-numeric: tabular-nums; }
.row .more {
  width: 32px; height: 32px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  /* Always present, never hidden. A hidden element cannot take focus, so a
     hover-only button is a button the arrow keys can never reach — and this
     UI is meant to be drivable by arrow keys alone. It recedes instead. */
  color: var(--muted-foreground); opacity: .55;
  transition: background .15s, color .15s, opacity .15s;
}
.row:hover .more, .row.now .more, .row .more:focus-visible { opacity: 1; }
.row .more:hover { background: var(--secondary); color: var(--foreground); opacity: 1; }

/* ── Cards, shelves, grid ────────────────────────────────────────────────── */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px 16px; }
.card { text-align: left; }
.card .cover {
  aspect-ratio: 16/9; border-radius: var(--radius-lg);
  background: var(--card) center/cover; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center; color: var(--muted-foreground);
  transition: border-color .15s;
}
.card:hover .cover { border-color: var(--ring); }
.card .t { margin-top: 8px; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card .s { color: var(--muted-foreground); font-size: 13px; }

.shelf { margin-bottom: 32px; }
.shelf h3 { margin: 0 0 12px; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.shelfRow { display: flex; gap: 16px; overflow-x: auto; padding: 2px 2px 12px; scroll-snap-type: x proximity; }
.tile { width: 208px; flex: none; text-align: left; scroll-snap-align: start; }
.tile .cover {
  aspect-ratio: 16/9; border-radius: var(--radius-lg);
  background: var(--card) center/cover; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center; color: var(--muted-foreground);
  transition: border-color .15s;
}
.tile:hover .cover { border-color: var(--ring); }
.tile .t {
  margin-top: 8px; font-size: 14px; font-weight: 500; line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.tile .s { margin-top: 2px; color: var(--muted-foreground); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 24px 18px; }
.grid .tile { width: auto; }

.head { display: flex; gap: 20px; align-items: flex-end; margin-bottom: 18px; }
.head .cover {
  width: 220px; aspect-ratio: 16/9; flex: none;
  border-radius: var(--radius-xl); background: var(--card) center/cover;
  border: 1px solid var(--border);
}

/* ── The slot YouTube's player is positioned over ────────────────────────── */
.slot { position: fixed; pointer-events: none; border-radius: var(--radius-lg); background: oklch(0.145 0 0); }
.slot.hidden { display: none; }
.slot.corner {
  right: 28px; bottom: calc(var(--bar) + 24px); width: 288px; aspect-ratio: 16/9;
  box-shadow: 0 10px 30px oklch(0 0 0 / 55%);
}
.slot.stage { left: var(--side); top: 0; right: 0; width: auto; height: min(46vh, 520px); border-radius: 0; }
.app.has-stage .main { padding-top: calc(min(46vh, 520px) + 24px); }
.app.has-corner .main { padding-bottom: 220px; }

/* ── Player bar ──────────────────────────────────────────────────────────── */
.bar {
  grid-column: 1 / -1; background: var(--card); border-top: 1px solid var(--border);
  display: grid; grid-template-columns: minmax(200px, 1fr) minmax(320px, 2fr) minmax(200px, 1fr);
  align-items: center; padding: 0 16px; gap: 16px;
}
.now { display: flex; align-items: center; gap: 12px; min-width: 0; }
.now .thumb {
  width: 56px; height: 56px; flex: none; border-radius: var(--radius-md);
  background: var(--muted) center/cover; border: 1px solid var(--border);
}
.now .t { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.now .b { color: var(--muted-foreground); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.center { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.ctl { display: flex; align-items: center; gap: 4px; }
.ctl button {
  width: 36px; height: 36px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted-foreground); transition: background .15s, color .15s;
}
.ctl button:hover { background: var(--accent); color: var(--foreground); }
.ctl button.on { color: var(--foreground); background: var(--accent); }
.ctl .big { width: 38px; height: 38px; border-radius: 999px; background: var(--primary); color: var(--primary-foreground); }
.ctl .big:hover { background: var(--primary-hover); color: var(--primary-foreground); }
.seek {
  display: flex; align-items: center; gap: 10px; width: 100%; max-width: 620px;
  font-size: 12px; color: var(--muted-foreground); font-variant-numeric: tabular-nums;
}
.seek input { flex: 1; }
.right { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.right button {
  width: 34px; height: 34px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted-foreground); transition: background .15s, color .15s;
}
.right button:hover { background: var(--accent); color: var(--foreground); }
.right button.on { color: var(--foreground); background: var(--accent); }
.right .vol { width: 88px; margin: 0 6px 0 2px; }

/* Slider */
input[type=range] {
  -webkit-appearance: none; appearance: none;
  height: 6px; border-radius: 999px; background: var(--secondary); outline: 0; cursor: pointer;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 14px; height: 14px; border-radius: 999px;
  background: var(--background); border: 1px solid var(--primary);
  box-shadow: 0 1px 2px oklch(0 0 0 / 30%);
}
input[type=range]:hover::-webkit-slider-thumb { border-color: var(--foreground); }

/* ── Dropdown menu, dialog, toast ────────────────────────────────────────── */
.menu {
  position: fixed; z-index: 2147483100; min-width: 200px; padding: 4px;
  background: var(--popover); color: var(--popover-foreground);
  border: 1px solid var(--border); border-radius: var(--radius-md);
  box-shadow: 0 10px 15px -3px oklch(0 0 0 / 40%), 0 4px 6px -4px oklch(0 0 0 / 40%);
}
.menu button {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  padding: 6px 8px; border-radius: var(--radius-sm); font-size: 14px;
  transition: background .12s;
}
.menu button:hover { background: var(--accent); color: var(--accent-foreground); }
.menu hr { border: 0; border-top: 1px solid var(--border); margin: 4px -4px; }

.scrim {
  position: fixed; inset: 0; z-index: 2147483090;
  background: oklch(0 0 0 / 80%); display: flex; align-items: center; justify-content: center;
}
.modal {
  width: 420px; max-height: 72vh; display: flex; flex-direction: column;
  background: var(--background); color: var(--foreground);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
  box-shadow: 0 25px 50px -12px oklch(0 0 0 / 60%);
}
.modal h3 { margin: 0; padding: 22px 24px 12px; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
.modal .list { overflow-y: auto; padding: 0 16px 8px; }
.modal .list button {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 8px 10px; border-radius: var(--radius-md); font-size: 14px;
  transition: background .12s;
}
.modal .list button:hover { background: var(--accent); }
.modal .new { display: flex; gap: 8px; padding: 16px 24px 22px; }
.modal .new input {
  flex: 1; height: 36px; padding: 0 12px;
  background: transparent; border: 1px solid var(--input); border-radius: var(--radius-md);
  outline: 0; font-size: 14px; transition: border-color .15s, box-shadow .15s;
}
.modal .new input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px oklch(0.556 0 0 / 50%); }

.toasts {
  position: fixed; left: 50%; bottom: calc(var(--bar) + 20px); transform: translateX(-50%);
  z-index: 2147483120; display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.toast {
  padding: 12px 16px; border-radius: var(--radius-lg); font-size: 14px;
  background: var(--popover); color: var(--popover-foreground);
  border: 1px solid var(--border);
  box-shadow: 0 10px 15px -3px oklch(0 0 0 / 40%);
}
.toast.bad { border-color: var(--destructive); color: var(--destructive); }

@media (max-width: 900px) {
  .app { --side: 64px; }
  .side { padding: 12px 8px; }
  .side .brand span, .side .nav span, .side h4, .side .pl, .exit span { display: none; }
  .nav, .exit { justify-content: center; }
  .modes { flex-direction: column; }
  .bar { grid-template-columns: 1fr 2fr auto; }
  .right .vol { display: none; }
}
`
