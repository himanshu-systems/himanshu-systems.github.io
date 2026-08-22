# HTML-DOCS-TO-Learn

One GitHub Pages site that routes to both **local HTML** (files in this repo) and
**external HTML** (pages hosted elsewhere, such as Claude artifacts). Every route
is declared in a single file, `pages.json`.

Live at <https://himanshu-systems.github.io/HTML-DOCS-TO-Learn/>

```
pages.json ──┬── local  → pages/*.html          ──┐
             │                                    ├──→ build → site/ → GitHub Pages
             └── external → import | embed | redirect ┘
```

## The registry

```json
{
  "site": {
    "title": "HTML DOCS TO Learn",
    "description": "…",
    "base": "/HTML-DOCS-TO-Learn"
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
| `route` | Required. `/a/b` builds to `site/a/b/index.html`, served as a clean URL. |
| `type` | `local` or `external`. Inferred from `file` / `url` if omitted. |
| `file` | Local only. Full document, or a fragment the build wraps in a shell. |
| `url` | External only. |
| `mode` | External only: `import` (default), `embed`, `redirect`. |
| `title`, `description`, `tags` | Shown on the collection index. |
| `chrome` | Set `false` to omit the floating "← Collection" pill on that page. |

`/` is a generated collection index listing every route — unless you register a
page at `/` yourself, in which case yours wins.

## External modes

| Mode | Visitor gets | Works if the source blocks framing? | Survives the source disappearing? |
| --- | --- | --- | --- |
| `import` | Your snapshot of the source HTML, served from your domain | Yes | **Yes** |
| `embed` | The live source in a full-page iframe | No — `X-Frame-Options` / CSP `frame-ancestors` will blank it | No |
| `redirect` | An immediate jump to the source URL | Yes | No |

`import` is the default and the right pick for Claude artifacts: an artifact is a
self-contained HTML file (its CSP forbids external assets), so a snapshot is
effectively lossless and the route stops depending on anyone else's uptime.

Snapshots live in `imported/<slug>.html` next to a `.meta.json` recording the
source URL, fetch time, byte count and SHA-256. **Commit them** — CI builds from
the snapshots and never fetches during a deploy.

### What importing rewrites

Relative `src`/`href`/`srcset`/`url(…)` references are resolved to absolute URLs
against the source origin, and a source `<base href>` is honoured then removed.
Known limits: assets stay hosted at the origin (fine for a self-contained
artifact, lossy for a page that pulls in its own CSS/JS), and any JavaScript that
calls a *relative* API path will hit your domain instead of the source's. Use
`embed` or `redirect` for pages that depend on a live backend.

## Commands

```bash
node tools/add.mjs --route /claude-demo --url https://claude.site/artifacts/… --title "Claude demo"
node tools/add.mjs --route /notes/css --file pages/css.html --title "CSS notes"

node tools/import.mjs                    # refresh every imported snapshot
node tools/import.mjs --route /demo      # refresh one
node tools/import.mjs --missing          # fetch only what has no snapshot yet

node tools/build.mjs                     # → site/  (uses committed snapshots)
node tools/build.mjs --refresh           # rebuild, refetching every external page

npm run build                            # same as node tools/build.mjs
npm run dev                              # build without the base path, then serve
```

`npm run dev` prints a `http://localhost:4173/…` URL. The preview server accepts
the path with or without the `/HTML-DOCS-TO-Learn` base prefix.

> **Pass flags to `node`, not to `npm run`.** npm 12 rejects unknown flags rather
> than forwarding them, so `npm run build -- --refresh` errors out. The bare
> scripts (`npm run build`, `npm run dev`, `npm run serve`) are fine.
>
> On Git Bash for Windows, a leading `/` in an argument gets rewritten into a
> Windows path. Drop it (`--route notes/css`) or use PowerShell.

Anything in an optional `static/` directory is copied to the site root verbatim —
use it for shared images, fonts or a `CNAME`.

Node 18+ is required. There are no dependencies.

## Deploying

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.
Enable it once: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
The base path comes from `actions/configure-pages`, so a custom domain or a move
to a user/org repo needs no code change.

`.github/workflows/refresh.yml` re-imports every external page and commits the
changed snapshots. Run it from the Actions tab, or uncomment its `schedule` block.

## Adding a Claude artifact

1. Copy the artifact URL.
2. `node tools/add.mjs --route /my-page --url <url> --title "My page"` — this
   registers the route and downloads the snapshot in one step.
3. `npm run dev` to check it locally, then commit `pages.json` and `imported/`.
4. Push. The deploy workflow publishes it at `…/HTML-DOCS-TO-Learn/my-page/`.

If the artifact is behind a login or otherwise not publicly fetchable, the import
will fail — save the HTML into `pages/` and register it as a local page instead.

## Layout

```
pages.json               route registry — the one file you edit most
pages/                   local HTML (documents or fragments)
imported/                committed snapshots of external pages
static/                  optional, copied to the site root as-is
tools/
  build.mjs              registry → site/
  import.mjs             refresh snapshots
  add.mjs                register a new route
  serve.mjs              local preview server
  registry.mjs           load + validate pages.json
  importer.mjs           fetch + URL rewriting
  render.mjs             page templates
site/                    build output (gitignored)
```
