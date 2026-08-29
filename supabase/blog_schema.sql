-- Run this whole file once: Supabase dashboard -> SQL Editor -> New query ->
-- paste -> Run. Every statement is safe to re-run if you need to.

create extension if not exists pgcrypto;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  content text not null default '',
  date date not null default current_date,
  tags text[] not null default '{}',
  reading_time text,
  image_src text,
  image_alt text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keeps updated_at current on every UPDATE.
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

alter table public.blog_posts enable row level security;

-- Public & Build Read Policy:
-- Anyone -- including the anonymous build step that generates the static site --
-- can read published blog posts. The owner, logged in with the email below,
-- can also read draft (unpublished) posts.
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
-- Only the owner email can insert, update, or delete blog posts.
drop policy if exists "blog_posts_owner_write" on public.blog_posts;
create policy "blog_posts_owner_write"
  on public.blog_posts
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com');

-- Performance Indexes
create index if not exists blog_posts_published_date_idx
  on public.blog_posts (published, date desc, created_at desc);

create unique index if not exists blog_posts_slug_idx
  on public.blog_posts (slug);

create index if not exists blog_posts_tags_idx
  on public.blog_posts using gin (tags);

-- Seed Data: Sample posts matching author's profile and systems theme.
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
