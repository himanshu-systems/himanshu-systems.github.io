#!/usr/bin/env node
/**
 * Register a page in pages.json.
 *
 *   node tools/add.mjs --route /claude-demo --url https://claude.site/artifacts/abc --title "Claude demo"
 *   node tools/add.mjs --route /notes/css --file pages/css.html --title "CSS notes"
 *
 * Flags: --mode import|embed|redirect (external only, default import)
 *        --description "..."   --tags a,b,c   --no-import (skip the fetch)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { REGISTRY_FILE, ROOT, loadRegistry, normalizeRoute, routeToSlug, titleFromRoute, rel } from './registry.mjs';
import { fetchSnapshot } from './importer.mjs';

const args = process.argv.slice(2);

main().catch((err) => {
  console.error(`\nCould not add the page: ${err.message}\n`);
  process.exit(1);
});

async function main() {
  const route = normalizeRoute(required('route'), '--route');
  const url = readValue('url');
  const file = readValue('file');

  if (!url && !file) throw new Error('Pass --url for an external page or --file for a local one.');
  if (url && file) throw new Error('Pass either --url or --file, not both.');

  const { pages } = await loadRegistry();
  if (pages.some((page) => page.route === route)) {
    throw new Error(`Route "${route}" is already registered. Edit pages.json to change it.`);
  }

  const entry = {
    route,
    title: readValue('title') ?? titleFromRoute(route),
    description: readValue('description') ?? '',
    type: url ? 'external' : 'local',
  };

  const tags = readValue('tags');
  if (tags) entry.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);

  if (url) {
    entry.url = new URL(url).href;
    entry.mode = readValue('mode') ?? 'import';
    if (!['import', 'embed', 'redirect'].includes(entry.mode)) {
      throw new Error(`--mode must be import, embed or redirect (got "${entry.mode}").`);
    }
  } else {
    const relFile = path.relative(ROOT, path.resolve(ROOT, file)).split(path.sep).join('/');
    if (!existsSync(path.join(ROOT, relFile))) throw new Error(`${relFile} does not exist.`);
    entry.file = relFile;
  }

  const registry = JSON.parse(await readFile(REGISTRY_FILE, 'utf8'));
  registry.pages.push(entry);
  await writeFile(REGISTRY_FILE, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  console.log(`Added "${entry.title}" at ${route} to ${rel(REGISTRY_FILE)}`);

  if (entry.type === 'external' && entry.mode === 'import' && !args.includes('--no-import')) {
    process.stdout.write(`Fetching snapshot ... `);
    const { meta, file: saved } = await fetchSnapshot({ ...entry, slug: routeToSlug(route) });
    console.log(`saved ${(meta.bytes / 1024).toFixed(1)} kB to ${saved}`);
  }

  console.log('Next: npm run build');
}

function readValue(name) {
  const inline = args.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const at = args.indexOf(`--${name}`);
  return at !== -1 ? args[at + 1] : undefined;
}

function required(name) {
  const v = readValue(name);
  if (!v) throw new Error(`--${name} is required.`);
  return v;
}
