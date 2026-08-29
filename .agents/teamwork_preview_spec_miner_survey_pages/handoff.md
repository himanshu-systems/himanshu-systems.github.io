# Handoff Report: Public Astro Pages & Design System Specification

**Agent**: Spec Miner (Public Astro Pages & Design System Specialist)  
**Handoff Type**: Hard (Task Complete)  
**Date**: 2026-08-29  

---

## 1. Observation

1. **Design System and Strict Constraints (`DESIGN.md`, `.agents/rules/strict_design.md`)**:
   - `DESIGN.md:9-14`: "A directory, not a dashboard. The index is a list of routes, set like an index at the back of a book: the route itself is the visual anchor, in monospace, in the left column. Nothing floats, nothing is in a card, nothing has a shadow. Structure comes from alignment and hairlines, not from boxes."
   - `DESIGN.md:18-25`: "1. One accent, spent only on state. Teal appears on hover, focus and active — never as decoration. 2. Hairlines instead of containers. A 1px rule between rows carries the same grouping a card does, at a fraction of the visual noise. 3. Type does the ranking. Serif for reading, mono for machine facts..."
   - `DESIGN.md:40-50`: Tokens table defines `--bg`, `--surface`, `--border`, `--border-strong`, `--text`, `--muted`, `--faint`, `--accent` (`#0b7a6e` light, `#4ecbb8` dark), `--accent-soft` (`#e6f2f0` light, `#12241f` dark).
   - `DESIGN.md:149-152`: Layout widths: `--measure: 34rem` (prose), `--page: 58rem` (index/listing). Single breakpoint at `46rem`.
   - `DESIGN.md:200-205`: Hover tint uses `.entry:hover { background: var(--accent-soft); box-shadow: -1rem 0 0 var(--accent-soft), 1rem 0 0 var(--accent-soft); }`.

2. **Layout Contract (`src/layouts/Doc.astro`)**:
   - `Doc.astro:10-33`: Props include `title`, `siteTitle`, `description`, `sourceUrl`, `chrome` (default `true`), `wide` (default `false`), `noindex` (default `false`), `floatingShape` (default `true`), `smoothScroll` (default `true`), `instrument` (default `true`), `prose` (default `true`).
   - `Doc.astro:49`: `shellClass = ['shell', wide && 'shell--wide', prose && 'shell--prose'].filter(Boolean).join(' ')`.
   - `Doc.astro:66-68`: Injects `<ThemeInit />` and conditionally `<ScrollInit />`.
   - `Doc.astro:103-129`: Ambient instrument crop marks in 4 corners (`body.instrument::after`) drawn in `var(--accent)`.

3. **Data Layer and Fallback Caching Strategy (`src/lib/tried.ts`, `src/lib/buildCache.ts`)**:
   - `src/lib/buildCache.ts:4-19`: `readCache<T>(key)` reads from `process.cwd()/.cache/<key>.json` with `existsSync` and `JSON.parse` in try/catch. `writeCache<T>(key, data)` creates directory and writes pretty-printed JSON.
   - `src/lib/tried.ts:65-87`: `getTriedRows()` queries Supabase `tried_entries` table with `.eq('is_public', true).order('date', { ascending: false }).order('created_at', { ascending: false })`. On success, writes `writeCache('tried_entries', rows)`. On catch, reads `readCache<TriedRow[]>('tried_entries')` and returns it, surviving Supabase outages during build.
   - `src/lib/tried.ts:34-52`: `toRow()` builds lowercased `search` string, resolves `href: routeHref(`/tried/${row.slug}`)`, and structures image `{ src, alt }`.

4. **Navigation & Headers (`src/styles/masthead.css`, `src/pages/tried.astro`, `src/pages/pages.astro`)**:
   - Top-level masthead (`.masthead`) uses uppercase mono `.eyebrow`, `<nav>` links (`About`, `Pages`, `Tried`, `ThemeToggle`), `h1`, and `.standfirst`.
   - Listing page uses `.controls` with `#filter` input and `.count#count`, wired to `initFilter()` from `src/lib/filterUI.ts`.

5. **Route Reservation (`tools/registry.mjs`)**:
   - `tools/registry.mjs:151-156`: `RESERVED = { '/': 'the about page', '/pages': 'the generated collection index', '/tried': 'the experiments log', '/admin': 'the admin page' }`.
   - `tools/registry.mjs:84-89`: Blocks registration of `/tried/*` routes in `pages.json`.

---

## 2. Logic Chain

1. **Design System Conformance**: The user request and project guidelines strictly demand the "directory, not dashboard" aesthetic. Any new public pages for Blog (`src/pages/blog.astro` and `src/pages/blog/[slug].astro`) must adhere to this: flat rows separated by 1px hairlines (`border-top: 1px solid var(--border)` between `.row + .row`), `--serif` for headings (weight 500) and excerpts, `--mono` for dates, tags, and categories, and single accent `--accent` / `--accent-soft` for hover states and focus rings.
2. **Layout Sizing**:
   - The listing page (`blog.astro`) displays a 3-column or 2-column list of articles and should use `wide` (`.shell--wide`, max-width `58rem`), `chrome={false}`, and masthead header with filter bar.
   - The detail page (`blog/[slug].astro`) is a reading document and should use default prose width (`34rem` `--measure`), `chrome={false}`, and back-link breadcrumb `<p class="eyebrow"><a href={routeHref('/blog')}>← Blog</a></p>`.
3. **Data Resilience**: Static builds run at deploy time and must not fail if Supabase is temporarily unreachable. `src/lib/blog.ts` must replicate `src/lib/tried.ts`'s caching pattern using `readCache('blog_posts')` and `writeCache('blog_posts', posts)`.
4. **Rich Content Rendering**: Rich text authored in Quill in `/admin` contains raw HTML. In `blog/[slug].astro`, it must be rendered via `<div class="prose" set:html={post.content} />` and styled with `:global(...)` child selectors to penetrate Astro's scoping barrier.
5. **Collision Protection**: Adding `/blog` and `/blog/*` requires updating `RESERVED` and `normalizePage` in `tools/registry.mjs` to prevent collisions with `pages.json`.

---

## 3. Caveats

- **Supabase Connectivity at Build Time**: If Supabase is unreachable and no `.cache/blog_posts.json` exists initially, the build will throw. The implementer should ensure a pre-seeded `.cache/blog_posts.json` exists or Supabase is connected during initial build.
- **Admin Specificity**: `/admin` uses `prose={false}` and its own system sans typography. The public blog pages must use `prose={true}` and standard token styles.
- **No other caveats.**

---

## 4. Conclusion

The specification for public Astro pages, design constraints, and data caching resilience is fully probed and documented in `analysis.md`. The exact blueprint for `src/lib/blog.ts`, `src/pages/blog.astro`, `src/pages/blog/[slug].astro`, and registry updates is ready for implementation by the builder agents.

---

## 5. Verification Method

To verify the analysis and contracts:
1. Inspect `analysis.md` at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_spec_miner_survey_pages\analysis.md`.
2. Inspect `DESIGN.md` and `src/styles/tokens.css` to verify token names and values.
3. Inspect `src/lib/tried.ts` and `src/lib/buildCache.ts` to verify caching logic.
4. Run `npm run check` or `npx astro check` to verify TypeScript interfaces.
