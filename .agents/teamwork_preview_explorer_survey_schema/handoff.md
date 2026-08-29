# Handoff Report: Supabase Schema & Database Architecture Survey

## 1. Observation

Direct observations from examining the codebase:

1. **Existing Tables and Policies**:
   - `supabase/schema.sql` (lines 6-21) defines `public.tried_entries` with `id uuid primary key default gen_random_uuid()`, `slug text not null unique`, `date date not null`, `title text not null`, `note text not null`, `description text`, `image_src text`, `image_alt text`, `outcome text`, `liked text`, `tags text[]`, `is_public boolean`, `created_at`, and `updated_at`.
   - `supabase/schema.sql` (lines 24-38) defines trigger `tried_entries_set_updated_at` calling function `public.set_updated_at()`.
   - `supabase/schema.sql` (lines 45-65) enables RLS and defines policies:
     - `tried_entries_public_read` using `is_public = true or (auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com'`.
     - `tried_entries_owner_write` for `all` using/checking `(auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com'`.
   - `supabase/site_content.sql` (lines 5-50) defines singleton table `public.site_content` (`id int primary key`, `check (id = 1)`) with `updated_at` trigger, public read policy, and owner-write policy for `himanshuchavdacodes@gmail.com`.
   - `supabase/storage.sql` (lines 7-27) defines public storage bucket `site-images` with public read and owner-only write policy for `himanshuchavdacodes@gmail.com`.
   - `supabase/README.md` (lines 24-70) documents owner email `himanshuchavdacodes@gmail.com`, publishable key env variables, and webhook dispatch events (`Insert, Update, Delete` triggering GitHub Actions `content-updated`).

2. **Supabase Client and Caching**:
   - `src/lib/supabaseClient.ts` (lines 10-13) creates a single Supabase client with `import.meta.env.PUBLIC_SUPABASE_URL` and `import.meta.env.PUBLIC_SUPABASE_KEY`.
   - `src/lib/buildCache.ts` (lines 6-19) provides `readCache<T>(key)` and `writeCache<T>(key, data)` operating on `.cache/${key}.json`.
   - `src/lib/tried.ts` (lines 65-88) fetches rows from Supabase, writes to `.cache/tried_entries.json`, and catches errors with fallback to `readCache('tried_entries')`.

3. **Admin CMS Integration**:
   - `src/pages/admin.astro` (lines 50-54, 154-245, 249-323) sets up tabs (`about`, `tried`), rich text editing using `createRichEditor('f-description-editor')`, image uploading using `wireImageUpload(...)`, and auth lifecycle using `initAuth(...)`.
   - `src/lib/admin/triedEditor.ts` (lines 21-233) implements table rendering, CRUD operations, public toggling, and slug generation via `uniqueSlug()`.
   - `src/lib/admin/imageUpload.ts` (lines 12-24) uploads files to `site-images/${folder}/${Date.now()}-${safeName}` and returns the public URL.

4. **Route Registry Protection**:
   - `tools/registry.mjs` (lines 84-89, 151-156) protects `RESERVED` routes (`'/'`, `'/pages'`, `'/tried'`, `'/admin'`) and throws an error if any entry in `pages.json` attempts to claim `/tried/*`.

---

## 2. Logic Chain

1. **Security & Identity Consistency**: Since all existing tables (`tried_entries`, `site_content`, `storage.objects`) restrict write access to `(auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com'`, the new `public.blog_posts` table must use the exact same RLS condition for write operations and public/owner read operations (Observation 1).
2. **Schema & Media Storage**: The table `public.blog_posts` requires columns `id` (UUID), `slug` (unique text), `title` (text), `description` (text), `content` (text / rich HTML), `date` (date), `tags` (text[]), `reading_time` (text), `image_src` (text), `image_alt` (text), `published` (boolean), `created_at` (timestamptz), and `updated_at` (timestamptz). The existing `site-images` bucket handles uploaded media under the `blog/` folder prefix without any storage schema modifications (Observations 1, 3).
3. **Trigger & Performance**: The table should reuse the existing `public.set_updated_at()` trigger function. For query efficiency during static builds and admin searches, composite indexes on `(published, date desc, created_at desc)` and a GIN index on `tags` should be created (Observation 1).
4. **Offline Resilience**: The static build requires `src/lib/blog.ts` to follow the exact pattern in `src/lib/tried.ts`, caching records in `.cache/blog_posts.json` and falling back to it on network failure (Observation 2).
5. **Admin CMS Integration**: The `/admin` interface requires a third tab (`Blog posts`), a dedicated editor module `src/lib/admin/blogEditor.ts` following `triedEditor.ts`, rich text editing via `createRichEditor`, and photo uploads via `wireImageUpload` (Observation 3).
6. **Route Collision Prevention**: Registering `/blog` in `RESERVED` and checking `route.startsWith('/blog/')` in `tools/registry.mjs` ensures consistency with the `/tried` route handling (Observation 4).

---

## 3. Caveats

- **Supabase Local vs Cloud Execution**: Schema files in `supabase/` are SQL migration scripts executed in the Supabase Dashboard SQL Editor or Supabase CLI; they cannot be automatically applied to the remote cloud database without user credentials or CLI links.
- **Email Literal**: The RLS policy uses `'himanshuchavdacodes@gmail.com'`. If the user changes their admin login email, the policy must be updated in Supabase to match.

---

## 4. Conclusion

A complete, self-contained, idempotent SQL schema file `supabase/blog_schema.sql` has been designed and specified in `analysis.md`. It includes:
- Table: `public.blog_posts`
- Trigger: `blog_posts_set_updated_at`
- Row Level Security (RLS) policies for anonymous read of `published = true` and full owner CRUD for `himanshuchavdacodes@gmail.com`
- Composite & GIN indexes
- High-quality seed posts matching author's background
- TypeScript client architecture (`src/lib/blog.ts`) with `.cache/` offline persistence
- Admin CMS integration specifications (`src/lib/admin/blogEditor.ts` & `src/pages/admin.astro`)

---

## 5. Verification Method

1. **Inspect Analysis Report**:
   - Check `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_explorer_survey_schema\analysis.md` for the complete SQL migration code and TypeScript data models.
2. **Schema Syntax Verification**:
   - Validate SQL statements for PostgreSQL 14+ syntax compliance (idempotent `create table if not exists`, `drop policy if exists`, `create policy`, `on conflict do nothing`).
3. **Build & Type Checking** (when implemented):
   - Command: `npm run build` or `npx astro check`
   - Invalidation conditions: If table column names mismatch between `src/lib/blog.ts` and `supabase/blog_schema.sql`, or if RLS policies block the build-time publishable key.
