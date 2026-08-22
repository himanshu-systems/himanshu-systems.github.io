/**
 * The floating "back to the collection" pill.
 *
 * Shared deliberately: prepare.mjs injects it into passthrough documents as a
 * raw string, and Chrome.astro renders the same markup inside Astro pages, so
 * both paths stay identical.
 */
export function chromeMarkup({ home, sourceUrl = null, title = 'Collection' } = {}) {
  const source = sourceUrl
    ? `<a href="${escapeAttr(sourceUrl)}" target="_blank" rel="noopener noreferrer">source</a>`
    : '';
  return `<style>
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
  /* Literal colours on purpose: this is injected into pages whose styling we
     do not control, so it cannot depend on the site's tokens. */
  background: #14161a;
  color: #fbfbfc;
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1;
  letter-spacing: .04em;
  padding: 9px 13px;
  white-space: nowrap;
}
#__collection_bar a:hover { background: #2b2f36; color: #4ecbb8; }
#__collection_bar a:focus-visible { outline: 2px solid #4ecbb8; outline-offset: -2px; }
@media print { #__collection_bar { display: none; } }
</style>
<div id="__collection_bar" role="navigation" aria-label="Collection">
  <a href="${escapeAttr(home)}" title="${escapeAttr(title)}">&#8592; Collection</a>
  ${source}
</div>`;
}

/** Insert markup just before </body>, or append it if there is no body tag. */
export function injectChrome(html, markup) {
  const at = html.toLowerCase().lastIndexOf('</body>');
  if (at === -1) return html + markup;
  return html.slice(0, at) + markup + html.slice(at);
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
