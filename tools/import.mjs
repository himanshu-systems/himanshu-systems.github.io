#!/usr/bin/env node
/**
 * Download external pages into imported/ so this repository, not the source,
 * is what GitHub Pages serves.
 *
 *   node tools/import.mjs                  refresh every external page
 *   node tools/import.mjs --route /demo    refresh one route
 *   node tools/import.mjs --missing        fetch only routes with no snapshot yet
 */
import { loadRegistry, normalizeRoute } from './registry.mjs';
import { fetchSnapshot, hasSnapshot } from './importer.mjs';

const args = process.argv.slice(2);
const routeArg = readValue('route');
const onlyMissing = args.includes('--missing');

main().catch((err) => {
  console.error(`\nImport failed: ${err.message}\n`);
  process.exit(1);
});

async function main() {
  const { pages } = await loadRegistry();
  let targets = pages.filter((page) => page.type === 'external' && page.mode === 'import');

  if (routeArg) {
    const route = normalizeRoute(routeArg, '--route');
    targets = targets.filter((page) => page.route === route);
    if (targets.length === 0) {
      throw new Error(`No importable page registered at "${route}".`);
    }
  }
  if (onlyMissing) {
    targets = targets.filter((page) => !hasSnapshot(page));
  }

  if (targets.length === 0) {
    console.log('Nothing to import.');
    return;
  }

  let failures = 0;
  for (const page of targets) {
    process.stdout.write(`  ${page.route} <- ${page.url} ... `);
    try {
      const result = await fetchSnapshot(page);
      const kb = (result.meta.bytes / 1024).toFixed(1);
      console.log(`${result.changed ? 'updated' : 'unchanged'} (${kb} kB -> ${result.file})`);
    } catch (err) {
      failures++;
      console.log(`FAILED\n      ${err.message}`);
    }
  }

  if (failures) {
    throw new Error(`${failures} of ${targets.length} import${targets.length === 1 ? '' : 's'} failed.`);
  }
  console.log(`\nImported ${targets.length} page${targets.length === 1 ? '' : 's'}. Commit imported/ to keep the snapshots.`);
}

function readValue(name) {
  const inline = args.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const at = args.indexOf(`--${name}`);
  return at !== -1 ? args[at + 1] : undefined;
}
