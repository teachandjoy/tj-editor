import DOMPurify from 'dompurify';

// Configure DOMPurify to allow safe HTML elements used by the editor
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
  'ul', 'ol', 'li', 'a', 'strong', 'em', 'u', 's', 'sub', 'sup',
  'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption', 'div', 'span', 'mark', 'details', 'summary',
  'section', 'article', 'header', 'footer', 'nav', 'aside',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'style', 'id', 'name',
  'target', 'rel', 'width', 'height', 'colspan', 'rowspan',
  'type', 'start', 'data-*',
];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['target'],
  });
}

export function createSafeHtml(dirty: string): { __html: string } {
  return { __html: sanitizeHtml(dirty) };
}
