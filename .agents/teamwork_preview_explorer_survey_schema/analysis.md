# Database Schema & CMS Investigation Report: Blog Collection Integration

**Date**: 2026-08-29  
**Agent**: Explorer 1 (Schema & DB Specialist)  
**Target Repository**: `HTML-DOCS-TO-Learn` (`himanshu-systems.github.io`)  
**Scope**: Existing Supabase database schemas, RLS policies, storage bucket policies, client libraries, build caching, admin CMS architecture, and complete specification for `supabase/blog_schema.sql`.

---

## 1. Executive Summary

The project utilizes Supabase Postgres for dynamic, owner-editable content while preserving static build performance and reliability via an offline cache (`.cache/`). Currently, two content tables exist:
1. `public.tried_entries` (log of experiments/attempts, filtered by public/private status)
2. `public.site_content` (singleton row holding profile, work, gallery, and bio data)
3. `storage.buckets` (`site-images` public bucket for uploaded media)

To implement the new **Blog** collection backed by Supabase Postgres and editable via `/admin`, a new migration file `supabase/blog_schema.sql` must be created following the exact conventions established in `supabase/schema.sql` and `supabase/site_content.sql`.

This report provides the full architectural analysis and the complete, drop-in SQL schema for `supabase/blog_schema.sql`, along with TypeScript data models, RLS policies, indexing strategy, and CMS integration guidelines.

---

## 2. Investigation of Existing Supabase Architecture

### 2.1 Schema Patterns & Database Objects

| Aspect | Existing Pattern (`tried_entries`) | Existing Pattern (`site_content`) | Blog Post Implementation Requirement |
|---|---|---|---|
| **Primary Key** | `id uuid primary key default gen_random_uuid()` | `id int primary key` (singleton `id = 1`) | `id uuid primary key default gen_random_uuid()` |
| **Route / Slug** | `slug text not null unique` | N/A (singleton) | `slug text not null unique` |
| **Timestamps** | `created_at`, `updated_at` (`timestamptz default now()`) | `updated_at` (`timestamptz default now()`) | `created_at`, `updated_at` (`timestamptz default now()`) |
| **Date Field** | `date date not null` | N/A | `date date not null default current_date` |
| **Content Type** | Short text: `note`, Rich HTML: `description text` | Short strings + JSONB arrays + `intro text` | Summary: `description text`, Rich HTML: `content text` |
| **Arrays / Tags**| `tags text[] not null default '{}'` | JSONB arrays | `tags text[] not null default '{}'` |
| **Visibility** | `is_public boolean not null default false` | Always public | `published boolean not null default false` (or `is_public`) |
| **Cover Media** | `image_src text`, `image_alt text` | `portrait_src text`, `portrait_alt text` | `image_src text`, `image_alt text` |
| **Trigger** | `public.set_updated_at()` trigger before update | `public.set_updated_at()` trigger before update | `public.set_updated_at()` trigger before update |

### 2.2 Security and Row Level Security (RLS) Model

The project enforces an owner-write / public-read RLS model tied to the owner's authenticated email:
- **Owner Email**: `himanshuchavdacodes@gmail.com` (found in `supabase/schema.sql`, `supabase/site_content.sql`, `supabase/storage.sql`, `supabase/README.md`).
- **Client Key**: Publishable key (`sb_publishable_...`) used in both client-side `/admin` and build-time frontmatter scripts (`src/lib/supabaseClient.ts`).
- **RLS Enforcement**:
  - Unauthenticated build processes (and anonymous visitors) can only read rows where `published = true` (or `is_public = true`).
  - Authenticated admin with email `himanshuchavdacodes@gmail.com` can read all rows (including drafts/unpublished) and has full CRUD write permissions (`ALL`).
  - Storage bucket `site-images` allows public reads, but write operations are restricted to `himanshuchavdacodes@gmail.com`.

### 2.3 Storage Architecture

Media is stored in the `site-images` Supabase Storage bucket:
- **Bucket ID**: `site-images` (`public: true`)
- **Upload Flow** (`src/lib/admin/imageUpload.ts`):
  `wireImageUpload(fileInput, textInput, folder, statusEl)`
  Upload path structure: `${folder}/${Date.now()}-${safeName}`
- **Blog Integration**: Blog cover photos and in-article uploads should use folder prefix `'blog'`, uploading to `site-images/blog/<timestamp>-<filename>`. No storage schema modifications are required since `site-images` already permits owner writes for any path.

### 2.4 Build-Time Fetching and Offline Caching Strategy

The build system (`src/lib/buildCache.ts`, `src/lib/tried.ts`) adheres to an offline-first fallback:
1. `src/lib/supabaseClient.ts` initializes the Supabase client using `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_KEY`.
2. Build queries Supabase: `.from('blog_posts').select('*').eq('published', true).order('date', { ascending: false }).order('created_at', { ascending: false })`.
3. If successful, writes data to `.cache/blog_posts.json` via `writeCache('blog_posts', rows)`.
4. If network fails or Supabase is unreachable during static site generation, it reads from `.cache/blog_posts.json` via `readCache<BlogRow[]>('blog_posts')`.
5. Static pages are prerendered using `getStaticPaths()` with deterministic data.

### 2.5 Admin CMS Interaction (`src/pages/admin.astro`)

The `/admin` surface is built with vanilla DOM manipulations + TypeScript modules:
- Tabs: `src/lib/admin/tabs.ts` (`tab-about`, `tab-tried`, and new `tab-blog`).
- Rich Text: `src/lib/admin/richEditor.ts` wraps Quill.js for rich HTML fields (`content`).
- Slugs: `src/lib/slug.ts` provides `slugify()` and `uniqueSlug()` to prevent slug conflicts on post creation.
- Webhook trigger: Saving or deleting rows in Supabase triggers a Database Webhook calling GitHub Actions `dispatches` endpoint (`{"event_type": "content-updated"}`).

### 2.6 Route Registry Constraints (`tools/registry.mjs`)

`tools/registry.mjs` enforces reserved routes to prevent collisions between static pages registered in `pages.json` and custom Astro pages:
- `RESERVED` dictionary includes `'/'`, `'/pages'`, `'/tried'`, `'/admin'`.
- Adding `'/blog': 'the blog collection index'` to `RESERVED` and checking `route.startsWith('/blog/')` in `tools/registry.mjs` protects the route space.

---

## 3. Complete Specification: `supabase/blog_schema.sql`

Here is the exact, complete, idempotent SQL script to create `supabase/blog_schema.sql`:

```sql
-- ============================================================================
-- Blog Collection Database Schema & RLS Policies
-- File: supabase/blog_schema.sql
-- Run once in Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Every statement is idempotent and safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Create table
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  content text not null default '',
  date date not null default current_date,
  image_src text,
  image_alt text,
  tags text[] not null default '{}',
  reading_time text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Trigger for updated_at
-- Re-use or define public.set_updated_at()
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row
  execute function public.set_updated_at();

-- 3. Row Level Security (RLS)
alter table public.blog_posts enable row level security;

-- Public & Build Read Policy:
-- Anyone (and static build prerendering) can read published posts.
-- Authenticated owner can read both published and draft posts.
drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read"
  on public.blog_posts
  for select
  to anon, authenticated
  using (
    published = true
    or (auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com'
  );

-- Owner Write Policy:
-- Only authenticated owner can insert, update, or delete posts.
drop policy if exists "blog_posts_owner_write" on public.blog_posts;
create policy "blog_posts_owner_write"
  on public.blog_posts
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com');

-- 4. Indexes
create index if not exists blog_posts_published_date_idx 
  on public.blog_posts (published, date desc, created_at desc);

create index if not exists blog_posts_tags_idx 
  on public.blog_posts using gin (tags);

-- 5. Seed Data (Idempotent seed matching author's profile & systems theme)
insert into public.blog_posts (slug, title, description, content, date, tags, reading_time, published)
values
  (
    'building-a-nats-studio-gui-in-rust',
    'Building a High-Performance GUI for NATS in Rust',
    'Why existing messaging tooling falls short for real-time telemetry, and how native Rust + Slint makes inspecting NATS subjects effortless.',
    '<h2>Why build another GUI?</h2><p>NATS is arguably one of the fastest, most resilient messaging and streaming systems available today. However, when developing distributed services or inspecting live subject subscriptions under load, existing web-based dashboards introduce latency and memory overhead.</p><p>We set out to build a lightweight desktop GUI utilizing Rust. By leveraging async Tokio workers and direct NATS protocol connections, we maintain sub-millisecond dispatch cycles with minimal CPU overhead.</p><h3>Key Architectural Takeaways</h3><ul><li>Direct client-side streaming avoids intermediate proxy hops.</li><li>Virtual list rendering handles 50,000+ message bursts without frame drops.</li><li>Native binary footprint remains under 15MB.</li></ul>',
    '2026-07-20',
    array['systems', 'rust', 'networking', 'nats'],
    '4 min read',
    true
  ),
  (
    'distributed-consensus-from-scratch',
    'Rethinking Distributed Systems: From Raft to Gossip Protocols',
    'Exploring consensus trade-offs, network partition handling, and what happens when deterministic state machines meet unpredictable networks.',
    '<h2>Consensus vs. Availability</h2><p>Every distributed systems engineer eventually meets the PACELC and CAP theorems in production. Strong consensus algorithms like Raft and Paxos provide linearizability at the cost of latency and partition fragility.</p><p>In contrast, epidemic (gossip) protocols offer eventual consistency with remarkable fault tolerance across wide-area networks. Choosing between them requires understanding your state machine invariants.</p>',
    '2026-05-14',
    array['systems', 'distributed', 'consensus'],
    '6 min read',
    true
  ),
  (
    'why-minimalist-web-architecture-survives',
    'Why Minimalist Web Architecture Survives',
    'A reflection on hairlines, pure semantic HTML, static site generation, and resisting modern framework churn.',
    '<h2>A directory, not a dashboard</h2><p>Modern frontend development often defaults to heavy component libraries, complex state containers, and nested div wrappers. Yet, semantic markup paired with strict design tokens produces interfaces that are faster, accessible, and timeless.</p><p>By treating web pages as structured documents and separating content persistence (Supabase) from static presentation (Astro), we achieve resilience against outages and zero runtime JavaScript bloat.</p>',
    '2026-03-02',
    array['web', 'architecture', 'design'],
    '3 min read',
    true
  )
on conflict (slug) do nothing;
```

---

## 4. TypeScript Client & CMS Integration Blueprint

### 4.1 Data Access Layer: `src/lib/blog.ts`

```typescript
import { supabase } from './supabaseClient';
import { routeHref } from './paths';
import { readCache, writeCache } from './buildCache';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  image?: { src: string; alt: string };
  tags: string[];
  reading_time?: string;
  published: boolean;
  href: string;
  /** Pre-computed lowercased search index for live filter */
  search: string;
}

interface PostRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string | null;
  date: string;
  image_src: string | null;
  image_alt: string | null;
  tags: string[] | null;
  reading_time: string | null;
  published: boolean;
}

function toBlogPost(row: PostRow): BlogPost {
  const search = [
    row.title,
    row.description ?? '',
    row.content ?? '',
    ...(row.tags ?? [])
  ].join(' ').toLowerCase();

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    content: row.content ?? '',
    date: row.date,
    image: row.image_src ? { src: row.image_src, alt: row.image_alt ?? '' } : undefined,
    tags: row.tags ?? [],
    reading_time: row.reading_time ?? undefined,
    published: row.published,
    href: routeHref(`/blog/${row.slug}`),
    search,
  };
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
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

### 4.2 Admin Editor Layer: `src/lib/admin/blogEditor.ts`

- Utilizes `createRichEditor('b-content-editor')` for the rich Quill container.
- Utilizes `wireImageUpload(deps.fImageUpload, deps.fImageSrc, 'blog', deps.fImageUploadStatus)` for uploading post header images to `site-images/blog/`.
- Implements `loadPosts()`, `renderList()`, `togglePublished()`, `deletePost()`, and form submission with `uniqueSlug()`.

### 4.3 Database Webhook Setup (`supabase/README.md` addition)

To ensure live deployments when blog posts are published/edited:
1. In Supabase Dashboard → **Database** → **Webhooks** → **Create a new hook**.
2. **Table**: `blog_posts`
3. **Events**: `Insert`, `Update`, `Delete`
4. **URL**: `https://api.github.com/repos/himanshu-systems/himanshu-systems.github.io/dispatches`
5. **Headers**: `Authorization: Bearer <GITHUB_PAT>`, `Accept: application/vnd.github+json`, `Content-Type: application/json`
6. **Body**: `{"event_type": "content-updated"}`

---

## 5. Security & Schema Verification Matrix

| Verification Item | Requirement | Implemented / Specified in Schema |
|---|---|---|
| **RLS Enabled** | `alter table public.blog_posts enable row level security` | Yes |
| **Anonymous / Build Access** | Only read `published = true` | Yes (`blog_posts_public_read`) |
| **Owner Authenticated Read** | Read drafts and published via JWT email check | Yes (`auth.jwt() ->> 'email' = 'himanshuchavdacodes@gmail.com'`) |
| **Owner Authenticated Write**| Insert/Update/Delete restricted to owner email | Yes (`blog_posts_owner_write` FOR ALL) |
| **UUID Primary Key** | UUID with `gen_random_uuid()` default | Yes (`id uuid primary key default gen_random_uuid()`) |
| **Slug Uniqueness** | Unique text constraint | Yes (`slug text not null unique`) |
| **Timestamp Automation** | `updated_at` updated on UPDATE statements | Yes (`blog_posts_set_updated_at` trigger) |
| **Static Build Resilience** | `.cache/blog_posts.json` fallback | Yes (matches `tried.ts` pattern) |

---

## 6. Summary for Implementers

1. **Database Schema**: Add `supabase/blog_schema.sql` with table `public.blog_posts`, RLS policies, trigger, indexes, and seed entries.
2. **Data Layer**: Create `src/lib/blog.ts` replicating the caching & transformation strategy of `src/lib/tried.ts`.
3. **Admin Module**: Create `src/lib/admin/blogEditor.ts` following `triedEditor.ts`.
4. **Admin UI**: Add `Blog posts` tab and panel to `src/pages/admin.astro`.
5. **Public Pages**: Create `src/pages/blog.astro` and `src/pages/blog/[slug].astro` adhering to `DESIGN.md` (hairlines, `--mono`/`--serif`, no cards).
6. **Registry**: Update `tools/registry.mjs` RESERVED routes.
