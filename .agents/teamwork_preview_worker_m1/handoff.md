# Milestone 1 Handoff Report: Database Schema & Route Registry Protection

## 1. Observation
- Created file `supabase/blog_schema.sql` (109 lines) defining:
  - Table `public.blog_posts` with columns: `id` (uuid default `gen_random_uuid()`), `slug` (text unique), `title` (text), `description` (text), `content` (text default `''`), `date` (date default `current_date`), `tags` (text[] default `'{}'`), `reading_time` (text), `image_src` (text), `image_alt` (text), `published` (boolean default `false`), `created_at` (timestamptz default `now()`), and `updated_at` (timestamptz default `now()`).
  - Trigger function `public.set_updated_at()` and before-update trigger `blog_posts_set_updated_at`.
  - Row Level Security enabled on `public.blog_posts`.
  - Policy `blog_posts_public_read` allowing select on `published = true or (auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com'`.
  - Policy `blog_posts_owner_write` allowing all actions for authenticated users with `(auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com'`.
  - Indexes: composite `blog_posts_published_date_idx (published, date desc, created_at desc)`, unique index `blog_posts_slug_idx (slug)`, and GIN index `blog_posts_tags_idx (tags)`.
  - Seed posts: 3 realistic posts ('building-a-nats-studio-gui-in-rust', 'distributed-consensus-from-scratch', 'why-minimalist-web-architecture-survives') with `on conflict (slug) do nothing;`.
- Modified `tools/registry.mjs`:
  - Added prefix guard `if (route.startsWith('/blog/'))` in `normalizePage` (lines 90-95).
  - Added `'/blog': 'the blog collection index'` to `RESERVED` map (lines 157-163).
- Ran Node.js import check on `tools/registry.mjs`:
  - `RESERVED` keys output: `[ '/', '/pages', '/tried', '/blog', '/admin' ]`
  - `loadRegistry()` returned 9 valid pages.

## 2. Logic Chain
1. `supabase/blog_schema.sql` matches the exact architecture of existing tables (`supabase/schema.sql` and `supabase/site_content.sql`), ensuring strict compatibility with Supabase PostgreSQL, RLS policies tied to `himanshuchavdacodes@gmail.com`, and automatic timestamp updates.
2. The schema columns (`id`, `slug`, `title`, `description`, `content`, `date`, `tags`, `reading_time`, `image_src`, `image_alt`, `published`, `created_at`, `updated_at`) directly satisfy the interface contract specified in `PROJECT.md` § Interface Contracts.
3. Updating `tools/registry.mjs` prevents collisions between custom Astro blog routes (`/blog` and `/blog/[slug]`) and documents registered in `pages.json`. If a user attempts to register a page at `/blog` or `/blog/*` in `pages.json`, `loadRegistry()` will fail fast with a descriptive error.
4. The schema seed entries provide initial content matching Himanshu's portfolio theme for downstream Astro pages and `.cache/blog_posts.json` offline fallback generation in Milestone 2.

## 3. Caveats
- The SQL script is designed to be executed in the Supabase SQL Editor. When deployed to a live Supabase instance, database webhooks for `public.blog_posts` should be configured as described in `supabase/README.md` to trigger GitHub Actions on post publish/update/delete.
- `pages.json` currently contains 9 entries; none collide with `/blog` or `/blog/*`.

## 4. Conclusion
Milestone 1 is complete and verified. `supabase/blog_schema.sql` is ready for database deployment and caching integration, and `tools/registry.mjs` enforces route reservation for `/blog` and `/blog/*`.

## 5. Verification Method
1. Inspect `supabase/blog_schema.sql` to verify table definition, RLS policies, trigger, indexes, and seed statements:
   ```bash
   cat supabase/blog_schema.sql
   ```
2. Verify `tools/registry.mjs` reservation and loading:
   ```bash
   node -e "import('./tools/registry.mjs').then(async ({ loadRegistry, RESERVED }) => { console.log(RESERVED); const r = await loadRegistry(); console.log('Pages count:', r.pages.length); })"
   ```
   Expected output contains `'/blog': 'the blog collection index'` in RESERVED and prints 9 pages.
