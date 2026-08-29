---
name: supabase-cms
description: Explains how the database and admin dashboard work for this project. Activate when modifying data access, the /admin interface, or Supabase integrations.
---

# Supabase Data Layer & CMS

This project uses Supabase for dynamic content, specifically the About page and the "Tried" (experiments) log.

## Architecture
- **Data Source**: Content does not live in markdown files. It lives in Postgres tables: `site_content` and `tried_entries`.
- **Build-Time Fetching**: Astro pages (`src/pages/index.astro`, `src/pages/tried.astro`) fetch data at build time via `src/lib/site.ts` and `src/lib/tried.ts`.
- **Caching**: Data fetches are cached in `.cache/` to survive Supabase outages during builds.
- **Client-Side CMS**: The `/admin` page is a complex, login-gated client-side CMS that writes to Supabase. It uses the `src/lib/admin/` modules (e.g., `aboutEditor.ts`, `triedEditor.ts`).

## Security
- The project uses **Row Level Security (RLS)**. 
- The client-side code (`src/lib/supabaseClient.ts`) uses the *publishable key*.
- RLS ensures anonymous users (and the Astro build) can only read `is_public = true` rows.
- Only the authenticated admin user can write to the tables or the `site-images` storage bucket.

## Making Changes
- To add new fields to the site, you must update the SQL schema (`supabase/schema.sql` or `supabase/site_content.sql`), update the TypeScript types in `src/lib/`, and update the UI in `src/pages/admin.astro`.
- To edit content, you do not modify source files. The user must log in to the deployed `/admin` route or run the site locally and visit `http://localhost:4321/admin`.
- When an edit is made in `/admin`, Supabase database webhooks trigger a GitHub Action to rebuild the static site.
