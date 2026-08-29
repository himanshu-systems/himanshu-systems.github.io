export function initTabs(tabButtons: HTMLElement[], tabPanels: Record<string, HTMLElement>) {
  for (const btn of tabButtons) {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab!;
      for (const b of tabButtons) b.setAttribute('aria-selected', String(b === btn));
      for (const [name, panel] of Object.entries(tabPanels)) panel.hidden = name !== target;
    });
  }
}
