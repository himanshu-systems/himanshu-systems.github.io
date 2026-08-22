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
anyone view an uploaded image but only you add or replace one.

## 2. Create your login — and only yours

**Authentication → Users → Add user.** Use `himanshuchavdacodes@gmail.com`
(or whatever email you want to log into the admin page with — if it's
different, edit the two `'himanshuchavdacodes@gmail.com'` literals in
`schema.sql` to match, and re-run just those two `create policy` blocks) and
set a password. Toggle **"Auto confirm user"** on so you don't need to click
an email link.

Then: **Authentication → Providers → Email → disable "Allow new users to
sign up."** Without this, anyone could create their own account — the RLS
policy above only lets *your* email write, but there's no reason to leave
public sign-up open on a project that should only ever have one user.

This — the RLS policy plus this one account — is what actually keeps everyone
else out. The admin page's login form is not the security boundary; anyone
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
