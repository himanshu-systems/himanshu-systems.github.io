import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { CACHE_DIR, rel } from './registry.mjs';

const USER_AGENT = 'html-docs-to-learn-importer/1.0 (+https://github.com/himanshu-systems/HTML-DOCS-TO-Learn)';

export function snapshotPaths(page) {
  return {
    html: path.join(CACHE_DIR, `${page.slug}.html`),
    meta: path.join(CACHE_DIR, `${page.slug}.meta.json`),
  };
}

export function hasSnapshot(page) {
  return existsSync(snapshotPaths(page).html);
}

export async function readSnapshot(page) {
  const paths = snapshotPaths(page);
  const html = await readFile(paths.html, 'utf8');
  let meta = {};
  try {
    meta = JSON.parse(await readFile(paths.meta, 'utf8'));
  } catch {
    /* meta is optional */
  }
  return { html, meta };
}

/**
 * Download an external page and store a rewritten snapshot under imported/.
 * Returns { changed, meta }.
 */
export async function fetchSnapshot(page, { timeoutMs = 30_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(page.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,*/*' },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`${page.url} responded ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const source = await response.text();
  if (!/html/i.test(contentType) && !/<html|<!doctype/i.test(source)) {
    throw new Error(`${page.url} returned "${contentType || 'unknown content type'}", not HTML.`);
  }

  const finalUrl = response.url || page.url;
  const html = rewriteUrls(source, finalUrl);
  const meta = {
    route: page.route,
    requestedUrl: page.url,
    finalUrl,
    contentType,
    status: response.status,
    bytes: Buffer.byteLength(html),
    sha256: createHash('sha256').update(html).digest('hex'),
    fetchedAt: new Date().toISOString(),
  };

  const paths = snapshotPaths(page);
  const previous = existsSync(paths.html) ? await readFile(paths.html, 'utf8') : null;
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(paths.html, html, 'utf8');
  await writeFile(paths.meta, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  return { changed: previous !== html, meta, file: rel(paths.html) };
}

const URL_ATTRIBUTES = ['src', 'href', 'poster', 'action', 'formaction', 'data-src', 'xlink:href'];
const NON_URL = /^(?:#|data:|blob:|about:|javascript:|mailto:|tel:|sms:)/i;
const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Rewrite relative references in a fetched document so they keep resolving
 * against the source origin once the HTML is served from our own domain.
 */
export function rewriteUrls(html, sourceUrl) {
  let base = sourceUrl;
  let out = html;

  // A <base href> in the source changes how its own relative URLs resolve.
  // Honour it, then drop the tag so our absolute rewrites stay authoritative.
  const baseTag = out.match(/<base\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (baseTag) {
    try {
      base = new URL(baseTag[1], sourceUrl).href;
    } catch {
      /* keep sourceUrl */
    }
    out = out.replace(baseTag[0], '');
  }

  const resolve = (value) => {
    const trimmed = value.trim();
    if (!trimmed || NON_URL.test(trimmed) || ABSOLUTE.test(trimmed)) return value;
    try {
      return new URL(trimmed, base).href;
    } catch {
      return value;
    }
  };

  const attrPattern = new RegExp(
    String.raw`(\s(?:${URL_ATTRIBUTES.join('|')})\s*=\s*)(["'])([^"']*)\2`,
    'gi',
  );
  out = out.replace(attrPattern, (match, lead, quote, value) => `${lead}${quote}${resolve(value)}${quote}`);

  // The same attributes, written without quotes (common in minified HTML).
  const bareAttrPattern = new RegExp(
    String.raw`(\s(?:${URL_ATTRIBUTES.join('|')})\s*=\s*)([^\s"'=<>` + '`' + String.raw`]+)`,
    'gi',
  );
  out = out.replace(bareAttrPattern, (match, lead, value) => `${lead}${resolve(value)}`);

  // srcset / imagesrcset: comma-separated "url descriptor" pairs.
  out = out.replace(
    /(\s(?:srcset|imagesrcset)\s*=\s*)(["'])([^"']*)\2/gi,
    (match, lead, quote, value) => {
      const rewritten = value
        .split(',')
        .map((candidate) => {
          const parts = candidate.trim().split(/\s+/);
          if (!parts[0]) return candidate.trim();
          parts[0] = resolve(parts[0]);
          return parts.join(' ');
        })
        .filter(Boolean)
        .join(', ');
      return `${lead}${quote}${rewritten}${quote}`;
    },
  );

  // url(...) inside <style> blocks and style="" attributes.
  out = out.replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi, (match, quote, value) => {
    const resolved = resolve(value);
    return resolved === value ? match : `url(${quote}${resolved}${quote})`;
  });

  return out;
}
