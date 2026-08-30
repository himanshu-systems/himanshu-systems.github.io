-- Replaces the hardcoded owner email in every policy with an admins table.
--
-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run. Run this AFTER schema.sql, site_content.sql, blog_schema.sql
-- and storage.sql, because it drops and recreates the policies they define.
--
-- Why this exists
-- ---------------
-- Every write policy previously read:
--
--   using ((auth.jwt() ->> 'email') = 'himanshuchavdacodes@gmail.com')
--
-- so a second Supabase Auth user could sign in perfectly well and then have
-- every write rejected -- authentication succeeded, authorisation did not.
-- Adding a person meant editing four .sql files and re-running them. Now it is
-- one INSERT into public.admins.
--
-- Why a SECURITY DEFINER function and not `exists (select 1 from admins ...)`
-- inline: a policy that queries a table which itself has RLS re-enters policy
-- evaluation and Postgres raises 42P17 infinite recursion. A SECURITY DEFINER
-- function runs as its owner and skips RLS on the tables it touches, which
-- breaks the cycle. `set search_path` is not optional on such a function --
-- without it a caller can prepend a schema and have the body resolve `admins`
-- to a table they control.

create table if not exists public.admins (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Bootstrap: make every account that already exists in Supabase Auth an admin.
--
-- This reads auth.users, which the SQL editor can do because it connects as
-- postgres. It means you do not have to type the addresses, and it cannot lock
-- you out of your own project.
--
-- It is a ONE-TIME bootstrap, not a rule. Accounts created after this runs are
-- NOT admins -- membership is this table, and nothing keeps it in step with
-- auth.users afterwards. That is deliberate: "anyone who can sign up can write"
-- is exactly what the policies are here to prevent. Keep public sign-up
-- disabled (Authentication -> Providers -> Email) and add people explicitly.
--
-- If you have accounts in Auth that should NOT be able to edit the site, do not
-- run this block -- insert the specific addresses instead:
--   insert into public.admins (email, note) values ('you@example.com', 'why');
insert into public.admins (email, note)
select u.email, 'bootstrapped from auth.users'
from auth.users u
where u.email is not null
on conflict (email) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Case-insensitive: Postgres text compare is exact, but email is not, and a
  -- capitalised sign-in should not silently lose write access.
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(nullif(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Admins can see and manage the admin list. Safe against recursion because
-- is_admin() is SECURITY DEFINER and so does not re-trigger these policies.
drop policy if exists "admins_read" on public.admins;
create policy "admins_read"
  on public.admins
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins_write" on public.admins;
create policy "admins_write"
  on public.admins
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Repoint every existing policy at is_admin().
-- ---------------------------------------------------------------------------

-- site_content: the about page. Public read, admin write.
drop policy if exists "site_content_owner_write" on public.site_content;
create policy "site_content_owner_write"
  on public.site_content
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- tried_entries: public rows are world-readable, admins also see private ones.
drop policy if exists "tried_entries_public_read" on public.tried_entries;
create policy "tried_entries_public_read"
  on public.tried_entries
  for select
  to anon, authenticated
  using (is_public = true or public.is_admin());

drop policy if exists "tried_entries_owner_write" on public.tried_entries;
create policy "tried_entries_owner_write"
  on public.tried_entries
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- blog_posts: published rows are world-readable, admins also see drafts.
drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read"
  on public.blog_posts
  for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "blog_posts_owner_write" on public.blog_posts;
create policy "blog_posts_owner_write"
  on public.blog_posts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- storage: uploaded images in the site-images bucket.
drop policy if exists "site_images_owner_write" on storage.objects;
create policy "site_images_owner_write"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'site-images' and public.is_admin())
  with check (bucket_id = 'site-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Adding someone later (run as SQL, or from /admin once you are an admin):
--
--   insert into public.admins (email, note) values ('them@example.com', 'why');
--
-- Removing:
--
--   delete from public.admins where email = 'them@example.com';
--
-- Check who is currently an admin, and whether every Auth account is covered:
--
--   select * from public.admins order by created_at;
--
--   select u.email,
--          (a.email is not null) as is_admin
--   from auth.users u
--   left join public.admins a on lower(a.email) = lower(u.email)
--   order by u.created_at;
--
-- And, from a signed-in session in the browser, whether YOU can write:
--
--   select auth.jwt() ->> 'email' as signed_in_as, public.is_admin() as can_write;
--
-- That last query is the one to run when /admin says a write was rejected: it
-- shows the address the policy actually sees, which is often not the address
-- you think you signed in with.
-- ---------------------------------------------------------------------------
