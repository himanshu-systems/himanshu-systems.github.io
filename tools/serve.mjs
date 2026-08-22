#!/usr/bin/env node
/** Static preview of site/ - the closest local stand-in for GitHub Pages. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { OUT_DIR, loadRegistry, normalizeBase } from './registry.mjs';

const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
};

// Prefer the manifest the last build emitted - it reflects the base path the
// output was actually built with, which `npm run dev` deliberately empties.
const base = normalizeBase(await builtBase());

async function builtBase() {
  try {
    const manifest = JSON.parse(await readFile(path.join(OUT_DIR, 'pages.json'), 'utf8'));
    return manifest.site?.base ?? '';
  } catch {
    const { site } = await loadRegistry().catch(() => ({ site: { base: '' } }));
    return site.base;
  }
}

createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad request', 'text/plain');
  }

  // Accept both http://localhost/x and http://localhost<base>/x so the same
  // build works whether or not it was made for a project-pages base path.
  if (base && (pathname === base || pathname.startsWith(`${base}/`))) {
    pathname = pathname.slice(base.length) || '/';
  }

  const candidates = pathname.endsWith('/')
    ? [path.join(pathname, 'index.html')]
    : [pathname, path.join(pathname, 'index.html')];

  for (const candidate of candidates) {
    const file = safeJoin(OUT_DIR, candidate);
    if (!file) break;
    try {
      const info = await stat(file);
      if (!info.isFile()) continue;
      const body = await readFile(file);
      return send(res, 200, body, TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
    } catch {
      /* try the next candidate */
    }
  }

  try {
    return send(res, 404, await readFile(path.join(OUT_DIR, '404.html')), TYPES['.html']);
  } catch {
    return send(res, 404, 'Not found', 'text/plain');
  }
}).listen(port, () => {
  console.log(`Serving ${OUT_DIR}`);
  console.log(`  http://localhost:${port}${base}/`);
});

function safeJoin(root, target) {
  const resolved = path.resolve(root, `.${path.posix.normalize(target)}`);
  return resolved === root || resolved.startsWith(root + path.sep) ? resolved : null;
}

function send(res, status, body, type) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}
