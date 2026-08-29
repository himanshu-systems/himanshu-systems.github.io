import { supabase } from '../supabaseClient';

export function wireImageUpload(fileInput: HTMLInputElement, textInput: HTMLInputElement, folder: string, statusEl: HTMLElement) {
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    statusEl.hidden = false;
    statusEl.classList.remove('error');
    statusEl.textContent = 'Uploading…';

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]+/g, '-');
    const path = `${folder}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('site-images').upload(path, file, { upsert: true });

    if (error) {
      statusEl.textContent = `Upload failed: ${error.message}`;
      statusEl.classList.add('error');
      return;
    }

    const { data } = supabase.storage.from('site-images').getPublicUrl(path);
    textInput.value = data.publicUrl;
    statusEl.textContent = 'Uploaded.';
    fileInput.value = '';
  });
}
