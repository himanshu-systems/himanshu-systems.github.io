/**
 * Hover previews for the /pages listing.
 *
 * One reused panel appended to <body>, not a node per row: nine rows would
 * otherwise mean nine idle panels and nine image requests on first paint.
 *
 * The panel is position:fixed and lives outside #smooth-content on purpose.
 * ScrollSmoother transforms that wrapper, and a fixed child of a transformed
 * ancestor is positioned against the ancestor rather than the viewport -- the
 * panel would drift as you scroll. As a sibling of #smooth-wrapper it tracks
 * the viewport, and getBoundingClientRect() on a row already reports the
 * post-transform visual position, so the two agree.
 *
 * Positioning uses the independent `translate` property, not `transform`, so
 * the CSS open transition can own `transform` for the lift without the two
 * clobbering each other every frame.
 *
 * The horizontal follow is a hand-rolled lerp rather than gsap.quickTo. GSAP is
 * already a dependency, but this is ten lines and one rAF, and it keeps the
 * listing page from having to load the animation runtime at all.
 */

/** Panel geometry, in CSS px. Must match the .link-preview rules in pages.astro. */
const W = 240;
const H = 150;
const GAP = 14; // clearance between the panel and the hovered row
const EDGE = 12; // minimum clearance from the viewport edge
const OPEN_DELAY = 90; // ms; stops a fast scan down the list strobing every row
const EASE = 0.18; // lerp factor per frame for the x-follow

export function initLinkPreview(): void {
  // Coarse pointers have no hover to preview from, and a tap must open the
  // link rather than reveal a panel. Bail before building any DOM.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const rows = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[data-preview]'),
  );
  if (rows.length === 0) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const panel = document.createElement('div');
  panel.className = 'link-preview';
  panel.setAttribute('aria-hidden', 'true');

  const img = document.createElement('img');
  img.width = W;
  img.height = H;
  img.alt = '';
  img.decoding = 'async';

  const cap = document.createElement('span');
  cap.className = 'link-preview__cap';

  panel.append(img, cap);
  document.body.appendChild(panel);

  let openTimer: number | undefined;
  let raf = 0;
  let active: HTMLAnchorElement | null = null;
  let targetX = 0;
  let curX = 0;
  let y = 0;

  const clampX = (x: number) =>
    Math.min(Math.max(x - W / 2, EDGE), window.innerWidth - W - EDGE);

  const draw = () => {
    curX += (targetX - curX) * EASE;
    panel.style.translate = `${curX.toFixed(1)}px ${y.toFixed(1)}px`;
    // Settle and stop rather than burning a rAF forever on a still panel.
    if (Math.abs(targetX - curX) < 0.4) {
      curX = targetX;
      panel.style.translate = `${curX.toFixed(1)}px ${y.toFixed(1)}px`;
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(draw);
  };

  const tick = () => {
    if (!raf) raf = requestAnimationFrame(draw);
  };

  const place = (row: HTMLAnchorElement, pointerX: number | null) => {
    const rect = row.getBoundingClientRect();
    // Prefer above the row; flip below when the top of the viewport is close.
    const above = rect.top - GAP - H;
    y = above >= EDGE ? above : Math.min(rect.bottom + GAP, window.innerHeight - H - EDGE);
    targetX = clampX(pointerX ?? rect.left + Math.min(rect.width, 320) / 2);
  };

  const show = (row: HTMLAnchorElement, pointerX: number | null) => {
    const src = row.dataset.preview;
    if (!src) return;

    active = row;
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    cap.textContent = row.dataset.previewLabel ?? '';

    place(row, pointerX);
    // Jump straight to the anchor point on open so the panel does not fly in
    // from wherever the previous row left it.
    curX = targetX;
    panel.style.translate = `${curX.toFixed(1)}px ${y.toFixed(1)}px`;
    panel.classList.add('is-open');
  };

  const hide = () => {
    active = null;
    window.clearTimeout(openTimer);
    panel.classList.remove('is-open');
  };

  for (const row of rows) {
    row.addEventListener('pointerenter', (event) => {
      window.clearTimeout(openTimer);
      const x = event.clientX;
      // Already open on a sibling: swap immediately, the delay has been paid.
      if (panel.classList.contains('is-open')) {
        show(row, x);
        return;
      }
      openTimer = window.setTimeout(() => show(row, x), reduced ? 0 : OPEN_DELAY);
    });

    row.addEventListener('pointermove', (event) => {
      if (active !== row || reduced) return;
      place(row, event.clientX);
      tick();
    });

    row.addEventListener('pointerleave', hide);

    // Keyboard parity: the panel is decorative, but a keyboard user tabbing the
    // list should get the same information a mouse user does.
    row.addEventListener('focus', () => show(row, null));
    row.addEventListener('blur', hide);
  }

  // A panel anchored to a rect that has moved is worse than no panel.
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);
}
