# Design system

A small system for a personal collection of documents. One page type carries the
weight (the index), everything else is prose. The goal is that a page with no
images and no illustration still looks deliberate.

## The idea

**A directory, not a dashboard.**

The index is a list of routes, set like an index at the back of a book: the route
itself is the visual anchor, in monospace, in the left column. Nothing floats,
nothing is in a card, nothing has a shadow. Structure comes from alignment and
hairlines, not from boxes.

Three rules keep it honest:

1. **One accent, spent only on state.** Teal appears on hover, focus and active —
   never as decoration. If you find yourself reaching for a second colour, you
   are decorating.
2. **Hairlines instead of containers.** A 1px rule between rows carries the same
   grouping a card does, at a fraction of the visual noise.
3. **Type does the ranking.** Serif for reading, mono for machine facts (routes,
   dates, counts, labels). A reader can tell what kind of thing they are looking
   at before reading a word.

### What this deliberately is not

The default look for a generated page is warm cream (`#F4F1EA`), a serif display
face, a terracotta accent, rounded cards that lift on hover, and a gradient
somewhere. That is the house style of every AI-made page, and this site had it.
Cool ink neutrals, flat rows, and a cold accent were chosen specifically to land
somewhere else.

## Colour

Neutrals are cool and near-grey — a hint of blue, never brown. The accent is the
only saturated value in the system.

| Token           | Light     | Dark      | Used for                              |
| --------------- | --------- | --------- | ------------------------------------- |
| `--bg`          | `#fbfbfc` | `#0c0e11` | page ground                           |
| `--surface`     | `#ffffff` | `#14171b` | code blocks, the embed bar            |
| `--border`      | `#e6e7ea` | `#22262c` | hairlines between rows                |
| `--border-strong`| `#d3d5da`| `#333941` | the one rule under the filter; quotes |
| `--text`        | `#14161a` | `#e9eaec` | body                                  |
| `--muted`       | `#61666f` | `#8a9099` | blurbs, secondary prose               |
| `--faint`       | `#6d737c` | `#7d838d` | mono labels, counts, eyebrows         |
| `--accent`      | `#0b7a6e` | `#4ecbb8` | hover, focus, links in chrome         |
| `--accent-soft` | `#e6f2f0` | `#12241f` | hover tint, inline code ground        |

`--faint` is only slightly lighter than `--muted` on purpose. It reads as
lower-priority because of its size and letterspacing, not because it is washed
out — small mono text that is genuinely faint fails contrast.

### Contrast

Every foreground/background pair in the system clears **WCAG AA (4.5:1)** in all
three theme states. The tightest pair is `--accent` on `--accent-soft` in light
at 4.55:1.

```
LIGHT                          DARK (both states)
text    on bg   17.51:1        text    on bg   16.06:1
muted   on bg    5.58:1        muted   on bg    6.01:1
faint   on bg    4.62:1        faint   on bg    5.06:1
accent  on bg    5.05:1        accent  on bg    9.72:1
accent  on soft  4.55:1        accent  on soft  8.14:1
```

Re-check after any palette edit. The audit script is in the repo history; the
short version is: linearise sRGB, compute relative luminance, ratio the two.

## Theme

Three states, not two — and this is where most theme implementations break.

```css
:root                { /* complete light palette */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* system dark */ }
}

:root[data-theme="dark"] { /* explicit choice */ }
```

The rules that make it work:

- **Every token gets its full value on bare `:root`.** A colour whose only
  definition lives inside a media query or a `[data-theme]` block simply does not
  exist in the unstamped state. This is the single most common cause of an
  unreadable page.
- **The two dark blocks define the same token set.** They are duplicated rather
  than shared, because `:root:not([data-theme="light"])` inside the media query
  is what lets the toggle override the OS in *both* directions.
- **No stamp means system.** The toggle cycles `system → light → dark` and
  removes the attribute for system, handing control back to the OS.
- **`body` sets `background: var(--bg)` explicitly.** A transparent body borrows
  whatever the host paints behind it.
- **`ThemeInit` runs `is:inline` in `<head>`**, before paint, so a saved choice
  never flashes the wrong palette. Every `localStorage` access is in a
  `try/catch` — private mode throws.

## Type

Two faces, loaded from Google Fonts with real fallback stacks.

```css
--serif: "Source Serif 4", ui-serif, Charter, Georgia, "Times New Roman", serif;
--mono:  "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

**Source Serif 4** is the reading face. It was drawn for screen text rather than
adapted from metal, so it has a large x-height, open apertures and low stroke
contrast — the three things that decide whether small text stays legible. It
carries a real optical-size axis (`opsz` 8–60), so `font-optical-sizing: auto` on
`body` thickens the strokes at 17px body copy and thins them at display sizes.
That is one font file doing the work of two.

**IBM Plex Mono** is the machine voice: routes, dates, counts, labels. A reader
can tell which kind of thing they are looking at before reading a word.

The fallback stack matters. `ui-serif` catches the platform's own reading serif,
and **Charter** — bundled with macOS — is the closest metric match if the
webfont never arrives.

| Role          | Size                                   | Notes                          |
| ------------- | -------------------------------------- | ------------------------------ |
| `h1`          | `clamp(2rem, 1.4rem + 2.4vw, 2.9rem)`  | weight 500, `-0.02em`, balanced|
| `h2`          | `1.4rem`                               | weight 500                     |
| body          | `1.0625rem` / `1.7`                    | 17px, the reading default      |
| row title     | `1.12rem`                              | weight 500                     |
| blurb         | `0.92rem`                              | `--muted`                      |
| route, mono   | `0.8rem`                               |                                |
| label, eyebrow| `0.68–0.7rem`                          | uppercase, `0.08–0.16em`       |

Headings sit at weight 500, not 700. At this size the serif already has enough
presence; bold would shout.

Mono text is always letterspaced (`0.02em` up to `0.16em` for uppercase labels)
and numbers use `font-variant-numeric: tabular-nums` so counts and dates hold
their column.

## Layout

Two widths, both on the `.shell` container:

```css
--measure: 34rem;   /* prose — roughly 70 characters */
--page:    58rem;   /* the index listing */
```

Prose is capped at `--measure` because line length, not font size, is what makes
long text tiring. The index gets `--page` so the three columns can breathe.

The index row is a grid:

```css
grid-template-columns: 13rem 1fr auto;   /* route | title + blurb | kind + meta */
```

**One breakpoint**, at `46rem`, where those three columns fold into a stack and
the meta column turns horizontal. A single well-chosen breakpoint beats four
half-considered ones.

### Rows

Every two-column row in the system uses one class, `.pair`, and it goes on **the
element that actually holds the two children** — the `<a>`, or the `<div>` in a
`<dl>`. Never put it on both a wrapper and its child: the inner grid then lands
inside the outer grid's first column and the row collapses to `10rem` wide. That
bug shipped once already.

The same rule applies to the three-column `.entry` rows on the about page and
`/tried`: the grid goes directly on the `<a>` (or, on the about page, the `<li>`
when there is nowhere to link yet), never on a wrapper around it.

### Search

`/pages` and `/tried` both filter with `src/lib/filter.ts`'s `matchesQuery`:
every whitespace-separated word in the query must appear somewhere in the row,
in any order. Typing "iit hackathon" matches a row containing both words in
either order, not only that exact three-word phrase — a plain substring test
would miss it. Nothing is scored or ranked; a small personal list doesn't need
that, so query words either all match or they don't.

### Images

Files live in `static/`, which is copied to the site root during `prepare`, so
`static/images/x.jpg` is written as `'images/x.jpg'` and resolved through
`asset()`. Every image gets an explicit `border`, a 4px radius to match `pre`,
and `aspect-ratio: 3 / 2` with `object-fit: cover` so a mixed-size set still
lines up. The gallery is `repeat(auto-fill, minmax(15rem, 1fr))` — it reflows on
its own and needs no breakpoint. Captions are mono at `--faint`.

Hover tints the whole row and bleeds the tint past the text on both sides, so the
row reads as one target rather than a highlighted paragraph:

```css
.row a:hover {
  background: var(--accent-soft);
  box-shadow: -1rem 0 0 var(--accent-soft), 1rem 0 0 var(--accent-soft);
}
```

### Social icons

`src/components/SocialIcon.astro` deliberately isn't the official brand
marks — GitHub black, LinkedIn blue, Instagram's gradient — which would be
four foreign colours dropped into a one-accent system. Plain `currentColor`
outlines instead, in a bordered circle matching the button language
elsewhere, so hover is the same `--accent` + `--accent-soft` treatment as
every other interactive element on the page. Unrecognised labels fall back
to a generic link glyph rather than rendering nothing.

### The floating shape

The one deliberate illustration on an otherwise type-only site
(`src/components/FloatingShape.astro`) — a wireframe icosahedron, not a
solid, coloured with `--accent` so it's teal in light and the paler
dark-mode teal automatically, and re-tints live via a `MutationObserver` on
`data-theme` if the toggle is used while it's on screen.

`position: fixed`, bottom-right, no border, no background — it floats over
whatever page is actually behind it rather than sitting in its own panel,
and it's rendered from `Doc.astro`, so it's on every page that layout
serves, not just the about page. `/admin` is the one opt-out (`floatingShape={false}`
on that page's `<Doc>`) — a toy floating over a data-entry form is a
liability, not a delight, while someone's mid-edit. The wrapper is
`pointer-events: none`; only the canvas itself is `auto`, so the
transparent space around the wireframe never swallows a click or a scroll
meant for whatever's underneath it. Hidden below `30rem` — there's no free
corner left in a single-column layout, and dragging competes with
scrolling on touch.

Idle motion (slow spin, a small sine-wave bob) is skipped entirely under
`prefers-reduced-motion`; what's left is only the momentum from a visitor's
own drag, which decays back to a standstill. Three.js's own bundle doesn't
tree-shake past roughly 500KB minified regardless of whether you import the
whole namespace or name individual classes — that's the accepted cost of
using the library at all, loaded on every page it appears on.

### Smooth scroll

GSAP's ScrollSmoother (`src/components/SmoothScroll.astro`) lerps the whole
page's scroll position a beat behind the real one, so the wheel feels weighted
instead of stepping frame-to-frame. It needs a specific shape to work: a
`#smooth-wrapper` clipped to the viewport, with `#smooth-content` transformed
inside it — `Doc.astro` wraps `<main>` and `<Chrome>` in those two divs, and
the CSS that makes the outer one `position: fixed` is gated on an
`html.gsap-smooth` class stamped by `src/components/ScrollInit.astro`, an
inline `<head>` script in the spirit of `ThemeInit.astro`. That gate is the
progressive-enhancement fallback: under `prefers-reduced-motion` (or with JS
disabled entirely) the class never lands, the wrapper CSS never matches
anything, and the two divs behave like plain blocks — the page just scrolls
natively, with no ScrollSmoother instance ever created. Printing gets the same
native fallback deliberately, since a `position: fixed`, clipped wrapper can
only ever print one page's worth of content.

The floating shape stays outside `#smooth-wrapper` on purpose — anything
`position: fixed` has to live outside the transformed content or it would
drift with the lerp instead of staying pinned to the viewport. `/admin` opts
out (`smoothScroll={false}`) for the same reason `floatingShape` does there,
plus a concrete one: the Tried-entry form calls `scrollIntoView()` when you
click Edit, and that's simplest to keep working exactly as browsers implement
it rather than reconcile against a lerped scroll position mid-edit. Touch
devices are left unsmoothed (`smoothTouch: 0`) — native mobile scrolling
already feels right, and fighting the OS there costs more than it buys.

Spacing runs on a loose 4px-derived scale (`.3 / .45 / .7 / 1.1 / 1.5 / 2.5 / 3rem`).
Section rhythm uses `clamp()` so it compresses on small screens instead of
stepping at a breakpoint.

## Motion

`.15s ease` on colour and background. Nothing moves position, nothing scales,
nothing lifts. `prefers-reduced-motion: reduce` collapses every duration to
`.01ms` globally in `tokens.css`.

## Focus

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 2px;
}
```

Set once, globally, never removed. `:focus-visible` rather than `:focus`, so a
mouse click does not draw a ring but a Tab key does.

## Files

Four routes are hand-written Astro pages rather than registry entries: `/` is
the about page, `/pages` is the generated collection index, `/tried/<slug>`
is each Tried entry's own page, and `/admin` is the private editor. A static
Astro route silently beats the `[...route]` catch-all, so `/`, `/pages`,
`/admin`, and anything under `/tried/` are rejected in `tools/registry.mjs` —
registering one of them in `pages.json` now fails loudly instead of building
a page nothing can reach.

**Content lives in Supabase, not in the page files or `src/data/`.** Both the
about page's content and every Tried entry are rows in Postgres tables
(`supabase/site_content.sql`, `supabase/schema.sql`) — Row Level Security
only lets the anonymous build read `is_public = true` Tried rows, and only
one email write anything at all. `src/lib/site.ts` and `src/lib/tried.ts` are
the build-time fetch: `src/pages/index.astro` awaits `getSiteContent()` and
`getTriedRows()`; `src/pages/tried.astro` and `src/pages/tried/[slug].astro`
await `getTriedRows()`. Editing a bio line, adding an image, or logging a new
attempt happens at `/admin`, logged in — never by editing a file.

`/admin` deliberately breaks a few of this document's own rules — panels,
not hairlines; a system sans instead of the serif reading face; a danger-red
hover on Delete. It's a private tool, not the public showcase these rules
were written for.

Two fields are rich text (Quill, in `/admin`) rather than plain strings: the
about page's Intro and a Tried entry's Description. Both store real HTML and
render via `set:html` on the public pages — safe here specifically because
RLS means only the one owner can ever write either table, the same trust
boundary as everything else in `/admin`. Every other field (title, note,
labels, tags…) stays plain text, since a one-line label has no real use for
bold or a bullet list. A `set:html` container's contents are raw strings
Astro never compiles, so they never get the scoping attribute a plain
selector would need — styling what's inside always goes through
`.container :global(p)`, never a bare `.container p`.

Images can be a path already committed under `static/images/`, or a URL from
"Upload a photo" in `/admin`, which pushes straight to the `site-images`
Supabase Storage bucket (`supabase/storage.sql`) and fills the field in.
`resolveImage()` in `src/lib/paths.ts` tells the two apart -- a relative path
still gets `asset()` and the base path; an absolute URL is used as-is.

| File                                | Holds                                        |
| ------------------------------------ | -------------------------------------------- |
| `src/styles/tokens.css`             | all three theme states, base element styles  |
| `src/layouts/Doc.astro`             | `.shell`, font loading, global prose styles, the `noindex` meta option, the `#smooth-wrapper`/`#smooth-content` shell |
| `src/layouts/Frame.astro`           | the embed wrapper for `mode: "embed"`         |
| `src/components/ThemeInit.astro`    | pre-paint theme stamp (`is:inline`, in head) |
| `src/components/ThemeToggle.astro`  | the system/light/dark cycle button           |
| `src/components/SocialIcon.astro`   | currentColor outline icons for Elsewhere, not brand marks |
| `src/components/FloatingShape.astro`| the draggable Three.js wireframe, fixed and site-wide |
| `src/components/ScrollInit.astro`   | stamps `html.gsap-smooth`, skipped under reduced motion |
| `src/components/SmoothScroll.astro` | creates the GSAP ScrollSmoother instance |
| `src/lib/supabaseClient.ts`         | the one Supabase client, shared by build-time fetches and `/admin` |
| `src/lib/site.ts`                   | fetches the about page's single content row  |
| `src/lib/tried.ts`                  | fetches public Tried rows, sorted newest-first, with slug/href/search built in |
| `src/lib/slug.ts`                   | the slugify rule, used by `/admin` when it creates a new entry |
| `src/lib/filter.ts`                 | `matchesQuery` — the live-filter matcher shared by /pages and /tried |
| `src/lib/paths.ts`                  | `asset()`, `routeHref()`, and `resolveImage()` for uploaded-vs-committed images |
| `src/pages/index.astro`             | the about page; renders Supabase content, capped to a 3-entry teaser for both Selected work and Tried, with Elsewhere links opening in a new tab |
| `src/pages/pages.astro`             | the generated collection index               |
| `src/pages/tried.astro`             | the full, filterable Tried list              |
| `src/pages/tried/[slug].astro`      | one entry's own page — image and full description, if set |
| `src/pages/admin.astro`             | login-gated editor for both tables, `noindex`, unlinked from the rest of the site |
| `supabase/schema.sql`, `supabase/site_content.sql`, `supabase/storage.sql` | tables, RLS policies, the images bucket, seed data — run once each in the SQL editor |
| `supabase/README.md`                | the one-time dashboard setup this repo can't do for you |
| `tools/chrome.mjs`                  | the "← Collection" pill                      |

`chrome.mjs` uses **literal colours, not tokens** — by design. It is injected
into imported documents whose CSS we do not control, so it cannot depend on this
site's variables existing. Its palette mirrors the dark theme; if you change
`--accent`, change `#4ecbb8` there too.

## Adding a page

Components read tokens and never declare a raw colour. If you need a value that
is not in the table above, that is a signal the system needs a new token, not
that this page needs a one-off hex.

```astro
---
import Doc from '../layouts/Doc.astro';
---

<Doc title="Page title" siteTitle="HTML DOCS TO Learn" description="One line.">
  <p class="eyebrow">Section</p>
  <h1>Page title</h1>
  <p class="lede">A standfirst, in <code>--muted</code>.</p>

  <h2>A section</h2>
  <p>Body copy inherits the prose styles from <code>.shell</code>.</p>
</Doc>

<style>
  .eyebrow {
    font-family: var(--mono);
    font-size: .7rem;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--faint);
    margin: 0 0 1.5rem;
  }

  .lede { color: var(--muted); }
</style>
```

Pass `wide` for a full-width page, `chrome={false}` to drop the back pill.
