/**
 * Astro's BASE_URL arrives without a trailing slash for a project site
 * (`/my-repo`), so joining it by template literal silently produces
 * `/my-repofavicon.svg`. Everything goes through these helpers instead. This site
 * now serves from the domain root, where BASE_URL is just "/", but the helpers
 * stay so a move back to a project path needs no other change.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** The site root, which is the about page. */
export const home = `${BASE}/`;

/** The generated collection index, listing every registered page. */
export const collection = `${BASE}/pages/`;

/** A file served from the site root, e.g. asset('favicon.svg'). */
export function asset(file: string): string {
  return `${BASE}/${file.replace(/^\//, '')}`;
}

/**
 * Images from /admin can be either a path to a file committed under
 * static/images/, or a full URL from an upload to Supabase Storage.
 * The latter is already absolute -- joining it to BASE would break it.
 */
export function resolveImage(src: string): string {
  return /^https?:\/\//.test(src) ? src : asset(src);
}

/**
 * Browser-facing URL for a registered route within the Astro context.
 *
 * NOTE on routeHref boundary:
 * This version runs in Astro context where `import.meta.env.BASE_URL` is available,
 * taking a single `route` argument.
 * A separate `routeHref(base, route)` function exists in `tools/registry.mjs` for
 * plain Node.js tooling (prepare.mjs, add.mjs) where `import.meta.env.BASE_URL`
 * doesn't exist and the base path must be supplied explicitly.
 * They intentionally have different signatures for their different environments.
 */
export function routeHref(route: string): string {
  return route === '/' ? home : `${BASE}${route}/`;
}
