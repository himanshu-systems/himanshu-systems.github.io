## 2026-08-29T10:26:33Z

You are Worker for Milestone 2 (Public Data Layer & Astro Pages).
Read ORIGINAL_REQUEST.md at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\ORIGINAL_REQUEST.md`.
Read `PROJECT.md` at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\PROJECT.md`.
Read `DESIGN.md` and `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\rules\strict_design.md`.
Read Spec Miner findings at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_spec_miner_survey_pages\analysis.md`.
Read Schema findings at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_explorer_survey_schema\analysis.md`.
Read `src/lib/tried.ts`, `src/lib/buildCache.ts`, `src/layouts/Doc.astro`, `src/pages/tried.astro`, `src/pages/pages.astro`, `src/pages/index.astro`, and `src/styles/tokens.css`.

Your working directory is: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_worker_m2`
Project workspace: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn`

Write ownership:
You exclusively own:
- `src/lib/blog.ts`
- `.cache/blog_posts.json`
- `src/pages/blog.astro`
- `src/pages/blog/[slug].astro`
- Masthead navigation updates in `src/pages/index.astro`, `src/pages/pages.astro`, `src/pages/tried.astro`, `src/pages/admin.astro`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
1. Implement `src/lib/blog.ts`:
   - Define interfaces `BlogPostRow` and `BlogPost` per `PROJECT.md` § Interface Contracts.
   - Implement `toPost(row: BlogPostRow): BlogPost` mapping fields, formatting date, setting `href: routeHref('/blog/' + row.slug)`, constructing `search` string for live filtering, and setting `image: { src: row.image_src, alt: row.image_alt || row.title }`.
   - Implement `getBlogPosts(): Promise<BlogPost[]>`: query Supabase `blog_posts` table `.eq('published', true).order('date', { ascending: false }).order('created_at', { ascending: false })`, on success cache with `writeCache('blog_posts', rows)`, on error fall back to `readCache<BlogPostRow[]>('blog_posts')`.
   - Implement `getBlogPostBySlug(slug: string): Promise<BlogPost | null>`: fetch from `getBlogPosts()` and find matching post.
2. Create `.cache/blog_posts.json`:
   - Seed with the 3 realistic articles from `supabase/blog_schema.sql` (in `BlogPostRow` format with `published: true`) so that Astro static builds succeed offline.
3. Implement `src/pages/blog.astro`:
   - Use `<Doc title="Blog" siteTitle={site.title} description="..." chrome={false} wide={true} prose={false}>`.
   - Masthead with links: `About`, `Pages`, `Tried`, `Blog`, and `<ThemeToggle />`.
   - Search filter `#filter` and count element `.count#count` wired with `initFilter()` from `src/lib/filterUI.ts`.
   - Strict design conformance: directory list layout, flat rows, 1px hairlines (`border-top: 1px solid var(--border)`), Source Serif 4 headings/excerpts, IBM Plex Mono dates/tags/counts, `--accent` on hover tint only (`.entry:hover { background: var(--accent-soft); }`).
4. Implement `src/pages/blog/[slug].astro`:
   - `export async function getStaticPaths()` returning all published posts.
   - Use `<Doc title={post.title} siteTitle={site.title} description={post.description} chrome={false} wide={false} prose={true}>`.
   - Backlink `<p class="eyebrow"><a href={routeHref('/blog')}>← Blog</a></p>`.
   - Metadata header (title in serif 500, date/reading_time/tags in mono), optional cover image if `post.image` exists.
   - Rich content rendering `<div class="prose" set:html={post.content} />` with `:global(.prose ...)` styling for headings, paragraphs, lists, code, quotes, and images.
5. Update Masthead navigation in `src/pages/index.astro`, `src/pages/pages.astro`, `src/pages/tried.astro`, `src/pages/admin.astro` to include `<a href={routeHref('/blog')}>Blog</a>`.
6. Run Astro check / build to verify clean compilation with no TypeScript or markup errors.

Write your report to `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_worker_m2\handoff.md` with build verification results. Send a message to parent when done.
