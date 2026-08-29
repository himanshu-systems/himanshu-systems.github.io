# Specification Mining Analysis: Public Astro Pages & Design System

**Specialist Role**: Public Astro Pages & Design System Specialist  
**Workspace**: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn`  
**Date**: 2026-08-29  

---

## 1. Executive Summary

This report documents the exhaustive architectural and visual specifications of the public-facing pages, design system constraints, data fetching layer, and caching resilience mechanisms in the `html-docs-to-learn` Astro project.

The project implements an intentional, high-craft aesthetic: **"A directory, not a dashboard."** Layouts reject cards, elevation shadows, and rounded container boxes in favour of typographical hierarchy, 1px hairlines (`border-bottom: 1px solid var(--border)`), and a single accent color (Teal) reserved exclusively for interactive states. Build-time data is sourced from Supabase Postgres with offline fallback caching in `.cache/` to ensure resilience during network partitions or offline static builds.

This document establishes the exact blueprint for adding the **Blog** collection (`src/pages/blog.astro` and `src/pages/blog/[slug].astro`) and its underlying library `src/lib/blog.ts`.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Layout | `Doc.astro` Shell | Primary layout wrapper handling HTML head, fonts, theme initialization, smooth scrolling, ambient instrument marks, and floating wireframe. | `title`, `siteTitle`, `description?`, `sourceUrl?`, `chrome?`, `wide?`, `noindex?`, `floatingShape?`, `smoothScroll?`, `instrument?`, `prose?` | Rendered HTML document with `<main class="shell ...">` and slot content. | Throws build error if required props (`title`, `siteTitle`) missing. | `src/layouts/Doc.astro`, `DESIGN.md` |
| 2 | Design Tokens | Three-State Theme System | CSS custom properties defined for Light, System Dark, and Explicit Dark without unstamped token leaks. | `:root`, `prefers-color-scheme: dark`, `[data-theme="dark"]`, `[data-theme="light"]` | Reactive CSS custom properties (`--bg`, `--surface`, `--border`, `--text`, `--muted`, `--faint`, `--accent`, `--accent-soft`). | Validated WCAG AA (>= 4.5:1) in all 3 states. | `src/styles/tokens.css`, `DESIGN.md` |
| 3 | Theme Init | `ThemeInit.astro` | Inline `<head>` script reading `localStorage.getItem('theme')` before paint to avoid flash of unstyled content. | `localStorage` entry `'theme'` | Sets `data-theme` attribute on `document.documentElement` or removes attribute for system. | Wrapped in `try/catch` to avoid crash in private browsing modes. | `src/components/ThemeInit.astro`, `DESIGN.md` |
| 4 | Theme Toggle | `ThemeToggle.astro` | Interactive button cycling `system → light → dark → system` with SVG icon transitions. | Click event on `#theme-toggle` button. | Mutates `document.documentElement` attributes and updates `localStorage`. | Falls back to system preference if `localStorage` throws or is cleared. | `src/components/ThemeToggle.astro` |
| 5 | Typography | Optical Serif & Tabular Mono | Dual-font system: Source Serif 4 (`--serif`) with optical size axis (`opsz 8..60`) and IBM Plex Mono (`--mono`) with tabular numerals. | CSS font loading in `Doc.astro` `<head>`. | Screen-optimized legible reading body and machine facts. | System fallback stack (`ui-serif, Charter` and `ui-monospace, SFMono-Regular`). | `DESIGN.md`, `tokens.css`, `Doc.astro` |
| 6 | Navigation | Masthead Header | Standardized header container with flex layout, uppercase mono eyebrow, navigation links, and theme toggle. | `.masthead`, `.eyebrow`, `nav a`, `h1`, `.standfirst` | Standardized header UI across public pages. | Responsive collapse on narrow screens (`<= 46rem`). | `src/styles/masthead.css` |
| 7 | Navigation | Floating Chrome Pill | Floating fixed pill at bottom-right (`#__collection_bar`) providing `← Collection` back link. | `chromeMarkup({ collection, sourceUrl, title })` | Injected fixed DOM pill with literal dark palette. | Hidden in print stylesheets via `@media print`. | `tools/chrome.mjs`, `src/components/Chrome.astro` |
| 8 | Listing UI | Filter Controls & Live Search | Monospace search input `#filter` with live count badge `#count` and all-words matching. | Search input string, `data-search` attribute on list rows. | Toggles `hidden` attribute on rows and `#empty` message. | Empty query shows all rows; unmatched query reveals `#empty`. | `src/styles/listing.css`, `src/lib/filter.ts`, `src/lib/filterUI.ts` |
| 9 | Listing UI | Row Grid & Hover Bleed | Multi-column grid rows (`.pair` or `.entry`) with negative box-shadow horizontal bleed on hover. | Grid items (date/route, body/title+blurb, tags/meta). | Unified hover rectangle in `var(--accent-soft)` without card borders. | Responsive single-column reflow below `46rem`. | `src/styles/listing.css`, `DESIGN.md` |
| 10 | Motion | Progressive Smooth Scroll | GSAP ScrollSmoother wrapping `#smooth-wrapper` and `#smooth-content` with progressive enhancement gate. | `html.gsap-smooth` class from `ScrollInit.astro`. | Lerped weighted scrolling on desktop wheel. | Bypassed when `prefers-reduced-motion`, JS disabled, or on touch devices. | `src/components/ScrollInit.astro`, `src/components/SmoothScroll.astro`, `Doc.astro` |
| 11 | Motion | Ambient Instrument Chrome | 4-corner print proof registration crop marks drawn using CSS linear gradients in `var(--accent)`. | `body.instrument::after` pseudo-element. | Fixed ambient crop marks at corner offsets (`inset: 1.15rem`). | Disabled on `/admin` (`instrument={false}`) and in `@media print`. | `src/layouts/Doc.astro` |
| 12 | Visual Asset | Floating 3D Wireframe | Three.js wireframe icosahedron pinned to bottom-right, re-tinting dynamically with theme changes. | `FloatingShape.astro`, `data-theme` MutationObserver. | Interactive draggable 3D wireframe. | Disabled on `/admin`, hidden on screens `< 30rem`, stops idle spin on reduced-motion. | `src/components/FloatingShape.astro`, `DESIGN.md` |
| 13 | Data Layer | Supabase Build Fetcher | Build-time data fetching using publishable key and Row Level Security (`is_public = true`). | Supabase table queries (`site_content`, `tried_entries`). | Structured TypeScript data objects. | Throws on error if no cache exists. | `src/lib/supabaseClient.ts`, `src/lib/tried.ts`, `src/lib/site.ts` |
| 14 | Data Layer | File-Based Build Cache | Filesystem cache in `.cache/*.json` to survive Supabase network outages during static site generation. | `readCache<T>(key)`, `writeCache<T>(key, data)`. | Read/write JSON files in `process.cwd()/.cache`. | Graceful fallback: returns cached data on network error; returns `null` if missing. | `src/lib/buildCache.ts`, `src/lib/tried.ts` |
| 15 | Routing | Static Astro Routing vs Passthrough | Astro routes (`/`, `/pages`, `/tried`, `/tried/[slug]`) compile statically; external/local full documents use `tools/prepare.mjs`. | `pages.json`, Astro pages in `src/pages/`. | Pre-rendered static HTML in `dist/`. | Reserved route conflict check in `tools/registry.mjs`. | `tools/registry.mjs`, `tools/prepare.mjs`, `astro.config.mjs` |
| 16 | Dynamic Pages | Static Path Generation (`[slug].astro`) | Astro `getStaticPaths()` generates discrete static HTML pages for each public entry. | Array of public rows from Supabase / cache. | Static HTML routes (e.g. `/tried/hackathons/index.html`). | Private entries excluded; missing slugs yield 404. | `src/pages/tried/[slug].astro` |
| 17 | Rich Text | Quill HTML Scoped Rendering | Raw HTML generated from Quill rich editor rendered via `set:html` with global scoped CSS selectors. | HTML string in `entry.description` or `intro`. | Formatted typography (paragraphs, lists, bold, blockquotes). | Uses `:global(p)` / `:global(a)` inside scoped wrapper to reach uncompiled DOM. | `DESIGN.md`, `src/pages/tried/[slug].astro`, `src/pages/index.astro` |
| 18 | Image Handling | Dual Path Resolution (`resolveImage`) | Distinguishes relative committed assets (`images/x.jpg`) from absolute Supabase Storage URLs. | Image source string. | Browser-ready absolute URL or base-prefixed path. | Protocol regex check (`/^https?:\/\//`). | `src/lib/paths.ts` |
| 19 | Slugs | Deterministic Unique Slugs | Generates clean URL slugs from titles with collision disambiguation (`-2`, `-3`). | Title string, `taken` Set of slugs. | Sanitized lowercase hyphenated slug. | Replaces invalid chars with `-`; falls back to `'entry'`. | `src/lib/slug.ts` |
| 20 | Route Guard | Reserved Route Collision Prevention | Prevents `pages.json` registry from overwriting hand-written Astro routes. | `RESERVED` dictionary in `tools/registry.mjs`. | Throws explicit error during registry validation. | Prevents silent route eclipsing. | `tools/registry.mjs` |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Three-State Theme | User OS is Dark, no explicit choice in `localStorage`. | Evaluates `@media (prefers-color-scheme: dark)` + `:root:not([data-theme="light"])`. Dark tokens apply. Unstamped `:root` tokens serve as base. |
| 2 | Theme Storage | Private browsing window blocks `localStorage` access. | `ThemeInit.astro` catches exception silently, leaving `<html>` unstamped so OS system theme applies without script crash. |
| 3 | Build Cache | Supabase is offline or `PUBLIC_SUPABASE_URL` is unreachable during `npm run build`. | `getTriedRows()` catches fetch error, checks `readCache('tried_entries')`. If cache file `.cache/tried_entries.json` exists, build succeeds with cached rows. If no cache exists, throws descriptive error. |
| 4 | Build Cache | Supabase returns empty rows `[]` or null data. | `(data ?? []).map(toRow)` returns empty array `[]`, writes `[]` to cache, returns `[]` without crashing. |
| 5 | Rich Text Scoping | Quill HTML rendered inside `<div class="prose" set:html={html} />`. | Astro does not compile elements inside `set:html`, so Astro scoped attributes (e.g. `data-astro-cid-xyz`) are not present on child `<p>`, `<a>`, `<ul>` tags. CSS rules must use `.prose :global(p)` to style content. |
| 6 | Image Resolution | `post.cover_image` is a full Supabase Storage URL (`https://xyz.supabase.co/storage/v1/...`). | `resolveImage()` detects `^https?:\/\/` and returns URL unmodified, preventing double-prefixing with `BASE_URL`. |
| 7 | Image Resolution | `post.cover_image` is a committed asset path (`images/cover.jpg` or `/images/cover.jpg`). | `resolveImage()` strips leading slash and prefixes with `asset()`, yielding `${BASE}/images/cover.jpg`. |
| 8 | Search Filtering | Search query words entered in different order from text (e.g. `"networking go"` for `"Go I/O networking"`). | `matchesQuery()` splits query into whitespace-separated words and verifies every word is present in `data-search` (`words.every(...)`). Query matches successfully. |
| 9 | Search Filtering | Search query has multiple spaces or special characters (e.g. `"  kernel   bpf  "`). | Query is trimmed, lowercased, and split on `/\s+/`. Empty tokens filtered out. Matches correctly. |
| 10 | Search Filtering | Zero matches found in search filter. | All rows get `hidden = true`. `#empty` element gets `hidden = false`. `#count` text is set to `"0"`. |
| 11 | Responsive Listing | Viewport width <= 46rem (736px). | `.entry` grid shifts from `grid-template-columns: 6rem 1fr auto` to `1fr` single-column stack. Meta/tags wrap horizontally. Hover box-shadow bleeds reduce to `0.75rem`. Editorial numerals `h2::before` hide. |
| 12 | Reduced Motion | OS has `prefers-reduced-motion: reduce` enabled. | `ScrollInit.astro` does not stamp `html.gsap-smooth`. ScrollSmoother is never instantiated. Native browser scrolling occurs. `FloatingShape` stops idle rotation. Global CSS sets transitions and animations to `.01ms`. |
| 13 | Single Row Slug Collision | Admin creates blog post with same title as existing post. | `uniqueSlug(title, taken)` detects collision in `taken` Set and appends `-2`, `-3` until slug is unique. |
| 14 | Route Reservation | Developer attempts to register `/blog` or `/tried` in `pages.json`. | `tools/registry.mjs` checks `RESERVED` table and throws loud validation error during prepare/build. |
| 15 | Static Path Generation | Supabase returns 0 public blog posts. | `getStaticPaths()` returns `[]`. Astro builds the listing page with count `0` and displays empty state. |

---

## 4. Public Astro Pages Architecture & Routing Taxonomy

### Routing Hierarchy
The repository uses a hybrid architecture:
1. **Hand-Written Astro Public Pages (`src/pages/`)**:
   - `/` (`src/pages/index.astro`): The About page. Builds teaser lists from Supabase (`site_content`, `tried_entries`).
   - `/pages` (`src/pages/pages.astro`): The Collection Index. Renders list of all entries registered in `pages.json` with live client-side filtering.
   - `/tried` (`src/pages/tried.astro`): Full filterable experiments log fetched from Supabase.
   - `/tried/[slug]` (`src/pages/tried/[slug].astro`): Static detail pages generated via `getStaticPaths()` for every public row.
   - `/404` (`src/pages/404.astro`): Custom 404 page styled with `Doc.astro`.
   - `/admin` (`src/pages/admin.astro`): Private client-side CMS editor (`noindex`, `smoothScroll={false}`, `floatingShape={false}`).
2. **Registry Passthrough & Fragments (`pages.json` + `tools/prepare.mjs` + `src/pages/[...route].astro`)**:
   - Complete HTML documents (`mode: "passthrough"`) are copied directly to `public/` by `prepare.mjs`.
   - Fragment HTML documents (`mode: "embed"`) are rendered via `[...route].astro` using `Frame.astro` or `Doc.astro`.

### Route Reservation Guard
`tools/registry.mjs` maintains a strict reservation map:
```javascript
export const RESERVED = {
  '/': 'the about page',
  '/pages': 'the generated collection index',
  '/tried': 'the experiments log',
  '/admin': 'the admin page',
};
```
When implementing `/blog`, `RESERVED` in `tools/registry.mjs` should be updated to include:
```javascript
'/blog': 'the blog listing',
```
And `normalizePage()` in `tools/registry.mjs` should check `route.startsWith('/blog/')` to prevent registry collisions.

---

## 5. Design System Specification & Strict Constraints

The design system is rigorously governed by `DESIGN.md` and `.agents/rules/strict_design.md`.

### Core Philosophy: "A Directory, Not a Dashboard"
1. **No Containers, No Cards, No Shadows**: Structure is built from typographic scale, vertical whitespace, and 1px hairlines (`border-bottom: 1px solid var(--border)`). Never wrap items in rounded cards with elevation shadows.
2. **One Accent Color**: Teal (`--accent`) is spent **only** on interactive states (hover, focus, active, selection) plus the ambient instrument registration marks and floating wireframe. It is never used as decorative text color or static badge backgrounds.
3. **Type Does the Ranking**:
   - **Source Serif 4 (`--serif`)**: For human reading (prose, titles, standfirst, intro).
   - **IBM Plex Mono (`--mono`)**: For machine facts (routes, dates, counts, labels, tags, code, eyebrows).

### CSS Tokens Palette (`src/styles/tokens.css`)

| Token | Light Theme (`:root`) | Dark Theme (`[data-theme="dark"]` & system dark) | Purpose & Usage Rule |
|---|---|---|---|
| `--bg` | `#fbfbfc` | `#0c0e11` | Page ground canvas. Set on `body`. |
| `--surface` | `#ffffff` | `#14171b` | Code block backgrounds (`pre`), admin panels. |
| `--border` | `#e6e7ea` | `#22262c` | 1px hairlines between rows (`.row + .row`), dividers (`hr`). |
| `--border-strong` | `#d3d5da` | `#333941` | Filter underline, blockquote border, section number labels. |
| `--text` | `#14161a` | `#e9eaec` | Primary body text, headings. |
| `--muted` | `#61666f` | `#8a9099` | Standfirst/lede, blurbs, secondary prose, dates. |
| `--faint` | `#6d737c` | `#7d838d` | Mono labels, tags, counts, eyebrows. |
| `--accent` | `#0b7a6e` | `#4ecbb8` | Hover state, focus rings, link hover, instrument ticks. |
| `--accent-soft` | `#e6f2f0` | `#12241f` | Row hover background tint, inline code ground, `::selection`. |
| `--measure` | `34rem` (544px) | `34rem` (544px) | Max-width for prose reading (~70 characters). |
| `--page` | `58rem` (928px) | `58rem` (928px) | Max-width for wide listings (`.shell--wide`). |

### Typography Scale & Rules

| Role | Font Family | Size | Weight | Tracking / Styling Notes |
|---|---|---|---|---|
| Page Heading `h1` | `var(--serif)` | `clamp(2rem, 1.4rem + 2.4vw, 2.9rem)` | `500` | `-0.02em`, `line-height: 1.1`, `text-wrap: balance` |
| Section Heading `h2` | `var(--serif)` (prose) or `var(--mono)` (listing) | `1.4rem` (prose) / `0.7rem` (listing) | `500` / `400` | Prose: `-0.01em`; Listing: `0.16em` uppercase |
| Subheading `h3` | `var(--serif)` | `1.05rem` | `600` | `margin: 2.25rem 0 0.5rem` |
| Body Prose `p` | `var(--serif)` | `1.0625rem` (17px) | `400` | `line-height: 1.7`, `font-optical-sizing: auto` |
| Row Title `.title` | `var(--serif)` | `1.05rem` – `1.12rem` | `500` | `line-height: 1.3`, `letter-spacing: -0.01em` |
| Blurb / Excerpt `.blurb` | `var(--serif)` | `0.92rem` | `400` | `color: var(--muted)`, `text-wrap: pretty` |
| Standfirst `.standfirst` | `var(--serif)` | `1.05rem` | `400` | `color: var(--muted)`, `text-wrap: pretty` |
| Eyebrow `.eyebrow` | `var(--mono)` | `0.7rem` | `400` | `0.16em`, uppercase, `color: var(--faint)` |
| Date / Route `.date` / `.route` | `var(--mono)` | `0.76rem` – `0.8rem` | `400` | `color: var(--muted)`, `tabular-nums` |
| Tag `.tag` | `var(--mono)` | `0.68rem` – `0.7rem` | `400` | `0.06em`, uppercase, `color: var(--faint)` |
| Tag Highlighted `.tag-liked` | `var(--mono)` | `0.68rem` – `0.7rem` | `400` | `color: var(--muted)` |
| Filter Input `#filter` | `var(--mono)` | `0.78rem` | `400` | `0.02em`, `color: var(--text)` |
| Counter Badge `.count` | `var(--mono)` | `0.7rem` | `400` | `tabular-nums`, `color: var(--faint)` |
| Inline Code `code` | `var(--mono)` | `0.82em` | `400` | `background: var(--accent-soft)`, `padding: .15em .4em` |
| Code Block `pre` | `var(--mono)` | `0.82rem` | `400` | `background: var(--surface)`, `border: 1px solid var(--border)` |

### Interactive States & Row Bleed
- Hover on list rows (`.row a:hover`, `.entry:hover`):
  ```css
  .entry:hover {
    background: var(--accent-soft);
    box-shadow: -1rem 0 0 var(--accent-soft), 1rem 0 0 var(--accent-soft);
  }
  .entry:hover .date,
  .entry:hover .tag {
    color: var(--accent);
  }
  ```
- Focus indicator:
  ```css
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
    border-radius: 2px;
  }
  ```

---

## 6. Layout Contract: `Doc.astro` Breakdown

`src/layouts/Doc.astro` is the single authoritative layout for public pages.

### Interface & Props Specification

```typescript
interface Props {
  title: string;                 // Page title for <title> and meta
  siteTitle: string;             // Global site title from pages.json
  description?: string;          // Meta description for SEO
  sourceUrl?: string | null;     // External source link in Chrome pill
  chrome?: boolean;              // Toggle floating "← Collection" pill (default: true)
  wide?: boolean;                // Toggle .shell--wide (58rem) vs default .shell (34rem)
  noindex?: boolean;             // Adds <meta name="robots" content="noindex, nofollow" />
  floatingShape?: boolean;       // Three.js wireframe icosahedron (default: true)
  smoothScroll?: boolean;        // GSAP ScrollSmoother (default: true)
  instrument?: boolean;          // Ambient 4-corner crop marks (default: true)
  prose?: boolean;               // Styles bare h1/h2/p/table in .shell--prose (default: true)
}
```

### Layout Modes Matrix

| Page Type | `wide` | `prose` | `chrome` | `floatingShape` | `smoothScroll` | `instrument` | Shell Max-Width |
|---|---|---|---|---|---|---|---|
| **Listing Pages** (`/`, `/pages`, `/tried`, `/blog`) | `true` | `true` | `false` | `true` | `true` | `true` | `58rem` (`--page`) |
| **Prose Detail Pages** (`/tried/[slug]`, `/blog/[slug]`) | `false` | `true` | `false` | `true` | `true` | `true` | `34rem` (`--measure`) |
| **Document Fragments** (`[...route].astro`) | `false` | `true` | `true` | `true` | `true` | `true` | `34rem` (`--measure`) |
| **Admin Application** (`/admin`) | `true` | `false` | `false` | `false` | `false` | `false` | `52rem` (custom sans) |

---

## 7. Navigation & Header/Footer Hierarchy

### Standard Masthead Header Pattern
Used on all top-level public pages (`index.astro`, `pages.astro`, `tried.astro`, and `blog.astro`):
```astro
<header>
  <div class="masthead">
    <p class="eyebrow">Blog</p>
    <nav>
      <a href={home}>About</a>
      <a href={collection}>Pages</a>
      <a href={routeHref('/tried')}>Tried</a>
      <ThemeToggle />
    </nav>
  </div>
  <h1>Writing</h1>
  <p class="standfirst">Thoughts on software architecture, systems engineering, and technical investigations.</p>
</header>
```

### Standard Detail Back-Breadcrumb Pattern
Used on single entry pages (`tried/[slug].astro` and `blog/[slug].astro`):
```astro
<p class="eyebrow"><a href={routeHref('/blog')}>&larr; Blog</a></p>
```

### Site Navigation Matrix

| Surface | Eyebrow Text / Link | Navigation Links (`<nav>`) | Back Pill (`Chrome.astro`) |
|---|---|---|---|
| `/` (About) | `{me.name}` (Himanshu Chavda) | `Pages`, `ThemeToggle` | Disabled (`chrome={false}`) |
| `/pages` (Collection) | `Pages` | `← About`, `ThemeToggle` | Disabled (`chrome={false}`) |
| `/tried` (Experiments) | `Tried` | `About`, `Pages`, `ThemeToggle` | Disabled (`chrome={false}`) |
| `/blog` (Blog Listing) | `Blog` | `About`, `Pages`, `Tried`, `ThemeToggle` | Disabled (`chrome={false}`) |
| `/tried/[slug]` | `← Tried` (link) | N/A | Disabled (`chrome={false}`) |
| `/blog/[slug]` | `← Blog` (link) | N/A | Disabled (`chrome={false}`) |
| Passthrough Document | N/A | N/A | Injected `#__collection_bar` (`← Collection`) |

---

## 8. Data Access & Offline Resilience Strategy (`.cache/`)

### Caching Architecture in `src/lib/buildCache.ts`
```typescript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_DIR = join(process.cwd(), '.cache');

export function readCache<T>(key: string): T | null {
  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(data, null, 2), 'utf8');
}
```

### Data Fetching Resilience Pattern (from `src/lib/tried.ts`)
1. **Build-Time Fetch**: Queries Supabase Postgres with publishable key (`is_public = true`).
2. **Cache Write**: On success, immediately caches sanitized rows to `.cache/<key>.json`.
3. **Resilience Fallback**: If network fails or Supabase returns an error, intercepts the error in `catch`, reads `.cache/<key>.json`, and returns cached rows without failing the static build.
4. **Deterministic Ordering**: Sorts newest first by date (`order('date', { ascending: false })`) with secondary tie-breaker (`order('created_at', { ascending: false })`).

---

## 9. Client-Side Search & Live Filtering Engine

### Matcher Specification (`src/lib/filter.ts`)
```typescript
export function matchesQuery(haystack: string, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  return words.every((word) => haystack.includes(word));
}
```
- Multi-token `AND` query logic.
- Order-independent matching across title, excerpt/blurb, tags, and category.

### UI Binding (`src/lib/filterUI.ts`)
- List rows contain `data-search` attribute populated with pre-lowercased space-delimited searchable tokens.
- On input event on `#filter`:
  - Iterates `#index .row`.
  - Sets `row.hidden = !match`.
  - Dynamically updates `#count.textContent = String(shown)`.
  - Toggles `#empty.hidden = (shown !== 0)`.

---

## 10. Concrete Blueprint for Blog Feature Implementation

Based on all mined patterns, the required implementation components for the Blog feature are:

### A. TypeScript Data Module (`src/lib/blog.ts`)

```typescript
import { supabase } from './supabaseClient';
import { routeHref } from './paths';
import { readCache, writeCache } from './buildCache';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  date: string;
  reading_time?: string;
  category?: string;
  tags: string[];
  cover_image?: { src: string; alt: string };
  href: string;
  search: string;
}

interface BlogDbRow {
  slug: string;
  title: string;
  excerpt: string;
  content: string | null;
  date: string;
  reading_time: string | null;
  category: string | null;
  tags: string[];
  cover_image_src: string | null;
  cover_image_alt: string | null;
}

function toBlogPost(row: BlogDbRow): BlogPost {
  const search = [
    row.title,
    row.excerpt,
    row.content ?? '',
    row.category ?? '',
    row.reading_time ?? '',
    ...row.tags
  ].join(' ').toLowerCase();

  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content ?? undefined,
    date: row.date,
    reading_time: row.reading_time ?? undefined,
    category: row.category ?? undefined,
    tags: row.tags ?? [],
    cover_image: row.cover_image_src ? { src: row.cover_image_src, alt: row.cover_image_alt ?? '' } : undefined,
    href: routeHref(`/blog/${row.slug}`),
    search,
  };
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, content, date, reading_time, category, tags, cover_image_src, cover_image_alt')
      .eq('is_public', true)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Could not load blog_posts from Supabase: ${error.message}`);
    }

    const posts = (data ?? []).map(toBlogPost);
    writeCache('blog_posts', posts);
    return posts;
  } catch (err: any) {
    const cached = readCache<BlogPost[]>('blog_posts');
    if (cached) {
      return cached;
    }
    throw new Error(`Could not load blog_posts from Supabase: ${err?.message || err}`);
  }
}
```

### B. Blog Listing Page (`src/pages/blog.astro`)

```astro
---
import Doc from '../layouts/Doc.astro';
import ThemeToggle from '../components/ThemeToggle.astro';
import { loadRegistry } from '../../tools/registry.mjs';
import { home, collection, routeHref } from '../lib/paths';
import { getBlogPosts } from '../lib/blog';

import '../styles/masthead.css';
import '../styles/listing.css';

const { site } = await loadRegistry();
const posts = await getBlogPosts();
---

<Doc
  title="Blog"
  siteTitle={site.title}
  description="Thoughts on software engineering, distributed systems, and technical experiments."
  chrome={false}
  wide
>
  <header>
    <div class="masthead">
      <p class="eyebrow">Blog</p>
      <nav>
        <a href={home}>About</a>
        <a href={collection}>Pages</a>
        <a href={routeHref('/tried')}>Tried</a>
        <ThemeToggle />
      </nav>
    </div>
    <h1>Writing</h1>
    <p class="standfirst">Longer-form essays, deep dives into systems architecture, and engineering notes.</p>
  </header>

  <div class="controls">
    <input id="filter" type="search" placeholder="Filter by title, tag, or topic" aria-label="Filter posts" autocomplete="off" />
    <span class="count" id="count">{posts.length}</span>
  </div>

  <ol class="rows" id="index">
    {
      posts.map((post) => (
        <li class="row" data-search={post.search}>
          <a class="entry" href={post.href}>
            <span class="date">{post.date}</span>
            <span class="body">
              <span class="title">{post.title}</span>
              {post.excerpt && <span class="blurb">{post.excerpt}</span>}
              {post.tags.length > 0 && <span class="domains">{post.tags.join(' · ')}</span>}
            </span>
            <span class="tags">
              {post.category && <span class="tag">{post.category}</span>}
              {post.reading_time && <span class="tag tag-liked">{post.reading_time}</span>}
            </span>
          </a>
        </li>
      ))
    }
  </ol>

  <p class="empty" id="empty" hidden>No posts match that.</p>
</Doc>

<script>
  import { initFilter } from '../lib/filterUI';
  initFilter();
</script>

<style>
  .title {
    font-size: 1.05rem;
    color: var(--text);
  }

  .domains {
    font-family: var(--mono);
    font-size: .68rem;
    letter-spacing: .04em;
    color: var(--faint);
  }
</style>
```

### C. Blog Post Detail Page (`src/pages/blog/[slug].astro`)

```astro
---
import Doc from '../../layouts/Doc.astro';
import { loadRegistry } from '../../../tools/registry.mjs';
import { resolveImage, routeHref } from '../../lib/paths';
import { getBlogPosts, type BlogPost } from '../../lib/blog';

export async function getStaticPaths() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}

const { post } = Astro.props as { post: BlogPost };
const { site } = await loadRegistry();

const hasContent = Boolean(post.content?.trim());
---

<Doc title={post.title} siteTitle={site.title} description={post.excerpt} chrome={false}>
  <p class="eyebrow"><a href={routeHref('/blog')}>&larr; Blog</a></p>

  <div class="meta">
    <span class="date">{post.date}</span>
    {post.category && <span class="tag">{post.category}</span>}
    {post.reading_time && <span class="tag tag-liked">{post.reading_time}</span>}
  </div>

  <h1>{post.title}</h1>

  {post.tags.length > 0 && <p class="domains">{post.tags.join(' · ')}</p>}

  {
    post.cover_image && (
      <img class="cover" src={resolveImage(post.cover_image.src)} alt={post.cover_image.alt} loading="lazy" decoding="async" />
    )
  }

  {
    hasContent ? (
      <div class="prose" set:html={post.content} />
    ) : (
      <div class="prose">
        <p>{post.excerpt}</p>
      </div>
    )
  }
</Doc>

<style>
  .eyebrow {
    margin: 0 0 2rem;
    font-family: var(--mono);
    font-size: .7rem;
    letter-spacing: .16em;
    text-transform: uppercase;
  }

  .eyebrow a {
    color: var(--faint);
    text-decoration: none;
    transition: color .15s ease;
  }

  .eyebrow a:hover {
    color: var(--accent);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: .8rem;
  }

  .date {
    font-family: var(--mono);
    font-size: .78rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .tag {
    font-family: var(--mono);
    font-size: .7rem;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--faint);
  }

  .tag-liked {
    color: var(--muted);
  }

  h1 {
    margin: 0 0 .6rem;
  }

  .domains {
    margin: 0 0 2.5rem;
    font-family: var(--mono);
    font-size: .74rem;
    letter-spacing: .04em;
    color: var(--faint);
  }

  .cover {
    display: block;
    width: 100%;
    height: auto;
    margin: 0 0 2.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  .prose :global(p) {
    margin: 0 0 1.1em;
    color: var(--muted);
    text-wrap: pretty;
  }

  .prose :global(p:first-child) {
    font-size: 1.05rem;
  }

  .prose :global(p:last-child) {
    margin-bottom: 0;
  }

  .prose :global(a) {
    color: inherit;
    text-decoration-color: var(--border-strong);
  }

  .prose :global(a:hover) {
    text-decoration-color: var(--accent);
  }

  .prose :global(strong) {
    color: var(--text);
    font-weight: 600;
  }

  .prose :global(ul),
  .prose :global(ol) {
    margin: 0 0 1.1em;
    padding-left: 1.2rem;
    color: var(--muted);
  }

  .prose :global(h2),
  .prose :global(h3) {
    color: var(--text);
    margin: 1.5em 0 .6em;
  }

  .prose :global(pre) {
    font-family: var(--mono);
    font-size: .82rem;
    line-height: 1.7;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 1rem 1.1rem;
    overflow-x: auto;
    margin: 1.5rem 0;
  }
</style>
```

---

## 11. Conclusion & Recommendations

1. **Strict Design Adherence**: The public blog pages must strictly follow the "directory, not dashboard" aesthetic. Do not add card borders or elevated box-shadows.
2. **Resilience Contract**: `src/lib/blog.ts` must use `readCache` and `writeCache` via `.cache/blog_posts.json` identically to `src/lib/tried.ts`.
3. **Route Safety**: Update `tools/registry.mjs` to reserve `/blog` so users cannot register colliding routes in `pages.json`.
4. **Scoping Requirement**: All dynamic HTML rendered via `set:html` inside `.prose` must use `:global(...)` descendant selectors.
