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
  /* **The landing page's palette, value for value** (site/index.html's :root).
     The user's instruction — "깃헙 페이지처럼 깔끔하게 가자고 디자인 이미 예시가
     다있구만" — and they are right that the example was already written. The
     page and the product were two greys apart for no reason anyone could see. */
  --ground: #0e0e12;
  --side-panel: #17171e;
  --panel: #17171e;
  --background: #17171e;
  --foreground: #f4f4f7;
  --muted-foreground: #9c9ca9;
  --secondary: #1e1e28;
  --secondary-hover: #262633;
  --border: #2a2a38;
  --popover: #17171e;
  --popover-foreground: #f4f4f7;
  --primary: #9d6ee0;
  --primary-hover: #ac82e6;
  --primary-foreground: #ffffff;
  --destructive: #f38ba8;
  --ring: #9d6ee0;

  /* One surface. The sidebar, the bar and the page are the same colour and are
     told apart by a single hairline, not by three shades of grey. Only things
     that float — a menu, a dialog, the corner window — sit on --popover. */
  /* The panels are translucent and blurred over a ground that is not flat.
     Glass over a single colour is just a colour, so the ground carries two
     soft washes for the panels to have something to be in front of. */
  --glass: rgba(23, 23, 30, .66);
  --glass-strong: rgba(23, 23, 30, .80);
  --glass-line: rgba(255, 255, 255, .09);
  --blur: saturate(150%) blur(22px);

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
  --ground: #f0f0f4;
  --side-panel: #f7f7f9;
  --panel: #ffffff;
  --background: #ffffff;
  --foreground: #141418;
  --muted-foreground: #5e5e6e;
  --secondary: #f0f0f4;
  --secondary-hover: #e6e6ec;
  --border: #e2e2e8;
  --popover: #ffffff;
  --popover-foreground: #141418;
  --primary: #7e4dc5;
  --primary-hover: #8f61d0;
  --primary-foreground: #ffffff;
  --destructive: #d63b5e;
  --ring: #7e4dc5;
  --glass: rgba(255, 255, 255, .66);
  --glass-strong: rgba(255, 255, 255, .78);
  --glass-line: rgba(0, 0, 0, .07);
  --hover: rgba(0, 0, 0, .05);
  --shadow: 0 16px 40px rgba(0, 0, 0, .16);
}

.app {
  --bar: 84px;
  --side: 244px;
  --gap: 8px;
  /* The stage is as tall as a 16:9 video in the width it has, and no taller.
     A fraction of the screen height was the wrong measure: it took the room a
     video needed plus whatever was left over, and the list got half a screen
     the moment anyone pressed 영상. Capped, because on a wide window 16:9 of
     the full width is most of the viewport. */
  --stage-h: min(calc((100vw - var(--side) - var(--gap) * 3) * 0.5625), 42vh);

  /* Two panels floating on a darker ground, with the player bar across the
     bottom. This is what separates an application from a web page: the chrome
     is a frame the content sits inside, not a strip of the document. */
  /* dvh, not vh and not a number measured in script.
     vh is the *largest* viewport — it ignores a browser's retractable toolbars,
     so the bottom of the app hides behind them. Measuring visualViewport in
     script has the opposite failure: it reports the visible area in CSS pixels,
     which on a zoomed-out page is far smaller than the screen, and the app ends
     up covering the top half with the hidden page showing black underneath.
     dvh is the dynamic viewport — exactly the visible area, in the page's own
     units — and it is the unit this problem was invented for.
     No backticks anywhere in this file: it is one template literal. */
  /* Sized in viewport units on BOTH axes, and this is not a style choice.
     A fixed element resolves against the viewport only while no ancestor has
     a transform, a filter or containment — any of those becomes the containing
     block instead, and YouTube has one. So right:0 was measuring that ancestor:
     on a 390-pixel phone the app came out 508 wide, and everything along its
     right edge — the next button, and the mode switch back when it was up
     there — sat off the side of the screen where no thumb could reach it.
     shell.ts carries the same note about the player, which is why it places
     that by measuring rather than by trusting the rect it asked for.
     The height was already in viewport units for a different reason and was
     therefore right; the width was left to right:0 and was wrong.
     (No backticks anywhere in this file: it is one template literal.) */
  position: fixed; top: 0; left: 0; z-index: 2147482000;
  width: 100vw;
  width: 100dvw;
  height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-columns: var(--side) 1fr; grid-template-rows: 1fr var(--bar);
  gap: var(--gap); padding: var(--gap);
  background:
    radial-gradient(72% 55% at 12% -8%, color-mix(in srgb, var(--primary) 20%, transparent), transparent 62%),
    radial-gradient(58% 46% at 96% 106%, color-mix(in srgb, var(--primary) 14%, transparent), transparent 62%),
    var(--ground);
  color: var(--foreground);
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
.nav:hover, .row:hover,
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
  /* Glass, over the ground's wash. Edged with a light hairline rather than a
     border colour, which is what makes a pane read as glass and not as a box. */
  background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
  border: 1px solid var(--glass-line);
  border-radius: var(--radius-lg);
  padding: 16px 12px; display: flex; flex-direction: column; gap: 2px;
  /* It has to scroll, and on a phone that needs saying twice: min-height so a
     column of buttons that will not shrink can overflow rather than push the
     box open, and overscroll-behavior so a flick that reaches the end does not
     hand the page underneath a scroll it will do nothing with. */
  overflow-y: auto; min-height: 0; overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
/* Everything in this column shares one left edge and one icon-to-label gap:
   10px of padding, an 18px glyph, 12px of gap. They had been 8/20/8, 10/18/10
   and 10/18/12, so the brand, the switch and the destinations each started at
   a different x and the column read as three lists stacked. */
.brand {
  display: flex; align-items: center; gap: 12px;
  padding: 6px 10px 18px; font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
}
/* One switch, not two buttons. There are two states and one of them is on;
   a segmented pair made that binary look like a choice between two places. */
.modeToggle {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 5px 10px; margin: 0 0 10px; border-radius: var(--radius-md);
  font-size: 13px; font-weight: 500; color: var(--muted-foreground);
  transition: color var(--ease), background var(--ease);
}
.modeToggle .lbl { flex: 1; text-align: left; }
.modeToggle .sw {
  position: relative; flex: none; width: 30px; height: 17px;
  border-radius: 999px; background: var(--secondary);
  transition: background var(--ease);
}
.modeToggle .knob {
  position: absolute; top: 2px; left: 2px; width: 13px; height: 13px;
  border-radius: 999px; background: var(--muted-foreground);
  transition: left var(--ease), background var(--ease);
}
.modeToggle:hover { color: var(--foreground); background: var(--hover); }
.modeToggle.on { color: var(--foreground); }
.modeToggle.on .sw { background: var(--primary); }
.modeToggle.on .knob { left: 15px; background: var(--primary-foreground); }
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
/* One more line in the list, with the same indent and the same gap. It was a
   bordered button under the menu, which read as a different kind of thing. */
.exit { margin-top: 4px; }

/* ── The header strip, on a narrow screen only ───────────────────────────── */
.top { display: none; }
/* The screen's name, at the size a header wants rather than the size a page
   title wants. It replaces the 22px heading that used to sit in the content. */
.top .name {
  min-width: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.themeButton {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 34px; height: 34px; border-radius: var(--radius-md);
  color: var(--muted-foreground); transition: background var(--ease), color var(--ease);
}
.themeButton:hover { color: var(--foreground); background: var(--hover); }

.drawerClose {
  display: none; width: 34px; height: 34px; border-radius: var(--radius-md);
  align-items: center; justify-content: center; color: var(--muted-foreground);
  transition: background var(--ease), color var(--ease);
}
.drawerClose:hover { color: var(--foreground); background: var(--hover); }

/* ── Main ────────────────────────────────────────────────────────────────── */
.main {
  background: var(--glass-strong); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
  border: 1px solid var(--glass-line);
  border-radius: var(--radius-lg);
  overflow-y: auto; padding: 28px 28px 48px; min-width: 0;
}
.main h2 { margin: 0 0 20px; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
.main h3 { margin: 24px 0 8px; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.sub { color: var(--muted-foreground); font-size: 14px; }
.label { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 10px; }
.empty { color: var(--muted-foreground); padding: 56px 0; text-align: center; font-size: 14px; }
.empty svg { display: block; margin: 0 auto 14px; opacity: .45; }
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
/* The playing row.
 *
 * A flat tint was easy to miss in a list of forty; this is tinted, edged on
 * the left in the accent, and carries three bars that move. Motion is the
 * thing the eye finds without looking for it. */
.row.now {
  background: linear-gradient(90deg, color-mix(in srgb, var(--primary) 16%, transparent), transparent 60%);
  box-shadow: inset 2px 0 0 var(--primary);
}
.row.now .title { color: var(--primary); font-weight: 600; }
.eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 13px; }
.eq i { width: 3px; border-radius: 1px; background: var(--primary); animation: eq .9s ease-in-out infinite; }
.eq i:nth-child(1) { height: 40%; animation-delay: -.2s; }
.eq i:nth-child(2) { height: 100%; animation-delay: -.5s; }
.eq i:nth-child(3) { height: 65%; }
@keyframes eq {
  0%, 100% { transform: scaleY(.35); }
  50% { transform: scaleY(1); }
}
.eq i { transform-origin: bottom; }
/* A reader who has asked for less movement gets the bars, standing still. */
@media (prefers-reduced-motion: reduce) {
  .eq i { animation: none; }
}
.row.dead { opacity: .4; }
.row .idx { color: var(--muted-foreground); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
.row .thumb { width: 56px; height: 32px; border-radius: 4px; background: var(--secondary) center/cover; }
/* Square, because a playlist's picture is a cover. The trailing chevron is the
   one from the sidebar's exit, turned around. */
.row.plrow { grid-template-columns: 44px 1fr 20px; }
.row.plrow .thumb { width: 44px; height: 44px; border-radius: 6px; }
.row.plrow > svg { color: var(--muted-foreground); transform: rotate(180deg); justify-self: end; }
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

/* ── Artwork ───────────────────────────────────────────────────────────────
   One card, not a picture with a caption floating under it. The artwork is
   flush to the card's top edge with square corners of its own, and the title
   sits on the card directly beneath it — asked for, and it is what an app
   looks like. The rounding lives on the card, so the corners the eye sees are
   the card's; the picture is not cropped round.

   (This replaces an earlier rule that put a radius on the picture itself and
   left a gap under it. That read as a loose photo above some text.) */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 20px 14px; }
.card, .tile {
  text-align: left; border-radius: var(--radius-md); overflow: hidden;
  background: var(--secondary); transition: background var(--ease);
}
.card:hover, .tile:hover, .card:focus-visible, .tile:focus-visible { background: var(--secondary-hover); }
.card .cover, .tile .cover {
  position: relative; aspect-ratio: 16/9; border-radius: 0;
  background: var(--secondary) center/cover;
  display: flex; align-items: center; justify-content: center; color: var(--muted-foreground);
}
/* Sits on the artwork and appears on hover or focus, like every music client.
   It is decoration only — the whole card is the button. */
.cover .play {
  position: absolute; right: 10px; bottom: 10px;
  width: 40px; height: 40px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  background: oklch(0 0 0 / 74%); color: oklch(0.985 0 0);
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
.card .t, .tile .t { margin-top: 0; padding: 8px 10px 0; font-size: 14px; font-weight: 500; }
.card .t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* Two lines of room whether the title needs them or not. A grid holds titles
   of one line beside titles of two, and without this the second line of one
   card sits where its neighbour's subtitle is — the row stops being a row. */
.tile .t {
  line-height: 1.35; min-height: calc(14px * 1.35 * 2 + 8px);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card .s, .tile .s { margin-top: 2px; padding: 0 10px 10px; color: var(--muted-foreground); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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
.slot { position: fixed; pointer-events: none; background: #000; }
.slot.hidden { display: none; }
.slot.corner {
  left: calc(100dvw - 280px - var(--gap)); bottom: calc(var(--bar) + var(--gap)); width: 280px;
  aspect-ratio: 16/9; box-shadow: var(--shadow);
}
/* The stage was 46vh with the list pushed down by the same amount, so on a
   900px window more than half the content panel was video and the list got a
   sliver. A player that shows one and a half rows is not showing a list. */
.slot.stage {
  left: calc(var(--side) + var(--gap) * 2); top: var(--gap);
  width: calc(100dvw - var(--side) - var(--gap) * 3); height: var(--stage-h);
}
.app.has-stage .main { padding-top: calc(var(--stage-h) + 20px); }
.app.has-corner .main { padding-bottom: 220px; }

/* ── Player bar ──────────────────────────────────────────────────────────── */
.bar {
  /* min-width: 0, or a long title makes the bar wider than the screen.
     A grid item's automatic minimum size is its min-content width, and the
     min-content of a bar holding a nowrap title is that whole title — so the
     track said 390 and the bar took 508, carrying the play and next buttons
     off the right-hand edge. The ellipsis cannot save it: it only applies once
     something has decided the box is narrower than its text. */
  grid-column: 1 / -1; min-width: 0; background: transparent;
  display: grid; grid-template-columns: minmax(200px, 1fr) minmax(320px, 2fr) minmax(200px, 1fr);
  align-items: center; padding: 0; gap: 16px;
}
.now { display: flex; align-items: center; gap: 14px; min-width: 0; overflow: hidden; }
.now .nowText { min-width: 0; }
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
/* The transport's play button is not the accent. It was the largest purple
   thing on the screen, next to purple sliders and purple badges on every card,
   and a colour used that often stops pointing at anything. It is the highest
   contrast shape instead, which is what a play button wants to be; --primary
   is left to the elapsed line and the one primary button a screen has. */
.ctl .big { background: var(--foreground); color: var(--background); border-radius: 999px; }
.ctl .big:hover { background: var(--foreground); color: var(--background); opacity: .88; }
.seek {
  display: flex; align-items: center; gap: 12px; width: 100%; max-width: 620px;
  font-size: 12px; color: var(--muted-foreground); font-variant-numeric: tabular-nums;
}
.seek input { flex: 1; }
.right { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.right .vol { width: 84px; margin-left: 4px; }

/* A range input draws no progress of its own: left alone it is a grey line
   with a dot on it, which reads as a setting rather than as elapsed time. The
   filled part is a gradient whose stop is --p, written by the tick.

   The input is 16px tall and transparent while the visible line is 4px, so
   the part a finger has to hit is four times the part the eye sees. */
input[type=range] {
  -webkit-appearance: none; appearance: none;
  height: 16px; margin: 0; background: transparent; outline: 0; cursor: pointer;
}
input[type=range]::-webkit-slider-runnable-track {
  height: 4px; border-radius: 999px;
  background: linear-gradient(to right, var(--primary) var(--p, 0%), var(--secondary) var(--p, 0%));
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; margin-top: -4px;
  width: 12px; height: 12px; border-radius: 999px; background: var(--foreground);
}
input[type=range]::-moz-range-track {
  height: 4px; border-radius: 999px;
  background: linear-gradient(to right, var(--primary) var(--p, 0%), var(--secondary) var(--p, 0%));
}
input[type=range]::-moz-range-thumb {
  width: 12px; height: 12px; border: 0; border-radius: 999px; background: var(--foreground);
}

/* ── The words ───────────────────────────────────────────────────────────── */
.lyrics { display: none; }
.lyricsEmpty { color: var(--muted-foreground); font-size: 14px; text-align: center; padding: 40px 0; }
.lyricLine {
  display: block; width: 100%; text-align: center;
  padding: 7px 4px; font-size: 16px; line-height: 1.45; font-weight: 500;
  color: var(--muted-foreground); opacity: .55;
  transition: color var(--ease), opacity var(--ease), transform var(--ease);
}
/* The line being sung, and only it. Everything else recedes rather than
   disappearing, so the shape of the song stays visible. */
.lyricLine.on { color: var(--foreground); opacity: 1; transform: scale(1.04); }

/* ── Menu, dialog, toast — the only things that float ────────────────────── */
.menu {
  position: fixed; z-index: 2147483100; min-width: 208px; padding: 4px;
  background: var(--glass-strong); color: var(--popover-foreground);
  -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
  border: 1px solid var(--glass-line); border-radius: var(--radius-md); box-shadow: var(--shadow);
}
.menu button {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  padding: 8px 10px; border-radius: 6px; font-size: 14px;
  color: var(--foreground); transition: background var(--ease);
}
.menu hr { border: 0; border-top: 1px solid var(--border); margin: 4px -4px; }

/* The narrow form: a sheet at the foot of the screen. Placed here rather than
   in the width query below because this root has no .app to qualify it and the
   decision is made in script anyway. */
.menu.sheetMenu {
  left: 10px; right: 10px; bottom: calc(12px + env(safe-area-inset-bottom));
  top: auto; min-width: 0; padding: 6px;
}
.menu.sheetMenu button { padding: 13px 12px; font-size: 15px; }

.scrim {
  position: fixed; left: 0; top: 0; width: 100dvw; height: 100dvh; z-index: 2147483090;
  background: oklch(0 0 0 / 70%); display: flex; align-items: center; justify-content: center;
}
.modal {
  width: 420px; max-height: 72vh; display: flex; flex-direction: column;
  background: var(--glass-strong); color: var(--popover-foreground);
  -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
  border: 1px solid var(--glass-line); border-radius: var(--radius-lg); box-shadow: var(--shadow);
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
  position: fixed; left: 50dvw; bottom: calc(var(--bar) + var(--gap) + 12px); transform: translateX(-50%);
  z-index: 2147483120; display: flex; flex-direction: column; gap: 8px; pointer-events: none;
}
.toast {
  padding: 12px 18px; border-radius: var(--radius-md); font-size: 14px;
  background: var(--glass-strong); color: var(--popover-foreground);
  -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
  border: 1px solid var(--glass-line); box-shadow: var(--shadow);
}
.toast.bad { color: var(--destructive); }

/* ── Responsive ──────────────────────────────────────────────────────────
   Three steps, and each one gives something up rather than making everything
   narrower.

   **The last step is a class, not a width query, and that is deliberate.**
   Whether there is room for a sidebar is a question only the app can answer,
   because the honest answer needs two numbers: the viewport, and the screen.
   Orion on iPhone sends a desktop user agent, is served the desktop page, and
   until our viewport meta lands it reports a layout viewport near 980 — a
   width query calls that a desktop and lays a phone out as one. device.ts
   takes the smaller of the two and stamps a narrow class on the app; every rule
   below reads that stamp, so the layout and the code that decides where the
   picture goes can no longer disagree. The two steps above it are about a
   window being dragged narrower, which is exactly what a width query is for.

   Menus, dialogs and toasts are drawn in the *other* shadow root, where there
   is no .app to qualify them, so those keep a width query of their own at the
   bottom of this file.

   Container queries do not work here and cost an hour to find out: a container
   cannot style itself, and the shadow host is inline under all: initial, so it
   cannot be a size container either. */
.drawerScrim, .drawerToggle, .sheetClose { display: none; }

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

/* ── Narrow ───────────────────────────────────────────────────────────────
   The sidebar becomes a drawer, the header becomes a strip of its own, and
   the player bar becomes something that can be opened. */
.app.narrow {
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 0; padding: 0;
  --bar: auto;
  --top-h: 52px;
  --top-all: calc(var(--top-h) + env(safe-area-inset-top));
  --stage-h: calc(100vw * 0.5625);
}

/* ── The header strip ─────────────────────────────────────────────────────
   A row in the grid rather than two buttons fixed to the corners.

   The floating version was covered by the video the moment anyone pressed
   영상: the stage is fixed to the top of the screen and the player is drawn
   above the entire app — it has to be, or our own panels would hide the
   picture — so the drawer button and the mode switch ended up underneath it
   with no way to reach either. A row cannot be covered, because the stage
   starts below it. */
.app.narrow .top {
  grid-row: 1; grid-column: 1;
  display: flex; align-items: center; gap: 9px;
  height: var(--top-all); padding: env(safe-area-inset-top) 10px 0;
  background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
  border-bottom: 1px solid var(--glass-line);
}
.app.narrow .drawerToggle { display: inline-flex; width: 38px; height: 38px; margin-right: -3px; }
.app.narrow .drawerClose { display: inline-flex; }

.app.narrow .main {
  grid-row: 2; grid-column: 1; position: relative;
  border: 0; border-radius: 0;
  padding: 20px 16px 24px;
}
/* Only the screen's own title, which the header now carries. A playlist's
   heading lives inside .head and is content, not a screen name. */
.app.narrow .main > h2, .app.narrow .head h2 { display: none; }
.app.narrow .btn { height: 34px; padding: 0 12px; font-size: 13.5px; }
.app.narrow .toolbar { gap: 6px; }
.app.narrow .main h2 { font-size: 22px; margin-bottom: 16px; }

/* ── The drawer ─────────────────────────────────────────────────────────── */
/* Slid with left, not transform.
   A transformed element becomes the containing block for any fixed-position
   descendant, and that took the mode switch off-canvas with the drawer when
   it still lived in here. Animating left costs a little smoothness and avoids
   the whole class of problem. (No backticks in this file: it is one template
   literal.) */
.app.narrow .side {
  position: fixed; left: -302px; top: 0; height: 100dvh; width: 302px; z-index: 20;
  overflow-y: auto; overscroll-behavior: contain;
  background: var(--glass-strong);
  border: 0; border-right: 1px solid var(--glass-line); border-radius: 0;
  transition: left .22s ease;
  padding: calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));
}
.app.narrow.drawer-open .side { left: 0; }
.app.narrow .brand { padding: 4px 4px 14px; }
/* A finger is not a cursor: every line in the drawer is a target. */
.app.narrow .nav { padding: 11px 12px; font-size: 15px; }
.app.narrow .exit { padding: 11px 12px; font-size: 15px; }
.app.narrow .side .pl { padding: 9px 12px; font-size: 14px; }

/* Sized like the app, and for the same reason: inset: 0 measures a box that
   can be wider than the screen, and a scrim wider than the screen makes the
   page overflow. On a phone that is not a cosmetic problem — the browser zooms
   out to fit, so tapping the menu button shrank the whole UI. */
.app.narrow .drawerScrim {
  display: block; position: fixed; left: 0; top: 0; width: 100dvw; height: 100dvh; z-index: 15;
  background: rgba(0, 0, 0, .6); opacity: 0; pointer-events: none;
  transition: opacity .22s ease;
}
.app.narrow.drawer-open .drawerScrim { opacity: 1; pointer-events: auto; }

/* ── The picture ────────────────────────────────────────────────────────── */
.app.narrow .slot.corner { display: none; }
.app.narrow.has-corner .main { padding-bottom: 24px; }
.app.narrow .slot.stage { left: 0; width: 100dvw; top: var(--top-all); height: var(--stage-h); border-radius: 0; }
.app.narrow.has-stage .main { padding-top: calc(var(--stage-h) + 16px); }

/* ── The bar, closed ──────────────────────────────────────────────────────
   What is playing, a play button, a next button, and the progress as a
   hairline along the top edge. Everything else is one tap away rather than
   squeezed in beside them. */
.app.narrow .bar {
  grid-row: 3; grid-column: 1; position: relative;
  display: flex; align-items: center; gap: 10px;
  background: var(--glass); -webkit-backdrop-filter: var(--blur); backdrop-filter: var(--blur);
  border-top: 1px solid var(--glass-line);
  padding: 7px 8px calc(16px + env(safe-area-inset-bottom));
}
.app.narrow .now { flex: 1; min-width: 0; gap: 10px; cursor: pointer; }
.app.narrow .now .thumb { width: 38px; height: 38px; }
.app.narrow .now .t { font-size: 13.5px; }
.app.narrow .now .b { font-size: 11.5px; margin-top: 1px; }
.app.narrow .center { flex-direction: row; gap: 0; }
.app.narrow .ctl { gap: 0; }
.app.narrow .ctl button { width: 38px; height: 38px; }
.app.narrow .ctl .big { width: 42px; height: 42px; }

/* Shuffle and repeat put away, which is where they already were. Previous,
   play and next stay exactly where they have always been. */
.app.narrow:not(.sheet-open) .ctl .sh,
.app.narrow:not(.sheet-open) .ctl .rp,
.app.narrow:not(.sheet-open) .right { display: none; }
/* The elapsed line goes along the *bottom* edge, under everything — asked for
   twice. Above the controls it was a second horizontal rule in a bar that
   already has one. */
/* Inset, and with its handle. Run to the edges it read as a rule under the
   bar rather than as a control, and a progress bar with no handle gives a
   thumb nothing to take hold of. */
.app.narrow:not(.sheet-open) .seek {
  position: absolute; left: 14px; right: 14px; top: auto;
  bottom: calc(env(safe-area-inset-bottom) + 3px);
  /* width: auto, and it matters: the base rule sets width: 100%, which on an
     absolutely positioned box wins over the left/right pair — the track began
     at 14px and then took the full width anyway, so its right end hung 14px
     off the side of the screen. */
  width: auto; max-width: none; gap: 0;
}
/* A shorter box than the 16px the sliders take elsewhere, so the track clears
   the row above it instead of overlapping the title by six pixels. */
.app.narrow:not(.sheet-open) .seek input { height: 10px; }
.app.narrow:not(.sheet-open) .seek input::-webkit-slider-thumb { margin-top: -3px; }
.app.narrow:not(.sheet-open) .seek span { display: none; }
/* Small, because it is a hint of where you are rather than a control asking
   to be dragged — the full-size one belongs in the opened player. */
.app.narrow:not(.sheet-open) .seek input::-webkit-slider-thumb { width: 9px; height: 9px; margin-top: -2.5px; }
.app.narrow:not(.sheet-open) .seek input::-moz-range-thumb { width: 9px; height: 9px; }

/* ── The bar, opened ──────────────────────────────────────────────────────
   The same element and the same controls, laid out down the screen instead of
   across it. There is no second player to keep in step, which is the whole
   reason it is done this way.

   In 영상 mode it opens under the picture rather than over it: the player is
   drawn above the app and cannot be covered, and a sheet that hid the video
   would be a sheet about a video you cannot see. */
.app.narrow.sheet-open .bar {
  position: fixed; left: 0; top: 0; width: 100dvw; bottom: 0; z-index: 30;
  flex-direction: column; align-items: stretch; gap: 0;
  padding: calc(6px + env(safe-area-inset-top)) 20px calc(22px + env(safe-area-inset-bottom));
  background: var(--glass-strong);
  border-top: 0;
}
.app.narrow.sheet-open.has-stage .bar {
  top: calc(var(--top-all) + var(--stage-h));
  padding-top: 6px;
}
.app.narrow.sheet-open .sheetClose {
  display: inline-flex; align-items: center; justify-content: center;
  align-self: flex-start; flex: none;
  width: 40px; height: 40px; margin-left: -10px;
  border-radius: var(--radius-md); color: var(--muted-foreground);
}
.app.narrow.sheet-open .sheetClose:hover { color: var(--foreground); background: var(--hover); }

.app.narrow.sheet-open .now {
  flex: 0 1 auto; flex-direction: column; align-items: center; text-align: center;
  gap: 0; padding: 0; margin: 0; cursor: default; min-width: 0;
}
.app.narrow.sheet-open .now .thumb {
  width: min(70vw, 300px); height: auto; aspect-ratio: 1;
  border-radius: var(--radius-lg); box-shadow: var(--shadow); margin: 6px 0 26px;
}
/* The picture is already on screen above; a cover under it would be a second
   answer to the same question. */
.app.narrow.sheet-open.has-stage .now .thumb { display: none; }

/* With the words open they are what the pane is for: the artwork steps aside
   and the list takes the room the transport is not using. */
.app.narrow.sheet-open.lyrics-open .now .thumb { display: none; }
.app.narrow.sheet-open.lyrics-open .lyrics {
  display: block; flex: 1; min-height: 0; overflow-y: auto;
  overscroll-behavior: contain; padding: 8px 0 4px; margin-top: 10px;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 12%, #000 88%, transparent);
}
.app.narrow.sheet-open.lyrics-open .center { flex: none; gap: 18px; }
.app.narrow.sheet-open.lyrics-open .now { flex: none; }

/* iOS will not let script move the volume — it is a hardware control there —
   so the slider is a dead thing on a phone. The mute button still works. */
.app.narrow .right .vol { display: none; }
.app.narrow.sheet-open .now .nowText { width: 100%; }
/* Two lines of room here too: a one-line title otherwise pulled the artist and
   everything under it up by a line, so the transport moved depending on which
   track was playing. */
.app.narrow.sheet-open .now .t {
  font-size: 19px; line-height: 1.3; min-height: calc(19px * 1.3 * 2); white-space: normal;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.app.narrow.sheet-open .now .b { font-size: 14px; margin-top: 6px; }

/* column-reverse, so the times sit above the transport with the children in
   the order the desktop bar wants them. */
/* Back to a column: the compact bar above put these side by side, and without
   saying so here the opened player kept the row and pushed the elapsed line
   off the right edge. */
.app.narrow.sheet-open .center {
  flex: 1; flex-direction: column; justify-content: center; gap: 26px;
}
.app.narrow.sheet-open .seek { position: static; width: 100%; max-width: none; font-size: 12px; }
.app.narrow.sheet-open .ctl { gap: 8px; }
.app.narrow.sheet-open .ctl button { width: 52px; height: 52px; }
.app.narrow.sheet-open .ctl .big { width: 66px; height: 66px; }
.app.narrow.sheet-open .right { display: flex; flex: none; justify-content: center; gap: 6px; }
.app.narrow.sheet-open .right .vol { display: block; width: 116px; margin-left: 8px; }

/* ── Lists, at a phone's width ────────────────────────────────────────────
   Still width queries: these are about how much room a row of cards has, and
   nothing here depends on knowing what kind of screen it is. */
@media (max-width: 860px) {
  .row { grid-template-columns: 52px 1fr 32px; gap: 12px; padding: 8px 4px; }
  .row .idx, .row .dur { display: none; }
  .row .thumb { width: 52px; height: 30px; }
  .shelf { margin-bottom: 26px; }
  .shelf h3 { font-size: 15px; margin-bottom: 10px; }
  .shelfRow { gap: 12px; }
  .tile { width: 40vw; max-width: 176px; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 20px 12px; }
  .cards { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 20px 12px; }
  /* Side by side, not a big square with two lines stranded beneath it. The
     screen's name is in the header now, so what is left here is a cover and a
     couple of facts — which is a row. */
  .head { flex-direction: row; align-items: center; gap: 14px; }
  .head .cover { width: 88px; }
  .head .sub { font-size: 13px; }
  .searchbox { margin-bottom: 16px; }

  /* The other shadow root: no .app around these, so they cannot be qualified
     by the narrow class the way everything above is. */
  .menu { min-width: 200px; }
  .modal { width: calc(100vw - 28px); }
  .toasts { bottom: 108px; }
}
`
