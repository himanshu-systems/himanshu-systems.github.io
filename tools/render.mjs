import { routeHref } from './registry.mjs';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const BADGES = {
  local: { label: 'Local', title: 'Authored in this repository' },
  import: { label: 'Imported', title: 'Snapshot of an external page, hosted here' },
  embed: { label: 'Embedded', title: 'Loaded from the source in an iframe' },
  redirect: { label: 'Redirect', title: 'Sends visitors to the source URL' },
};

export function badgeFor(page) {
  return BADGES[page.type === 'local' ? 'local' : page.mode] ?? BADGES.local;
}

/** Shared design tokens, used by the index, the 404 and the local-page shell. */
const TOKENS = `
:root {
  color-scheme: light dark;
  --bg: #fbfaf8;
  --surface: #ffffff;
  --border: #e5e1da;
  --text: #201d1a;
  --muted: #6b6660;
  --accent: #b8552a;
  --accent-soft: #f6eae2;
  --shadow: 0 1px 2px rgba(32, 29, 26, .06), 0 8px 24px -16px rgba(32, 29, 26, .3);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #17150f;
    --surface: #201d17;
    --border: #37322a;
    --text: #f1ece4;
    --muted: #a29a8e;
    --accent: #e08a5b;
    --accent-soft: #2e241c;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px -16px rgba(0, 0, 0, .8);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-text-size-adjust: 100%;
}
a { color: var(--accent); }
`;

/** The floating "back to the collection" pill injected into every page. */
export function chromeMarkup(site, base, page) {
  const home = routeHref(base, '/');
  const source = page && page.type === 'external' ? page.url : null;
  const sourceLink = source
    ? `<a class="src" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">source</a>`
    : '';
  return `
<style>
#__collection_bar {
  all: initial;
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 2147483647;
  display: flex;
  gap: 1px;
  border-radius: 999px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,.18), 0 10px 30px -12px rgba(0,0,0,.45);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
#__collection_bar a {
  all: unset;
  cursor: pointer;
  background: #201d1a;
  color: #fbfaf8;
  font-size: 12px;
  line-height: 1;
  letter-spacing: .01em;
  padding: 9px 13px;
  white-space: nowrap;
}
#__collection_bar a:hover { background: #3a352f; }
#__collection_bar a:focus-visible { outline: 2px solid #e08a5b; outline-offset: -2px; }
@media print { #__collection_bar { display: none; } }
</style>
<div id="__collection_bar" role="navigation" aria-label="Collection">
  <a href="${escapeHtml(home)}" title="${escapeHtml(site.title)}">&#8592; Collection</a>
  ${sourceLink}
</div>`;
}

/** Insert the chrome just before </body>, or append it if there is no body tag. */
export function injectChrome(html, markup) {
  const at = html.toLowerCase().lastIndexOf('</body>');
  if (at === -1) return html + markup;
  return html.slice(0, at) + markup + html.slice(at);
}

/** Wrap a bare HTML fragment (no <html> element) in a readable document. */
export function wrapFragment(fragment, page, site) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)} &middot; ${escapeHtml(site.title)}</title>
${page.description ? `<meta name="description" content="${escapeHtml(page.description)}">` : ''}
<style>${TOKENS}
.doc { max-width: 46rem; margin: 0 auto; padding: 4rem 1.5rem 7rem; }
.doc h1 { font-size: clamp(1.7rem, 1.2rem + 2vw, 2.4rem); line-height: 1.15; letter-spacing: -.02em; margin: 0 0 1rem; }
.doc h2 { margin: 2.5rem 0 .75rem; font-size: 1.3rem; letter-spacing: -.01em; }
.doc h3 { margin: 2rem 0 .5rem; font-size: 1.05rem; }
.doc hr { border: 0; border-top: 1px solid var(--border); margin: 2.5rem 0; }
.doc code { font: .875em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--accent-soft); padding: .15em .4em; border-radius: 4px; }
.doc pre { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; overflow-x: auto; }
.doc pre code { background: none; padding: 0; }
.doc table { width: 100%; border-collapse: collapse; }
.doc th, .doc td { text-align: left; border-bottom: 1px solid var(--border); padding: .5rem .6rem; }
.doc img { max-width: 100%; height: auto; }
.doc blockquote { margin: 1.5rem 0; padding-left: 1rem; border-left: 3px solid var(--border); color: var(--muted); }
</style>
</head>
<body>
<main class="doc">
${fragment}
</main>
</body>
</html>`;
}

export function renderIndex(site, pages, base) {
  const cards = pages
    .map((page) => {
      const badge = badgeFor(page);
      const kind = page.type === 'local' ? 'local' : page.mode;
      const href = routeHref(base, page.route);
      const meta =
        page.type === 'external'
          ? `<p class="src">${escapeHtml(hostOf(page.url))}${page.fetchedAt ? ` &middot; snapshot ${escapeHtml(page.fetchedAt.slice(0, 10))}` : ''}</p>`
          : `<p class="src">${escapeHtml(page.file)}</p>`;
      const tags = page.tags.length
        ? `<p class="tags">${page.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</p>`
        : '';
      const search = [page.title, page.description, page.route, ...page.tags].join(' ').toLowerCase();
      return `<li class="card" data-search="${escapeHtml(search)}">
  <a class="hit" href="${escapeHtml(href)}">
    <span class="badge badge--${escapeHtml(kind)}" title="${escapeHtml(badge.title)}">${escapeHtml(badge.label)}</span>
    <h2>${escapeHtml(page.title)}</h2>
    <p class="route">${escapeHtml(page.route)}</p>
    ${page.description ? `<p class="desc">${escapeHtml(page.description)}</p>` : ''}
  </a>
  ${tags}
  ${meta}
</li>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(site.title)}</title>
<meta name="description" content="${escapeHtml(site.description)}">
<style>${TOKENS}
.wrap { max-width: 62rem; margin: 0 auto; padding: 4rem 1.5rem 6rem; }
header { margin-bottom: 2.5rem; }
h1 { font-size: clamp(1.9rem, 1.3rem + 2.4vw, 2.8rem); line-height: 1.1; letter-spacing: -.025em; margin: 0 0 .6rem; }
header p { color: var(--muted); margin: 0; max-width: 42rem; }
.filter { width: 100%; max-width: 22rem; margin: 1.75rem 0 0; padding: .6rem .85rem; font: inherit; font-size: .95rem; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 9px; }
.filter:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); }
.card { position: relative; display: flex; flex-direction: column; gap: .5rem; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 1.1rem 1.2rem 1rem; box-shadow: var(--shadow); transition: transform .15s ease, border-color .15s ease; }
.card:hover { transform: translateY(-2px); border-color: var(--accent); }
.card:has(.hit:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
.hit { text-decoration: none; color: inherit; display: block; }
.hit::after { content: ""; position: absolute; inset: 0; border-radius: 14px; }
.hit:focus-visible { outline: none; }
.card h2 { font-size: 1.06rem; line-height: 1.3; letter-spacing: -.01em; margin: .55rem 0 .2rem; }
.route { font: .78rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--muted); margin: 0; }
.desc { color: var(--muted); font-size: .9rem; margin: .5rem 0 0; }
.badge { display: inline-block; font-size: .68rem; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; padding: .2rem .5rem; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
.tags { display: flex; flex-wrap: wrap; gap: .35rem; margin: .25rem 0 0; position: relative; }
.tags span { font-size: .7rem; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: .1rem .5rem; }
.src { font-size: .75rem; color: var(--muted); margin: 0; word-break: break-word; position: relative; }
.empty { color: var(--muted); font-size: .95rem; padding: 2rem 0; display: none; }
footer { margin-top: 3.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); color: var(--muted); font-size: .82rem; }
footer code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>${escapeHtml(site.title)}</h1>
  <p>${escapeHtml(site.description)}</p>
  <input class="filter" id="filter" type="search" placeholder="Filter ${pages.length} page${pages.length === 1 ? '' : 's'}&hellip;" aria-label="Filter pages" autocomplete="off">
</header>
<ul id="cards">
${cards}
</ul>
<p class="empty" id="empty">Nothing matches that filter.</p>
<footer>Routes are defined in <code>pages.json</code>. Imported pages are snapshots stored in <code>imported/</code> and served from this domain.</footer>
</div>
<script>
(function () {
  var input = document.getElementById('filter');
  var cards = Array.prototype.slice.call(document.querySelectorAll('#cards .card'));
  var empty = document.getElementById('empty');
  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var match = !q || card.dataset.search.indexOf(q) !== -1;
      card.hidden = !match;
      if (match) shown++;
    });
    empty.style.display = shown ? 'none' : 'block';
  });
})();
</script>
</body>
</html>`;
}

export function renderEmbed(page, site, base) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)} &middot; ${escapeHtml(site.title)}</title>
<style>${TOKENS}
html, body { height: 100%; }
body { display: flex; flex-direction: column; }
.bar { display: flex; align-items: center; gap: .75rem; padding: .5rem .9rem; background: var(--surface); border-bottom: 1px solid var(--border); font-size: .82rem; }
.bar a { color: var(--accent); text-decoration: none; white-space: nowrap; }
.bar a:hover { text-decoration: underline; }
.bar strong { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar .spacer { flex: 1; }
.bar .hint { color: var(--muted); }
@media (max-width: 40rem) { .bar .hint { display: none; } }
iframe { flex: 1; width: 100%; border: 0; background: var(--bg); }
</style>
</head>
<body>
<div class="bar">
  <a href="${escapeHtml(routeHref(base, '/'))}">&#8592; Collection</a>
  <strong>${escapeHtml(page.title)}</strong>
  <span class="spacer"></span>
  <span class="hint">Blank below? The source blocks embedding &mdash;</span>
  <a href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer">open it directly &#8599;</a>
</div>
<iframe src="${escapeHtml(page.url)}" title="${escapeHtml(page.title)}" loading="lazy" referrerpolicy="no-referrer"></iframe>
</body>
</html>`;
}

export function renderRedirect(page, site) {
  const url = escapeHtml(page.url);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${url}">
<link rel="canonical" href="${url}">
<meta name="robots" content="noindex">
<title>${escapeHtml(page.title)} &middot; ${escapeHtml(site.title)}</title>
<style>${TOKENS}
.wrap { max-width: 34rem; margin: 0 auto; padding: 5rem 1.5rem; }
</style>
</head>
<body>
<div class="wrap">
  <p>Redirecting to <a href="${url}">${url}</a>&hellip;</p>
</div>
<script>location.replace(${JSON.stringify(page.url)});</script>
</body>
</html>`;
}

export function renderNotFound(site, base) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not found &middot; ${escapeHtml(site.title)}</title>
<style>${TOKENS}
.wrap { max-width: 34rem; margin: 0 auto; padding: 6rem 1.5rem; }
h1 { font-size: 1.8rem; letter-spacing: -.02em; margin: 0 0 .5rem; }
p { color: var(--muted); }
code { font: .875em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--accent-soft); padding: .15em .4em; border-radius: 4px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>No page on that route</h1>
  <p>This route is not registered in <code>pages.json</code>.</p>
  <p><a href="${escapeHtml(routeHref(base, '/'))}">Back to the collection</a></p>
</div>
</body>
</html>`;
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
