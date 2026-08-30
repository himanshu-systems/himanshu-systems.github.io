import { supabase } from '../supabaseClient';
import { wrote } from './wrote';
import { createListEditor } from './listEditor';
import { createRichEditor } from './richEditor';
import { wireImageUpload } from './imageUpload';

export function initAboutEditor(deps: {
  aboutForm: HTMLFormElement;
  aboutStatus: HTMLElement;
  name: HTMLInputElement;
  role: HTMLInputElement;
  now: HTMLInputElement;
  portraitSrc: HTMLInputElement;
  portraitAlt: HTMLInputElement;
  portraitUpload: HTMLInputElement;
  portraitUploadStatus: HTMLElement;
  doingList: HTMLElement;
  countDoing: HTMLElement;
  addDoing: HTMLElement;
  workList: HTMLElement;
  countWork: HTMLElement;
  addWork: HTMLElement;
  galleryList: HTMLElement;
  countGallery: HTMLElement;
  addGallery: HTMLElement;
  elsewhereList: HTMLElement;
  countElsewhere: HTMLElement;
  addElsewhere: HTMLElement;
}) {
  const doingEditor = createListEditor(
    deps.doingList,
    [
      { key: 'label', label: 'Label' },
      { key: 'detail', label: 'Detail', type: 'textarea', wide: true },
    ],
    deps.countDoing,
  );
  deps.addDoing.addEventListener('click', () => doingEditor.addRow());

  const workEditor = createListEditor(
    deps.workList,
    [
      { key: 'year', label: 'Year' },
      { key: 'title', label: 'Title' },
      { key: 'blurb', label: 'Blurb', type: 'textarea', wide: true },
      { key: 'href', label: 'Link (optional)', wide: true },
    ],
    deps.countWork,
  );
  deps.addWork.addEventListener('click', () => workEditor.addRow());

  const galleryEditor = createListEditor(
    deps.galleryList,
    [
      { key: 'src', label: 'Image path', upload: { folder: 'gallery' } },
      { key: 'alt', label: 'Alt text' },
      { key: 'caption', label: 'Caption (optional)', wide: true },
    ],
    deps.countGallery,
  );
  deps.addGallery.addEventListener('click', () => galleryEditor.addRow());

  const elsewhereEditor = createListEditor(
    deps.elsewhereList,
    [
      { key: 'label', label: 'Label' },
      { key: 'text', label: 'Text' },
      { key: 'href', label: 'Link', wide: true },
    ],
    deps.countElsewhere,
  );
  deps.addElsewhere.addEventListener('click', () => elsewhereEditor.addRow());

  const introEditor = createRichEditor('a-intro-editor');

  wireImageUpload(deps.portraitUpload, deps.portraitSrc, 'portrait', deps.portraitUploadStatus);

  async function loadAboutContent() {
    const { data, error } = await supabase.from('site_content').select('*').eq('id', 1).single();
    if (error) {
      deps.aboutStatus.textContent = `Could not load: ${error.message}`;
      deps.aboutStatus.hidden = false;
      deps.aboutStatus.classList.add('error');
      return;
    }

    deps.name.value = data.name ?? '';
    deps.role.value = data.role ?? '';
    introEditor.setHTML(data.intro ?? '');
    deps.now.value = data.now ?? '';
    deps.portraitSrc.value = data.portrait_src ?? '';
    deps.portraitAlt.value = data.portrait_alt ?? '';

    doingEditor.setItems(data.doing ?? []);
    workEditor.setItems(data.work ?? []);
    galleryEditor.setItems(data.gallery ?? []);
    elsewhereEditor.setItems(data.elsewhere ?? []);
  }

  deps.aboutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      id: 1,
      name: deps.name.value.trim(),
      role: deps.role.value.trim(),
      intro: introEditor.getHTML(),
      now: deps.now.value.trim(),
      portrait_src: deps.portraitSrc.value.trim() || null,
      portrait_alt: deps.portraitAlt.value.trim() || null,
      doing: doingEditor.getItems(),
      work: workEditor.getItems().map((w) => ({ ...w, href: w.href || null })),
      gallery: galleryEditor.getItems(),
      elsewhere: elsewhereEditor.getItems(),
    };

    // .select() so a policy-rejected upsert is distinguishable from a real
    // one -- without it this reports "Saved." over an unchanged database.
    const failure = wrote(
      await supabase.from('site_content').upsert(payload).select('id'),
      'Could not save',
    );
    deps.aboutStatus.hidden = false;
    deps.aboutStatus.classList.toggle('error', Boolean(failure));
    deps.aboutStatus.textContent = failure
      ? failure.message
      : 'Saved. The site will rebuild in about a minute.';
  });

  return { loadAboutContent };
}
