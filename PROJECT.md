# Project: Blog Content Collection with Supabase & Admin CMS

## Architecture
- **Data Backend**: Supabase PostgreSQL (`public.blog_posts` table) with Row Level Security (RLS) policies allowing public read of `published = true` and full CRUD restricted to `(auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com'`.
- **Offline / Build Resilience Layer**: `src/lib/blog.ts` utilizing `readCache` / `writeCache` (`.cache/blog_posts.json`) matching `src/lib/tried.ts` and `src/lib/buildCache.ts` architecture.
- **Public Frontend**: Astro SSG with `Doc.astro` layout:
  - `src/pages/blog.astro`: Directory-style post listing with live search filter, date sorting, tags, responsive hairlines, and strict design token adherence.
  - `src/pages/blog/[slug].astro`: Full article reader with Source Serif 4 prose typography, metadata header, backlink, and rendered Quill HTML.
  - Navigation updates in masthead (`src/pages/tried.astro`, `src/pages/pages.astro`, `src/pages/index.astro`, `src/pages/blog.astro`, `src/pages/blog/[slug].astro`, `src/pages/admin.astro`).
  - Route registry reservation in `tools/registry.mjs` for `/blog` and `/blog/*`.
- **Admin CMS**: Single-page administrative dashboard in `src/pages/admin.astro` and modular controller in `src/lib/admin/blogEditor.ts`:
  - Third tab: "Blog posts" (`#tab-blog` -> `#panel-blog`).
  - Interactive table showing all posts (published & draft) with live status toggling, edit modal, delete confirmation, and create modal.
  - Form integration with `createRichEditor('b-content-editor')` from `richEditor.ts` and `wireImageUpload(...)` from `imageUpload.ts` targeting `site-images/blog`.
  - Slug auto-generation via `uniqueSlug(...)` from `src/lib/slug.ts`.

## Code Layout
- `supabase/blog_schema.sql`: Database schema definition, RLS policies, triggers, indexes, and seed posts.
- `src/lib/blog.ts`: Data access layer with Supabase client query and `.cache/blog_posts.json` offline fallback.
- `.cache/blog_posts.json`: Static build fallback cache containing seed blog posts.
- `src/pages/blog.astro`: Public blog directory listing page.
- `src/pages/blog/[slug].astro`: Public blog article reading page.
- `src/lib/admin/blogEditor.ts`: Admin CMS controller for managing blog posts, forms, Quill editor, and image upload wiring.
- `src/pages/admin.astro`: Admin UI with Blog tab, table, modal, and script initialization.
- `tools/registry.mjs`: Route collision protection for `/blog` and `/blog/*`.
- `tests/e2e/`: E2E test scripts and automated verification runner.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database Schema & RLS | PostgreSQL `public.blog_posts` table with UUID id, slug, title, description, content, date, tags, image_src, image_alt, reading_time, published, created_at, updated_at, set_updated_at trigger, indexes, and RLS policies matching `himanshuchavdacodes@gmail.com` | M1 | survey/ORIGINAL_REQUEST §R1 |
| 2 | Route Collision Protection | Update `tools/registry.mjs` to reserve `/blog` and block `/blog/*` in `pages.json` | M1 | survey |
| 3 | TypeScript Data Layer & Cache Fallback | `src/lib/blog.ts` with `getBlogPosts()`, `getBlogPostBySlug()`, `toPost()`, and `.cache/blog_posts.json` read/write caching strategy | M2 | survey/ORIGINAL_REQUEST §R2 |
| 4 | Public Blog Listing Page | `src/pages/blog.astro` with `Doc.astro` layout, `.shell--wide`, masthead navigation, live search filter (`filterUI.ts`), hairlines, date sorting, and strict token adherence | M2 | survey/ORIGINAL_REQUEST §R2 |
| 5 | Public Blog Detail Page | `src/pages/blog/[slug].astro` with `getStaticPaths()`, `Doc.astro` prose layout (`--measure: 34rem`), Source Serif 4 typography, backlink, cover image, and `:global()` styled rich content | M2 | survey/ORIGINAL_REQUEST §R2 |
| 6 | Masthead & Navigation Consistency | Ensure "Blog" link appears consistently in public masthead navigation across all main pages | M2 | survey |
| 7 | Admin CMS Blog Tab & UI | Add "Blog posts" tab (`#tab-blog`) and panel (`#panel-blog`) with post list table, status pills, edit/toggle/delete action buttons, and modal form in `src/pages/admin.astro` | M3 | survey/ORIGINAL_REQUEST §R3 |
| 8 | Admin CMS Blog Controller | `src/lib/admin/blogEditor.ts` implementing post loading, table rendering, create/edit modal handling, slug generation via `uniqueSlug()`, optimistic updates, and Supabase CRUD operations | M3 | survey/ORIGINAL_REQUEST §R3 |
| 9 | Rich Text & Image Upload Integration | Connect `createRichEditor('b-content-editor')` (`richEditor.ts`) and `wireImageUpload(...)` (`imageUpload.ts`) into blog editor form | M3 | survey/ORIGINAL_REQUEST §R3 |
| 10 | E2E Testing Suite & Quality Assurance | Automated test runner verifying all 4 tiers of test cases (schema, public listing, detail pages, cache fallback, admin CRUD, and design system constraints) | M4 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Database Schema & Registry Protection | `supabase/blog_schema.sql`, seed data, RLS policies, and `tools/registry.mjs` | none | DONE |
| 2 | M2: Public Data Layer & Astro Pages | `src/lib/blog.ts`, `.cache/blog_posts.json`, `src/pages/blog.astro`, `src/pages/blog/[slug].astro`, masthead nav links | M1 | DONE |
| 3 | M3: Admin CMS Integration | `src/lib/admin/blogEditor.ts`, `src/pages/admin.astro` tab/panel/modal, Quill & image upload wiring | M1, M2 | DONE |
| 4 | M4: E2E Verification & Adversarial Hardening | E2E test execution (Tiers 1-4), adversarial stress testing (Tier 5), build & type verification | M1, M2, M3 | DONE |

## Interface Contracts
### `supabase/blog_schema.sql` ↔ `src/lib/blog.ts` & `src/lib/admin/blogEditor.ts`
- **Table Name**: `public.blog_posts`
- **Columns**:
  - `id`: `uuid primary key default gen_random_uuid()`
  - `slug`: `text not null unique`
  - `title`: `text not null`
  - `description`: `text`
  - `content`: `text not null default ''` (HTML from Quill)
  - `date`: `date not null default current_date`
  - `tags`: `text[] not null default '{}'`
  - `reading_time`: `text`
  - `image_src`: `text`
  - `image_alt`: `text`
  - `published`: `boolean not null default false`
  - `created_at`: `timestamptz not null default now()`
  - `updated_at`: `timestamptz not null default now()`

### `src/lib/blog.ts` Types & Functions
```typescript
export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  date: string;
  tags: string[] | null;
  reading_time: string | null;
  image_src: string | null;
  image_alt: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  dateFormatted: string;
  tags: string[];
  readingTime: string;
  image?: { src: string; alt: string };
  published: boolean;
  href: string;
  search: string;
}

export async function getBlogPosts(): Promise<BlogPost[]>;
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null>;
```

### `src/lib/admin/blogEditor.ts` Interface
```typescript
export interface BlogEditorDeps {
  statusEl: HTMLElement;
  tableBody: HTMLElement;
  countEl: HTMLElement;
  modal: HTMLElement;
  modalTitle: HTMLElement;
  form: HTMLFormElement;
  fId: HTMLInputElement;
  fSlug: HTMLInputElement;
  fTitle: HTMLInputElement;
  fDescription: HTMLTextAreaElement;
  fDate: HTMLInputElement;
  fTags: HTMLInputElement;
  fReadingTime: HTMLInputElement;
  fImageSrc: HTMLInputElement;
  fImageAlt: HTMLInputElement;
  fImageUpload: HTMLInputElement;
  fImageUploadStatus: HTMLElement;
  fPublished: HTMLInputElement;
  btnNew: HTMLElement;
  btnCancel: HTMLElement;
}

export function initBlogEditor(deps: BlogEditorDeps): { loadPosts: () => Promise<void> };
```
