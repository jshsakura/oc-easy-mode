// The shell's stylesheet, as a string for the shadow root.
//
// **This is shadcn/ui, ported rather than installed.** shadcn ships React
// components styled with Tailwind classes, and neither can come along: this UI
// is a few hundred lines of plain DOM inside a content script's shadow root,
// where a Tailwind build and a React runtime would be more machinery than the
// entire product. What actually carries the look is the token set and the
// component recipes, and both are portable.
//
// The recipe layer below still follows shadcn's component shapes — button and
// its variants, input, card, dropdown-menu, dialog, slider, separator — but
// the token values left shadcn's default dark theme long ago: the palette is
// the paper one (--ground #141210 and family), the accent is a dusty violet,
// and the radii are zero. shadcn taught the structure; the surface is ours.
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
  /* **Paper, not pixels.** The palette left the landing page's cool greys for
     the e-book direction asked for by name: warm ink on warm stock. Night is
     a reading lamp rather than a screen — near-black with brown in it, text
     the colour of paper, lines like pencil rules. */
  --ground: #141210;
  --side-panel: #1b1815;
  --panel: #1b1815;
  --background: #1b1815;
  --foreground: #ece7df;
  --muted-foreground: #a39c91;
  --secondary: #26221d;
  --secondary-hover: #2f2a24;
  --border: #322c25;
  --popover: #1b1815;
  --popover-foreground: #ece7df;
  /* The accent is a dusty stamp, not a neon pen — Notion-quiet. It keeps the
     product's violet hue at a fraction of the saturation, so on paper it
     reads as ink that happens to be purple. */
  --primary: #8578a6;
  --primary-hover: #9286b4;
  /* Ink on the dusty violet, not white: white on #8578a6 measures 4.01:1,
     a hair under AA for 14px text; ink measures 4.66 and reads as stamping. */
  --primary-foreground: #141210;
  --destructive: #f38ba8;
  --ring: #8578a6;

  /* ── shadcn's token contract, adopted by name ────────────────────────────
     Not the framework: shadcn is React and Tailwind, and this is one CSS
     string injected into a shadow root. What carries over is the naming
     discipline, which is the part that was actually missing.

     Every surface token has a -foreground guaranteed legible on it, and the
     surface itself drops the "background" suffix. A rule then names a pair
     rather than two colours chosen separately — which is precisely the
     failure this product has already had twice, a menu drawn black on a white
     page because its text colour and its surface came from different places. */
  /* The card surface is the raised one, not the panel — cards were already
     drawn on --secondary and naming them --card must not move them onto the
     background, or a card stops being visible at all. */
  --card: #26221d;
  --card-foreground: #ece7df;
  --secondary-foreground: #ece7df;
  --muted: #26221d;
  --accent: #26221d;
  --accent-foreground: #ece7df;
  --destructive-foreground: #1b1815;
  /* The border of something you type into, which shadcn keeps apart from the
     border of something you only look at. */
  --input: #322c25;

  /* One surface. The sidebar, the bar and the page are the same colour and are
     told apart by a single hairline, not by three shades of grey. Only things
     that float — a menu, a dialog, the corner window — sit on --popover. */
  /* Flat, on purpose. The glass era ended where every busy element lived —
     blurs, washes, saturated panes. Notion-clean means: panels are the panel
     colour, hairlines do the separating, and colour is spent on one primary
     button and the focus ring. The tokens keep their names so no rule had to
     move — only the values went flat. */
  --glass: #1b1815;
  --glass-strong: #1b1815;
  --glass-line: #322c25;
  /* Glass, but only where something floats. Panels stay flat — that is the
     rule above and it holds. A menu, a dialog, a sheet and a toast are the
     four things in this UI that sit *over* the app, and they are the four
     the reader asked to be glass: translucent, blurred, with the light
     hairline that tells an edge from a shadow. */
  --pop: rgba(30, 27, 23, .72);
  --pop-line: rgba(236, 231, 223, .12);
  --pop-blur: saturate(180%) blur(20px);

  --hover: rgba(236, 231, 223, .06);
  --shadow: 0 2px 6px rgba(20, 12, 4, .28);
  --ease: .15s ease;

  /* Bookish: the display face for screen titles and the words being sung.
     Degrades to the UI sans wherever no Korean serif is installed — the
     measure and leading carry the feel on their own. */
  --font-book: Georgia, 'Iowan Old Style', 'Times New Roman', 'Noto Serif KR',
               'Nanum Myeongjo', serif;
  /* Numbers the way a program sets them: fixed-width figures from the mono
     rack, for times, counts and durations. */
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;

  /* One number decides every corner in the product, and the scale is derived
     from it the way shadcn derives theirs.
     It was 0 for a while — 직각, the look of a program rather than a page — and
     rendered, the room read as harder than the thing is. This is a player for
     listening in, not a console. Ten is the radius that reads as *soft* at the
     sizes we use without becoming a pill: a 32px button keeps a visible flat
     edge, and a 56px cover still looks like a cover. Every other corner in the
     product follows from this line. */
  --radius: 10px;
  --radius-sm: calc(var(--radius) * .6);
  --radius-md: calc(var(--radius) * .8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}
* { box-sizing: border-box; }

/* Light, for when YouTube is light or the reader asks for it.
   **Both selectors, and that is the whole point.** Menus, dialogs and toasts
   are drawn in the *second* shadow root, which has no .app in it — so a light
   palette written only on .app left every popover with the dark tokens, and a
   black menu opened over a white page. The host carries the class too. */
:host(.light),
.app.light,
.menu.light,
.modal.light,
.sheetMenu.light {
  --ground: #f2efe9;
  --side-panel: #f7f4ee;
  --panel: #fbfaf6;
  --background: #fbfaf6;
  --foreground: #232019;
  --muted-foreground: #6f6a5f;
  --secondary: #efece4;
  --secondary-hover: #e7e3d9;
  --border: #ddd8cd;
  --popover: #fbfaf6;
  --popover-foreground: #232019;
  --primary: #776aa6;
  --primary-hover: #8579b2;
  --primary-foreground: #ffffff;
  --destructive: #d63b5e;
  --ring: #776aa6;
  /* The same pairs, so a rule written once reads correctly on either side. */
  --card: #efece4;
  --card-foreground: #232019;
  --secondary-foreground: #232019;
  --muted: #efece4;
  --accent: #efece4;
  --accent-foreground: #232019;
  --destructive-foreground: #ffffff;
  --input: #ddd8cd;
  --glass: #fbfaf6;
  --glass-strong: #fbfaf6;
  --glass-line: #ddd8cd;
  --pop: rgba(251, 250, 246, .74);
  --pop-line: rgba(35, 32, 25, .12);
  --pop-blur: saturate(180%) blur(20px);
  --hover: rgba(0, 0, 0, .05);
  --shadow: 0 2px 6px rgba(70, 60, 40, .1);
}

.app {
  --bar: 72px;
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
  background: var(--ground);
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

/* Pressed, not passed over: the background appears for the instant of the
   press alone — a pointer drifting across the screen is not a press, and
   grey flashing under a moving hand reads as flicker, not feedback. */
.nav:active, .row:active,
.menu button:active, .modal .list button:active, .ctl button:active,
.right button:active, .row .more:active, .row .quick:active, .drawerToggle:active, .btn.ghost:active {
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
  /* Full height, floor to ceiling. It used to stop where the player bar began
     and give up the last 80 pixels to a strip it had nothing to do with, so
     the column of destinations and playlists was the shortest thing on a
     screen otherwise full of room. The bar keeps the width it needs by
     starting where this column ends. */
  grid-row: 1 / -1; grid-column: 1;
  /* One flat surface, edged with a hairline — a pane told from a box by the
     line, not by translucency. */
  background: var(--glass);
  border: 1px solid var(--glass-line);
  border-radius: var(--radius-lg);
  padding: 16px 12px; display: flex; flex-direction: column; gap: 2px;
  /* The pane itself does not scroll; the list inside it does. With enough
     playlists in the column the name and the way out used to travel up and
     off the top with everything else. */
  overflow: hidden; min-height: 0;
}
/* Stays put. Never shrinks, whatever is underneath it. */
.sideHead {
  flex: none; display: flex; flex-direction: column; gap: 2px;
  padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid var(--glass-line);
}
/* Everything else. min-height so a column of buttons that will not shrink can
   overflow rather than push the box open, and overscroll-behavior so a flick
   that reaches the end does not hand the page underneath a scroll it will do
   nothing with. */
.sideScroll {
  flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 2px;
  overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  /* Out to the pane's edge and back in again, so the scrollbar rides the edge
     of the drawer instead of floating 12px inside it, while the rows stay
     exactly where they were. */
  margin-inline: -12px; padding-inline: 12px;
  scrollbar-width: thin; scrollbar-color: var(--glass-line) transparent;
}
/* **Every row keeps its own height.**
   A flex item will not normally shrink below its content, but that protection
   is dropped for an item whose overflow is not visible, and .pl sets
   overflow: hidden to get its ellipsis. So the playlists were being squeezed
   instead of overflowing: measured at 390x844 with twenty of them, twenty rows
   fell from 38px to 18px, the names printed on top of each other, and the
   column never scrolled because nothing ever overflowed. The spacer is the one
   thing here whose whole job is to take up slack. */
.sideScroll > * { flex: none; }
.sideScroll > .spacer { flex: 1 0 auto; }
/* Thin, and the colour of the hairline that edges the pane. The shared rule
   above draws a 3px border in --background, which is the page's colour and
   not this pane's, so on the drawer it read as a gap rather than a bar. */
.sideScroll::-webkit-scrollbar { width: 6px; }
.sideScroll::-webkit-scrollbar-track { background: transparent; }
.sideScroll::-webkit-scrollbar-thumb {
  background: var(--glass-line); border: 0; border-radius: 999px;
}
.sideScroll::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }
/* Everything in this column shares one left edge and one icon-to-label gap:
   10px of padding, an 18px glyph, 12px of gap. They had been 8/20/8, 10/18/10
   and 10/18/12, so the brand, the switch and the destinations each started at
   a different x and the column read as three lists stacked. */
.brand {
  display: flex; align-items: center; gap: 12px;
  padding: 6px 10px 10px; font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
}
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
/* The pane's own controls: leaving, and closing. Both live in the name row,
   both are the same 34px square as the theme glyph in the header strip, so the
   three read as one family wherever they appear. */
.headAction {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 34px; height: 34px; border-radius: var(--radius-md);
  color: var(--muted-foreground); transition: background var(--ease), color var(--ease);
}
.headAction:hover { color: var(--foreground); background: var(--hover); }
.headAction:active { background: var(--secondary); }

/* ── The header strip, on a narrow screen only ───────────────────────────── */
.top { display: none; }
/* The screen's name, at the size a header wants rather than the size a page
   title wants. It replaces the 22px heading that used to sit in the content. */
.top .name {
  flex: 1; min-width: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.themeButton {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 34px; height: 34px; border-radius: var(--radius-md);
  color: var(--muted-foreground); transition: background var(--ease), color var(--ease);
}
.themeButton:hover { color: var(--foreground); }
.themeButton:active { background: var(--hover); }

/* Drawer only: on a wide screen the column is simply there and there is
   nothing to close. The rest of its look comes from .headAction. */
.drawerClose { display: none; }

/* ── Main ────────────────────────────────────────────────────────────────── */
/* The page has margins the way a book does — text starts away from the edge,
   and the edge is where the paper is. */
.main {
  background: var(--glass-strong);
  border: 1px solid var(--glass-line);
  border-radius: var(--radius-lg);
  overflow-y: auto; padding: 32px 44px 56px; min-width: 0;
}
.main h2 { margin: 0 0 20px; font-family: var(--font-book); font-size: 24px; font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; }
.main h3 { margin: 24px 0 8px; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.sub { color: var(--muted-foreground); font-size: 14px; }
.label { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 10px; }
.empty { color: var(--muted-foreground); padding: 56px 0; text-align: center; font-size: 14px; }
.empty svg { display: block; margin: 0 auto 14px; opacity: .45; }

/* Skeletons: the shape of what is coming, in the palette's quiet grey,
   breathing until it is replaced. A pulse, not a shimmer — nothing travels
   across the page; a block only dims and returns. */
.sk { background: var(--muted); border-radius: var(--radius-md); animation: sk 1.2s ease-in-out infinite; }
@keyframes sk { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; opacity: .6; } }
/* Light skeletons need a darker grey than --secondary: on warm paper the
   secondary is one breath from the panel and a static skeleton disappears. */
.app.light .sk { background: var(--border); }
.err { color: var(--destructive); font-size: 14px; padding: 16px 0 20px; }

.searchbox {
  display: flex; gap: 10px; align-items: center;
  height: 40px; padding: 0 12px; margin-bottom: 24px;
  border: 1px solid var(--input); border-radius: var(--radius-md);
  transition: border-color var(--ease);
}
.searchbox:focus-within { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 25%, transparent); }
/* The box is the field. The search input is reachable by remote and so carries
   data-nav, which would otherwise draw the shared focus ring *inside* the box
   that is already showing focus on its own border — a rectangle within a
   rectangle, which is what it looked like: two fields where there is one. */
.searchbox input[data-nav]:focus-visible { box-shadow: none; }
/* 16px, and not a pixel less.
   WebKit on iPhone zooms the page in when an input smaller than 16px takes
   focus, and it does not zoom back out. Tapping the search box swallowed the
   whole screen. Nothing else in the UI has to be 16px; this does. */
/* min-width: 0, or the input keeps its intrinsic size and pushes its own right
   edge past the box it sits in. */
.searchbox input { flex: 1; min-width: 0; height: 100%; background: none; border: 0; outline: 0; font-size: 16px; }
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
.btn:active { background: var(--hover); }
.btn.primary { background: var(--primary); color: var(--primary-foreground); border-color: transparent; }
.btn.primary:active { background: var(--primary-hover); }
.btn.ghost { border-color: transparent; color: var(--muted-foreground); }
.btn.ghost:hover { color: var(--foreground); }
.btn.danger { color: var(--destructive); }
.btn.danger:active { background: var(--destructive); color: var(--background); border-color: transparent; }

/* ── Track rows ──────────────────────────────────────────────────────────── */
.rows { display: flex; flex-direction: column; }
.queueMark {
  margin: 18px 0 6px; font-size: 12px; font-weight: 600;
  letter-spacing: .06em; text-transform: uppercase; color: var(--muted-foreground);
}
.rows > .queueMark:first-child { margin-top: 4px; }
.row {
  /* Content, and a strip of actions after it. The content used to be the row
     itself; it is its own box now so a swipe can move it without moving the
     actions with it. */
  display: grid; grid-template-columns: 1fr auto;
  align-items: center; padding: 8px;
  border-radius: var(--radius-md); cursor: pointer;
  transition: background var(--ease);
}
.rowInner {
  display: grid; grid-template-columns: 24px 44px 1fr auto;
  align-items: center; gap: 16px; min-width: 0;
}
.rowActions { display: flex; align-items: center; gap: 16px; margin-left: 16px; }
/* A quiet fill, like any list's chosen row. The bars say which row it is;
   the fill says it is the one you are on. Nothing lifts, nothing glows. */
.row.now { background: var(--secondary); }
.row.now .title { font-weight: 600; }
/* The playing mark. Sized to read as motion, not texture — at 3px it vanished
   into the row and the animation was there but invisible. */
.eq { display: inline-flex; align-items: flex-end; gap: 3px; height: 16px; }
.eq i { width: 4px; border-radius: 999px; background: var(--foreground); animation: eq .9s ease-in-out infinite; }
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
.row .idx { color: var(--muted-foreground); font-family: var(--font-mono); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
/* Square, everywhere a picture appears: the list, the bar, the covers — one
   shape, like a record sleeve. Video stills crop to it without complaint. */
.row .thumb { width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--secondary) center/cover; }
/* Square, because a playlist's picture is a cover. The trailing chevron is the
   one from the sidebar's exit, turned around.
   A playlist row has no action strip, so its parts are laid out directly and
   it carries the gap the ordinary row now keeps on .rowInner. */
.row.plrow { grid-template-columns: 44px 1fr 20px; gap: 16px; }
.row.plrow .thumb { width: 44px; height: 44px; border-radius: var(--radius-md); }
.row.plrow > svg { color: var(--muted-foreground); transform: rotate(180deg); justify-self: end; }
.row .meta { min-width: 0; }
.row .title { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .by { color: var(--muted-foreground); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .dur { color: var(--muted-foreground); font-family: var(--font-mono); font-size: 13px; font-variant-numeric: tabular-nums; }
.row .more, .row .quick {
  width: 32px; height: 32px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted-foreground); opacity: .5;
  transition: background var(--ease), color var(--ease), opacity var(--ease);
}
.row:hover .more, .row.now .more, .row .more:focus-visible,
.row:hover .quick, .row.now .quick, .row .quick:focus-visible { opacity: 1; }
.row .more:hover, .row .quick:hover { color: var(--foreground); }

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
  background: var(--card); color: var(--card-foreground); transition: background var(--ease);
}
.card:active, .tile:active, .card:focus-visible, .tile:focus-visible { background: var(--secondary-hover); }
/* Top-right of the artwork, where a card's own play button is not. Always
   visible on touch — a card has no hover to wait for. */
.tileAdd {
  position: absolute; right: 8px; top: 8px; z-index: 2;
  width: 30px; height: 30px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  background: oklch(0 0 0 / 55%); color: #fff; cursor: pointer;
  opacity: 0; transition: opacity var(--ease), background var(--ease);
}
.card:hover .tileAdd, .tile:hover .tileAdd,
.card:focus-within .tileAdd, .tile:focus-within .tileAdd { opacity: 1; }
@media (hover: hover) {
  .tileAdd:hover { background: oklch(0 0 0 / 75%); }
}
@media (hover: none) { .tileAdd { opacity: 1; } }

.card .cover, .tile .cover {
  position: relative; aspect-ratio: 1; border-radius: var(--radius-md);
  background: var(--secondary) center/cover;
  display: flex; align-items: center; justify-content: center; color: var(--muted-foreground);
}
/* Sits on the artwork and appears on hover or focus, like every music client.
   It is decoration only — the whole card is the button. */
.cover .play {
  /* 8px from the edge, the same as the badge opposite it and the same as the
     add button above it. Three different insets read as three accidents. */
  position: absolute; right: 8px; bottom: 8px;
  width: 40px; height: 40px; border-radius: var(--radius-md);
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
  /* A row's buttons wait for a hover that a finger never gives. Half-visible
     is fine for a menu nobody has asked for; it is not fine for the button
     that puts a track in a playlist, which is meant to be pressed. */
  .row .more, .row .quick { opacity: 1; }

  /* ── Swipe ───────────────────────────────────────────────────────────────
     Two glyphs on every line of every list is a lot of furniture on the screen
     with the least room, and a finger cannot hover them away. So the actions
     wait just past the right-hand edge and a leftward drag brings them in —
     one row's at a time. The strip is placed outside the row and clipped by
     it, which is why nothing needs an opaque background to hide behind.
     --swipe is written by the gesture; both halves move by the same amount. */
  .row { overflow: hidden; touch-action: pan-y; }
  .rowInner, .rowActions {
    transform: translateX(var(--swipe, 0px));
    transition: transform .2s cubic-bezier(.2, .8, .2, 1);
  }
  .row.swiping .rowInner, .row.swiping .rowActions { transition: none; }
  .rowActions {
    position: absolute; left: 100%; top: 0; bottom: 0;
    margin: 0; padding: 0 8px 0 4px; gap: 4px;
  }
}

/* ── A picture that shows its own arrival ──────────────────────────────────
   The artwork is an <img> inside the box rather than the box's background:
   a background can be neither deferred nor waited on, so a hundred rows asked
   for a hundred pictures at once and each box stayed panel-coloured until its
   own arrived. Now the box shimmers like every other skeleton in the app and
   the picture fades in over it. */
.thumb, .cover { position: relative; overflow: hidden; }
.thumb > img, .cover > img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; border-radius: inherit;
  transition: opacity var(--ease);
}
.thumb.loading, .cover.loading { background: var(--muted); animation: sk 1.2s ease-in-out infinite; }
.thumb.loading > img, .cover.loading > img { opacity: 0; }

/* The running time, where every video player puts it. */
.cover .badge {
  position: absolute; left: 8px; bottom: 8px;
  padding: 2px 6px; border-radius: var(--radius-md);
  background: oklch(0 0 0 / 72%); color: oklch(0.985 0 0);
  font-family: var(--font-mono); font-size: 11.5px; font-weight: 500; font-variant-numeric: tabular-nums;
}
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
/* A shelf that runs off the edge should look like it runs off the edge.
   It was clipping a card in half against a hard border, which reads as broken
   rather than as "there is more this way" — the complaint, in one word, was
   구리다. The mask fades the last centimetre out, and disappears once the row
   is scrolled to its end so nothing is faded that cannot be reached. */
.shelfRow {
  display: flex; gap: 16px; overflow-x: auto; padding: 0 0 12px;
  scroll-snap-type: x proximity; scroll-padding-left: 0;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 56px), transparent 100%);
  mask-image: linear-gradient(to right, #000 calc(100% - 56px), transparent 100%);
}
.shelfRow::-webkit-scrollbar { height: 0; }
/* Scrolled to the end there is nothing beyond, so nothing fades. */
.shelfRow:not(:hover) { scroll-behavior: smooth; }
.tile { width: 176px; flex: none; scroll-snap-align: start; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(212px, 1fr)); gap: 28px 16px; }
.grid .tile { width: auto; }

.head { display: flex; gap: 28px; align-items: flex-end; margin-bottom: 28px; }
.head .cover {
  width: 208px; aspect-ratio: 1; flex: none;
  border-radius: var(--radius-lg); background: var(--secondary) center/cover;
  box-shadow: var(--shadow);
}
.head h2 { font-family: var(--font-book); font-size: clamp(28px, 4vw, 44px); line-height: 1.1; letter-spacing: -0.01em; margin: 0 0 10px; }
.head .sub { font-size: 14px; }

/* ── The slot YouTube's player is positioned over ────────────────────────── */
.slot { position: fixed; pointer-events: none; background: #000; }
/* Black is what a video element is before it has a frame, and a black
   rectangle in the middle of the screen reads as breakage rather than as
   loading. While there is nothing to show, the slot is a skeleton like every
   other waiting thing here; it goes back to black the moment the picture can
   letterbox against it. */
.slot.warming { background: var(--muted); animation: sk 1.2s ease-in-out infinite; }
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

/* A wait, drawn inside the button that is waiting. currentColor, so it reads
   on the light disc of the big button and on the bare ones either side.
   The quarter that fades rather than a hard gap: a ring with one transparent
   side has a seam, and a seam at this diameter reads as a stutter even while
   the rotation is perfectly even. */
.spin {
  display: block; width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-right-color: color-mix(in oklab, currentColor 45%, transparent);
  animation: spin .9s linear infinite;
  will-change: transform;
}
/* The opened player draws the same button at 48px, and an 18px ring inside it
   reads as a speck rather than as a wait. */
.app.narrow.sheet-open .ctl .big .spin { width: 24px; height: 24px; border-width: 2.5px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spin { animation-duration: 2.4s; } }

/* ── Player bar ──────────────────────────────────────────────────────────── */
.bar {
  /* min-width: 0, or a long title makes the bar wider than the screen.
     A grid item's automatic minimum size is its min-content width, and the
     min-content of a bar holding a nowrap title is that whole title — so the
     track said 390 and the bar took 508, carrying the play and next buttons
     off the right-hand edge. The ellipsis cannot save it: it only applies once
     something has decided the box is narrower than its text. */
  /* relative, because the elapsed line runs along the bar's bottom edge —
     see the seek rule just below the transport. */
  grid-column: 2; min-width: 0; background: transparent; position: relative;
  display: grid; grid-template-columns: minmax(200px, 1fr) minmax(320px, 2fr) minmax(200px, 1fr);
  align-items: center; padding: 0; gap: 16px;
}
.bar .now { display: flex; align-items: center; gap: 14px; min-width: 0; overflow: hidden; }
.bar .now .nowText { min-width: 0; }
/* The pair travels together: YouTube keeps one rating per track, so these two
   are one control and are never separated. Never squeezed by a long title
   either — the text is what gives way. */
/* The pair sits between the title and the transport, and at 2px apart in a
   34px box it read as one crowded lump on a phone. Now that only the chosen
   one stays lit there is room to give it. */
.bar .now .rate-box { display: flex; flex: none; gap: 6px; margin-left: 6px; }
.ctl .rate-box { display: flex; gap: 2px; }
.rate {
  width: 34px; height: 34px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted-foreground);
  transition: background var(--ease), color var(--ease);
}
/* Only where a pointer exists. A tap leaves :hover stuck on the last thing
   touched until something else is touched, so the wash this paints stayed on
   좋아요 after every press and read as a state the button was in. Reported
   exactly that way. The press already has :active, and the opinion itself has
   .on; hover is the one of the three a phone cannot honestly have. */
@media (hover: hover) {
  .rate:hover { background: var(--hover); color: var(--foreground); }
}
.rate:disabled { opacity: .35; pointer-events: none; }
/* Lit apart, because they mean opposite things: approval takes the accent, and
   "not this one" takes the colour nothing else in the bar uses.
   And lit *loudly*: the state was a colour change on an 18px outline, which on
   a phone is no feedback at all — the press read as having been missed. Now
   the button takes a fill as well, and the glyph pops once as it lands. The
   call to YouTube still happens afterwards and still puts this back if it is
   refused; this is only about the press being seen. */
.rate.on { background: var(--secondary); }
.rate.up.on { color: var(--primary); }
.rate.down.on { color: var(--destructive); }
.rate:active { transform: scale(.92); }
.rate.on > svg { animation: pop .24s ease; }
@keyframes pop { 0% { transform: scale(.82); } 60% { transform: scale(1.16); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .rate.on > svg { animation: none; } }
.bar .now .thumb {
  width: 56px; height: 56px; flex: none; border-radius: var(--radius-md);
  background: var(--secondary) center/cover;
}
.bar .now .t {
  font-size: 15px; font-weight: 500; line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bar .now .b {
  margin-top: 2px; color: var(--muted-foreground); font-size: 13px; line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.center { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ctl { display: flex; align-items: center; gap: 4px; }
/* Squared, every one of them — the asked-for 사각사각. Pills and circles are
   the default shape of generated interfaces; a tight radius is the shape of
   a tool. The chip and hover are backgrounds on the button itself, so one
   radius settles all three. Dense on purpose: a toolbar, not a toy.
   **One exception, and it is below: the transport.** Everything else in the
   product keeps the square base; the play, skip and shuffle buttons in the
   player bar are round, because that is the one row of controls a person has
   never seen square anywhere else and it would not settle. */
.ctl button, .right button, .drawerToggle {
  width: 28px; height: 28px; border-radius: var(--radius-md);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted-foreground);
  /* No 300ms wait for a second tap that is never coming. A browser holds a tap
     back on a page it thinks might be double-tapped to zoom, and the delay
     read as the button not having taken the press. */
  touch-action: manipulation;
  transition: background var(--ease), color var(--ease);
}
/* The glyph shrinks with the box, from CSS: the markup asks for 18 and every
   context that needs another size says so here, once. */
.ctl button svg, .right button svg, .drawerToggle svg { width: 16px; height: 16px; }
.ctl button:hover, .right button:hover, .drawerToggle:hover { color: var(--foreground); }
/* On is said by brightness *and* by a chip. Brightness alone was the earlier
   answer and it is the more elegant one, but it is grey-to-white on an 18px
   glyph: on a phone, at arm's length, a shuffle that was on looked like a
   shuffle that was off, and the press read as lost. The chip is the panel's
   own secondary, not the accent, so the bar still has no colour in it. */
.ctl button.on, .right button.on { color: var(--foreground); background: var(--secondary); }
.ctl button.on:hover, .right button.on:hover { color: var(--foreground); }
/* The transport's play button is not the accent. It was the largest purple
   thing on the screen, next to purple sliders and purple badges on every card,
   and a colour used that often stops pointing at anything. It is the highest
   contrast shape instead, which is what a play button wants to be; --primary
   is left to the elapsed line and the one primary button a screen has. */
.ctl button, .ctl .rate { border-radius: 999px; }
.ctl .big { width: 30px; height: 30px; background: var(--foreground); color: var(--background); border-radius: 999px; }
.ctl .big svg { width: 18px; height: 18px; }
/* The generic press rule would repaint this button var(--hover), and a
   paper glyph on a 6% wash is a glyph you cannot see for the length of the
   press. The press keeps the fill and dims instead. */
.ctl .big:active { background: var(--foreground); color: var(--background); opacity: .8; }
.ctl .big:hover { background: var(--foreground); color: var(--background); opacity: .88; }
.seek {
  display: flex; align-items: center; gap: 12px; width: 100%; max-width: 620px;
  font-family: var(--font-mono); font-size: 12px; color: var(--muted-foreground); font-variant-numeric: tabular-nums;
}
.seek input { flex: 1; }
/* The elapsed line belongs under the bar, not inside it — a transport footer,
   which is what every player puts there. The time labels stay at the two
   ends; the line runs along the bar's bottom edge. It starts clear of the
   artwork — measured the hard way, a full-width line laid its elapsed label
   over the playing track's cover — and stops short of the far edge.
   width: auto for the same reason the narrow rule below needs it: width:
   100% on an absolutely positioned box wins over the left/right pair. */
.app:not(.narrow) .bar .seek {
  position: absolute; left: 96px; right: 16px; bottom: 4px;
  width: auto; max-width: none;
}
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
  background: linear-gradient(to right, var(--foreground) var(--p, 0%), var(--secondary) var(--p, 0%));
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; margin-top: -4px;
  width: 12px; height: 12px; border-radius: 999px; background: var(--foreground);
}
input[type=range]::-moz-range-track {
  height: 4px; border-radius: 999px;
  background: linear-gradient(to right, var(--foreground) var(--p, 0%), var(--secondary) var(--p, 0%));
}
input[type=range]::-moz-range-thumb {
  width: 12px; height: 12px; border: 0; border-radius: 999px; background: var(--foreground);
}

/* ── The words ───────────────────────────────────────────────────────────── */
.lyrics { display: none; }
.lyricsEmpty { color: var(--muted-foreground); font-size: 14px; text-align: center; padding: 40px 0; }
/* The words are set like a book's page: the display face, leading wide
   enough to breathe, centred like a poem rather than fitted like a caption. */
.lyricLine {
  display: block; width: 100%; text-align: center;
  padding: 8px 4px; font-family: var(--font-book); font-size: 16.5px; line-height: 1.7; font-weight: 500;
  color: var(--muted-foreground); opacity: .55;
  transition: color var(--ease), opacity var(--ease), transform var(--ease);
}
/* The line being sung, and only it. Everything else recedes rather than
   disappearing, so the shape of the song stays visible. No scale — calm
   means the words change, the page does not move. */
.lyricLine.on { color: var(--foreground); opacity: 1; }

/* ── Menu, dialog, toast — the only things that float ────────────────────── */
/* Compact like the bar beneath it: a menu is a tool palette, dense is right. */
.menu {
  /* Wide enough for the longest line it holds. At 168 the labels wrapped and
     the menu came out a different width for every row it was opened from,
     which is what made it feel like it moved. */
  position: fixed; z-index: 2147483100; padding: 4px;
  min-width: 224px; max-width: min(320px, calc(100dvw - 16px));
  background: var(--pop); color: var(--popover-foreground);
  -webkit-backdrop-filter: var(--pop-blur); backdrop-filter: var(--pop-blur);
  border: 1px solid var(--pop-line); border-radius: var(--radius-md); box-shadow: var(--shadow);
}
.menu button {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 6px 9px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500;
  color: var(--popover-foreground); transition: background var(--ease), color var(--ease);
}
.menu button svg {
  width: 15px; height: 15px; flex: none; color: var(--muted-foreground);
  transition: color var(--ease);
}
.menu button:hover { color: var(--foreground); }
.menu button:active { background: var(--hover); }
.menu button:hover svg { color: var(--foreground); }
.menu hr { border: 0; border-top: 1px solid var(--border); margin: 4px -1px; }

/* The narrow form: a sheet at the foot of the screen. Placed here rather than
   in the width query below because this root has no .app to qualify it and the
   decision is made in script anyway. */
.menu.sheetMenu {
  left: 10px; right: 10px; bottom: calc(12px + env(safe-area-inset-bottom));
  top: auto; min-width: 0; max-width: none; padding: 8px; border-radius: var(--radius-lg);
  /* Never more than half the screen, and scrolls if the list is longer. A
     sheet that grows with its contents eventually stops being a menu over the
     page and becomes the page. */
  max-height: 44dvh; overflow-y: auto; overscroll-behavior: contain;
  /* The dimming, without a second element to manage. A menu with nothing
     behind it reads as the screen having changed rather than as something
     opening on top of it — which is exactly how it was read. */
  box-shadow: var(--shadow), 0 0 0 100vmax oklch(0 0 0 / 45%);
}
/* Tighter than it was. A thumb still has a 40px target, which is the number
   that matters, but the sheet was spending 50px a line and seven lines is half
   a phone. */
.menu.sheetMenu button { padding: 10px 12px; font-size: 14px; gap: 10px; }
/* A thumb aims at the sheet, so the glyph gives it something to aim at. */
.menu.sheetMenu button svg { width: 17px; height: 17px; }
/* The dividers were eating a line each. A hairline is enough to group. */
.menu.sheetMenu hr { margin: 4px 8px; }

.scrim {
  position: fixed; left: 0; top: 0; width: 100dvw; height: 100dvh; z-index: 2147483090;
  background: oklch(0 0 0 / 55%); display: flex; align-items: center; justify-content: center;
}
.modal {
  width: min(420px, calc(100dvw - 32px)); max-height: 72dvh; display: flex; flex-direction: column;
  background: var(--pop); color: var(--popover-foreground);
  -webkit-backdrop-filter: var(--pop-blur); backdrop-filter: var(--pop-blur);
  border: 1px solid var(--pop-line); border-radius: var(--radius-lg); box-shadow: var(--shadow);
}
/* The phone form: the whole screen, no card, no corners, and the buttons at
   the foot where a thumb is. */
.modal.full {
  width: 100dvw; max-width: none; height: 100dvh; max-height: none;
  border: 0; border-radius: 0;
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
}
.modal.full h3 { padding: 26px 20px 14px; font-size: 20px; }
.modal.full .list { flex: 1; padding: 0 12px 8px; }
.modal.full .list button { padding: 14px 12px; font-size: 15px; }
.modal.full .new { margin-top: auto; padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); }
.modal.full .new .btn { height: 44px; font-size: 15px; }
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
  /* Full width and centred by the flex box, not left: 50dvw with a translate.
     A fixed element sized shrink-to-fit gets the containing block minus that
     left offset — half a screen — so every message of more than a few words
     wrapped. Same trap as the app being 508px wide: measure the viewport, in
     viewport units. */
  position: fixed; left: 0; width: 100dvw; bottom: calc(var(--bar) + var(--gap) + 12px);
  z-index: 2147483120; display: flex; flex-direction: column; align-items: center;
  gap: 8px; pointer-events: none;
}
.toast {
  max-width: min(560px, calc(100dvw - 32px));
  padding: 12px 18px; border-radius: var(--radius-md); font-size: 14px;
  background: var(--pop); color: var(--popover-foreground);
  -webkit-backdrop-filter: var(--pop-blur); backdrop-filter: var(--pop-blur);
  border: 1px solid var(--pop-line); box-shadow: var(--shadow);
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
  .rowInner { grid-template-columns: 24px 44px 1fr auto; gap: 8px; }
  .rowActions { gap: 8px; margin-left: 8px; }
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
  background: var(--glass);
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
  /* Above the opened player, not under it. Script keeps the two from being
     out at once; this makes the losing case visible rather than clipped. */
  position: fixed; left: -302px; top: 0; height: 100dvh; width: 302px; z-index: 40;
  overflow: hidden;
  background: var(--glass-strong);
  border: 0; border-right: 1px solid var(--glass-line); border-radius: 0;
  transition: left .22s ease;
  padding: calc(12px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));
}
.app.narrow.drawer-open .side { left: 0; }
.app.narrow .brand { padding: 4px 4px 14px; }
/* A finger is not a cursor: every line in the drawer is a target. */
.app.narrow .nav { padding: 11px 12px; font-size: 15px; }
.app.narrow .side .pl { padding: 9px 12px; font-size: 14px; }
/* A shelf reaches both edges of the screen and keeps going. The fade was a
   desktop answer to a hard clip; on a phone it greys out the card a thumb is
   reaching for, and the row stopping short of the edge reads as a margin
   error rather than as more content. The negative margin is the content
   padding, so the first card still lines up with the heading above it. */
.app.narrow .shelfRow {
  -webkit-mask-image: none; mask-image: none;
  margin-left: -16px; margin-right: -16px;
  padding-left: 16px; padding-right: 16px;
  scroll-padding-left: 16px;
}

/* Sized like the app, and for the same reason: inset: 0 measures a box that
   can be wider than the screen, and a scrim wider than the screen makes the
   page overflow. On a phone that is not a cosmetic problem — the browser zooms
   out to fit, so tapping the menu button shrank the whole UI. */
.app.narrow .drawerScrim {
  display: block; position: fixed; left: 0; top: 0; width: 100dvw; height: 100dvh; z-index: 35;
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
  background: var(--glass);
  border-top: 1px solid var(--glass-line);
  padding: 7px 8px calc(16px + env(safe-area-inset-bottom));
}
.app.narrow .bar .now { flex: 1; min-width: 0; gap: 10px; cursor: pointer; }
.app.narrow .bar .now .thumb { width: 38px; height: 38px; }
.app.narrow .bar .now .t { font-size: 13.5px; }
.app.narrow .bar .now .b { font-size: 11.5px; margin-top: 1px; }
.app.narrow .center { flex-direction: row; gap: 0; }
.app.narrow .ctl { gap: 0; }
.app.narrow .ctl button { width: 30px; height: 30px; }
.app.narrow .ctl .big { width: 32px; height: 32px; }

/* Shuffle and repeat put away, which is where they already were. Previous,
   play and next stay exactly where they have always been. */
.app.narrow:not(.sheet-open) .ctl .sh,
.app.narrow:not(.sheet-open) .ctl .rp { display: none; }
/* The picture's own button stays out here: the moment you want it is the
   moment a music video starts, and opening the player first to reach it is one
   press too many. The rest of the row waits inside. */
.app.narrow:not(.sheet-open) .right { display: flex; gap: 0; }
.app.narrow:not(.sheet-open) .right > *:not(.vid) { display: none; }
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
.app.narrow.sheet-open .sheetClose:hover { color: var(--foreground); }
.app.narrow.sheet-open .sheetClose:active { background: var(--hover); }

.app.narrow.sheet-open .bar .now {
  flex: 0 1 auto; flex-direction: column; align-items: center; text-align: center;
  gap: 0; padding: 0; margin: 0; cursor: default; min-width: 0;
}
.app.narrow.sheet-open .bar .now .thumb {
  width: min(70vw, 300px); height: auto; aspect-ratio: 1;
  border-radius: var(--radius-lg); box-shadow: var(--shadow); margin: 6px 0 26px;
}
/* The picture is already on screen above; a cover under it would be a second
   answer to the same question. */
.app.narrow.sheet-open.has-stage .bar .now .thumb { display: none; }

/* With the words open they are what the pane is for: the artwork steps aside
   and the list takes the room the transport is not using. */
.app.narrow.sheet-open.lyrics-open .bar .now .thumb { display: none; }
.app.narrow.sheet-open.lyrics-open .lyrics {
  display: block; flex: 1; min-height: 0; overflow-y: auto;
  overscroll-behavior: contain; padding: 8px 0 4px; margin-top: 10px;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 12%, #000 88%, transparent);
}
.app.narrow.sheet-open.lyrics-open .center { flex: none; gap: 18px; }
.app.narrow.sheet-open.lyrics-open .bar .now { flex: none; }

/* iOS will not let script move the volume — it is a hardware control there —
   so the slider is a dead thing on a phone. The mute button still works. */
.app.narrow .right .vol { display: none; }
.app.narrow.sheet-open .bar .now .nowText { width: 100%; }
/* Two lines of room here too: a one-line title otherwise pulled the artist and
   everything under it up by a line, so the transport moved depending on which
   track was playing. */
.app.narrow.sheet-open .bar .now .t {
  font-size: 19px; line-height: 1.3; min-height: calc(19px * 1.3 * 2); white-space: normal;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.app.narrow.sheet-open .bar .now .b { font-size: 14px; margin-top: 6px; }

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
.app.narrow.sheet-open .ctl button { width: 40px; height: 40px; }
.app.narrow.sheet-open .ctl .big { width: 48px; height: 48px; }
.app.narrow.sheet-open .ctl button svg { width: 20px; height: 20px; }
.app.narrow.sheet-open .ctl .big svg { width: 22px; height: 22px; }
.app.narrow.sheet-open .right { display: flex; flex: none; justify-content: center; gap: 6px; }
.app.narrow.sheet-open .right .vol { display: block; width: 116px; margin-left: 8px; }

/* ── Lists, at a phone's width ────────────────────────────────────────────
   Still width queries: these are about how much room a row of cards has, and
   nothing here depends on knowing what kind of screen it is. */
@media (max-width: 860px) {
  /* Four visible children on a phone — artwork, text, the one-press action,
     the menu — so four tracks. Declaring three left the menu with no column of
     its own and the grid gave it an implicit row: the ⋯ dropped onto a line of
     its own under the title. */
  /* On .rowInner, not on .row. The row is two boxes now — the content and the
     strip of actions a swipe brings out — and leaving this template on .row put
     the whole of the content into the 44px artwork column: every title crushed
     to two characters with the picture on top of it. Measured on the queue
     screen, and it is the shape the phone was in. */
  .rowInner { grid-template-columns: 44px 1fr; gap: 10px; }
  .row { padding: 8px 4px; }
  .rowActions { gap: 4px; margin-left: 4px; }
  .row .idx, .row .dur { display: none; }
  /* The bars come back, over the artwork.
     The number column is dropped on a phone and the bars lived inside it, so
     the one thing that says "this row is the one playing" vanished on the only
     screen where the row number was already gone. Putting the cell back would
     indent the playing row past its neighbours; over the thumbnail is where
     every music app puts this, and it costs the grid nothing. */
  .row { position: relative; }
  .row.now .idx {
    display: flex; align-items: center; justify-content: center;
    position: absolute; left: 4px; top: 50%; transform: translateY(-50%);
    width: 44px; height: 44px; z-index: 1;
    background: oklch(0 0 0 / 45%); border-radius: var(--radius-md);
  }
  .row.now .eq i { background: #fff; }
  .row .thumb { width: 44px; height: 44px; }
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
  .menu { min-width: 160px; }
  .modal { width: calc(100vw - 28px); }
  .toasts { bottom: 108px; }
}

/* ── What a phone gets instead of a volume slider ──────────────────────────
   Last in the file on purpose: these override the narrow rules above at equal
   specificity, and only where there is no pointer.

   The slider goes because on the device this row is drawn on it cannot work —
   iOS refuses a volume from script and says nothing — and a control that
   cannot move is worse than no control. The room goes to the two actions that
   were behind ⋯, which then has nothing left to open. Mute stays: the muted
   flag is a different permission and that one is honoured. */
@media (hover: none) {
  .app.narrow.sheet-open .right .vol { display: none; }
  .app.narrow.sheet-open .right .sp,
  .app.narrow.sheet-open .right .sl { display: inline-flex; }
  .app.narrow.sheet-open .right .mr { display: none; }
  /* A finger, on the row that now has six things in it. */
  .app.narrow.sheet-open .right button { width: 40px; height: 40px; }
  .app.narrow.sheet-open .right button svg { width: 19px; height: 19px; }
}

/* The closed bar has no room for an opinion, and it was taking the room from
   the title. Measured on a 390px phone: .now is 234 wide, the pair took 90 of
   it, and the title was left 80 and cut at 112. There is nowhere to float them
   either — the bar is 66px tall with a 42px row in it, and its top-right
   corner is the video button. So they wait in the opened player, which is one
   press away and where they are already drawn at 40px. */
.app.narrow:not(.sheet-open) .bar .now .rate-box { display: none; }
/* Off everywhere else: a desktop keeps the menu, which is where these two have
   always lived and where there is no shortage of room. */
.right .sp, .right .sl { display: none; }
/* The speed button is a word, not a glyph. */
.right .sp { font-size: 12.5px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
`
