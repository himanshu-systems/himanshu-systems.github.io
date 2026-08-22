-- Run once, after schema.sql: Supabase dashboard -> SQL Editor -> New query ->
-- paste -> Run. Adds the about-page content as a second, admin-editable
-- table. Safe to re-run.

create table if not exists public.site_content (
  id int primary key,
  name text not null default '',
  role text not null default '',
  intro text not null default '',
  now text not null default '',
  portrait_src text,
  portrait_alt text,
  -- Each is a JSON array of the same shape src/data/me.ts used:
  --   doing:     [{ "label", "detail" }]
  --   work:      [{ "year", "title", "blurb", "href" }]   (href can be null)
  --   gallery:   [{ "src", "alt", "caption" }]
  --   elsewhere: [{ "label", "text", "href" }]
  doing jsonb not null default '[]'::jsonb,
  work jsonb not null default '[]'::jsonb,
  gallery jsonb not null default '[]'::jsonb,
  elsewhere jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_content_singleton check (id = 1)
);

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
  before update on public.site_content
  for each row
  execute function public.set_updated_at();

alter table public.site_content enable row level security;

-- The about page is always public -- there's no private version of it.
drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read"
  on public.site_content
  for select
  to anon, authenticated
  using (true);

-- Same owner-only rule as tried_entries.
drop policy if exists "site_content_owner_write" on public.site_content;
create policy "site_content_owner_write"
  on public.site_content
  for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com');

-- Seed with what's on the site today.
insert into public.site_content (id, name, role, intro, now, portrait_src, portrait_alt, doing, work, gallery, elsewhere)
values (
  1,
  'Himanshu Chavda',
  'I turn simple questions into unnecessarily deep problems.',
  'I research things, work out how they actually work, then build around what I learn. Backend systems, networking, operating systems, databases, distributed systems, security, Rust, Go — whatever has my attention that week. I want the big picture and the smallest mechanism, which is how I end up with ten unfinished things and twenty more I want to start.',
  'Working on a nats.studio app which is GUI for Nats messaging , and Participating in Hackathons.',
  'images/portrait.jpg',
  'Portrait photo',
  '[
    {"label":"systems","detail":"Backend, operating systems, distributed systems, and the networking underneath."},
    {"label":"Ai","detail":"Vibe codding and building Ai tools for fun and learning. Planning to go in more into Automation and LLM and other stuff."},
    {"label":"security","detail":"How things break, and what that says about how they were built. not stated yet."},
    {"label":"languages","detail":"Rust and Go, mostly. Understanding the Features it  provides "},
    {"label":"method","detail":"Start with a question. Read until it makes sense. Build something with it."}
  ]'::jsonb,
  '[
    {"year":"2026","title":"HTML DOCS TO Learn","blurb":"A single GitHub Pages site that serves both hand-written pages and imported HTML, driven by one registry file.","href":"https://github.com/himanshu-systems/himanshu-systems.github.io"},
    {"year":"20XX","title":"Another project","blurb":"One sentence on what it does and why you built it.","href":null}
  ]'::jsonb,
  '[
    {"src":"images/work-1.svg","alt":"Placeholder image one","caption":"A caption, if it needs one."},
    {"src":"images/work-2.svg","alt":"Placeholder image two","caption":""},
    {"src":"images/work-3.svg","alt":"Placeholder image three","caption":""}
  ]'::jsonb,
  '[
        {"label":"github","text":"@himanshu-systems","href":"https://github.com/himanshu-systems"},
    {"label":"email","text":"himanshu.tech.profile@gmail.com","href":"mailto:himanshu.tech.profile@gmail.com"},
    {"label":"twitter","text":"@himanshu_","href":"https://twitter.com/himanshu_systems"},
    {"label":"linkedin","text":"@himanshu-systems","href":"https://www.linkedin.com/in/himanshuchavda/"},
    {"label":"instagram","text":"@himanshu_","href":"https://www.instagram.com/himanshu.nihilist/"}
    
  ]'::jsonb
)
on conflict (id) do nothing;
