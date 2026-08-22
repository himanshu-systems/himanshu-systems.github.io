import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';

const registry = JSON.parse(readFileSync(new URL('./pages.json', import.meta.url), 'utf8'));

// CI passes the base path from actions/configure-pages; locally it comes from
// pages.json. `npm run dev` sets BASE_PATH="" to serve from the root.
const configured = process.env.BASE_PATH ?? registry.site?.base ?? '';
const base = configured === '' ? '/' : configured;

export default defineConfig({
  site: registry.site?.origin ?? 'https://himanshu-systems.github.io',
  base,
  outDir: './dist',
  publicDir: './public',
  build: {
    // /about -> dist/about/index.html, served as a clean URL by GitHub Pages.
    format: 'directory',
  },
  devToolbar: { enabled: false },
});
