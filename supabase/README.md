# Supabase setup

Everything code-side is done. These five steps are manual dashboard/token work
that only you can do — they're what actually makes the admin page yours alone.

## 1. Run the schema

Supabase dashboard → **SQL Editor** → New query → paste all of `schema.sql` →
**Run**. Creates the `tried_entries` table, turns on Row Level Security, and
seeds the six entries already on the site (marked public, same slugs,
nothing changes on the live site).

Then do the same with **`site_content.sql`** — a second, separate table for
everything on the about page (name, intro, "What I do", Selected work,
Images, Elsewhere). It's seeded with exactly what's on the site today, so
this doesn't change anything either until you edit it in `/admin`.

Then **`storage.sql`** — creates the `site-images` bucket that the
"Upload a photo" buttons in `/admin` write to, and the policies that let
anyone view an uploaded image but only an admin add or replace one.

Finally **`admins.sql`** — run this **last**, after the other four. It creates
the `admins` table and the `is_admin()` function, and repoints every policy at
it. Before this file existed, each policy compared against one hardcoded email
literal, so a second Auth user could sign in and then have every write silently
rejected. Now write access is a row in a table.

## 2. Create your login — and only yours

**Authentication → Users → Add user.** Set an email and password, and toggle
**"Auto confirm user"** on so you don't need to click an email link.

Creating the Auth user is only half of it. Authentication says *who you are*;
the RLS policies decide *what you may write*, and they check `public.admins`.
An account that exists in Auth but not in that table logs in perfectly and then
has every write rejected — which is exactly what "I can log in but can't edit
anything" looks like. So add the address there too:

```sql
insert into public.admins (email, note) values ('you@example.com', 'why');
```

If a write is refused, run this to see the address the policy actually sees —
it is often not the one you think you signed in with:

```sql
select auth.jwt() ->> 'email' as signed_in_as, public.is_admin() as can_write;
```

Then: **Authentication → Providers → Email → disable "Allow new users to
sign up."** Without this, anyone could create their own account — the RLS
policies above only let an admin write, but there's no reason to leave public
sign-up open on a project with a handful of trusted users.

This — the RLS policies plus the `admins` table — is what actually keeps
everyone else out. The admin page's login form is not the security boundary; anyone
can view its HTML. Someone without your password gets a Supabase auth error
on every write, no matter what they do in the browser.

## 3. A GitHub token, scoped to just this repo

The admin page can't safely trigger a rebuild directly — that would mean
shipping a powerful GitHub token inside the browser bundle, for anyone to
copy. Instead, Supabase's own server calls GitHub directly (step 4), and only
Supabase ever holds this token.

**github.com → Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token.**

- **Repository access:** Only select repositories → `himanshu-systems.github.io`
- **Permissions:** Contents → **Read and write**
- Copy the token (starts with `github_pat_`) — you won't see it again.

## 4. A Database Webhook that triggers a rebuild

**Supabase dashboard → Database → Webhooks → Create a new hook.** Webhooks
are per-table, so make **two** — one for each content table. Same URL,
headers, and body both times; only the Table field changes.

| Field | Value |
|---|---|
| Table | `tried_entries` (make a second hook with `site_content`) |
| Events | Insert, Update, Delete |
| Type | HTTP Request |
| Method | POST |
| URL | `https://api.github.com/repos/himanshu-systems/himanshu-systems.github.io/dispatches` |
| Headers | `Authorization: Bearer <the token from step 3>` <br> `Accept: application/vnd.github+json` <br> `Content-Type: application/json` |
| Body | `{"event_type": "content-updated"}` |

Every save/delete on either table now fires its webhook, which asks GitHub to
run the deploy workflow — live in about 30–60 seconds, no manual step.

## 5. Add the two committed env values to your local `.env` if it's ever missing

`.env` (committed, not secret) should already have:

```
PUBLIC_SUPABASE_URL=https://vuvfmppdnjoafvcoxhtf.supabase.co
PUBLIC_SUPABASE_KEY=sb_publishable_ooUssMN3D-5ybBIynGfVuw_wvsk-6VZ
```

These are the *publishable* key — safe to commit, safe to ship to the
browser. Never put the **service_role** key or the GitHub token from step 3
anywhere in the repo; if you ever need a secret locally, it goes in
`.env.local`, which is gitignored.

---

Once steps 1–4 are done: visit `/admin`, log in, and try editing something.
Watch the Actions tab on GitHub — a new run should start within a few seconds
of saving.
