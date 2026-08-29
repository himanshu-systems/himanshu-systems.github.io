import Quill from 'quill';
import 'quill/dist/quill.snow.css';

export function createRichEditor(containerId: string) {
  const quill = new Quill(`#${containerId}`, {
    theme: 'snow',
    modules: {
      toolbar: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']],
    },
  });
  return {
    getHTML: () => {
      const html = quill.root.innerHTML;
      return html === '<p><br></p>' ? '' : html;
    },
    setHTML: (html: string) => {
      quill.root.innerHTML = html && html.trim() ? html : '<p><br></p>';
    },
  };
}
