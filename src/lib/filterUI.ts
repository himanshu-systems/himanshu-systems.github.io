import { matchesQuery } from './filter';

export function initFilter(containerId: string = 'index') {
  const input = document.getElementById('filter') as HTMLInputElement | null;
  const rows = Array.from(document.querySelectorAll<HTMLElement>(`#${containerId} .row`));
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');

  input?.addEventListener('input', () => {
    let shown = 0;
    for (const row of rows) {
      const match = matchesQuery(row.dataset.search ?? '', input.value);
      row.hidden = !match;
      if (match) shown++;
    }
    if (empty) empty.hidden = shown !== 0;
    if (count) count.textContent = String(shown);
  });
}
