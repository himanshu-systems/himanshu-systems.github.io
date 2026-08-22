#!/usr/bin/env node
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadRegistry, routeHref, OUT_DIR, STATIC_DIR, rel } from './registry.mjs';
import { hasSnapshot, readSnapshot, fetchSnapshot } from './importer.mjs';
import {
  chromeMarkup,
  injectChrome,
  renderEmbed,
  renderIndex,
  renderNotFound,
  renderRedirect,
  wrapFragment,
} from './render.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? undefined : hit.slice(name.length + 3);
};

const options = {
  base: value('base'),
  // Refetch every external page instead of building from the committed snapshots.
  refresh: flag('refresh'),
};

build().catch((err) => {
  console.error(`\nBuild failed: ${err.message}\n`);
  process.exit(1);
});

async function build() {
  const { site, pages } = await loadRegistry({ base: options.base });
  const base = site.base;

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Building ${pages.length} page${pages.length === 1 ? '' : 's'} at base "${base || '/'}"`);

  const built = [];
  for (const page of pages) {
    const html = await renderPage(page, site, base);
    await emit(page.outPath, html);
    built.push(page);
  }

  // "/" is the collection index unless a registered page already claims it.
  if (!pages.some((page) => page.route === '/')) {
    await emit('index.html', renderIndex(site, built, base));
    console.log(`  index      /                              (generated collection)`);
  }

  await emit('404.html', renderNotFound(site, base));

  // Tell GitHub Pages to serve the output verbatim instead of running Jekyll.
  await emit('.nojekyll', '');

  // A machine-readable copy of the routes, handy for any client-side navigation.
  await emit(
    'pages.json',
    `${JSON.stringify(
      {
        site: { ...site, base },
        pages: built.map((page) => ({
          route: page.route,
          href: routeHref(base, page.route),
          title: page.title,
          description: page.description,
          type: page.type,
          mode: page.mode ?? 'local',
          tags: page.tags,
          ...(page.type === 'external' ? { source: page.url, fetchedAt: page.fetchedAt ?? null } : { file: page.file }),
        })),
      },
      null,
      2,
    )}\n`,
  );

  if (existsSync(STATIC_DIR)) {
    await cp(STATIC_DIR, OUT_DIR, { recursive: true });
    console.log(`  static     ${rel(STATIC_DIR)}/ -> site/`);
  }

  console.log(`\nDone. Output in ${rel(OUT_DIR)}/`);
}

async function renderPage(page, site, base) {
  const chrome = page.chrome ? chromeMarkup(site, base, page) : '';

  if (page.type === 'local') {
    const raw = await readFile(page.absFile, 'utf8');
    const isDocument = /<html[\s>]|<!doctype/i.test(raw);
    const html = isDocument ? raw : wrapFragment(raw, page, site);
    log('local', page.route, page.file);
    return chrome ? injectChrome(html, chrome) : html;
  }

  if (page.mode === 'redirect') {
    log('redirect', page.route, page.url);
    return renderRedirect(page, site);
  }

  if (page.mode === 'embed') {
    log('embed', page.route, page.url);
    return renderEmbed(page, site, base);
  }

  // mode: import - serve our own snapshot of the source.
  let refetched = false;
  if (options.refresh || !hasSnapshot(page)) {
    try {
      const { meta } = await fetchSnapshot(page);
      page.fetchedAt = meta.fetchedAt;
      refetched = true;
      log('import', page.route, `fetched ${page.url}`);
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
  page.fetchedAt = page.fetchedAt ?? meta.fetchedAt;
  if (!refetched) log('import', page.route, `snapshot ${meta.fetchedAt ? meta.fetchedAt.slice(0, 10) : ''}`);
  return chrome ? injectChrome(html, chrome) : html;
}

async function emit(outPath, contents) {
  const dest = path.join(OUT_DIR, outPath);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, contents, 'utf8');
}

function log(kind, route, detail) {
  console.log(`  ${kind.padEnd(10)} ${route.padEnd(30)} ${detail}`);
}
