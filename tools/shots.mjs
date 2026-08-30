/**
 * Generates the hover-preview thumbnails for /pages.
 *
 * Deliberately NOT part of `npm run build`. Playwright is a local-only tool
 * here -- it is not in package.json, and CI does not install a browser -- so
 * wiring this into the build would make the GitHub Pages deploy depend on a
 * binary that is not there. Instead the JPEGs are committed to static/previews/
 * and the build just copies them like any other static asset. Run this by hand
 * (`npm run shots`) after adding or editing a page, then commit the output.
 *
 * Sources are the raw pages/*.html files, not dist/. They are self-contained
 * documents (that is why the router serves them verbatim), so file:// renders
 * them faithfully with no base-path rewriting, and they do not carry the chrome
 * bar prepare.mjs injects -- which would only be noise in a 240px thumbnail.
 *
 * Re-shooting is skipped when the source file's hash is unchanged, so the
 * common case (one page edited) costs one screenshot, not nine.
 */

import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// static/, not public/: prepare.mjs does `rm -rf public/` on every build and
// regenerates it, and public/ is gitignored. static/ is the committed asset
// home (see tools/registry.mjs STATIC_DIR); prepare copies it into public/.
const outDir = join(root, 'static', 'previews');
// Beside the tool, not inside static/: anything under static/ is copied into
// public/ and then dist/, and this is build bookkeeping, not a site asset.
// Committed (unlike .cache/, which is gitignored) so a fresh checkout with the
// thumbnails already in it does not re-shoot all nine.
const manifestPath = join(root, 'tools', 'previews.manifest.json');

/**
 * 3x the 240x150 CSS box the panel renders at, so it stays crisp on a 2x
 * display with headroom. JPEG because Playwright only encodes png/jpeg, and a
 * png of a text-heavy page is roughly 6x the bytes for no visible gain here.
 */
const SHOT = { width: 720, height: 450 };
const QUALITY = 78;

const slugFor = (route) => route.replace(/^\//, '').replace(/\//g, '-') || 'index';

const force = process.argv.includes('--force');

const registry = JSON.parse(readFileSync(join(root, 'pages.json'), 'utf8'));
const targets = registry.pages.filter((p) => p.type === 'local' && p.file);

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const manifest = existsSync(manifestPath) && !force
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : {};

const wanted = new Set(targets.map((p) => slugFor(p.route)));
const next = {};
const todo = [];

for (const page of targets) {
  const abs = join(root, page.file);
  if (!existsSync(abs)) {
    console.warn(`  skip ${page.route} -- ${page.file} is missing`);
    continue;
  }

  const slug = slugFor(page.route);
  const hash = createHash('sha256').update(readFileSync(abs)).digest('hex').slice(0, 16);
  const shotPath = join(outDir, `${slug}.jpg`);

  next[slug] = { hash, route: page.route, title: page.title };

  // A recorded hash only counts if the image it describes is still on disk.
  if (manifest[slug]?.hash === hash && existsSync(shotPath)) continue;
  todo.push({ page, slug, abs, shotPath });
}

// Drop thumbnails for routes that are no longer in the registry, so a removed
// page does not leave an orphan asset shipping forever.
for (const file of readdirSync(outDir)) {
  if (!file.endsWith('.jpg')) continue;
  const slug = file.slice(0, -4);
  if (wanted.has(slug)) continue;
  unlinkSync(join(outDir, file));
  console.log(`  removed orphan ${file}`);
}

if (todo.length === 0) {
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`previews up to date (${Object.keys(next).length} pages, nothing to re-shoot)`);
  process.exit(0);
}

console.log(`shooting ${todo.length} of ${targets.length} page(s)...`);

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: SHOT,
  deviceScaleFactor: 1,
  // These documents pull webfonts from Google. Without a real UA some CDNs
  // serve a fallback stylesheet, and the thumbnail then misrepresents the page.
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
});

let shot = 0;
let failed = 0;

for (const { page, slug, abs, shotPath } of todo) {
  const tab = await context.newPage();
  try {
    await tab.goto(pathToFileURL(abs).href, { waitUntil: 'load', timeout: 30_000 });
    // networkidle can never settle on a page with a polling timer or a looping
    // animation, so wait on the fonts instead -- that is the thing that
    // actually changes what the thumbnail looks like -- and cap it.
    await tab.evaluate(() => document.fonts.ready).catch(() => {});
    await tab.waitForTimeout(400);
    await tab.screenshot({ path: shotPath, type: 'jpeg', quality: QUALITY });
    shot += 1;
    console.log(`  ${page.route} -> previews/${slug}.jpg`);
  } catch (err) {
    // One bad page must not cost the whole run: drop its hash so the next
    // invocation retries it, and keep going.
    failed += 1;
    delete next[slug];
    console.warn(`  FAILED ${page.route}: ${err.message.split('\n')[0]}`);
  } finally {
    await tab.close();
  }
}

await browser.close();

writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`done: ${shot} shot, ${failed} failed, ${targets.length} total`);
if (failed > 0) process.exitCode = 1;
