/**
 * Strip editor-specific attributes and elements from HTML before export.
 * Removes data-tj-*, contenteditable markers, ProseMirror classes, and
 * any editor control buttons that were injected into the DOM.
 */
export function cleanExportHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove editor control elements
  doc.querySelectorAll(
    '[data-tj-eb], [data-tj-lb], [data-tj-is], [data-tj-fn], ' +
    '[data-tj-doi], [data-tj-rn], [data-tj-ac], [data-tj-ip], ' +
    '.ProseMirror-gapcursor, .ProseMirror-separator, ' +
    '[data-node-view-wrapper], [data-drag-handle]'
  ).forEach(el => el.remove());

  // Remove editor-specific attributes
  doc.querySelectorAll('*').forEach(el => {
    // Remove data-tj-* attributes
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-tj-') ||
          attr.name === 'contenteditable' ||
          attr.name === 'data-block-type' ||
          attr.name === 'draggable') {
        el.removeAttribute(attr.name);
      }
    });
    // Remove ProseMirror-specific classes
    if (el.classList) {
      const toRemove: string[] = [];
      el.classList.forEach(cls => {
        if (cls.startsWith('ProseMirror') || cls === 'tiptap') {
          toRemove.push(cls);
        }
      });
      toRemove.forEach(cls => el.classList.remove(cls));
      if (el.classList.length === 0) el.removeAttribute('class');
    }
  });

  return doc.body.innerHTML;
}
