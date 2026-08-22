# himanshu-systems.github.io

An [Astro](https://astro.build) site where every route is declared in one file,
`pages.json`. A route is either **local** (HTML in this repo) or **external**
(HTML hosted elsewhere, such as a Claude artifact). Deployed to GitHub Pages.

```
pages.json ──┬── local  → pages/*.html
             │
             └── external → import | embed | redirect
                      ↓
              prepare → astro build → dist/ → GitHub Pages
```

## The registry

```json
{
  "site": {
    "title": "HTML DOCS TO Learn",
    "description": "…",
    "base": ""
  },
  "pages": [
    { "route": "/about",       "type": "local",    "file": "pages/about.html" },
    { "route": "/claude-demo", "type": "external", "mode": "import",
      "url": "https://claude.site/artifacts/…" }
  ]
}
```

| Field | Notes |
| --- | --- |
| `route` | Required. `/a/b` builds to `dist/a/b/index.html`, a clean URL. `/` is reserved for the collection index. |
| `type` | `local` or `external`. Inferred from `file` / `url` if omitted. |
| `file` | Local only. A full HTML document, or a fragment wrapped in the `Doc` layout. |
| `url` | External only. |
| `mode` | External only: `import` (default), `embed`, `redirect`. |
| `title`, `description`, `tags` | Shown on the collection index. |
| `chrome` | Set `false` to omit the floating "← Collection" pill. |

## External modes

| Mode | Visitor gets | Works if the source blocks framing? | Survives the source disappearing? |
| --- | --- | --- | --- |
| `import` | Your snapshot of the source HTML, served from your domain | Yes | **Yes** |
| `embed` | The live source in a full-page iframe | No — `X-Frame-Options` / CSP `frame-ancestors` will blank it | No |
| `redirect` | An immediate jump to the source URL | Yes | No |

`import` is the default and the right pick for Claude artifacts: an artifact is a
self-contained HTML file (its CSP forbids external assets), so a snapshot is
effectively lossless and the route stops depending on anyone else's uptime.

Snapshots live in `imported/<slug>.html` beside a `.meta.json` recording the
source URL, fetch time, byte count and SHA-256. **Commit them** — CI builds from
the snapshots and never fetches during a deploy.

### What importing rewrites

Relative `src`/`href`/`srcset`/`url(…)` references are resolved to absolute URLs
against the source origin, and a source `<base href>` is honoured then removed.
Known limits: assets stay hosted at the origin (fine for a self-contained
artifact, lossy for a page that pulls in its own CSS/JS), and JavaScript calling
a *relative* API path will hit your domain instead of the source's. Use `embed`
or `redirect` for pages that depend on a live backend.

## Who renders what

This is the one structural rule worth knowing:

- **A complete HTML document** — an imported snapshot, or a local file with its
  own `<html>` — is written straight to `public/` by `tools/prepare.mjs` and
  copied verbatim into `dist/`. It **cannot** go through an Astro layout: you
  would end up with `html`/`head`/`body` nested inside `html`/`head`/`body`,
  which browsers silently restructure.
- **Everything else** — local fragments, and the `embed` / `redirect` shims — is
  rendered by Astro with real layouts and scoped styles.

`classify()` in `tools/registry.mjs` makes that call, and both the build and the
collection index agree on it. `public/` is fully generated and gitignored; put
hand-maintained assets in `static/` instead.

## Commands

```bash
npm run dev              # prepare + astro dev  → http://localhost:4321/
npm run build            # prepare + astro build → dist/
npm run build:refresh    # same, but refetch every imported page first
npm run preview          # serve the built dist/

node tools/add.mjs --route /claude-demo --url https://claude.site/artifacts/… --title "Claude demo"
node tools/add.mjs --route /notes/css --file pages/css.html --title "CSS notes"

node tools/import.mjs                    # refresh every snapshot
node tools/import.mjs --route /demo      # refresh one
node tools/import.mjs --missing          # fetch only what has no snapshot yet
```

> **Pass flags to `node`, not to `npm run`.** npm 12 rejects unknown flags rather
> than forwarding them, so `npm run import -- --missing` errors out.
>
> On Git Bash for Windows a leading `/` in an argument is rewritten into a
> Windows path. Drop it (`--route notes/css`) or use PowerShell.

### Local Node requirement

Astro needs Node ≥ 22.12. If `npm run build` reports an older version while
`node --version` shows a newer one, a stray `node` package is shadowing the real
binary — see **Troubleshooting** below.

## Adding a Claude artifact

1. Copy the artifact URL.
2. `node tools/add.mjs --route /my-page --url <url> --title "My page"` — registers
   the route and downloads the snapshot in one step.
3. `npm run dev` to check it, then commit `pages.json` and `imported/`.
4. Push. The deploy workflow publishes it at `https://himanshu-systems.github.io/my-page/`.

If the artifact needs a login, the import fails with a clear error — save the
HTML into `pages/` and register it as a local page instead.

## Deploying

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.
Enable it once: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The base path comes from `actions/configure-pages`, so a custom domain or a repo
rename needs no code change.

`.github/workflows/refresh.yml` re-imports every external page and commits the
changed snapshots. Run it from the Actions tab, or uncomment its `schedule` block.

**GitHub Pages is free only for public repositories.** A private repo needs a paid
plan, or a host like Netlify / Vercel / Cloudflare Pages that deploys `dist/` from
a private repo on a free tier.

## Troubleshooting

**"Node.js vN is not supported by Astro" even though `node --version` is fine.**
npm prepends every *ancestor* `node_modules/.bin` to `PATH` when running scripts.
If a parent directory of this project has a `node` package installed, its shim
shadows your real Node inside npm scripts only. Check with:

```bash
node -e "console.log(process.version, process.execPath)"      # your real Node
npm run whichnode                                             # what scripts see
```

Fix it by removing the `node` dependency from the offending parent
`package.json` and deleting its `node_modules/node` plus the `.bin/node*` shims.

## Layout

```
pages.json               route registry — the file you edit most
pages/                   local HTML (documents or fragments)
imported/                committed snapshots of external pages
static/                  hand-maintained assets, copied into public/
public/                  generated by prepare.mjs — gitignored
src/
  pages/
    index.astro          collection index
    [...route].astro     fragments, embed and redirect shims
    404.astro
  layouts/               Doc, Frame, Redirect
  components/Chrome.astro
  lib/paths.ts           base-path joins
  styles/tokens.css
tools/
  prepare.mjs            passthrough documents + manifest → public/
  registry.mjs           load, validate and classify pages.json
  importer.mjs           fetch + URL rewriting
  import.mjs             refresh snapshots
  add.mjs                register a new route
  chrome.mjs             the "← Collection" pill, shared by both render paths
dist/                    build output — gitignored
```
