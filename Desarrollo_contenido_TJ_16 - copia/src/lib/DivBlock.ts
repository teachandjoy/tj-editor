import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Custom TipTap node that preserves generic <div> elements with their
 * classes, inline styles, and data-* attributes. This is critical for
 * corporate identity blocks (tj-editor-block) and styled blocks
 * (block-tip, block-perla, etc.) to render correctly in the editor
 * and survive round-trip serialization.
 */
export const DivBlock = Node.create({
  name: 'divBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('class') || null,
        renderHTML: (attributes: Record<string, string | null>) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style') || null,
        renderHTML: (attributes: Record<string, string | null>) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
      'data-tj-block': {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-tj-block') || null,
        renderHTML: (attributes: Record<string, string | null>) => {
          if (!attributes['data-tj-block']) return {};
          return { 'data-tj-block': attributes['data-tj-block'] };
        },
      },
      'data-tj-block-name': {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-tj-block-name') || null,
        renderHTML: (attributes: Record<string, string | null>) => {
          if (!attributes['data-tj-block-name']) return {};
          return { 'data-tj-block-name': attributes['data-tj-block-name'] };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[class]',
        // Only parse divs that have relevant classes (block-*, tj-editor-block, or custom styles)
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return false;
          const cls = node.getAttribute('class') || '';
          const hasTjBlock = node.hasAttribute('data-tj-block');
          const hasBlockClass = /\b(block-|tj-editor-block|tj-block|callout|tip|perla|nota|warning|conclusion|objectives)\b/.test(cls);
          const hasInlineStyle = node.hasAttribute('style');
          if (hasTjBlock || hasBlockClass || hasInlineStyle) return null; // accept
          return false; // reject - let TipTap handle normally
        },
      },
      {
        tag: 'div[data-tj-block]',
      },
      {
        tag: 'div[style]',
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return false;
          const style = node.getAttribute('style') || '';
          // Only capture divs with meaningful styling (background, border, padding)
          if (/background|border|padding|margin/.test(style)) return null;
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },
});
