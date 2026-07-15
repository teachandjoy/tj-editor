import { Node, mergeAttributes } from '@tiptap/core';
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Bold, GripVertical, Italic, List, ListOrdered, Save, Trash2, Underline as UnderlineIcon, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { sanitizeHtml } from './sanitize';
import { DivBlock } from './DivBlock';
import { StylePreserver } from './StylePreservingExtensions';

interface BlockEditorModalProps {
  html: string;
  name: string;
  onCancel: () => void;
  onSave: (html: string) => void;
}

function BlockEditorModal({ html, name, onCancel, onSave }: BlockEditorModalProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, DivBlock, StylePreserver],
    content: html,
  });

  if (!editor) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4" onMouseDown={onCancel}>
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Editar bloque</h2>
            <p className="text-xs text-slate-500">{name}</p>
          </div>
          <button type="button" className="rounded-lg p-2 hover:bg-slate-100" onClick={onCancel} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1 border-b bg-slate-50 px-5 py-2">
          <button type="button" className={editor.isActive('bold') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></button>
          <button type="button" className={editor.isActive('italic') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></button>
          <button type="button" className={editor.isActive('underline') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></button>
          <button type="button" className={editor.isActive('bulletList') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></button>
          <button type="button" className={editor.isActive('orderedList') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></button>
        </div>
        <div className="max-h-[55vh] overflow-auto p-5">
          <EditorContent editor={editor} className="tj-block-modal-editor min-h-48 rounded-lg border border-slate-200 p-4" />
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={onCancel}>Cancelar</button>
          <button type="button" className="flex items-center gap-2 rounded-lg bg-[#1b4b85] px-4 py-2 text-sm font-semibold text-white" onClick={() => onSave(editor.getHTML())}>
            <Save size={15} /> Guardar bloque
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CorporateBlockView({ node, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const blockName = String(node.attrs.blockName || 'Bloque');
  const blockHtml = String(node.attrs.blockHtml || '');

  useEffect(() => {
    if (!editing) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditing(false);
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [editing]);

  return (
    <NodeViewWrapper
      className={`tj-corporate-block ${selected ? 'tj-corporate-block-selected' : ''}`}
      contentEditable={false}
    >
      <div className="tj-corporate-block-toolbar">
        <button type="button" data-drag-handle className="tj-corporate-block-handle" title="Arrastrar bloque" aria-label="Arrastrar bloque">
          <GripVertical size={16} />
        </button>
        <span>{blockName}</span>
        <button type="button" onClick={() => setEditing(true)}>Editar</button>
        <button type="button" className="danger" onClick={deleteNode} aria-label={`Eliminar ${blockName}`}>
          <Trash2 size={14} /> Eliminar
        </button>
      </div>
      <div className="tj-corporate-block-preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(blockHtml) }} />
      {editing && (
        <BlockEditorModal
          html={blockHtml}
          name={blockName}
          onCancel={() => setEditing(false)}
          onSave={nextHtml => {
            updateAttributes({ blockHtml: sanitizeHtml(nextHtml) });
            setEditing(false);
          }}
        />
      )}
    </NodeViewWrapper>
  );
}

export const CorporateBlock = Node.create({
  name: 'corporateBlock',
  group: 'block',
  atom: true,
  isolating: true,
  defining: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      blockId: { default: '' },
      blockName: { default: 'Bloque' },
      blockHtml: { default: '<p>Contenido del bloque</p>' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-tj-corporate-block]',
        getAttrs: element => {
          if (!(element instanceof HTMLElement)) return false;
          return {
            blockId: element.getAttribute('data-tj-block-id') || '',
            blockName: element.getAttribute('data-tj-block-name') || 'Bloque',
            blockHtml: element.getAttribute('data-tj-block-html') || element.innerHTML,
          };
        },
      },
      {
        tag: 'div.tj-editor-block',
        getAttrs: element => {
          if (!(element instanceof HTMLElement)) return false;
          return {
            blockId: element.getAttribute('data-tj-block') || '',
            blockName: element.getAttribute('data-tj-block-name') || 'Bloque',
            blockHtml: element.innerHTML,
          };
        },
      },
      {
        tag: 'div.block-tip, div.block-perla, div.block-nota, div.block-warning, div.block-conclusion, div.block-objectives',
        getAttrs: element => {
          if (!(element instanceof HTMLElement)) return false;
          const name = [...element.classList].find(className => className.startsWith('block-'))?.replace('block-', '') || 'Bloque';
          return {
            blockId: `legacy-${name}`,
            blockName: name.charAt(0).toUpperCase() + name.slice(1),
            blockHtml: element.outerHTML,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-tj-corporate-block': 'true',
        'data-tj-block-id': node.attrs.blockId,
        'data-tj-block-name': node.attrs.blockName,
        'data-tj-block-html': node.attrs.blockHtml,
        class: 'tj-corporate-block-serialized',
      }),
      ['p', {}, node.attrs.blockName],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CorporateBlockView);
  },
});
