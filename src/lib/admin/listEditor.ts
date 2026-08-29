import { wireImageUpload } from './imageUpload';

export interface FieldSpec {
  key: string;
  label: string;
  type?: 'text' | 'textarea';
  placeholder?: string;
  wide?: boolean;
  upload?: { folder: string };
}

export function createListEditor(container: HTMLElement, fields: FieldSpec[], countEl?: HTMLElement) {
  function updateCount() {
    if (countEl) countEl.textContent = String(container.children.length);
  }

  function addRow(values: Record<string, string> = {}) {
    const row = document.createElement('div');
    row.className = 'list-row';

    for (const f of fields) {
      const wrap = document.createElement('label');
      wrap.className = f.wide ? 'field-wide' : 'field-narrow';
      const span = document.createElement('span');
      span.textContent = f.label;
      const input = f.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
      if (input instanceof HTMLInputElement) input.type = 'text';
      if (input instanceof HTMLTextAreaElement) input.rows = 2;
      if (f.placeholder) (input as HTMLInputElement).placeholder = f.placeholder;
      input.value = values[f.key] ?? '';
      input.dataset.key = f.key;
      wrap.append(span, input);
      row.append(wrap);

      if (f.upload) {
        const uploadWrap = document.createElement('label');
        uploadWrap.className = 'field-narrow upload-field';
        const uploadSpan = document.createElement('span');
        uploadSpan.textContent = 'Upload a photo';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        const status = document.createElement('span');
        status.className = 'upload-status';
        status.hidden = true;
        uploadWrap.append(uploadSpan, fileInput, status);
        row.append(uploadWrap);
        wireImageUpload(fileInput, input as HTMLInputElement, f.upload.folder, status);
      }
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'danger remove-row';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      row.remove();
      updateCount();
    });
    row.append(removeBtn);

    container.append(row);
    updateCount();
  }

  function setItems(items: Record<string, string>[]) {
    container.innerHTML = '';
    for (const item of items) addRow(item);
    updateCount();
  }

  function getItems(): Record<string, string>[] {
    return Array.from(container.querySelectorAll<HTMLElement>('.list-row')).map((row) => {
      const obj: Record<string, string> = {};
      for (const f of fields) {
        const el = row.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-key="${f.key}"]`);
        obj[f.key] = el?.value.trim() ?? '';
      }
      return obj;
    });
  }

  return { addRow, setItems, getItems };
}
