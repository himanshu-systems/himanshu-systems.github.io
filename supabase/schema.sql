-- Run this whole file once: Supabase dashboard -> SQL Editor -> New query ->
-- paste -> Run. Every statement is safe to re-run if you need to.

create extension if not exists pgcrypto;

create table if not exists public.tried_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  date date not null,
  title text not null,
  note text not null,
  description text,
  image_src text,
  image_alt text,
  outcome text not null default '',
  liked text not null default '',
  tags text[] not null default '{}',
  is_public boolean not null default false,
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

drop trigger if exists tried_entries_set_updated_at on public.tried_entries;
create trigger tried_entries_set_updated_at
  before update on public.tried_entries
  for each row
  execute function public.set_updated_at();

alter table public.tried_entries enable row level security;

-- Anyone -- including the anonymous build step that generates the static
-- site -- can read rows marked public. An admin, logged into the admin page,
-- can also read the private ones.
drop policy if exists "tried_entries_public_read" on public.tried_entries;
create policy "tried_entries_public_read"
  on public.tried_entries
  for select
  to anon, authenticated
  using (
    is_public = true
    or public.is_admin()
  );

-- Only an admin can insert, update, or delete a row. Membership is a row in
-- public.admins -- add a person with an INSERT, not by editing this file (see
-- supabase/admins.sql, which must be run before this one). This is what
-- actually keeps everyone else out -- not the admin page's login form, which
-- anyone can view the HTML of.
drop policy if exists "tried_entries_owner_write" on public.tried_entries;
create policy "tried_entries_owner_write"
  on public.tried_entries
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed data: the six entries already live on the site, unchanged. Slugs
-- match the URLs already deployed (/tried/hackathons/ etc.), so nothing
-- that has been shared breaks. All marked public, since they're already
-- visible today.
insert into public.tried_entries (slug, date, title, note, outcome, liked, tags, is_public)
values
  ('seva-cafe-volunteering', '2026-06-18', 'Seva Cafe - Volunteering',
   'I want to volunteer at Seva Cafe, a place where people can come together and share a meal. I want to give back to the community and help those in need.',
   'processing', 'let see', array['people', 'creative'], true),

  ('singing-reel-challenge', '2026-06-18', 'Singing Reel Challenge',
   'Planning to do anonymous singing reels for a month. I want to see if I can get over my fear of singing in public.',
   'processing', 'let see', array['creative'], true),

  ('hackathons', '2026-06-18', 'Hackathons',
   'Tried building under ridiculous time pressure with my IIT friend(TIRTH NANDHA). I liked the chaos, the ideas, and the feeling of making something from nothing.',
   'worked', 'liked it', array['people', 'creative'], true),

  ('singing-in-public', '2026-08-14', 'Singing in Public',
   'I have never sung in public before, so I decided to try it. It was terrifying, but also exhilarating. I forgot about fear and just sang my heart out. I want to do it again.',
   'worked', 'loved it', array['creative'], true),

  ('dancing', '2026-04-10', 'Dancing',
   'I have made a reel of me dancing for the first time. And completed the dare my friend asked me to do. I was in fear of getting laughed at, but I did it anyway.',
   'worked', 'liked it', array['creative'], true),

  ('reading-philosophy', '2024-05-15', 'Reading philosophy',
   'Went down a few philosophical rabbit holes. Some ideas genuinely changed how I think; others made my brain hurt.',
   'mixed', 'mixed feelings', array['ideas'], true)
on conflict (slug) do nothing;
