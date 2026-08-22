import { createClient } from '@supabase/supabase-js';

/**
 * One client, used both at build time (Astro frontmatter, reading only
 * public rows) and in the browser (the admin page, after login). Safe to
 * share: this is the publishable key, meant to be visible in client
 * bundles -- protection comes from the RLS policies in supabase/schema.sql,
 * not from keeping this value secret.
 */
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_KEY,
);
