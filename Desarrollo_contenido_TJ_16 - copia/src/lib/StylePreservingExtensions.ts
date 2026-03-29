import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * GlobalAttributes extension that adds `style` and `class` attributes
 * to all block and inline nodes so imported HTML preserves its original
 * inline styles, CSS classes, colors, fonts, etc.
 */
export const StylePreserver = Extension.create({
  name: 'stylePreserver',

  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'bulletList',
          'orderedList',
          'listItem',
          'blockquote',
          'codeBlock',
          'hardBreak',
          'horizontalRule',
          'tableCell',
          'tableHeader',
          'tableRow',
          'table',
        ],
        attributes: {
          style: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('style') || null,
            renderHTML: (attributes: Record<string, string | null>) => {
              if (!attributes.style) return {};
              return { style: attributes.style };
            },
          },
          class: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('class') || null,
            renderHTML: (attributes: Record<string, string | null>) => {
              if (!attributes.class) return {};
              return { class: attributes.class };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('stylePreserver'),
      }),
    ];
  },
});
