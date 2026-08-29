## 2026-08-29T10:24:00Z

You are Worker for Milestone 1 (Database Schema & Route Registry Protection).
Read ORIGINAL_REQUEST.md at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\ORIGINAL_REQUEST.md`.
Read `PROJECT.md` at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\PROJECT.md`.
Read Explorer 1 findings at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_explorer_survey_schema\analysis.md`.
Read `supabase/schema.sql`, `supabase/site_content.sql`, `supabase/storage.sql`, `supabase/README.md`, and `tools/registry.mjs`.

Your working directory is: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_worker_m1`
Project workspace: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn`

Write ownership:
You exclusively own `supabase/blog_schema.sql` and `tools/registry.mjs`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
1. Create `supabase/blog_schema.sql`:
   - Define table `public.blog_posts` (`id uuid primary key default gen_random_uuid()`, `slug text not null unique`, `title text not null`, `description text`, `content text not null default ''`, `date date not null default current_date`, `tags text[] not null default '{}'`, `reading_time text`, `image_src text`, `image_alt text`, `published boolean not null default false`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`).
   - Trigger `blog_posts_set_updated_at` on update using `public.set_updated_at()`.
   - Enable Row Level Security (`alter table public.blog_posts enable row level security;`).
   - RLS Policies:
     - `blog_posts_public_read`: `for select using (published = true or (auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com');`
     - `blog_posts_owner_write`: `for all using ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com') with check ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com');`
   - Indexes: composite index `blog_posts_published_date_idx on public.blog_posts (published, date desc, created_at desc);`, unique index on `slug`, and GIN index on `tags`.
   - Seed posts: Insert at least 2 realistic, high-quality sample blog posts authored by Himanshu (e.g. on building resilient static sites, HTML/web fundamentals, or design systems).
2. Update `tools/registry.mjs`:
   - Add `'/blog'` to `RESERVED` map (`'/blog': 'the blog collection index'`).
   - Add route collision guard for `/blog/*` in `normalizePage` matching the `/tried/*` guard.
3. Verify syntax and test changes with node / registry commands if needed.

Write your report to `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_worker_m1\handoff.md` with build/verification commands and results. Send a message to parent when done.
