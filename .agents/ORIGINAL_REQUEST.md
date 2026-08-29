# Original User Request

## Initial Request — 2026-08-29T10:19:54Z

Implement a new "Blog" content collection backed by Supabase Postgres and fully editable via the existing `/admin` CMS.

Working directory: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\teamwork_preview_orchestrator_1`
Project workspace: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn`
Original request file: `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\ORIGINAL_REQUEST.md`

Please read `ORIGINAL_REQUEST.md` and the available skills (`supabase-cms` at `C:\Users\Lenovo\Documents\Hackathon\HTML-DOCS-TO-Learn\.agents\skills\supabase_cms\SKILL.md` and `registry-manager` if relevant). Follow all design constraints in `DESIGN.md` / rules (`strict_design.md`).

Orchestrate the full implementation:
1. R1. Database Schema (`supabase/blog_schema.sql` with accurate RLS policies matching existing tables).
2. R2. Public Astro Pages (`src/pages/blog.astro` and `src/pages/blog/[slug].astro` with `.cache/` fallback strategy matching `src/lib/tried.ts` and minimalist design constraints with `Doc.astro` layout).
3. R3. Admin CMS Integration (`src/pages/admin.astro` and `src/lib/admin/blogEditor.ts` leveraging `richEditor.ts` and `imageUpload.ts`).

Verify all acceptance criteria, ensure builds pass without errors, and report completion back to me.
