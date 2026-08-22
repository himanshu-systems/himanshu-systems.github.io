#!/usr/bin/env node
/**
 * Fill public/ before Astro runs.
 *
 * public/ is entirely generated (and gitignored). It holds:
 *   - passthrough pages: complete HTML documents - imported snapshots and local
 *     full documents - copied verbatim so nothing rewrites their markup
 *   - a routes manifest for the collection index
 *   - anything in static/, copied as-is
 *
 * Astro then treats public/ as its static directory and copies it into dist/.
 */
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadRegistry, classify, PUBLIC_DIR, STATIC_DIR, rel } from './registry.mjs';
import { hasSnapshot, readSnapshot, fetchSnapshot } from './importer.mjs';
import { chromeMarkup, injectChrome } from './chrome.mjs';

const args = process.argv.slice(2);
const refresh = args.includes('--refresh');

main().catch((err) => {
  console.error(`\nprepare failed: ${err.message}\n`);
  process.exit(1);
});

async function main() {
  // loadRegistry already resolves BASE_PATH over pages.json's site.base.
  const { site, pages } = await loadRegistry();
  const base = normalizeBaseUrl(site.base);
  // The pill points at the collection index, which lives at /pages now that
  // the site root is the about page.
  // joinBase, not a template literal: normalizeBaseUrl already ends in a slash.
  const collection = joinBase(base, '/pages');

  await rm(PUBLIC_DIR, { recursive: true, force: true });
  await mkdir(PUBLIC_DIR, { recursive: true });

  const manifest = [];
  let passthrough = 0;

  for (const page of pages) {
    const owner = await classify(page);
    const entry = {
      route: page.route,
      href: joinBase(base, page.route),
      title: page.title,
      description: page.description,
      type: page.type,
      mode: page.mode ?? 'local',
      tags: page.tags,
      renderedBy: owner,
    };

    if (page.type === 'external') {
      entry.source = page.url;
    } else {
      entry.file = page.file;
    }

    if (owner === 'passthrough') {
      const { html, fetchedAt } = await passthroughHtml(page);
      const chrome = page.chrome
        ? chromeMarkup({ collection, sourceUrl: page.type === 'external' ? page.url : null, title: site.title })
        : '';
      await emit(page.route, chrome ? injectChrome(html, chrome) : html);
      entry.fetchedAt = fetchedAt ?? null;
      passthrough++;
      console.log(`  passthrough  ${page.route.padEnd(28)} ${page.type === 'external' ? 'snapshot' : page.file}`);
    } else {
      console.log(`  astro        ${page.route.padEnd(28)} ${page.type === 'external' ? page.mode : page.file}`);
    }

    manifest.push(entry);
  }

  await writeFile(
    path.join(PUBLIC_DIR, 'pages.json'),
    `${JSON.stringify({ site: { ...site, base }, pages: manifest }, null, 2)}\n`,
    'utf8',
  );

  if (existsSync(STATIC_DIR)) {
    await cp(STATIC_DIR, PUBLIC_DIR, { recursive: true });
    console.log(`  static       ${rel(STATIC_DIR)}/ -> public/`);
  }

  console.log(`\nprepared ${pages.length} route${pages.length === 1 ? '' : 's'} (${passthrough} passthrough) in ${rel(PUBLIC_DIR)}/`);
}

async function passthroughHtml(page) {
  if (page.type === 'local') {
    return { html: await readFile(page.absFile, 'utf8'), fetchedAt: null };
  }

  if (refresh || !hasSnapshot(page)) {
    try {
      const { meta } = await fetchSnapshot(page);
      console.log(`  fetched      ${page.route.padEnd(28)} ${page.url}`);
      const { html } = await readSnapshot(page);
      return { html, fetchedAt: meta.fetchedAt };
    } catch (err) {
      if (!hasSnapshot(page)) {
        throw new Error(
          `No snapshot for "${page.route}" and the fetch failed: ${err.message}\n` +
            `  Run "node tools/import.mjs --route ${page.route}" once the source is reachable, ` +
            `or switch that page to "mode": "embed".`,
        );
      }
      console.warn(`  ! ${page.route}: fetch failed (${err.message}); using the committed snapshot.`);
    }
  }

  const { html, meta } = await readSnapshot(page);
  return { html, fetchedAt: meta.fetchedAt ?? null };
}

/** Write to public/<route>/index.html so GitHub Pages serves a clean URL. */
async function emit(route, html) {
  const dir = route === '/' ? PUBLIC_DIR : path.join(PUBLIC_DIR, ...route.replace(/^\//, '').split('/'));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), html, 'utf8');
}

/** Astro's BASE_URL convention: always a leading and a trailing slash. */
function normalizeBaseUrl(value) {
  const trimmed = String(value ?? '').trim().replace(/\/+$/, '');
  return trimmed === '' ? '/' : `${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}/`;
}

function joinBase(baseUrl, route) {
  if (route === '/') return baseUrl;
  return `${baseUrl.replace(/\/$/, '')}${route}/`;
}
