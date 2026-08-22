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
--serif: "Newsreader", ui-serif, Georgia, "Times New Roman", serif;
--mono:  "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

**Newsreader** is a screen-first serif with optical sizing — it holds up at 17px
body copy where a print serif goes muddy. **IBM Plex Mono** is the machine voice.

| Role          | Size                                   | Notes                          |
| ------------- | -------------------------------------- | ------------------------------ |
| `h1`          | `clamp(2rem, 1.4rem + 2.4vw, 2.9rem)`  | weight 500, `-0.02em`, balanced|
| `h2`          | `1.4rem`                               | weight 500                     |
| body          | `1.0625rem` / `1.65`                   | 17px, the reading default      |
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

Hover tints the whole row and bleeds the tint past the text on both sides, so the
row reads as one target rather than a highlighted paragraph:

```css
.row a:hover {
  background: var(--accent-soft);
  box-shadow: -1rem 0 0 var(--accent-soft), 1rem 0 0 var(--accent-soft);
}
```

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

| File                              | Holds                                        |
| --------------------------------- | -------------------------------------------- |
| `src/styles/tokens.css`           | all three theme states, base element styles  |
| `src/layouts/Doc.astro`           | `.shell`, font loading, global prose styles   |
| `src/layouts/Frame.astro`         | the embed wrapper for `mode: "embed"`         |
| `src/components/ThemeInit.astro`  | pre-paint theme stamp (`is:inline`, in head) |
| `src/components/ThemeToggle.astro`| the system/light/dark cycle button           |
| `src/pages/index.astro`           | the directory listing                        |
| `tools/chrome.mjs`                | the "← Collection" pill                      |

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
