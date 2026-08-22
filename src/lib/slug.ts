/** Same rule the site has always used for /tried/<slug> URLs. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'entry';
}

/** Appends -2, -3, ... until the slug isn't in `taken`. */
export function uniqueSlug(title: string, taken: Set<string>, ignoreSlug?: string): string {
  const base = slugify(title);
  if (base === ignoreSlug || !taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`) && `${base}-${i}` !== ignoreSlug) i++;
  return `${base}-${i}`;
}
