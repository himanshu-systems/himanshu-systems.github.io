import { tried, type TriedEntry } from '../data/tried';
import { routeHref } from './paths';

export interface TriedRow extends TriedEntry {
  /** URL segment for this entry's own page: /tried/<slug>/ */
  slug: string;
  href: string;
  /** Pre-lowercased text for the client-side filter. */
  search: string;
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'entry';
}

/**
 * Sorted newest first regardless of the order entries are written in
 * tried.ts, with a numeric suffix on any slug that collides (two entries
 * titled the same thing) so every entry still gets its own page.
 */
function buildRows(): TriedRow[] {
  const sorted = [...tried].sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Map<string, number>();

  return sorted.map((entry) => {
    const base = slugify(entry.title);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count + 1}`;

    const search = [entry.title, entry.note, entry.description ?? '', entry.outcome, entry.liked, ...entry.tags]
      .join(' ')
      .toLowerCase();

    return { ...entry, slug, href: routeHref(`/tried/${slug}`), search };
  });
}

export const triedRows: TriedRow[] = buildRows();
