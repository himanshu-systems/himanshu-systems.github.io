# Admin CMS & Blog Editor Architectural Investigation Report

## 1. Executive Summary

This investigation examines the structure, mechanics, state management, and editor integrations of the `/admin` CMS in this project, and provides a complete architectural blueprint for adding a full-featured "Blog Posts" management interface backed by Supabase Postgres and Storage.

The existing `/admin` route is a client-side single-page application hosted inside an Astro layout (`Doc.astro` with `prose={false}`, `floatingShape={false}`, `smoothScroll={false}`). It provides authentication against Supabase Auth, tab-based navigation, Quill rich text editing, client-side direct-to-bucket image uploading, and real-time CRUD operations against Postgres tables secured with Row Level Security (RLS).

---

## 2. Existing Admin Architecture & Component Breakdown

### 2.1 File Map
```
src/
├── pages/
│   └── admin.astro                # Admin UI template & script orchestrator
└── lib/
    ├── supabaseClient.ts          # Shared client with PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY
    ├── slug.ts                    # slugify and uniqueSlug generation utilities
    ├── paths.ts                   # asset(), routeHref(), resolveImage()
    └── admin/
        ├── auth.ts                # Supabase Auth session watcher and login/logout handler
        ├── tabs.ts                # Tab switching logic (aria-selected and hidden toggling)
        ├── richEditor.ts          # Quill editor factory (Snow theme, custom toolbar)
        ├── imageUpload.ts         # Supabase Storage direct uploader to 'site-images'
        ├── listEditor.ts          # Dynamic repeatable form row generator
        ├── aboutEditor.ts         # Controller for site_content singleton row
        └── triedEditor.ts         # Controller for tried_entries table (CRUD + slug gen)
```

---

## 3. Detailed Component Mechanics

### 3.1 Authentication & Lifecycle (`src/lib/admin/auth.ts`)
- **Mechanism**:
  - Uses `supabase.auth.signInWithPassword({ email, password })` on `#login-form` submit.
  - Listens to authentication state through both `supabase.auth.getSession()` on load and `supabase.auth.onAuthStateChange()`.
  - When authenticated: hides `#login-section`, shows `#admin-section`, sets `#who.textContent = email`, and invokes the `onLogin(email)` callback.
  - When signed out: shows `#login-section`, hides `#admin-section`.
- **Security & RLS**:
  - Client uses the publishable Supabase key.
  - Admin operations (insert, update, delete) are authorized at the Postgres database level via RLS policies checking `(auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com'`.
  - On login, the `onLogin` callback triggers initial data fetching across all editor modules.

### 3.2 Tab Switching System (`src/lib/admin/tabs.ts`)
- **Mechanism**:
  - `initTabs(tabButtons: HTMLElement[], tabPanels: Record<string, HTMLElement>)`
  - Binds click events to each tab button.
  - Reads `btn.dataset.tab` as the active key.
  - Sets `aria-selected="true"` on the clicked tab and `"false"` on siblings.
  - Sets `panel.hidden = (name !== target)` across all registered panels.
- **Adding the Blog Tab**:
  - Requires adding `<button type="button" class="tab" id="tab-blog" data-tab="blog" aria-selected="false">Blog posts</button>` to the `.tabs` container in `admin.astro`.
  - Requires adding `<div id="panel-blog" class="tab-panel" hidden>...</div>`.
  - Pass `$('tab-blog')` in the buttons array and `blog: $('panel-blog')` in the panels dictionary.

### 3.3 Quill Rich Text Editor (`src/lib/admin/richEditor.ts`)
- **Mechanism**:
  - Imports Quill (`v2.0.2`) and `quill/dist/quill.snow.css`.
  - Factory function `createRichEditor(containerId: string)`:
    ```typescript
    const quill = new Quill(`#${containerId}`, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          ['clean']
        ],
      },
    });
    ```
  - Exposes:
    - `getHTML()`: returns empty string `""` if Quill contains only `<p><br></p>`, otherwise returns innerHTML.
    - `setHTML(html: string)`: resets to `<p><br></p>` if incoming string is empty, otherwise loads HTML.
- **Admin Styling**:
  - `.rich-editor` styled in `admin.astro` using global CSS tokens (`var(--bg)`, `var(--border)`, `var(--text)`, `var(--muted)`, `var(--accent)`).
  - SVG strokes and fills within toolbar buttons dynamically match theme custom properties.

### 3.4 Image Upload Pipeline (`src/lib/admin/imageUpload.ts`)
- **Mechanism**:
  - `wireImageUpload(fileInput: HTMLInputElement, textInput: HTMLInputElement, folder: string, statusEl: HTMLElement)`
  - Listens to `change` on `fileInput`.
  - Sanitizes filename (`file.name.replace(/[^a-zA-Z0-9.-]+/g, '-')`).
  - Constructs storage path: `${folder}/${Date.now()}-${safeName}`.
  - Executes upload: `supabase.storage.from('site-images').upload(path, file, { upsert: true })`.
  - Obtains public URL: `supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl`.
  - Writes URL directly into `textInput.value` and displays status.
- **Storage Bucket**:
  - Uses public bucket `'site-images'`.
  - For blog posts, target folder is `'blog'`, creating paths like `blog/1724930000000-post-hero.jpg`.

---

## 4. Blog Post Data Model & Supabase Schema

### 4.1 SQL Schema Specification (`supabase/blog_schema.sql`)
```sql
create extension if not exists pgcrypto;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  date date not null,
  title text not null,
  summary text not null,
  content text,
  cover_image text,
  cover_alt text,
  tags text[] not null default '{}',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for auto-updating updated_at
drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row
  execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

-- Anonymous and authenticated can read public posts; owner can read all posts
drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read"
  on public.blog_posts
  for select
  to anon, authenticated
  using (
    is_public = true
    or (auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com'
  );

-- Owner can insert, update, delete
drop policy if exists "blog_posts_owner_write" on public.blog_posts;
create policy "blog_posts_owner_write"
  on public.blog_posts
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com');
```

---

## 5. Design & Specification for `src/lib/admin/blogEditor.ts`

### 5.1 Type Definitions
```typescript
export interface AdminBlogPost {
  id: string;
  slug: string;
  date: string;
  title: string;
  summary: string;
  content: string | null;
  cover_image: string | null;
  cover_alt: string | null;
  tags: string[];
  is_public: boolean;
}

export interface BlogEditorDeps {
  listEl: HTMLElement;
  emptyEl: HTMLElement;
  formWrapper: HTMLElement;
  form: HTMLFormElement;
  formTitle: HTMLElement;
  cancelBtn: HTMLElement;
  slugNote: HTMLElement;
  statusEl: HTMLElement;
  newPostBtn: HTMLElement;
  fDate: HTMLInputElement;
  fTitle: HTMLInputElement;
  fSummary: HTMLTextAreaElement;
  fTags: HTMLInputElement;
  fImageSrc: HTMLInputElement;
  fImageAlt: HTMLInputElement;
  fPublic: HTMLInputElement;
  fImageUpload: HTMLInputElement;
  fImageUploadStatus: HTMLElement;
}
```

### 5.2 Implementation Logic
```typescript
import { supabase } from '../supabaseClient';
import { uniqueSlug } from '../slug';
import { createRichEditor } from './richEditor';
import { wireImageUpload } from './imageUpload';

export function initBlogEditor(deps: BlogEditorDeps) {
  const contentEditor = createRichEditor('b-content-editor');
  wireImageUpload(deps.fImageUpload, deps.fImageSrc, 'blog', deps.fImageUploadStatus);

  let posts: AdminBlogPost[] = [];
  let editingId: string | null = null;

  function setStatus(message: string, isError = false) {
    deps.statusEl.textContent = message;
    deps.statusEl.hidden = false;
    deps.statusEl.classList.toggle('error', isError);
  }

  function openForm() {
    deps.formWrapper.hidden = false;
  }

  function closeForm() {
    deps.formWrapper.hidden = true;
    editingId = null;
    deps.form.reset();
    contentEditor.setHTML('');
    deps.formTitle.textContent = 'New post';
    deps.slugNote.hidden = true;
  }

  deps.newPostBtn.addEventListener('click', () => {
    editingId = null;
    deps.form.reset();
    contentEditor.setHTML('');
    deps.formTitle.textContent = 'New post';
    deps.slugNote.hidden = true;
    openForm();
    deps.fTitle.focus();
  });

  deps.cancelBtn.addEventListener('click', closeForm);

  function startEdit(post: AdminBlogPost) {
    editingId = post.id;
    deps.fDate.value = post.date;
    deps.fTitle.value = post.title;
    deps.fSummary.value = post.summary;
    contentEditor.setHTML(post.content ?? '');
    deps.fTags.value = post.tags.join(', ');
    deps.fImageSrc.value = post.cover_image ?? '';
    deps.fImageAlt.value = post.cover_alt ?? '';
    deps.fPublic.checked = post.is_public;
    deps.formTitle.textContent = `Editing "${post.title}"`;
    deps.slugNote.hidden = false;
    deps.slugNote.textContent = `URL: /blog/${post.slug}/ — fixed once created to avoid breaking links.`;
    openForm();
    deps.formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadPosts() {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`Could not load blog posts: ${error.message}`, true);
      return;
    }
    posts = (data ?? []) as AdminBlogPost[];
    renderList();
  }

  function renderList() {
    deps.listEl.innerHTML = '';
    deps.emptyEl.hidden = posts.length !== 0;

    for (const post of posts) {
      const tr = document.createElement('tr');

      const dateTd = document.createElement('td');
      dateTd.className = 'col-date';
      dateTd.textContent = post.date;

      const postTd = document.createElement('td');
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = post.title;
      const summary = document.createElement('span');
      summary.className = 'blurb';
      summary.textContent = post.summary;
      postTd.append(title, summary);

      const statusTd = document.createElement('td');
      const status = document.createElement('span');
      status.className = post.is_public ? 'tag tag-public' : 'tag tag-private';
      status.textContent = post.is_public ? 'public' : 'private';
      statusTd.append(status);

      const actionsTd = document.createElement('td');
      actionsTd.className = 'col-actions';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.textContent = post.is_public ? 'Make private' : 'Publish';
      toggleBtn.addEventListener('click', () => togglePublic(post));

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => startEdit(post));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deletePost(post));

      actionsTd.append(toggleBtn, editBtn, deleteBtn);
      tr.append(dateTd, postTd, statusTd, actionsTd);
      deps.listEl.append(tr);
    }
  }

  async function togglePublic(post: AdminBlogPost) {
    const { error } = await supabase
      .from('blog_posts')
      .update({ is_public: !post.is_public })
      .eq('id', post.id);

    if (error) {
      setStatus(`Could not update: ${error.message}`, true);
      return;
    }
    setStatus('Saved. The site will rebuild in about a minute.');
    loadPosts();
  }

  async function deletePost(post: AdminBlogPost) {
    if (!confirm(`Delete "${post.title}"? This can't be undone.`)) return;

    const { error } = await supabase.from('blog_posts').delete().eq('id', post.id);
    if (error) {
      setStatus(`Could not delete: ${error.message}`, true);
      return;
    }
    if (editingId === post.id) closeForm();
    setStatus('Deleted. The site will rebuild in about a minute.');
    loadPosts();
  }

  deps.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      date: deps.fDate.value,
      title: deps.fTitle.value.trim(),
      summary: deps.fSummary.value.trim(),
      content: contentEditor.getHTML() || null,
      tags: deps.fTags.value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      cover_image: deps.fImageSrc.value.trim() || null,
      cover_alt: deps.fImageAlt.value.trim() || null,
      is_public: deps.fPublic.checked,
    };

    if (editingId) {
      const { error } = await supabase.from('blog_posts').update(payload).eq('id', editingId);
      if (error) {
        setStatus(`Could not save: ${error.message}`, true);
        return;
      }
    } else {
      const taken = new Set(posts.map((p) => p.slug));
      const slug = uniqueSlug(payload.title, taken);
      const { error } = await supabase.from('blog_posts').insert({ ...payload, slug });
      if (error) {
        setStatus(`Could not save: ${error.message}`, true);
        return;
      }
    }

    setStatus('Saved. The site will rebuild in about a minute.');
    closeForm();
    loadPosts();
  });

  return { loadPosts };
}
```

---

## 6. Template & Script Integration in `src/pages/admin.astro`

### 6.1 Masthead Navigation
Update `<nav>` in `src/pages/admin.astro` to include the Blog link:
```html
<nav>
  <a href={home}>About</a>
  <a href={collection}>Pages</a>
  <a href={routeHref('/tried')}>Tried</a>
  <a href={routeHref('/blog')}>Blog</a>
  <ThemeToggle />
</nav>
```

### 6.2 Tab Bar Update
```html
<div class="tabs" role="tablist">
  <button type="button" class="tab" id="tab-about" data-tab="about" aria-selected="true">About page</button>
  <button type="button" class="tab" id="tab-tried" data-tab="tried" aria-selected="false">Tried entries</button>
  <button type="button" class="tab" id="tab-blog" data-tab="blog" aria-selected="false">Blog posts</button>
</div>
```

### 6.3 Blog Tab Panel HTML
```html
<!-- ───────────────────────── Blog posts ───────────────────────── -->
<div id="panel-blog" class="tab-panel" hidden>
  <div class="list-toolbar">
    <button type="button" class="primary" id="new-blog-button">+ New post</button>
    <span class="notice" id="blog-form-status" hidden></span>
  </div>

  <div id="blog-form-wrapper" class="panel" hidden>
    <div class="panel-head">
      <p class="form-title" id="blog-form-title">New post</p>
      <button type="button" id="cancel-blog-edit">Close</button>
    </div>

    <form id="blog-form">
      <div class="row-fields">
        <label class="field-narrow">
          <span>Date</span>
          <input type="date" id="b-date" required />
        </label>
        <label class="checkbox field-narrow">
          <input type="checkbox" id="b-public" />
          <span>Public — visible on the live site</span>
        </label>
      </div>

      <label>
        <span>Title</span>
        <input type="text" id="b-title" required />
      </label>

      <label>
        <span>Summary <small>shows in blog index and meta descriptions</small></span>
        <textarea id="b-summary" rows="2" required></textarea>
      </label>

      <label>
        <span>Content <small>rich text article body</small></span>
        <div id="b-content-editor" class="rich-editor"></div>
      </label>

      <div class="row-fields">
        <label class="field-narrow">
          <span>Tags <small>comma separated</small></span>
          <input type="text" id="b-tags" placeholder="databases, architecture, rust" />
        </label>
        <label class="field-narrow">
          <span>Cover image path <small>in static/images/, or upload below</small></span>
          <input type="text" id="b-image-src" placeholder="images/post-cover.jpg" />
        </label>
        <label class="field-narrow">
          <span>Cover image alt text</span>
          <input type="text" id="b-image-alt" />
        </label>
        <label class="field-narrow upload-field">
          <span>Upload cover image</span>
          <input type="file" id="b-image-upload" accept="image/*" />
          <span class="upload-status" id="b-image-upload-status" hidden></span>
        </label>
      </div>

      <p class="notice" id="b-slug-note" hidden></p>

      <div class="actions">
        <button type="submit" class="primary" id="save-blog-button">Save</button>
      </div>
    </form>
  </div>

  <table class="entries-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Post</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="blog-list"></tbody>
  </table>
  <p class="empty" id="blog-list-empty" hidden>No posts yet.</p>
</div>
```

### 6.4 Client Script Wiring
```typescript
import { initTabs } from '../lib/admin/tabs';
import { initAboutEditor } from '../lib/admin/aboutEditor';
import { initTriedEditor } from '../lib/admin/triedEditor';
import { initBlogEditor } from '../lib/admin/blogEditor';
import { initAuth } from '../lib/admin/auth';

function $(id: string) {
  return document.getElementById(id)!;
}

initTabs(
  [$('tab-about'), $('tab-tried'), $('tab-blog')],
  {
    about: $('panel-about'),
    tried: $('panel-tried'),
    blog: $('panel-blog'),
  }
);

const aboutEditor = initAboutEditor({ ... });
const triedEditor = initTriedEditor({ ... });

const blogEditor = initBlogEditor({
  listEl: $('blog-list'),
  emptyEl: $('blog-list-empty'),
  formWrapper: $('blog-form-wrapper'),
  form: $('blog-form') as HTMLFormElement,
  formTitle: $('blog-form-title'),
  cancelBtn: $('cancel-blog-edit'),
  slugNote: $('b-slug-note'),
  statusEl: $('blog-form-status'),
  newPostBtn: $('new-blog-button'),
  fDate: $('b-date') as HTMLInputElement,
  fTitle: $('b-title') as HTMLInputElement,
  fSummary: $('b-summary') as HTMLTextAreaElement,
  fTags: $('b-tags') as HTMLInputElement,
  fImageSrc: $('b-image-src') as HTMLInputElement,
  fImageAlt: $('b-image-alt') as HTMLInputElement,
  fPublic: $('b-public') as HTMLInputElement,
  fImageUpload: $('b-image-upload') as HTMLInputElement,
  fImageUploadStatus: $('b-image-upload-status'),
});

initAuth({
  loginSection: $('login-section'),
  adminSection: $('admin-section'),
  loginForm: $('login-form') as HTMLFormElement,
  loginError: $('login-error'),
  whoEl: $('who'),
  logoutBtn: $('logout'),
  loginEmailInput: $('login-email') as HTMLInputElement,
  loginPasswordInput: $('login-password') as HTMLInputElement,
  onLogin: () => {
    aboutEditor.loadAboutContent();
    triedEditor.loadEntries();
    blogEditor.loadPosts();
  }
});
```

### 6.5 CSS Styling Refinements
Add Quill editor height rule for `#b-content-editor`:
```css
#b-content-editor .ql-editor {
  min-height: 14rem;
}
```

---

## 7. Public Blog Data Layer (`src/lib/blog.ts`) & Fallback Cache
To support build-time rendering on `src/pages/blog.astro` and `src/pages/blog/[slug].astro`:
- Fetch only `is_public = true` rows.
- Cache results to `.cache/blog_posts.json` with `readCache` / `writeCache` to survive Supabase connection hiccups during local builds or CI.
- Return structured `BlogPost` objects including formatted date, tags, search index string, and resolved href.

---

## 8. Summary of Findings & Next Steps

1. The existing `/admin` CMS architecture is highly modular and directly reusable.
2. `richEditor.ts` and `imageUpload.ts` require no modifications; they can be consumed directly by `blogEditor.ts`.
3. Tab management and authentication callbacks cleanly accommodate the third tab without structural refactoring.
4. The implementation plan adheres strictly to project rules and constraints (`strict_design.md`, `DESIGN.md`).
