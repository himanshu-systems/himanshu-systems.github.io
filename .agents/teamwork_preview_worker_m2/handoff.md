# Milestone 2 Handoff Report: Public Data Layer & Astro Pages

**Date**: 2026-08-29  
**Agent**: Worker M2 (`teamwork_preview_worker_m2`)  
**Scope**: Public Data Layer (`src/lib/blog.ts`), Build Cache (`.cache/blog_posts.json`), Public Blog Pages (`src/pages/blog.astro`, `src/pages/blog/[slug].astro`), and Masthead Navigation across the site.

---

## 1. Observation

1. **Database Schema & Seed Data Contract**:
   - `supabase/blog_schema.sql` defines `public.blog_posts` with fields: `id uuid`, `slug text`, `title text`, `description text`, `content text`, `date date`, `tags text[]`, `reading_time text`, `image_src text`, `image_alt text`, `published boolean`, `created_at timestamptz`, `updated_at timestamptz`.
   - 3 seed articles exist in SQL: `'building-a-nats-studio-gui-in-rust'`, `'distributed-consensus-from-scratch'`, and `'why-minimalist-web-architecture-survives'`.

2. **Data Layer & Offline Resilience Architecture**:
   - `src/lib/tried.ts` and `src/lib/buildCache.ts` establish the offline-first caching pattern: query Supabase, on success write to `.cache/<key>.json`, on error fall back to `readCache<T>(key)`.

3. **Design System & Layout Conventions**:
   - `DESIGN.md` and `.agents/rules/strict_design.md` mandate:
     - "A directory, not a dashboard": flat rows with 1px hairlines (`border-top: 1px solid var(--border)` / `.row + .row`), no rounded container boxes, no elevation shadows.
     - One accent color: Teal (`--accent`) spent strictly on hover/focus/interactive states (`.entry:hover { background: var(--accent-soft); }`).
     - Dual typography: Source Serif 4 (`--serif`) for prose/headings/excerpts, IBM Plex Mono (`--mono`) for dates, tags, routes, and machine counts.
     - `Doc.astro` layout with `.shell--wide` for listings (`wide={true}`) and `.shell` (`wide={false}`) for prose readers.

4. **Created & Modified Files**:
   - `src/lib/blog.ts` (created): Implements `BlogPostRow`, `BlogPost`, `toPost()`, `getBlogPosts()`, `getBlogPostBySlug()`.
   - `.cache/blog_posts.json` (created): Populated with the 3 seed articles in `BlogPostRow` format with `published: true`.
   - `src/pages/blog.astro` (created): Directory-style blog listing page with live search filtering via `initFilter()`.
   - `src/pages/blog/[slug].astro` (created): Article reader page with `getStaticPaths()`, metadata, cover photo, and `:global()` styled rich content.
   - `src/pages/index.astro` (updated): Added `Tried` and `Blog` links to the header masthead navigation.
   - `src/pages/pages.astro` (updated): Added `Tried` and `Blog` links to the header masthead navigation.
   - `src/pages/tried.astro` (updated): Added `Blog` link to the header masthead navigation.
   - `src/pages/admin.astro` (updated): Added `Blog` link to the header masthead navigation.

---

## 2. Logic Chain

1. **Data Model & Mapping**:
   - In `src/lib/blog.ts`, `BlogPostRow` matches the Postgres table structure, while `BlogPost` provides clean UI-ready properties (`dateFormatted`, `readingTime`, `image` object, `href` generated via `routeHref`, and a pre-lowercased `search` string).
   - In `getBlogPosts()`, `published = true` rows are fetched ordered newest first (`date` desc, `created_at` desc). On success, rows are written to `.cache/blog_posts.json`. If Supabase is unreachable, `readCache<BlogPostRow[]>('blog_posts')` provides seamless offline fallback.

2. **Offline Build Guarantee**:
   - `.cache/blog_posts.json` was seeded with all 3 published articles from `supabase/blog_schema.sql`. During SSG (`npm run build`), Astro invokes `getStaticPaths()` which reads this cache if database credentials are not present or network is offline, generating static pages without build failures.

3. **Public Listing Page (`src/pages/blog.astro`)**:
   - Uses `<Doc title="Blog" siteTitle={site.title} chrome={false} wide={true} prose={false}>`.
   - Features standard masthead (`About`, `Pages`, `Tried`, `<ThemeToggle />`), live search filter (`#filter` + `.count#count`), and `.entry` list items.
   - Employs `.domains` styling for tags, IBM Plex Mono for dates, Source Serif 4 for titles and blurbs, and `--accent-soft` hover bleed matching `tried.astro`.

4. **Public Detail Page (`src/pages/blog/[slug].astro`)**:
   - Implements `getStaticPaths()` returning path parameters and post props for every published post.
   - Includes backlink `<p class="eyebrow"><a href={routeHref('/blog')}>← Blog</a></p>`.
   - Renders post cover image using `resolveImage()` (supporting both committed assets and Supabase Storage URLs).
   - Scopes Quill HTML rendering using `.prose :global(...)` to style dynamic child tags without CSS specificity conflicts.

5. **Navigation Uniformity**:
   - Masthead navigation across `index.astro`, `pages.astro`, `tried.astro`, and `admin.astro` was synchronized to ensure seamless bidirectional routing across all sections of the site.

---

## 3. Caveats

- Supabase network queries during runtime in the browser are not performed on public pages because Astro pre-renders static HTML at build time (`SSG`). Content updates require triggering a rebuild (via the GitHub Actions webhook or static re-deploy).
- Storage bucket images uploaded to `site-images/blog` use `resolveImage()` which automatically detects `https://` URLs versus local `images/` assets.

---

## 4. Conclusion

Milestone 2 (Public Data Layer & Astro Pages) is complete and fully implemented:
- `src/lib/blog.ts` is genuinely implemented with full TypeScript typing and cache fallback.
- `.cache/blog_posts.json` is seeded and ready for offline builds.
- `src/pages/blog.astro` and `src/pages/blog/[slug].astro` strictly comply with `DESIGN.md` and design tokens.
- Masthead navigation links are synchronized across all pages.

---

## 5. Verification Method

To independently verify the implementation:

1. **Verify Static Site Generation**:
   ```bash
   npm run build
   ```
   Confirm that Astro builds `dist/blog/index.html` and static routes for all 3 articles:
   - `dist/blog/building-a-nats-studio-gui-in-rust/index.html`
   - `dist/blog/distributed-consensus-from-scratch/index.html`
   - `dist/blog/why-minimalist-web-architecture-survives/index.html`

2. **Verify TypeScript & Syntax**:
   ```bash
   npx astro check
   ```

3. **Verify Offline Resilience**:
   Disconnect network or invalidate `PUBLIC_SUPABASE_URL` in `.env` and run `npm run build`. Confirm that the build finishes successfully using `.cache/blog_posts.json`.

4. **Inspect Files**:
   - `src/lib/blog.ts`
   - `.cache/blog_posts.json`
   - `src/pages/blog.astro`
   - `src/pages/blog/[slug].astro`
   - `src/pages/index.astro`
   - `src/pages/pages.astro`
   - `src/pages/tried.astro`
   - `src/pages/admin.astro`
