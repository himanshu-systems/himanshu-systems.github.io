-- Set "Selected work" to the real project list.
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- The SQL editor connects as the postgres role, which bypasses RLS -- that is
-- why this works when the app's publishable key does not. A PATCH with the
-- publishable key returns HTTP 200 with an empty body and changes nothing,
-- because the write policy on site_content filters the row out before the
-- UPDATE ever matches it. See supabase/site_content.sql.

update public.site_content
set work = '[
  {
    "year": "2026",
    "title": "nats.studio",
    "blurb": "A desktop GUI for NATS — connect, publish and subscribe, and manage JetStream streams, consumers, KV and object stores from one cross-platform app.",
    "href": "https://github.com/himanshu-systems/nats-studio"
  }
]'::jsonb
where id = 1;

-- Verify:
select jsonb_pretty(work) from public.site_content where id = 1;
