import { supabase } from '../supabaseClient';
import { wrote } from './wrote';
import { uniqueSlug } from '../slug';
import { createRichEditor } from './richEditor';
import { wireImageUpload } from './imageUpload';

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  date: string;
  tags: string[] | null;
  reading_time: string | null;
  image_src: string | null;
  image_alt: string | null;
  published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BlogEditorDeps {
  statusEl: HTMLElement;
  tableBody: HTMLElement;
  countEl: HTMLElement;
  modal: HTMLElement;
  modalTitle: HTMLElement;
  form: HTMLFormElement;
  fId: HTMLInputElement;
  fSlug: HTMLInputElement;
  fTitle: HTMLInputElement;
  fDescription: HTMLTextAreaElement;
  fDate: HTMLInputElement;
  fTags: HTMLInputElement;
  fReadingTime: HTMLInputElement;
  fImageSrc: HTMLInputElement;
  fImageAlt: HTMLInputElement;
  fImageUpload: HTMLInputElement;
  fImageUploadStatus: HTMLElement;
  fPublished: HTMLInputElement;
  btnNew: HTMLElement;
  btnCancel: HTMLElement;
}

export function initBlogEditor(deps: BlogEditorDeps): { loadPosts: () => Promise<void> } {
  const contentEditor = createRichEditor('b-content-editor');
  wireImageUpload(deps.fImageUpload, deps.fImageSrc, 'blog', deps.fImageUploadStatus);

  let posts: BlogPostRow[] = [];
  let editingId: string | null = null;

  function setStatus(message: string, isError = false) {
    deps.statusEl.textContent = message;
    deps.statusEl.hidden = false;
    deps.statusEl.classList.toggle('error', isError);
  }

  function openModal() {
    deps.modal.hidden = false;
  }

  function closeModal() {
    deps.modal.hidden = true;
    editingId = null;
    deps.form.reset();
    deps.fId.value = '';
    deps.fSlug.value = '';
    contentEditor.setHTML('');
    deps.modalTitle.textContent = 'New post';
  }

  function openNew() {
    editingId = null;
    deps.form.reset();
    deps.fId.value = '';
    deps.fSlug.value = '';
    deps.fDate.value = new Date().toISOString().split('T')[0];
    deps.fPublished.checked = false;
    contentEditor.setHTML('');
    deps.modalTitle.textContent = 'New post';
    openModal();
    deps.fTitle.focus();
  }

  function startEdit(post: BlogPostRow) {
    editingId = post.id;
    deps.fId.value = post.id;
    deps.fSlug.value = post.slug;
    deps.fTitle.value = post.title;
    deps.fDescription.value = post.description ?? '';
    deps.fDate.value = post.date;
    deps.fTags.value = (post.tags ?? []).join(', ');
    deps.fReadingTime.value = post.reading_time ?? '';
    deps.fImageSrc.value = post.image_src ?? '';
    deps.fImageAlt.value = post.image_alt ?? '';
    deps.fPublished.checked = Boolean(post.published);
    contentEditor.setHTML(post.content ?? '');
    deps.modalTitle.textContent = `Editing "${post.title}"`;
    openModal();
    deps.fTitle.focus();
  }

  deps.btnNew.addEventListener('click', openNew);
  deps.btnCancel.addEventListener('click', closeModal);

  // Additional cancel buttons inside modal if present
  const extraCancel = deps.modal.querySelector('#b-cancel-btn');
  if (extraCancel) {
    extraCancel.addEventListener('click', closeModal);
  }

  // Backdrop click closes modal
  deps.modal.addEventListener('click', (e) => {
    if (e.target === deps.modal) {
      closeModal();
    }
  });

  // Auto-slug calculation on title input when creating a new post
  deps.fTitle.addEventListener('input', () => {
    if (!editingId) {
      const taken = new Set(posts.map((p) => p.slug));
      deps.fSlug.value = deps.fTitle.value.trim() ? uniqueSlug(deps.fTitle.value, taken) : '';
    }
  });

  async function loadPosts(): Promise<void> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`Could not load blog posts: ${error.message}`, true);
      return;
    }
    posts = (data ?? []) as BlogPostRow[];
    renderList();
  }

  function renderList() {
    deps.tableBody.innerHTML = '';
    if (deps.countEl) {
      deps.countEl.textContent = String(posts.length);
    }
    const emptyEl = document.getElementById('b-empty');
    if (emptyEl) {
      emptyEl.hidden = posts.length !== 0;
    }

    for (const post of posts) {
      const tr = document.createElement('tr');

      const dateTd = document.createElement('td');
      dateTd.className = 'col-date';
      dateTd.textContent = post.date;

      const postTd = document.createElement('td');
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = post.title;
      const blurb = document.createElement('span');
      blurb.className = 'blurb';
      blurb.textContent = post.description ?? '';
      postTd.append(title, blurb);

      const statusTd = document.createElement('td');
      const status = document.createElement('span');
      status.className = post.published ? 'tag tag-public' : 'tag tag-private';
      status.textContent = post.published ? 'public' : 'draft';
      statusTd.append(status);

      const actionsTd = document.createElement('td');
      actionsTd.className = 'col-actions';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.textContent = post.published ? 'Make draft' : 'Publish';
      toggleBtn.addEventListener('click', () => togglePublished(post));

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => startEdit(post));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deletePost(post));

      actionsTd.append(toggleBtn, editBtn, deleteBtn);
      tr.append(dateTd, postTd, statusTd, actionsTd);
      deps.tableBody.append(tr);
    }
  }

  async function togglePublished(post: BlogPostRow) {
    const nextState = !post.published;
    const failure = wrote(
      await supabase
        .from('blog_posts')
        .update({ published: nextState })
        .eq('id', post.id)
        .select('id'),
      'Could not update',
    );
    if (failure) {
      setStatus(failure.message, true);
      return;
    }
    setStatus(`Saved. Post ${nextState ? 'published' : 'moved to drafts'}. The site will rebuild in about a minute.`);
    await loadPosts();
  }

  async function deletePost(post: BlogPostRow) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;

    const failure = wrote(
      await supabase.from('blog_posts').delete().eq('id', post.id).select('id'),
      'Could not delete',
    );
    if (failure) {
      setStatus(failure.message, true);
      return;
    }
    if (editingId === post.id) closeModal();
    setStatus('Deleted. The site will rebuild in about a minute.');
    await loadPosts();
  }

  deps.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = deps.fTitle.value.trim();
    let slug = deps.fSlug.value.trim();
    const date = deps.fDate.value.trim();

    if (!title) {
      setStatus('Please provide a title.', true);
      deps.fTitle.focus();
      return;
    }
    if (!date) {
      setStatus('Please provide a date.', true);
      deps.fDate.focus();
      return;
    }

    const taken = new Set(posts.map((p) => p.slug));
    if (!slug) {
      slug = uniqueSlug(title, taken, editingId ? posts.find((p) => p.id === editingId)?.slug : undefined);
      deps.fSlug.value = slug;
    }

    const payload = {
      title,
      slug,
      description: deps.fDescription.value.trim() || null,
      content: contentEditor.getHTML() || '',
      date,
      tags: deps.fTags.value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      reading_time: deps.fReadingTime.value.trim() || null,
      image_src: deps.fImageSrc.value.trim() || null,
      image_alt: deps.fImageAlt.value.trim() || null,
      published: deps.fPublished.checked,
    };

    if (editingId) {
      const failure = wrote(
        await supabase.from('blog_posts').update(payload).eq('id', editingId).select('id'),
        'Could not save',
      );
      if (failure) {
        setStatus(failure.message, true);
        return;
      }
    } else {
      const { error } = await supabase.from('blog_posts').insert(payload);
      if (error) {
        setStatus(`Could not save: ${error.message}`, true);
        return;
      }
    }

    setStatus('Saved. The site will rebuild in about a minute.');
    closeModal();
    await loadPosts();
  });

  return { loadPosts };
}
