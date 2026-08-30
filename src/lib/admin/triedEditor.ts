import { supabase } from '../supabaseClient';
import { wrote } from './wrote';
import { uniqueSlug } from '../slug';
import { createRichEditor } from './richEditor';
import { wireImageUpload } from './imageUpload';

export interface AdminEntry {
  id: string;
  slug: string;
  date: string;
  title: string;
  note: string;
  description: string | null;
  image_src: string | null;
  image_alt: string | null;
  outcome: string;
  liked: string;
  tags: string[];
  is_public: boolean;
}

export function initTriedEditor(deps: {
  listEl: HTMLElement;
  emptyEl: HTMLElement;
  formWrapper: HTMLElement;
  form: HTMLFormElement;
  formTitle: HTMLElement;
  cancelBtn: HTMLElement;
  slugNote: HTMLElement;
  statusEl: HTMLElement;
  newEntryBtn: HTMLElement;
  fDate: HTMLInputElement;
  fTitle: HTMLInputElement;
  fNote: HTMLTextAreaElement;
  fOutcome: HTMLInputElement;
  fLiked: HTMLInputElement;
  fTags: HTMLInputElement;
  fImageSrc: HTMLInputElement;
  fImageAlt: HTMLInputElement;
  fPublic: HTMLInputElement;
  fImageUpload: HTMLInputElement;
  fImageUploadStatus: HTMLElement;
}) {
  const descriptionEditor = createRichEditor('f-description-editor');
  wireImageUpload(deps.fImageUpload, deps.fImageSrc, 'tried', deps.fImageUploadStatus);

  let entries: AdminEntry[] = [];
  let editingId: string | null = null;

  function setStatus(message: string, isError = false) {
    deps.statusEl.textContent = message;
    deps.statusEl.hidden = false;
    deps.statusEl.classList.toggle('error', isError);
  }

  function openForm() {
    deps.formWrapper.hidden = false;
  }

  function closeForm() {
    deps.formWrapper.hidden = true;
    editingId = null;
    deps.form.reset();
    descriptionEditor.setHTML('');
    deps.formTitle.textContent = 'New entry';
    deps.slugNote.hidden = true;
  }

  deps.newEntryBtn.addEventListener('click', () => {
    editingId = null;
    deps.form.reset();
    descriptionEditor.setHTML('');
    deps.formTitle.textContent = 'New entry';
    deps.slugNote.hidden = true;
    openForm();
    deps.fTitle.focus();
  });

  deps.cancelBtn.addEventListener('click', closeForm);

  function startEdit(entry: AdminEntry) {
    editingId = entry.id;
    deps.fDate.value = entry.date;
    deps.fTitle.value = entry.title;
    deps.fNote.value = entry.note;
    descriptionEditor.setHTML(entry.description ?? '');
    deps.fOutcome.value = entry.outcome;
    deps.fLiked.value = entry.liked;
    deps.fTags.value = entry.tags.join(', ');
    deps.fImageSrc.value = entry.image_src ?? '';
    deps.fImageAlt.value = entry.image_alt ?? '';
    deps.fPublic.checked = entry.is_public;
    deps.formTitle.textContent = `Editing "${entry.title}"`;
    deps.slugNote.hidden = false;
    deps.slugNote.textContent = `URL: /tried/${entry.slug}/ — fixed once an entry exists, so links already shared never break.`;
    openForm();
    deps.formWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadEntries() {
    const { data, error } = await supabase
      .from('tried_entries')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`Could not load entries: ${error.message}`, true);
      return;
    }
    entries = (data ?? []) as AdminEntry[];
    renderList();
  }

  function renderList() {
    deps.listEl.innerHTML = '';
    deps.emptyEl.hidden = entries.length !== 0;

    for (const entry of entries) {
      const tr = document.createElement('tr');

      const dateTd = document.createElement('td');
      dateTd.className = 'col-date';
      dateTd.textContent = entry.date;

      const entryTd = document.createElement('td');
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = entry.title;
      const note = document.createElement('span');
      note.className = 'blurb';
      note.textContent = entry.note;
      entryTd.append(title, note);

      const statusTd = document.createElement('td');
      const status = document.createElement('span');
      status.className = entry.is_public ? 'tag tag-public' : 'tag tag-private';
      status.textContent = entry.is_public ? 'public' : 'private';
      statusTd.append(status);

      const actionsTd = document.createElement('td');
      actionsTd.className = 'col-actions';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.textContent = entry.is_public ? 'Make private' : 'Publish';
      toggleBtn.addEventListener('click', () => togglePublic(entry));

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => startEdit(entry));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteEntry(entry));

      actionsTd.append(toggleBtn, editBtn, deleteBtn);
      tr.append(dateTd, entryTd, statusTd, actionsTd);
      deps.listEl.append(tr);
    }
  }

  async function togglePublic(entry: AdminEntry) {
    const failure = wrote(
      await supabase
        .from('tried_entries')
        .update({ is_public: !entry.is_public })
        .eq('id', entry.id)
        .select('id'),
      'Could not update',
    );
    if (failure) {
      setStatus(failure.message, true);
      return;
    }
    setStatus('Saved. The site will rebuild in about a minute.');
    loadEntries();
  }

  async function deleteEntry(entry: AdminEntry) {
    if (!confirm(`Delete "${entry.title}"? This can't be undone.`)) return;

    const failure = wrote(
      await supabase.from('tried_entries').delete().eq('id', entry.id).select('id'),
      'Could not delete',
    );
    if (failure) {
      setStatus(failure.message, true);
      return;
    }
    if (editingId === entry.id) closeForm();
    setStatus('Deleted. The site will rebuild in about a minute.');
    loadEntries();
  }

  deps.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      date: deps.fDate.value,
      title: deps.fTitle.value.trim(),
      note: deps.fNote.value.trim(),
      description: descriptionEditor.getHTML() || null,
      outcome: deps.fOutcome.value.trim(),
      liked: deps.fLiked.value.trim(),
      tags: deps.fTags.value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      image_src: deps.fImageSrc.value.trim() || null,
      image_alt: deps.fImageAlt.value.trim() || null,
      is_public: deps.fPublic.checked,
    };

    if (editingId) {
      const failure = wrote(
        await supabase.from('tried_entries').update(payload).eq('id', editingId).select('id'),
        'Could not save',
      );
      if (failure) {
        setStatus(failure.message, true);
        return;
      }
    } else {
      const taken = new Set(entries.map((e) => e.slug));
      const slug = uniqueSlug(payload.title, taken);
      const { error } = await supabase.from('tried_entries').insert({ ...payload, slug });
      if (error) {
        setStatus(`Could not save: ${error.message}`, true);
        return;
      }
    }

    setStatus('Saved. The site will rebuild in about a minute.');
    closeForm();
    loadEntries();
  });

  return { loadEntries };
}
