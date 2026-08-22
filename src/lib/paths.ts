/**
 * Astro's BASE_URL arrives without a trailing slash for a project site
 * (`/HTML-DOCS-TO-Learn`), so joining it by template literal silently produces
 * `/HTML-DOCS-TO-Learnfavicon.svg`. Everything goes through these helpers instead.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** The collection index. */
export const home = `${BASE}/`;

/** A file served from the site root, e.g. asset('favicon.svg'). */
export function asset(file: string): string {
  return `${BASE}/${file.replace(/^\//, '')}`;
}

/** The browser-facing URL for a registered route. */
export function routeHref(route: string): string {
  return route === '/' ? home : `${BASE}${route}/`;
}
