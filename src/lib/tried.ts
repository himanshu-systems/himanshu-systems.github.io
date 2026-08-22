import { supabase } from './supabaseClient';
import { routeHref } from './paths';

export interface TriedRow {
  date: string;
  title: string;
  note: string;
  description?: string;
  image?: { src: string; alt: string };
  outcome: string;
  liked: string;
  tags: string[];
  /** URL segment for this entry's own page: /tried/<slug>/ */
  slug: string;
  href: string;
  /** Pre-lowercased text for the client-side filter. */
  search: string;
}

interface Row {
  slug: string;
  date: string;
  title: string;
  note: string;
  description: string | null;
  image_src: string | null;
  image_alt: string | null;
  outcome: string;
  liked: string;
  tags: string[];
}

function toRow(row: Row): TriedRow {
  const search = [row.title, row.note, row.description ?? '', row.outcome, row.liked, ...row.tags]
    .join(' ')
    .toLowerCase();

  return {
    date: row.date,
    title: row.title,
    note: row.note,
    description: row.description ?? undefined,
    image: row.image_src ? { src: row.image_src, alt: row.image_alt ?? '' } : undefined,
    outcome: row.outcome,
    liked: row.liked,
    tags: row.tags ?? [],
    slug: row.slug,
    href: routeHref(`/tried/${row.slug}`),
    search,
  };
}

/**
 * Only rows marked public -- this runs at build time with the publishable
 * key, which RLS only lets read is_public = true rows (see
 * supabase/schema.sql). A private entry simply isn't fetched, so its page
 * doesn't exist on the built site until you flip it public and the site
 * rebuilds.
 *
 * Ordered newest first; same-date entries break ties by when they were
 * logged, so order is always deterministic even if you write entries out
 * of date order in the admin page.
 */
export async function getTriedRows(): Promise<TriedRow[]> {
  const { data, error } = await supabase
    .from('tried_entries')
    .select('slug, date, title, note, description, image_src, image_alt, outcome, liked, tags')
    .eq('is_public', true)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Could not load tried_entries from Supabase: ${error.message}`);
  }

  return (data ?? []).map(toRow);
}
