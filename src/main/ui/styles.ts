// The shell's stylesheet, as a string for the shadow root.
//
// Catppuccin Mocha, one accent, flat surfaces. The page-level rules that hide
// YouTube live in shell.ts because they must apply outside the shadow root.

export const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.app {
  --base: #1e1e2e; --mantle: #181825; --crust: #11111b;
  --surface0: #313244; --surface1: #45475a; --surface2: #585b70;
  --text: #cdd6f4; --subtext: #a6adc8; --overlay: #7f849c;
  --accent: #94e2d5; --red: #f38ba8; --green: #a6e3a1;
  --bar: 84px; --side: 232px;
  position: fixed; inset: 0; z-index: 2147482000;
  display: grid; grid-template-columns: var(--side) 1fr; grid-template-rows: 1fr var(--bar);
  background: var(--base); color: var(--text);
  font: 14px/1.5 system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  -webkit-font-smoothing: antialiased;
}
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
button:disabled { opacity: .4; cursor: default; }
input { font: inherit; color: inherit; }
a { color: inherit; text-decoration: none; }
::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-thumb { background: var(--surface1); border-radius: 5px; border: 2px solid var(--base); }

/* Mode switch */
.modes { display: flex; gap: 4px; background: var(--crust); border-radius: 8px; padding: 3px; margin: 0 4px 10px; }
.mode { flex: 1; padding: 6px 0; border-radius: 6px; font-size: 12.5px; color: var(--subtext); }
.mode:hover { color: var(--text); }
.mode.on { background: var(--surface0); color: var(--accent); font-weight: 600; }

/* The slot YouTube's player is positioned over. Never re-rendered, only re-classed. */
.slot { position: fixed; pointer-events: none; border-radius: 10px; background: var(--crust); }
.slot.hidden { display: none; }
.slot.corner { right: 28px; bottom: calc(var(--bar) + 24px); width: 288px; aspect-ratio: 16/9; box-shadow: 0 10px 32px rgba(0,0,0,.55); }
.slot.stage { left: var(--side); top: 0; right: 0; width: auto; height: min(46vh, 520px); border-radius: 0; }
.app.has-stage .main { padding-top: calc(min(46vh, 520px) + 24px); }
/* So the end of a list can be read out from under the floating picture. */
.app.has-corner .main { padding-bottom: 220px; }

/* Sidebar */
.side { background: var(--mantle); padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.brand { display: flex; align-items: center; gap: 8px; padding: 4px 8px 16px; font-weight: 600; color: var(--accent); }
.nav { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; color: var(--subtext); text-align: left; width: 100%; }
.nav:hover { background: var(--surface0); color: var(--text); }
.nav.on { background: var(--surface0); color: var(--text); }
.side h4 { margin: 18px 10px 6px; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--overlay); }
.side .pl { font-size: 13px; padding: 7px 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.side .spacer { flex: 1; }
.exit { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; color: var(--subtext); border: 1px solid var(--surface0); width: 100%; }
.exit:hover { color: var(--text); border-color: var(--surface1); }

/* Main */
.main { overflow-y: auto; padding: 28px 32px 40px; min-width: 0; }
.main h2 { margin: 0 0 16px; font-size: 22px; font-weight: 600; }
.main h3 { margin: 24px 0 8px; font-size: 15px; font-weight: 600; color: var(--subtext); }
.sub { color: var(--subtext); font-size: 13px; }
.empty { color: var(--overlay); padding: 40px 0; text-align: center; }
.err { color: var(--red); padding: 12px 14px; background: var(--mantle); border-radius: 8px; margin: 8px 0 16px; }
.searchbox { display: flex; gap: 8px; align-items: center; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 10px; padding: 0 12px; height: 46px; margin-bottom: 20px; }
.searchbox:focus-within { border-color: var(--accent); }
.searchbox input { flex: 1; background: none; border: 0; outline: 0; font-size: 15px; height: 100%; }
.searchbox svg { color: var(--overlay); flex: none; }
.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 12px 0 20px; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; background: var(--surface0); font-size: 13px; }
.btn:hover { background: var(--surface1); }
.btn.primary { background: var(--accent); color: var(--crust); font-weight: 600; }
.btn.primary:hover { filter: brightness(1.08); }
.btn.danger:hover { background: var(--red); color: var(--crust); }
.btn.ghost { background: none; color: var(--subtext); }
.btn.ghost:hover { background: var(--surface0); color: var(--text); }

/* Track rows */
.rows { display: flex; flex-direction: column; }
.row { display: grid; grid-template-columns: 28px 64px 1fr auto 36px; align-items: center; gap: 12px; padding: 6px 8px; border-radius: 8px; min-height: 52px; }
.row:hover { background: var(--surface0); }
.row.now { background: var(--surface0); }
.row.now .title { color: var(--accent); }
.row.dead { opacity: .45; }
.row .idx { color: var(--overlay); font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; }
.row.now .idx { color: var(--accent); }
.row .thumb { width: 64px; height: 36px; border-radius: 4px; background: var(--surface1) center/cover; cursor: pointer; position: relative; }
.row .thumb:hover::after { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,.35); border-radius: 4px; }
.row .meta { min-width: 0; cursor: pointer; }
.row .title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .by { color: var(--subtext); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .dur { color: var(--subtext); font-size: 12.5px; font-variant-numeric: tabular-nums; }
.row .more { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--subtext); visibility: hidden; }
.row:hover .more, .row.now .more { visibility: visible; }
.row .more:hover { background: var(--surface1); color: var(--text); }

/* Playlist cards */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 18px 16px; }
.card { text-align: left; }
.card .cover { aspect-ratio: 16/9; border-radius: 8px; background: var(--surface0) center/cover; display: flex; align-items: center; justify-content: center; color: var(--overlay); }
.card:hover .cover { outline: 2px solid var(--accent); }
.card .t { margin-top: 8px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card .s { color: var(--subtext); font-size: 12.5px; }
.head { display: flex; gap: 20px; align-items: flex-end; margin-bottom: 8px; }
.head .cover { width: 200px; aspect-ratio: 16/9; border-radius: 8px; background: var(--surface0) center/cover; flex: none; }

/* Player bar */
.bar { grid-column: 1 / -1; background: var(--mantle); border-top: 1px solid var(--surface0); display: grid; grid-template-columns: minmax(200px, 1fr) minmax(320px, 2fr) minmax(200px, 1fr); align-items: center; padding: 0 16px; gap: 16px; }
.now { display: flex; align-items: center; gap: 12px; min-width: 0; }
.now .thumb { width: 56px; height: 56px; border-radius: 6px; background: var(--surface0) center/cover; flex: none; }
.now .t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.now .b { color: var(--subtext); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.center { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ctl { display: flex; align-items: center; gap: 6px; }
.ctl button { width: 36px; height: 36px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--subtext); }
.ctl button:hover { color: var(--text); background: var(--surface0); }
.ctl button.on { color: var(--accent); }
.ctl .big { width: 40px; height: 40px; background: var(--text); color: var(--crust); }
.ctl .big:hover { background: #fff; color: var(--crust); }
.seek { display: flex; align-items: center; gap: 10px; width: 100%; max-width: 620px; font-size: 11.5px; color: var(--subtext); font-variant-numeric: tabular-nums; }
.seek input { flex: 1; }
input[type=range] { -webkit-appearance: none; height: 4px; background: var(--surface1); border-radius: 2px; outline: 0; cursor: pointer; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--text); }
input[type=range]:hover::-webkit-slider-thumb { background: var(--accent); }
.right { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.right button { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--subtext); }
.right button:hover { color: var(--text); background: var(--surface0); }
.right button.on { color: var(--accent); }
.right .vol { width: 90px; margin: 0 6px 0 2px; }

/* Menu, modal, toast */
.menu { position: fixed; z-index: 2147483100; background: var(--surface0); border: 1px solid var(--surface1); border-radius: 10px; padding: 6px; min-width: 200px; box-shadow: 0 8px 28px rgba(0,0,0,.45); }
.menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border-radius: 6px; text-align: left; font-size: 13.5px; }
.menu button:hover { background: var(--surface1); }
.menu hr { border: 0; border-top: 1px solid var(--surface1); margin: 6px 0; }
.scrim { position: fixed; inset: 0; z-index: 2147483090; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; }
.modal { background: var(--base); border: 1px solid var(--surface0); border-radius: 12px; width: 380px; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 12px 40px rgba(0,0,0,.5); }
.modal h3 { margin: 0; padding: 16px 18px 10px; font-size: 15px; color: var(--text); }
.modal .list { overflow-y: auto; padding: 0 8px 8px; }
.modal .list button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border-radius: 6px; text-align: left; }
.modal .list button:hover { background: var(--surface0); }
.modal .new { display: flex; gap: 8px; padding: 10px 12px 14px; border-top: 1px solid var(--surface0); }
.modal .new input { flex: 1; background: var(--mantle); border: 1px solid var(--surface0); border-radius: 8px; padding: 8px 10px; outline: 0; }
.modal .new input:focus { border-color: var(--accent); }
.toasts { position: fixed; left: 50%; bottom: calc(var(--bar) + 16px); transform: translateX(-50%); z-index: 2147483120; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
.toast { background: var(--surface0); color: var(--text); padding: 10px 16px; border-radius: 8px; font-size: 13px; box-shadow: 0 4px 16px rgba(0,0,0,.4); }
.toast.bad { background: var(--red); color: var(--crust); }

@media (max-width: 900px) {
  .app { --side: 64px; }
  .side { padding: 12px 8px; }
  .side .brand span, .side .nav span, .side h4, .side .pl, .exit span { display: none; }
  .nav, .exit { justify-content: center; }
  .bar { grid-template-columns: 1fr 2fr auto; }
  .right .vol { display: none; }
}
`
