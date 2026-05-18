import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store/context';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { ResizableImage } from '../lib/ResizableImage';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Link from '@tiptap/extension-link';
import {
  ArrowLeft, Save, Eye, Download, FileText, Bold, Italic,
  Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Quote, Minus, Undo, Redo,
  Table as TableIcon, Image, Link as LinkIcon, Highlighter,
  Superscript as SuperIcon, Subscript as SubIcon, Palette, BookOpen,
  ImagePlus, Type, ChevronDown, X, Maximize2, Minimize2,
  Columns, Trash2, Code, Edit, Plus, Upload
} from 'lucide-react';
import ImportDialog from '../components/editor/ImportDialog';
import PublicationPreviewDialog from '../components/editor/PublicationPreviewDialog';
import { StylePreserver } from '../lib/StylePreservingExtensions';
import { DivBlock } from '../lib/DivBlock';
import { formatReference, generateInTextCitation } from '../utils/bibliography';
import { downloadFile } from '../utils/export';
import type { BibliographyReference, IdentityBlock } from '../types';
import { TJ } from '../constants/theme';
import ModalPortal from '../components/ui/ModalPortal';
import { createPortal } from 'react-dom';

function getBlockStyles(cp: string, cs: string, ct: string): string {
  return `
    .block-tip{background:#f6f7fa;border-left:5px solid #a8b8d8;padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
    .block-perla{background:#eff6ff;border-left:5px solid ${cp};padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
    .block-nota{background:#fff8e5;border-left:5px solid ${ct};padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
    .block-warning{background:#fff5f5;border-left:5px solid ${cs};padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
    .block-conclusion{background:#fff8e5;border:1px solid #e8d89a;border-radius:8px;padding:12px 14px;margin:20px 0}
    .block-objectives{background:#f0f7ff;border:1px solid #bcd4f0;border-radius:8px;padding:12px 14px;margin:14px 0}
    .tj-editor-block{margin:16px 0;border-radius:8px;padding:4px}
  `;
}

/** Strip editor-only UI (block controls, drag handles) from HTML before export/save */
function stripEditorControls(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  doc.querySelectorAll('.tj-block-controls, .tj-block-delete').forEach(el => el.remove());
  // Remove draggable attrs and editor-only classes
  doc.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'));
  doc.querySelectorAll('.tj-block-selected').forEach(el => el.classList.remove('tj-block-selected'));
  doc.querySelectorAll('.tj-dragging').forEach(el => el.classList.remove('tj-dragging'));
  return doc.body.firstElementChild?.innerHTML || html;
}

function buildExportHTML(
  topic: { title: string; content: string; author: string; version: string; date: string; offerName: string },
  topicRefs: BibliographyReference[],
  snippet?: string,
  identity?: { colorPrimary: string; colorSecondary: string; colorTertiary: string; fontPrimaryName?: string; fontSecondaryName?: string; logoUrl?: string }
): string {
  const cp = identity?.colorPrimary || '#1b4b85';
  const cs = identity?.colorSecondary || '#8b2f3a';
  const ct = identity?.colorTertiary || '#c5aa6f';
  const fm = identity?.fontPrimaryName || 'Montserrat';
  const fb = identity?.fontSecondaryName || 'Open Sans';
  const logo = identity?.logoUrl || '';
  const refsHTML = topicRefs.length > 0 ? `
    <details style="border:1px solid #919BA5;border-radius:8px;overflow:hidden;background:#fff;margin-top:20px">
      <summary style="list-style:none;cursor:pointer;background:${cp};color:#fff;padding:12px 14px;font-size:1rem;outline:none;font-weight:600">
        Referencias bibliográficas
      </summary>
      <div style="padding:12px 14px;background:#f6f7fa">
        <ol style="margin:0 0 0 18px;padding:0;font-size:.9rem">
          ${topicRefs.map((r, i) => `<li style="margin:4px 0">${formatReference(r, i + 1)}</li>`).join('')}
        </ol>
      </div>
    </details>` : '';

  if (snippet?.trim()) {
    const blockStyles = getBlockStyles(cp, cs, ct);
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${topic.title}</title>
<link href="https://fonts.googleapis.com/css2?family=${fm.replace(/ /g,'+')}:wght@400;600;700&family=${fb.replace(/ /g,'+')}:wght@400;600&display=swap" rel="stylesheet">
<style>${blockStyles}</style>
</head><body style="font-family:'${fb}',sans-serif;background:#f5f5f5;padding:20px;margin:0">
${snippet.replace('Título principal del tema', topic.title).replace('Autor 1 · Autor 2 · Autor 3', topic.author)}
<section style="max-width:1200px;margin:20px auto;font-family:'${fb}',sans-serif;color:#212121;line-height:1.65">
${topic.content}${refsHTML}
</section></body></html>`;
  }

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${topic.title}</title>
<link href="https://fonts.googleapis.com/css2?family=${fm.replace(/ /g,'+')}:wght@400;600;700&family=${fb.replace(/ /g,'+')}:wght@400;600&display=swap" rel="stylesheet">
<style>
  body{font-family:'${fb}',sans-serif;background:#f5f5f5;margin:0;padding:20px;color:#212121}
  .wrap{max-width:900px;margin:0 auto;background:#fff;border-radius:10px;padding:48px;box-shadow:0 2px 20px rgba(0,0,0,.08)}
  h1{font-family:'${fm}',sans-serif;color:${cp};font-size:1.8rem;margin:0 0 12px;font-weight:700}
  h2{font-family:'${fm}',sans-serif;color:${cp};font-size:1.3rem;margin:24px 0 8px;font-weight:600}
  h3{font-family:'${fm}',sans-serif;color:${cs};font-size:1.1rem;margin:16px 0 6px}
  p{margin:0 0 10px;line-height:1.75;text-align:justify}
  table{width:100%;border-collapse:collapse;margin:14px 0}
  th{background:${cp};color:#fff;padding:9px 12px;border:1px solid #ddd;text-align:left;font-weight:600}
  th p,th span{color:#fff}
  td{padding:8px 12px;border:1px solid #ddd}
  tr:nth-child(even) td{background:#fafafa}
  blockquote{border-left:4px solid ${ct};background:#fdf9f0;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0}
  img{max-width:100%;border-radius:6px}
  figure{text-align:center;margin:20px 0}
  figcaption{font-size:12px;color:#666;margin-top:6px;font-style:italic}
  sup{font-size:11px;color:${cp};font-weight:600;vertical-align:super}
  .meta{font-size:13px;color:#a8b8d8;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid ${ct}}
  .block-tip{background:#f6f7fa;border-left:5px solid #a8b8d8;padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
  .block-perla{background:#eff6ff;border-left:5px solid ${cp};padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
  .block-nota{background:#fff8e5;border-left:5px solid ${ct};padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
  .block-warning{background:#fff5f5;border-left:5px solid ${cs};padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
  .block-conclusion{background:#fff8e5;border:1px solid #e8d89a;border-radius:8px;padding:12px 14px;margin:20px 0}
  .block-objectives{background:#f0f7ff;border:1px solid #bcd4f0;border-radius:8px;padding:12px 14px;margin:14px 0}
  details summary{cursor:pointer;background:${cp};color:#fff;padding:10px 14px;border-radius:6px;font-weight:600;list-style:none}
  details>div{padding:12px 14px;background:#f6f7fa;border:1px solid #ddd;border-top:0}
</style></head><body><div class="wrap">
${logo ? `<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid ${ct}"><img src="${logo}" style="height:40px;object-fit:contain"></div>` : ''}
<div class="meta">${topic.offerName ? `<strong>${topic.offerName}</strong> · ` : ''}${topic.author} · ${topic.version} · ${topic.date}</div>
${topic.content}${refsHTML}
</div></body></html>`;
}

export default function EditorPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { topics, offers, identities, updateTopic, references, updateReference, addReference, media, uploadMedia, addMedia, folders, currentUser } = useApp();
  const topic = topics.find(t => t.id === topicId);

  const [showReferences, setShowReferences] = useState(false);
  const [showRefNew, setShowRefNew] = useState(false);
  const [editingRef, setEditingRef] = useState<BibliographyReference | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageScale, setImageScale] = useState(70);
  const [figureCount, setFigureCount] = useState(1);
  const [autoSaved, setAutoSaved] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imgTab, setImgTab] = useState<'repo' | 'upload' | 'url'>('repo');
  const [imgUrlInput, setImgUrlInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [showBlockCatalog, setShowBlockCatalog] = useState(false);
  const [blockPreviewId, setBlockPreviewId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPublicationPreview, setShowPublicationPreview] = useState(false);
  const [publicationPreviewHtml, setPublicationPreviewHtml] = useState('');
  const [showFigureCitation, setShowFigureCitation] = useState(false);
  const [figureCitationType, setFigureCitationType] = useState<string>('Figura');
  const [figureCitationCustom, setFigureCitationCustom] = useState('');
  const [showTableNameDialog, setShowTableNameDialog] = useState(false);
  const [tableNameDraft, setTableNameDraft] = useState('');
  const [tableCount, setTableCount] = useState(1);

  // ── Block Editor Panel state ──
  const [blockEditorOpen, setBlockEditorOpen] = useState(false);
  const [blockEditorData, setBlockEditorData] = useState<{
    mode: 'generic' | 'identity';
    cls?: string;
    label?: string;
    block?: IdentityBlock;
    existingBlockHtml?: string;
    existingBlockPos?: number;
  } | null>(null);
  const blockEditorRef = useRef<HTMLDivElement>(null);
  const blockEditorInitRef = useRef(false);
  const openExistingBlockEditorRef = useRef<(blockEl: HTMLElement) => void>(() => {});

  const editorWrapRef = useRef<HTMLDivElement>(null);

  // Ref form
  const emptyRef = { style: 'vancouver', type: 'article', authors: '', title: '', year: '', journal: '', volume: '', issue: '', pages: '', doi: '', url: '', publisher: '', city: '', edition: '' };
  const [newRef, setNewRef] = useState({ ...emptyRef });

  const topicRefs = useMemo(() => {
    if (!topic) return [];
    return references.filter(r => topic.referenceIds.includes(r.id));
  }, [topic, references]);

  const offer = useMemo(() => offers.find(o => o.id === topic?.offerId), [offers, topic]);
  const identity = useMemo(() => identities.find(i => i.id === offer?.identityId), [identities, offer]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _snippetBlocks = identity?.detectedBlocks || [];
  const identityBlocks: IdentityBlock[] = identity?.blocks || [];

  const genericBlocks: [string, string][] = [
    ['block-tip', 'Tip'],
    ['block-perla', 'Perla'],
    ['block-nota', 'Nota'],
    ['block-warning', 'Advertencia'],
    ['block-conclusion', 'Conclusión'],
    ['block-objectives', 'Objetivos'],
  ];

  // Scoped references: only show references applicable to this topic/module
  const scopedReferences = useMemo(() => {
    if (!topic) return references;
    return references.filter(r => {
      // General references (no scoping) are always visible
      if (!r.offerId && !r.moduleIds?.length && !r.topicIds?.length) return true;
      // If scoped to this topic specifically
      if (r.topicIds?.includes(topic.id)) return true;
      // If scoped to this module
      if (r.moduleIds?.includes(topic.moduleId)) return true;
      // If scoped to this offer (and no further module/topic restriction)
      if (r.offerId === topic.offerId && !r.moduleIds?.length && !r.topicIds?.length) return true;
      // Already linked to this topic
      if (topic.referenceIds.includes(r.id)) return true;
      return false;
    });
  }, [topic, references]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const blockBtnRef = useRef<HTMLDivElement>(null);
  const [blockCatalogPos, setBlockCatalogPos] = useState({ top: 0, left: 0 });

  const initialContent = useMemo(() => {
    if (!topic) return '';
    if (topic.content) return topic.content;
    let html = '';
    for (const block of topic.blocks.sort((a, b) => a.order - b.order)) {
      switch (block.type) {
        case 'heading': html += `<h${block.level || 2}>${block.content}</h${block.level || 2}>`; break;
        case 'paragraph': html += `<p>${block.content}</p>`; break;
        case 'callout': {
          const cls = block.variant === 'objectives' ? 'block-objectives' : block.variant === 'tip' ? 'block-tip' : 'block-perla';
          html += `<div class="${cls}"><p>${block.content.replace(/\n/g, '<br>')}</p></div>`; break;
        }
        case 'section': html += `<h2>${block.sectionTitle || ''}</h2><p>${block.content || 'Escriba aquí el contenido...'}</p>`; break;
        default: if (block.content) html += `<p>${block.content}</p>`;
      }
    }
    return html || `<h1>${topic.title}</h1><p>Comience a escribir aquí...</p>`;
  }, [topic]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }), TableRow, TableCell, TableHeader,
      Placeholder.configure({ placeholder: 'Comience a escribir...' }),
      Highlight.configure({ multicolor: true }), TextStyle, Color,
      Superscript, Subscript, Link.configure({ openOnClick: false }),
      StylePreserver,
      DivBlock,
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: 'tiptap focus:outline-none min-h-[600px] px-16 py-12' },
    },
    onUpdate: ({ editor: ed }) => {
      // Autosave debounced — 2s for API persistence
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        if (topic) {
          updateTopic(topic.id, { content: ed.getHTML() });
          setAutoSaved(true);
          setTimeout(() => setAutoSaved(false), 2000);
        }
      }, 2000);
    },
  });

  // Escape key exits fullscreen + closes dropdowns
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (blockEditorOpen) { setBlockEditorOpen(false); setBlockEditorData(null); return; }
        if (isFullscreen) setIsFullscreen(false);
        setShowBlockCatalog(false);
        setShowHeadingMenu(false);
        setShowColorPicker(false);
        setShowLinkInput(false);
        setShowExportMenu(false);
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isFullscreen, blockEditorOpen]);

  // Unsaved changes confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editor && topic && editor.getHTML() !== topic.content) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editor, topic]);

  // ── Block overlay controls (rendered OUTSIDE ProseMirror DOM) ──
  const [hoveredBlockEl, setHoveredBlockEl] = useState<HTMLElement | null>(null);
  const [blockCtrlPos, setBlockCtrlPos] = useState<{ top: number; right: number } | null>(null);
  const blockCtrlRef = useRef<HTMLDivElement>(null);

  // Track which block the mouse is over and position the overlay
  useEffect(() => {
    const wrap = editorWrapRef.current;
    if (!wrap || !editor) return;

    const isBlock = (el: HTMLElement) =>
      el.classList.contains('tj-editor-block') || Array.from(el.classList).some(c => /^block-/.test(c));

    const findBlock = (target: HTMLElement): HTMLElement | null => {
      let cur: HTMLElement | null = target;
      while (cur && cur !== wrap) {
        if (isBlock(cur)) return cur;
        cur = cur.parentElement;
      }
      return null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore if hovering the overlay itself
      if (blockCtrlRef.current?.contains(target)) return;
      const block = findBlock(target);
      if (block && block !== hoveredBlockEl) {
        setHoveredBlockEl(block);
        const wrapRect = wrap.getBoundingClientRect();
        const blockRect = block.getBoundingClientRect();
        setBlockCtrlPos({
          top: blockRect.top - wrapRect.top,
          right: 4,
        });
      } else if (!block) {
        setHoveredBlockEl(null);
        setBlockCtrlPos(null);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (blockCtrlRef.current?.contains(related)) return;
      setHoveredBlockEl(null);
      setBlockCtrlPos(null);
    };

    // Click to select block
    const handleClick = (e: MouseEvent) => {
      wrap.querySelectorAll('.tj-editor-block.tj-block-selected').forEach(el => el.classList.remove('tj-block-selected'));
      const block = findBlock(e.target as HTMLElement);
      if (block) block.classList.add('tj-block-selected');
    };

    // Double-click to edit block
    const handleDblClick = (e: MouseEvent) => {
      const block = findBlock(e.target as HTMLElement);
      if (block) {
        e.preventDefault();
        openExistingBlockEditorRef.current(block);
      }
    };

    // Delete/Backspace to remove selected block
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = wrap.querySelector('.tj-editor-block.tj-block-selected');
        if (selected) {
          const sel = window.getSelection();
          const isEditingText = sel && sel.rangeCount > 0 && selected.contains(sel.anchorNode) && sel.toString().length === 0 && sel.anchorNode?.nodeType === Node.TEXT_NODE;
          if (!isEditingText) {
            e.preventDefault();
            selected.remove();
            editor.commands.focus();
          }
        }
      }
    };

    wrap.addEventListener('mousemove', handleMouseMove);
    wrap.addEventListener('mouseleave', handleMouseLeave);
    wrap.addEventListener('click', handleClick);
    wrap.addEventListener('dblclick', handleDblClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      wrap.removeEventListener('mousemove', handleMouseMove);
      wrap.removeEventListener('mouseleave', handleMouseLeave);
      wrap.removeEventListener('click', handleClick);
      wrap.removeEventListener('dblclick', handleDblClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, hoveredBlockEl]);

  const handleSave = useCallback(() => {
    if (!topic || !editor) return;
    const cleanHtml = stripEditorControls(editor.getHTML());
    updateTopic(topic.id, { content: cleanHtml });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [topic, editor, updateTopic]);

  const handleExport = useCallback((withSnippet: boolean) => {
    if (!topic) return;
    const rawContent = editor?.getHTML() || topic.content;
    const content = stripEditorControls(rawContent);
    const html = buildExportHTML({ ...topic, content }, topicRefs, withSnippet ? identity?.snippet : undefined, identity);
    downloadFile(html, `${topic.title.replace(/[^a-z0-9]/gi, '_')}.html`);
    setShowExportMenu(false);
  }, [topic, editor, topicRefs, identity]);

  const insertCitation = useCallback((refId: string) => {
    if (!editor || !topic) return;
    const ref = references.find(r => r.id === refId);
    if (!ref) return;
    if (!topic.referenceIds.includes(refId)) {
      updateTopic(topic.id, { referenceIds: [...topic.referenceIds, refId] });
    }
    const idx = [...new Set([...topic.referenceIds, refId])].indexOf(refId) + 1;
    const citation = generateInTextCitation(ref, idx);
    editor.chain().focus().insertContent(`<sup>${citation}</sup>`).run();
    setShowReferences(false);
  }, [editor, references, topic, updateTopic]);

  const handleSaveRef = useCallback(() => {
    if (!newRef.authors || !newRef.title || !newRef.year) return;
    if (editingRef) {
      updateReference(editingRef.id, {
        style: newRef.style as 'apa' | 'vancouver',
        type: newRef.type as BibliographyReference['type'],
        authors: newRef.authors, title: newRef.title, year: newRef.year,
        journal: newRef.journal || undefined, volume: newRef.volume || undefined,
        issue: newRef.issue || undefined, pages: newRef.pages || undefined,
        doi: newRef.doi || undefined, url: newRef.url || undefined,
        publisher: newRef.publisher || undefined, city: newRef.city || undefined,
        edition: newRef.edition || undefined,
      });
      setEditingRef(null);
    } else {
      const ref: BibliographyReference = {
        id: `ref-${Date.now()}`,
        style: newRef.style as 'apa' | 'vancouver',
        type: newRef.type as BibliographyReference['type'],
        authors: newRef.authors, title: newRef.title, year: newRef.year,
        journal: newRef.journal || undefined, volume: newRef.volume || undefined,
        issue: newRef.issue || undefined, pages: newRef.pages || undefined,
        doi: newRef.doi || undefined, url: newRef.url || undefined,
        publisher: newRef.publisher || undefined, city: newRef.city || undefined,
        edition: newRef.edition || undefined,
        offerId: topic?.offerId,
        moduleIds: topic?.moduleId ? [topic.moduleId] : undefined,
        topicIds: topic?.id ? [topic.id] : undefined,
      };
      addReference(ref);
      if (topic) updateTopic(topic.id, { referenceIds: [...topic.referenceIds, ref.id] });
      insertCitation(ref.id);
    }
    setNewRef({ ...emptyRef });
    setShowRefNew(false);
  }, [newRef, editingRef, addReference, updateReference, topic, updateTopic, insertCitation]);

  const openEditRef = useCallback((ref: BibliographyReference) => {
    setNewRef({
      style: ref.style, type: ref.type, authors: ref.authors, title: ref.title, year: ref.year,
      journal: ref.journal || '', volume: ref.volume || '', issue: ref.issue || '',
      pages: ref.pages || '', doi: ref.doi || '', url: ref.url || '',
      publisher: ref.publisher || '', city: ref.city || '', edition: ref.edition || '',
    });
    setEditingRef(ref);
    setShowRefNew(true);
  }, []);

  const doInsertImage = useCallback((url: string, name: string) => {
    if (!editor) return;
    const caption = imageCaption || name;
    const figNum = figureCount;
    const pct = imageScale;
    editor.chain().focus().insertContent(
      `<figure><img src="${url}" alt="${caption}" style="width:${pct}%;max-width:100%;display:block;margin:0 auto" data-scale="${pct}" /><figcaption><strong>Figura ${figNum}.</strong> ${caption}</figcaption></figure>`
    ).run();
    setFigureCount(f => f + 1);
    setImageCaption('');
    setShowImagePicker(false);
  }, [editor, imageCaption, figureCount, imageScale]);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const result = await uploadMedia(file, {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          folderId: 'root',
          offerId: topic?.offerId || '',
          uploadedBy: currentUser?.id || 'current',
        });
        doInsertImage(result.url, result.name);
      } catch (err) {
        console.error('Image upload error:', err);
      }
    };
    input.click();
  }, [uploadMedia, doInsertImage, topic, currentUser]);

  const insertBlock = useCallback((cls: string, label: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';
    blockEditorInitRef.current = false;
    setBlockEditorData({
      mode: 'generic',
      cls,
      label,
      existingBlockHtml: selectedText.trim() || '',
    });
    setBlockEditorOpen(true);
  }, [editor]);

  const insertIdentityBlock = useCallback((block: IdentityBlock) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';
    blockEditorInitRef.current = false;
    setBlockEditorData({
      mode: 'identity',
      block,
      existingBlockHtml: selectedText.trim() || '',
    });
    setBlockEditorOpen(true);
    setShowBlockCatalog(false);
  }, [editor]);

  // ── Save block from the WYSIWYG editor panel ──
  const saveBlockFromEditor = useCallback(() => {
    if (!editor || !blockEditorData || !blockEditorRef.current) return;
    const userContent = blockEditorRef.current.innerHTML.trim();
    if (!userContent || userContent === '<br>') return;

    if (blockEditorData.existingBlockPos != null) {
      // Editing existing block — delete old, insert new at same spot
      const pos = blockEditorData.existingBlockPos;
      const node = editor.state.doc.nodeAt(pos);
      if (node) {
        const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
        editor.view.dispatch(tr);
      }
      editor.chain().focus().setTextSelection(Math.min(pos, editor.state.doc.content.size)).run();
    }

    if (blockEditorData.mode === 'generic') {
      const cls = blockEditorData.cls || 'block-tip';
      const label = blockEditorData.label || 'Tip';
      editor.chain().focus().insertContent(`<div class="${cls}"><p><strong>${label}:</strong> ${userContent}</p></div><p></p>`).run();
    } else if (blockEditorData.mode === 'identity' && blockEditorData.block) {
      const block = blockEditorData.block;
      let blockHtml = block.html;
      const parser = new DOMParser();
      const doc = parser.parseFromString(blockHtml, 'text/html');
      const firstP = doc.querySelector('p');
      if (firstP) {
        // Preserve the <strong>Title:</strong> prefix if present
        const strongEl = firstP.querySelector('strong');
        if (strongEl) {
          const titlePrefix = strongEl.outerHTML;
          firstP.innerHTML = `${titlePrefix} ${userContent}`;
        } else {
          firstP.innerHTML = `<strong>${block.name}:</strong> ${userContent}`;
        }
        blockHtml = doc.body.innerHTML;
      }
      const wrappedHtml = `<div data-tj-block="${block.id}" data-tj-block-name="${block.name}" class="tj-editor-block">${blockHtml}</div><p></p>`;
      editor.chain().focus().insertContent(wrappedHtml, { parseOptions: { preserveWhitespace: 'full' } }).run();
    }

    setBlockEditorOpen(false);
    setBlockEditorData(null);
  }, [editor, blockEditorData]);

  // ── Open block editor for existing block in editor ──
  const openExistingBlockEditor = useCallback((blockEl: HTMLElement) => {
    if (!editor) return;
    // Find the ProseMirror position of this block
    const view = editor.view;
    const pos = view.posAtDOM(blockEl, 0);
    // Resolve to the start of the node
    const resolved = view.state.doc.resolve(pos);
    let nodePos = resolved.before(resolved.depth);
    // Make sure we found a divBlock node
    const node = view.state.doc.nodeAt(nodePos);
    if (!node || node.type.name !== 'divBlock') {
      // Try parent
      nodePos = resolved.before(Math.max(1, resolved.depth - 1));
    }

    // Extract inner content (without control buttons and without title prefix)
    const clone = blockEl.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.tj-block-controls, .tj-block-delete').forEach(el => el.remove());
    // Strip the <strong>Title:</strong> prefix so user only edits body text
    const firstP = clone.querySelector('p');
    if (firstP) {
      const strong = firstP.querySelector('strong');
      if (strong) strong.remove();
    }
    const innerHtml = clone.innerHTML;

    const isTjBlock = blockEl.hasAttribute('data-tj-block');
    const blockId = blockEl.getAttribute('data-tj-block') || '';
    const matchingBlock = identityBlocks.find(b => b.id === blockId);

    blockEditorInitRef.current = false;
    setBlockEditorData({
      mode: isTjBlock ? 'identity' : 'generic',
      cls: blockEl.className.split(' ').find(c => c.startsWith('block-')) || '',
      label: blockEl.getAttribute('data-tj-block-name') || 'Bloque',
      block: matchingBlock,
      existingBlockHtml: innerHtml,
      existingBlockPos: nodePos,
    });
    setBlockEditorOpen(true);
  }, [editor, identityBlocks]);
  openExistingBlockEditorRef.current = openExistingBlockEditor;

  // ── Initialize block editor content when it opens ──
  useEffect(() => {
    if (blockEditorOpen && blockEditorRef.current && blockEditorData && !blockEditorInitRef.current) {
      blockEditorInitRef.current = true;
      blockEditorRef.current.innerHTML = blockEditorData.existingBlockHtml || '';
      // Focus at end
      setTimeout(() => {
        if (blockEditorRef.current) {
          blockEditorRef.current.focus();
          const sel = window.getSelection();
          if (sel) {
            sel.selectAllChildren(blockEditorRef.current);
            sel.collapseToEnd();
          }
        }
      }, 50);
    }
  }, [blockEditorOpen, blockEditorData]);

  const insertLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl(''); setShowLinkInput(false);
  }, [editor, linkUrl]);

  // ── Figure citation: parse images/figures/tables from editor content ──
  const editorFigures = useMemo(() => {
    if (!editor) return [];
    const html = editor.getHTML();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const items: { src: string; caption: string; index: number; kind: string }[] = [];
    let figIdx = 1;
    let tblIdx = 1;
    // Find all <figure> elements (images with captions)
    doc.querySelectorAll('figure').forEach((fig) => {
      const img = fig.querySelector('img');
      const figcaption = fig.querySelector('figcaption');
      if (img) {
        items.push({
          src: img.getAttribute('src') || '',
          caption: figcaption?.textContent || img.getAttribute('alt') || 'Sin descripción',
          index: figIdx++,
          kind: 'Figura',
        });
      }
    });
    // Also find standalone <img> not inside <figure>
    doc.querySelectorAll('img').forEach((img) => {
      if (img.closest('figure')) return;
      items.push({
        src: img.getAttribute('src') || '',
        caption: img.getAttribute('alt') || 'Sin descripción',
        index: figIdx++,
        kind: 'Imagen',
      });
    });
    // Find all tables in editor content
    doc.querySelectorAll('table').forEach((table) => {
      const caption = table.getAttribute('data-table-name') || table.querySelector('caption')?.textContent || '';
      const prev = table.previousElementSibling;
      const nameFromPrev = prev?.tagName === 'P' && prev.textContent?.match(/^Tabla\s+\d+\.\s*(.+)/i);
      const displayName = caption || (nameFromPrev ? nameFromPrev[1].trim() : `Tabla ${tblIdx}`);
      items.push({
        src: '',
        caption: displayName,
        index: tblIdx++,
        kind: 'Tabla',
      });
    });
    return items;
  }, [editor, editor?.getHTML()]);

  const insertFigureCitation = useCallback((figIndex: number, label: string) => {
    if (!editor) return;
    const citationLabel = figureCitationCustom.trim() || label;
    editor.chain().focus().insertContent(
      `<sup style="color:${TJ.primary};font-weight:600">(${citationLabel} ${figIndex})</sup>`
    ).run();
    setShowFigureCitation(false);
  }, [editor, figureCitationCustom]);

  const insertNamedTable = useCallback(() => {
    if (!editor) return;
    const name = tableNameDraft.trim() || `Tabla ${tableCount}`;
    const label = `Tabla ${tableCount}. ${name}`;
    editor.chain().focus().insertContent(
      `<p style="text-align:center;font-weight:600;font-size:0.9em;color:${TJ.primary}"><strong>${label}</strong></p>`
    ).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setTableCount(c => c + 1);
    setTableNameDraft('');
    setShowTableNameDialog(false);
  }, [editor, tableNameDraft, tableCount]);

  const handleImportContent = useCallback((html: string) => {
    if (!editor) return;
    editor.commands.setContent(html);
    if (topic) {
      updateTopic(topic.id, { content: editor.getHTML() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [editor, topic, updateTopic]);

  const handlePublicationPreview = useCallback(() => {
    if (!topic) return;
    const rawContent = editor?.getHTML() || topic.content;
    const content = stripEditorControls(rawContent);
    const html = buildExportHTML({ ...topic, content }, topicRefs, identity?.snippet, identity);
    setPublicationPreviewHtml(html);
    setShowPublicationPreview(true);
  }, [topic, editor, topicRefs, identity]);

  const TjColors = useMemo(() => {
    if (identity) {
      const identityColors = [
        identity.colorPrimary,
        identity.colorSecondary,
        identity.colorTertiary,
        identity.colorTextPrimary,
        identity.colorButtons,
        identity.colorButtonsHover,
      ].filter((c, i, arr) => c && arr.indexOf(c) === i);
      return ['#000000', ...identityColors, '#ffffff'];
    }
    return ['#000000', '#1b4b85', '#8b2f3a', '#c5aa6f', '#276749', '#92400e', '#c53030', '#6b46c1', '#2d3748', '#718096', '#ffffff'];
  }, [identity]);

  if (!topic) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#eef0f3' }}>
      <div className="text-center">
        <p className="text-gray-500 mb-3">Tema no encontrado</p>
        <button onClick={() => navigate('/topics')} className="px-4 py-2 text-sm rounded-lg text-white" style={{ background: TJ.primary }}>Ir a Temas</button>
      </div>
    </div>
  );

  const TbBtn = ({ onClick, active, title, children, disabled }: { onClick: () => void; active?: boolean; title?: string; children: React.ReactNode; disabled?: boolean }) => (
    <button onClick={onClick} title={title} disabled={disabled}
      className="flex items-center justify-center rounded transition-all flex-shrink-0"
      style={{ width: 28, height: 28, background: active ? 'rgba(27,75,133,0.12)' : 'transparent', color: active ? TJ.primary : '#555', opacity: disabled ? 0.35 : 1 }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = '#f0ece6'; }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </button>
  );
  const Sep = () => <div style={{ width: 1, height: 22, background: TJ.border, margin: '0 3px', flexShrink: 0 }} />;

  return (
    <div className={`flex flex-col h-screen ${isFullscreen ? 'fixed inset-0' : ''}`} style={{ background: '#eef0f3', zIndex: isFullscreen ? 9999 : undefined }}>
      {/* Top bar */}
      <div className="bg-white border-b px-2 md:px-4 py-2 md:py-2.5 flex items-center justify-between flex-shrink-0 gap-2" style={{ borderColor: TJ.border }}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0" style={{ color: '#666' }}>
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0">
            {editingTitle ? (
              <input
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={() => { if (titleDraft.trim()) updateTopic(topic.id, { title: titleDraft.trim() }); setEditingTitle(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { if (titleDraft.trim()) updateTopic(topic.id, { title: titleDraft.trim() }); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }}
                className="font-bold text-sm w-full px-1 py-0.5 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif', borderColor: TJ.primary }}
                autoFocus
              />
            ) : (
              <div
                className="font-bold text-sm truncate cursor-text hover:bg-blue-50/50 px-1 py-0.5 rounded transition-colors"
                style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                onClick={() => { setTitleDraft(topic.title); setEditingTitle(true); }}
                title="Clic para editar el título"
              >{topic.title}</div>
            )}
            <div className="text-xs truncate" style={{ color: '#a8b8d8' }}>{topic.offerName}{identity ? ` · ${identity.name}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {(saved || autoSaved) && (
            <span className="text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
              style={{ background: '#f0fff4', color: '#276749' }}>
              ✓ {saved ? 'Guardado' : 'Guardado automáticamente'}
            </span>
          )}
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm rounded-lg text-white font-semibold transition-all"
            style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
            onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
            <Save size={14} /> <span className="hidden md:inline">Guardar</span>
          </button>
          <button onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all"
            style={{ borderColor: TJ.border, color: TJ.text }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = TJ.primary; e.currentTarget.style.color = TJ.primary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.color = TJ.text; }}>
            <Upload size={14} /> <span className="hidden md:inline">Importar</span>
          </button>
          <button onClick={() => navigate(`/preview/${topic.id}`)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all"
            style={{ borderColor: TJ.border, color: TJ.text }}>
            <Eye size={14} /> Vista Previa
          </button>
          <button onClick={handlePublicationPreview}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all"
            style={{ borderColor: TJ.border, color: TJ.text }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = TJ.gold; e.currentTarget.style.color = TJ.secondary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.color = TJ.text; }}>
            <Eye size={14} /> Preview Publicación
          </button>
          {/* Mobile overflow menu for hidden buttons */}
          <div className="relative md:hidden">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: '#666' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg py-1 z-20 min-w-48 modal-enter" style={{ borderColor: TJ.border }}>
                <button onClick={() => { navigate(`/preview/${topic.id}`); setShowMobileMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: TJ.text }}>
                  <Eye size={14} style={{ color: TJ.primary }} /> Vista Previa
                </button>
                <button onClick={() => { handlePublicationPreview(); setShowMobileMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: TJ.text }}>
                  <Eye size={14} style={{ color: TJ.secondary }} /> Preview Publicación
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all"
              style={{ borderColor: TJ.border, color: TJ.text }}>
              <Download size={14} /> Exportar <ChevronDown size={12} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg py-1 z-20 min-w-52 modal-enter" style={{ borderColor: TJ.border }}>
                <button onClick={() => handleExport(true)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: TJ.text }}>
                  <FileText size={14} style={{ color: TJ.primary }} /> HTML con snippet {identity?.name ? `(${identity.name})` : ''}
                </button>
                <button onClick={() => handleExport(false)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: TJ.text }}>
                  <Code size={14} style={{ color: '#666' }} /> HTML genérico
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: isFullscreen ? TJ.secondary : '#666' }}
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}>
            {isFullscreen ? <><Minimize2 size={16} /><span className="text-xs font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Salir</span></> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="bg-white border-b px-2 md:px-3 py-1.5 flex items-center gap-0.5 flex-shrink-0 min-h-11 overflow-x-auto" style={{ borderColor: TJ.border, position: 'relative', zIndex: 50, overflow: 'visible' }}>
          {/* Heading */}
          <div className="relative">
            <button onClick={() => setShowHeadingMenu(!showHeadingMenu)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded transition-all"
              style={{ color: '#555', background: showHeadingMenu ? '#f0ece6' : 'transparent', whiteSpace: 'nowrap' }}>
              <Type size={13} />
              <span style={{ minWidth: 56 }}>
                {editor.isActive('heading', { level: 1 }) ? 'Título 1' : editor.isActive('heading', { level: 2 }) ? 'Título 2' : editor.isActive('heading', { level: 3 }) ? 'Título 3' : editor.isActive('heading', { level: 4 }) ? 'Título 4' : 'Párrafo'}
              </span>
              <ChevronDown size={11} />
            </button>
            {showHeadingMenu && (
              <div className="absolute left-0 top-full mt-1 bg-white border rounded-xl shadow-lg py-1 min-w-40 modal-enter" style={{ borderColor: TJ.border, zIndex: 9999 }}>
                {[['Párrafo', null], ['Título 1', 1], ['Título 2', 2], ['Título 3', 3], ['Título 4', 4], ['Título 5', 5]].map(([lbl, lvl]) => (
                  <button key={String(lbl)} onClick={() => { if (lvl) { editor.chain().focus().toggleHeading({ level: lvl as 1|2|3|4|5|6 }).run(); } else { editor.chain().focus().setParagraph().run(); } setShowHeadingMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    style={{ fontSize: lvl ? Math.max(12, 16 - (Number(lvl) * 1.5)) : 14, fontWeight: lvl && Number(lvl) <= 3 ? 600 : 400 }}>
                    {lbl}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Sep />
          <TbBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita (Ctrl+B)"><Bold size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva (Ctrl+I)"><Italic size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado"><UnderlineIcon size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado"><Strikethrough size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superíndice"><SuperIcon size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subíndice"><SubIcon size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Resaltar"><Highlighter size={14} /></TbBtn>
          <div className="relative">
            <TbBtn onClick={() => setShowColorPicker(!showColorPicker)} title="Color de texto"><Palette size={14} /></TbBtn>
            {showColorPicker && (
              <div className="absolute left-0 top-full mt-1 bg-white border rounded-xl shadow-lg p-2.5 z-20 flex gap-1.5 flex-wrap w-36 modal-enter" style={{ borderColor: TJ.border }}>
                {TjColors.map(c => (
                  <button key={c} onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }}
                    className="w-6 h-6 rounded border hover:scale-110 transition-transform" style={{ background: c, borderColor: '#ddd' }} />
                ))}
              </div>
            )}
          </div>
          <Sep />
          <TbBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Izquierda"><AlignLeft size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centro"><AlignCenter size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Derecha"><AlignRight size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justificar"><AlignJustify size={14} /></TbBtn>
          <Sep />
          <TbBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista con viñetas"><List size={14} /></TbBtn>
          <div className="relative">
            <TbBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered size={14} /></TbBtn>
            {editor.isActive('orderedList') && (
              <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-32" style={{ borderColor: TJ.border, zIndex: 9999 }}>
                {[
                  { type: '1', label: '1, 2, 3...' },
                  { type: 'a', label: 'a, b, c...' },
                  { type: 'A', label: 'A, B, C...' },
                  { type: 'i', label: 'i, ii, iii...' },
                  { type: 'I', label: 'I, II, III...' },
                ].map(opt => (
                  <button key={opt.type} onClick={() => {
                    const listEl = editor.view.dom.querySelector('ol');
                    if (listEl) listEl.style.listStyleType = opt.type === '1' ? 'decimal' : opt.type === 'a' ? 'lower-alpha' : opt.type === 'A' ? 'upper-alpha' : opt.type === 'i' ? 'lower-roman' : 'upper-roman';
                  }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <TbBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cita"><Quote size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Línea divisoria"><Minus size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código"><Code size={14} /></TbBtn>
          <Sep />
          {/* Table controls — highlighted when inside a table */}
          <TbBtn onClick={() => setShowTableNameDialog(true)} title="Insertar tabla con nombre"><TableIcon size={14} /></TbBtn>
          {editor.isActive('table') && (
            <>
              <div style={{ display:'flex',alignItems:'center',gap:2,background:'rgba(27,75,133,0.07)',borderRadius:6,padding:'1px 4px' }}>
                <span style={{fontSize:9,fontWeight:700,color:TJ.primary,fontFamily:'Montserrat,sans-serif',marginRight:2}}>TABLA:</span>
                <TbBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="Agregar fila arriba">
                  <span style={{fontSize:9,fontWeight:700,fontFamily:'Montserrat,sans-serif'}}>↑F</span>
                </TbBtn>
                <TbBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Agregar fila abajo">
                  <span style={{fontSize:9,fontWeight:700,fontFamily:'Montserrat,sans-serif'}}>↓F</span>
                </TbBtn>
                <TbBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Agregar columna izquierda">
                  <span style={{fontSize:9,fontWeight:700,fontFamily:'Montserrat,sans-serif'}}>←C</span>
                </TbBtn>
                <TbBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Agregar columna derecha"><Columns size={12} /></TbBtn>
                <TbBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Eliminar fila">
                  <span style={{fontSize:9,fontWeight:700,fontFamily:'Montserrat,sans-serif',color:'#c53030'}}>–F</span>
                </TbBtn>
                <TbBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Eliminar columna"><Trash2 size={11} /></TbBtn>
                <TbBtn onClick={() => editor.chain().focus().mergeCells().run()} title="Fusionar celdas">
                  <span style={{fontSize:9,fontWeight:700,fontFamily:'Montserrat,sans-serif'}}>⊞</span>
                </TbBtn>
                <TbBtn onClick={() => editor.chain().focus().splitCell().run()} title="Separar celda">
                  <span style={{fontSize:9,fontWeight:700,fontFamily:'Montserrat,sans-serif'}}>⊡</span>
                </TbBtn>
                <TbBtn onClick={() => editor.chain().focus().toggleHeaderRow().run()} title="Alternar encabezado">
                  <span style={{fontSize:9,fontWeight:700,fontFamily:'Montserrat,sans-serif'}}>Enc.</span>
                </TbBtn>
                <TbBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Eliminar tabla">
                  <Trash2 size={11} style={{color:'#c53030'}} />
                </TbBtn>
              </div>
            </>
          )}
          <Sep />
          <TbBtn onClick={() => setShowImagePicker(true)} title="Insertar imagen del repositorio"><Image size={14} /></TbBtn>
          <TbBtn onClick={handleImageUpload} title="Subir imagen"><ImagePlus size={14} /></TbBtn>
          <div className="relative">
            <TbBtn onClick={() => setShowLinkInput(!showLinkInput)} active={editor.isActive('link')} title="Insertar enlace"><LinkIcon size={14} /></TbBtn>
            {showLinkInput && (
              <div className="absolute left-0 top-full mt-1 bg-white border rounded-xl shadow-lg p-2.5 z-20 flex gap-2 min-w-72 modal-enter" style={{ borderColor: TJ.border }}>
                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
                  className="flex-1 px-2 py-1.5 text-xs border rounded-lg focus:outline-none" style={{ borderColor: TJ.border }}
                  onKeyDown={e => e.key === 'Enter' && insertLink()} autoFocus />
                <button onClick={insertLink} className="px-2.5 py-1 text-xs rounded-lg text-white" style={{ background: TJ.primary }}>OK</button>
                <button onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkInput(false); }}
                  className="px-2 py-1 text-xs rounded-lg" style={{ color: '#c53030', border: `1px solid #fed7d7` }}>Quitar</button>
              </div>
            )}
          </div>
          <TbBtn onClick={() => { setShowReferences(true); setShowRefNew(false); setEditingRef(null); }} title="Citas bibliográficas"><BookOpen size={14} /></TbBtn>
          <TbBtn onClick={() => setShowFigureCitation(true)} title="Citar figuras/contenido"><Image size={14} /></TbBtn>
          <Sep />
          {/* Block catalog button */}
          <div ref={blockBtnRef} className="relative">
            <button onClick={() => {
              if (!showBlockCatalog && blockBtnRef.current) {
                const rect = blockBtnRef.current.getBoundingClientRect();
                setBlockCatalogPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 340) });
              }
              setShowBlockCatalog(!showBlockCatalog);
            }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded transition-all"
              style={{ color: showBlockCatalog ? TJ.primary : '#555', background: showBlockCatalog ? 'rgba(27,75,133,0.12)' : 'transparent', whiteSpace: 'nowrap', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}>
              <Plus size={12} /> Bloques <ChevronDown size={11} />
            </button>
          </div>
          <Sep />
          <TbBtn onClick={() => editor.chain().focus().undo().run()} title="Deshacer (Ctrl+Z)"><Undo size={14} /></TbBtn>
          <TbBtn onClick={() => editor.chain().focus().redo().run()} title="Rehacer (Ctrl+Y)"><Redo size={14} /></TbBtn>
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 overflow-auto p-2 md:p-8" style={{ background: '#eef0f3' }}>
        <div ref={editorWrapRef} className="max-w-[850px] mx-auto bg-white min-h-[600px] md:min-h-[1100px] relative"
          style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)' }}>

          <EditorContent editor={editor} />

          {/* Block controls overlay — rendered OUTSIDE ProseMirror DOM */}
          {hoveredBlockEl && blockCtrlPos && (
            <div
              ref={blockCtrlRef}
              className="tj-block-controls-overlay"
              style={{
                position: 'absolute',
                top: blockCtrlPos.top,
                right: blockCtrlPos.right,
                zIndex: 50,
                display: 'flex',
                gap: 2,
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #d0d5dd',
                borderRadius: 6,
                padding: '2px 4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                userSelect: 'none',
              }}
              onMouseLeave={() => { setHoveredBlockEl(null); setBlockCtrlPos(null); }}
            >
              <span
                title="Mover bloque arriba (⬆) — clic derecho para mover abajo"
                style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontSize: 13, lineHeight: 1 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!hoveredBlockEl || !editor) return;
                  // Move block up: swap with previous sibling
                  const prev = hoveredBlockEl.previousElementSibling as HTMLElement | null;
                  if (prev) {
                    hoveredBlockEl.parentNode?.insertBefore(hoveredBlockEl, prev);
                    setHoveredBlockEl(null);
                    setBlockCtrlPos(null);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!hoveredBlockEl || !editor) return;
                  // Move block down: swap with next sibling
                  const next = hoveredBlockEl.nextElementSibling as HTMLElement | null;
                  if (next) {
                    hoveredBlockEl.parentNode?.insertBefore(next, hoveredBlockEl);
                    setHoveredBlockEl(null);
                    setBlockCtrlPos(null);
                  }
                }}
              >
                &#x2195;
              </span>
              <span
                title="Editar bloque (doble clic)"
                style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontSize: 13, lineHeight: 1 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (hoveredBlockEl) openExistingBlockEditorRef.current(hoveredBlockEl);
                }}
              >
                &#x270E;
              </span>
              <span
                title="Eliminar bloque"
                style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontSize: 13, lineHeight: 1, color: '#e53e3e' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (hoveredBlockEl && editor) {
                    hoveredBlockEl.remove();
                    editor.commands.focus();
                    setHoveredBlockEl(null);
                    setBlockCtrlPos(null);
                  }
                }}
              >
                &#x2715;
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Block Catalog Portal ── */}
      {showBlockCatalog && createPortal(
        <div>
          <div className="fixed inset-0 z-40" onClick={() => setShowBlockCatalog(false)} />
          <div className="fixed bg-white border rounded-xl shadow-xl z-50 min-w-80 max-w-96 modal-enter"
            style={{ top: blockCatalogPos.top, left: blockCatalogPos.left, borderColor: TJ.border, maxHeight: 420, display: 'flex', flexDirection: 'column' }}>
            <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              <div className="font-bold text-xs" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                Catálogo de Bloques {identity ? `— ${identity.name}` : ''}
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {/* Blocks in use — navigation */}
              {(() => {
                const wrap = editorWrapRef.current;
                const blocksInUse: { label: string; el: HTMLElement }[] = [];
                if (wrap) {
                  wrap.querySelectorAll('.tj-editor-block, [class*="block-"]').forEach(el => {
                    const htmlEl = el as HTMLElement;
                    if (htmlEl.closest('.tj-block-controls')) return;
                    const name = htmlEl.getAttribute('data-tj-block-name')
                      || Array.from(htmlEl.classList).find(c => /^block-/.test(c))?.replace('block-', 'Bloque ')
                      || 'Bloque';
                    blocksInUse.push({ label: name, el: htmlEl });
                  });
                }
                if (blocksInUse.length === 0) return null;
                return (
                  <div className="px-3 py-2 border-b" style={{ borderColor: TJ.border }}>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: '#38a169', fontFamily: 'Montserrat, sans-serif' }}>
                      Bloques en uso ({blocksInUse.length}) — clic para navegar:
                    </p>
                    <div className="flex flex-col gap-0.5 max-h-28 overflow-auto">
                      {blocksInUse.map((b, i) => (
                        <button key={i} onClick={() => { b.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); b.el.classList.add('tj-block-selected'); setTimeout(() => b.el.classList.remove('tj-block-selected'), 2000); setShowBlockCatalog(false); }}
                          className="text-left text-xs px-2 py-1 rounded hover:bg-gray-50 transition-colors truncate"
                          style={{ color: TJ.primary }}>
                          📍 {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Generic blocks — always visible */}
              <div className="px-3 py-2">
                <p className="text-xs font-semibold mb-2" style={{ color: '#666', fontFamily: 'Montserrat, sans-serif' }}>
                  Bloques genéricos:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {genericBlocks.map(([cls, label]) => (
                    <button key={cls} onClick={() => { insertBlock(cls, label); setShowBlockCatalog(false); }}
                      className="px-2.5 py-1.5 text-xs rounded-lg border transition-all"
                      style={{ borderColor: TJ.border, color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,75,133,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      + {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Identity custom blocks */}
              {identityBlocks.length > 0 && (
                <div className="px-3 py-2 border-t" style={{ borderColor: TJ.border }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Bloques de la identidad:</p>
                  {identityBlocks.map(block => (
                    <div key={block.id} className="mb-2">
                      <button onClick={() => insertIdentityBlock(block)}
                        className="w-full text-left p-2.5 rounded-lg border transition-all"
                        style={{ borderColor: TJ.border }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = TJ.primary; e.currentTarget.style.background = 'rgba(27,75,133,0.03)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.background = 'transparent'; }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>{block.name}</span>
                          <span className="text-xs" style={{ color: '#a8b8d8' }}>clic para insertar</span>
                        </div>
                        {block.html && (
                          <div className="text-xs rounded p-2 overflow-hidden" style={{ background: '#f8f8f8', border: `1px solid ${TJ.border}`, maxHeight: blockPreviewId === block.id ? 200 : 48 }}
                            dangerouslySetInnerHTML={{ __html: block.html }} />
                        )}
                      </button>
                      {block.html && (
                        <button onClick={(e) => { e.stopPropagation(); setBlockPreviewId(blockPreviewId === block.id ? null : block.id); }}
                          className="text-xs mt-0.5 px-2 py-0.5 rounded transition-all"
                          style={{ color: '#a8b8d8' }}>
                          {blockPreviewId === block.id ? 'Reducir preview' : 'Expandir preview'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Link to identities if no identity blocks */}
              {identityBlocks.length === 0 && identity && (
                <div className="px-3 py-2 border-t text-center" style={{ borderColor: TJ.border }}>
                  <p className="text-xs mb-2" style={{ color: '#a8b8d8' }}>
                    La identidad &ldquo;{identity.name}&rdquo; no tiene bloques configurados.
                  </p>
                  <button onClick={() => { setShowBlockCatalog(false); navigate('/identities'); }}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                    style={{ borderColor: TJ.primary, color: TJ.primary }}>
                    Configurar en Identidades Corporativas
                  </button>
                </div>
              )}
              {!identity && (
                <div className="px-3 py-2 border-t text-center" style={{ borderColor: TJ.border }}>
                  <p className="text-xs mb-2" style={{ color: '#a8b8d8' }}>
                    No hay identidad corporativa seleccionada para esta oferta.
                  </p>
                  <button onClick={() => { setShowBlockCatalog(false); navigate('/identities'); }}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                    style={{ borderColor: TJ.primary, color: TJ.primary }}>
                    Ir a Identidades Corporativas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Block Editor Panel (WYSIWYG) ── */}
      {blockEditorOpen && blockEditorData && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TJ.border }}>
              <div>
                <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                  {blockEditorData.existingBlockPos != null ? 'Editar Bloque' : 'Insertar Bloque'}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: '#a8b8d8' }}>
                  {blockEditorData.mode === 'identity' ? blockEditorData.block?.name : blockEditorData.label}
                  {blockEditorData.mode === 'generic' && <span className="ml-1">— {blockEditorData.cls}</span>}
                </p>
              </div>
              <button onClick={() => { setBlockEditorOpen(false); setBlockEditorData(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Cerrar (Esc)"><X size={17} /></button>
            </div>

            {/* Block template preview for identity blocks */}
            {blockEditorData.mode === 'identity' && blockEditorData.block?.html && (
              <div className="px-5 pt-3">
                <p className="text-xs font-semibold mb-1" style={{ color: '#999', fontFamily: 'Montserrat, sans-serif' }}>Vista previa del bloque:</p>
                <div className="rounded-lg p-2 overflow-hidden" style={{ background: '#f8f8f8', border: `1px solid ${TJ.border}`, maxHeight: 80 }}
                  dangerouslySetInnerHTML={{ __html: blockEditorData.block.html }} />
              </div>
            )}

            {/* Mini WYSIWYG formatting toolbar */}
            <div className="px-5 pt-3">
              <div className="flex items-center gap-0.5 p-1.5 bg-gray-50 rounded-lg border flex-wrap" style={{ borderColor: TJ.border }}>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('bold'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Negrita (Ctrl+B)" style={{ color: '#555' }}><Bold size={14} /></button>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('italic'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Cursiva (Ctrl+I)" style={{ color: '#555' }}><Italic size={14} /></button>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('underline'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Subrayado" style={{ color: '#555' }}><UnderlineIcon size={14} /></button>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('strikeThrough'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Tachado" style={{ color: '#555' }}><Strikethrough size={14} /></button>
                <div style={{ width: 1, height: 18, background: '#ddd', margin: '0 4px', flexShrink: 0 }} />
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('insertUnorderedList'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Lista con viñetas" style={{ color: '#555' }}><List size={14} /></button>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('insertOrderedList'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Lista numerada" style={{ color: '#555' }}><ListOrdered size={14} /></button>
                <div style={{ width: 1, height: 18, background: '#ddd', margin: '0 4px', flexShrink: 0 }} />
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('justifyLeft'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Izquierda" style={{ color: '#555' }}><AlignLeft size={14} /></button>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('justifyCenter'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Centro" style={{ color: '#555' }}><AlignCenter size={14} /></button>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('justifyFull'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Justificar" style={{ color: '#555' }}><AlignJustify size={14} /></button>
                <div style={{ width: 1, height: 18, background: '#ddd', margin: '0 4px', flexShrink: 0 }} />
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'blockquote'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Cita" style={{ color: '#555' }}><Quote size={14} /></button>
                <button type="button" onMouseDown={e => { e.preventDefault(); document.execCommand('superscript'); }} className="p-1.5 rounded hover:bg-white transition-colors" title="Superíndice" style={{ color: '#555' }}><SuperIcon size={14} /></button>
              </div>
            </div>

            {/* ContentEditable editor area */}
            <div className="px-5 py-3">
              <div
                ref={blockEditorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[140px] max-h-[280px] overflow-auto p-4 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{ borderColor: TJ.border, lineHeight: 1.7, fontFamily: 'Open Sans, sans-serif' }}
                onKeyDown={e => {
                  if (e.key === 'Escape') { e.preventDefault(); setBlockEditorOpen(false); setBlockEditorData(null); }
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveBlockFromEditor(); }
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs" style={{ color: '#bbb' }}>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs border" style={{ borderColor: '#e5e7eb' }}>Ctrl+Enter</kbd> guardar
                  <span className="mx-2">·</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs border" style={{ borderColor: '#e5e7eb' }}>Esc</kbd> cancelar
                </p>
              </div>
            </div>

            {/* Footer with save/cancel buttons */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: TJ.border }}>
              <button onClick={() => { setBlockEditorOpen(false); setBlockEditorData(null); }}
                className="px-4 py-2 text-sm rounded-lg border transition-all"
                style={{ borderColor: TJ.border, fontFamily: 'Montserrat, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#999')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = TJ.border)}>
                Cancelar
              </button>
              <button onClick={saveBlockFromEditor}
                className="px-4 py-2 text-sm rounded-lg text-white font-semibold transition-all"
                style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
                {blockEditorData.existingBlockPos != null ? 'Guardar cambios' : 'Insertar Bloque'}
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* ── References Modal ── */}
      {showReferences && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] md:max-h-[88vh] flex flex-col modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Referencias Bibliográficas</h3>
              <button onClick={() => { setShowReferences(false); setShowRefNew(false); setEditingRef(null); }} className="p-1 rounded-lg hover:bg-gray-100"><X size={17} /></button>
            </div>
            <div className="flex border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              <button onClick={() => { setShowRefNew(false); setEditingRef(null); }}
                className="px-5 py-2.5 text-xs font-bold border-b-2 transition-all"
                style={{ borderColor: !showRefNew ? TJ.primary : 'transparent', color: !showRefNew ? TJ.primary : '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>
                Existentes ({scopedReferences.length})
              </button>
              <button onClick={() => { setShowRefNew(true); setEditingRef(null); setNewRef({ ...emptyRef }); }}
                className="px-5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1"
                style={{ borderColor: showRefNew && !editingRef ? TJ.primary : 'transparent', color: showRefNew && !editingRef ? TJ.primary : '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>
                <Plus size={11} /> Nueva
              </button>
              {editingRef && (
                <div className="px-5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1"
                  style={{ borderColor: TJ.gold, color: '#8b6914', fontFamily: 'Montserrat, sans-serif' }}>
                  <Edit size={11} /> Editando
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto px-5 py-4">
              {!showRefNew && !editingRef ? (
                <div className="space-y-2">
                  {scopedReferences.length === 0 && (
                    <p className="text-sm text-center py-8" style={{ color: '#a8b8d8' }}>No hay referencias para este tema/módulo. Crea una nueva.</p>
                  )}
                  {scopedReferences.map((ref, idx) => (
                    <div key={ref.id}
                      className="p-3 rounded-xl border transition-all"
                      style={{ borderColor: topic.referenceIds.includes(ref.id) ? TJ.primary : TJ.border, background: topic.referenceIds.includes(ref.id) ? 'rgba(27,75,133,0.03)' : '#fff' }}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold mb-1 flex items-center gap-2" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                            {generateInTextCitation(ref, idx + 1)}
                            {topic.referenceIds.includes(ref.id) && <span style={{ color: '#276749', fontWeight: 400 }}>✓ Asociada</span>}
                          </div>
                          <div className="text-xs" style={{ color: '#555' }} dangerouslySetInnerHTML={{ __html: formatReference(ref, idx + 1) }} />
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { openEditRef(ref); setShowRefNew(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" style={{ color: TJ.primary }} title="Editar">
                            <Edit size={12} />
                          </button>
                          <button onClick={() => insertCitation(ref.id)}
                            className="px-2 py-1 text-xs rounded-lg text-white font-semibold" style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                            Citar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: '#a8b8d8' }}>
                    {editingRef ? 'Edita los datos de la referencia:' : 'Completa los datos de la nueva referencia:'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Estilo', key: 'style', type: 'select', options: [['apa','APA'],['vancouver','Vancouver']] },
                      { label: 'Tipo', key: 'type', type: 'select', options: [['article','Artículo'],['book','Libro'],['chapter','Capítulo'],['website','Web'],['thesis','Tesis'],['conference','Conferencia']] },
                    ].map(({ label, key, options }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold mb-1" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{label}</label>
                        <select className="w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none" style={{ borderColor: TJ.border }}
                          value={(newRef as Record<string, string>)[key]} onChange={e => setNewRef(p => ({ ...p, [key]: e.target.value }))}>
                          {(options as string[][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    ))}
                    {[
                      { label: 'Autor(es) *', key: 'authors', full: true },
                      { label: 'Título *', key: 'title', full: true },
                      { label: 'Año *', key: 'year' },
                      { label: newRef.type === 'article' ? 'Revista' : 'Editorial', key: newRef.type === 'article' ? 'journal' : 'publisher' },
                      ...(newRef.type === 'article' ? [{ label: 'Vol.', key: 'volume' }, { label: 'Núm.', key: 'issue' }, { label: 'Págs.', key: 'pages' }, { label: 'DOI', key: 'doi', full: false }] : []),
                      ...(newRef.type === 'book' || newRef.type === 'chapter' ? [{ label: 'Ciudad', key: 'city' }, { label: 'Edición', key: 'edition' }] : []),
                      ...(newRef.type === 'website' ? [{ label: 'URL', key: 'url', full: true }] : []),
                    ].map(({ label, key, full }) => (
                      <div key={key} className={full ? 'col-span-2' : ''}>
                        <label className="block text-xs font-semibold mb-1" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{label}</label>
                        <input className="w-full px-2 py-1.5 border rounded-lg text-xs focus:outline-none" style={{ borderColor: TJ.border }}
                          value={(newRef as Record<string, string>)[key] || ''} onChange={e => setNewRef(p => ({ ...p, [key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setShowRefNew(false); setEditingRef(null); setNewRef({ ...emptyRef }); }}
                      className="px-3 py-1.5 text-xs rounded-lg border" style={{ borderColor: TJ.border }}>Cancelar</button>
                    <button onClick={handleSaveRef}
                      disabled={!newRef.authors || !newRef.title || !newRef.year}
                      className="px-3 py-1.5 text-xs rounded-lg text-white font-semibold disabled:opacity-50"
                      style={{ background: editingRef ? TJ.gold : TJ.primary, fontFamily: 'Montserrat, sans-serif', color: editingRef ? '#2a2a32' : '#fff' }}>
                      {editingRef ? 'Guardar cambios' : 'Agregar e insertar cita'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* ── Import Dialog ── */}
      {showImportDialog && (
        <ImportDialog
          onClose={() => setShowImportDialog(false)}
          onImport={handleImportContent}
          folders={folders}
          onSaveImages={(images) => {
            images.forEach((img) => {
              addMedia({
                id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: img.name,
                url: img.src,
                type: 'image',
                description: 'Importada desde Word',
                uploadedBy: currentUser?.id || 'system',
                uploadedAt: new Date().toISOString().slice(0, 10),
                size: Math.round(img.src.length * 0.75),
                folderId: img.folderId,
              });
            });
          }}
        />
      )}

      {/* ── Publication Preview Dialog ── */}
      {showPublicationPreview && (
        <PublicationPreviewDialog
          html={publicationPreviewHtml}
          onClose={() => setShowPublicationPreview(false)}
          onExport={() => handleExport(true)}
        />
      )}

      {/* ── Table Name Dialog ── */}
      {showTableNameDialog && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Insertar Tabla</h3>
              <button onClick={() => setShowTableNameDialog(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Nombre de la tabla</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: TJ.primary }}>Tabla {tableCount}.</span>
                  <input value={tableNameDraft} onChange={e => setTableNameDraft(e.target.value)} placeholder="Nombre descriptivo..."
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: TJ.border }}
                    onKeyDown={e => e.key === 'Enter' && insertNamedTable()} autoFocus />
                </div>
              </div>
              <p className="text-xs" style={{ color: '#a8b8d8' }}>Se insertará una tabla 3×3 con encabezado. Podrás agregar filas y columnas después.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: TJ.border }}>
              <button onClick={() => setShowTableNameDialog(false)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>Cancelar</button>
              <button onClick={insertNamedTable}
                className="px-4 py-2 text-sm rounded-lg text-white font-semibold" style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Insertar Tabla</button>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* ── Figure Citation Modal ── */}
      {showFigureCitation && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Citar Figuras / Contenido</h3>
              <button onClick={() => setShowFigureCitation(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={17} /></button>
            </div>
            <div className="px-5 py-3 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Tipo de cita</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Figura', 'Ilustración', 'Tabla', 'Gráfico', 'Imagen', 'Diagrama'].map(t => (
                  <button key={t} onClick={() => { setFigureCitationType(t); setFigureCitationCustom(''); }}
                    className="px-2.5 py-1 text-xs rounded-lg border transition-all font-semibold"
                    style={{
                      borderColor: figureCitationType === t && !figureCitationCustom ? TJ.primary : TJ.border,
                      background: figureCitationType === t && !figureCitationCustom ? 'rgba(27,75,133,0.08)' : 'white',
                      color: figureCitationType === t && !figureCitationCustom ? TJ.primary : '#666',
                      fontFamily: 'Montserrat, sans-serif',
                    }}>{t}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#a8b8d8' }}>o personalizado:</span>
                <input value={figureCitationCustom} onChange={e => setFigureCitationCustom(e.target.value)}
                  placeholder="Ej: Esquema, Mapa..."
                  className="flex-1 px-2 py-1 text-xs border rounded-lg focus:outline-none" style={{ borderColor: TJ.border }} />
              </div>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4">
              {editorFigures.length === 0 ? (
                <div className="text-center py-12">
                  <Image size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm" style={{ color: '#a8b8d8' }}>No hay figuras, tablas o imágenes en este tema.</p>
                  <p className="text-xs mt-1" style={{ color: '#d4cfc8' }}>Inserta imágenes o tablas primero para poder citarlas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {editorFigures.map((fig) => (
                    <div key={`${fig.kind}-${fig.index}`}
                      className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                      style={{ borderColor: TJ.border }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = TJ.primary)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = TJ.border)}>
                      <div className="w-16 h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#f0ece6' }}>
                        {fig.src ? (
                          <img src={fig.src} alt={fig.caption} className="w-full h-full object-cover" />
                        ) : fig.kind === 'Tabla' ? <TableIcon size={22} style={{ color: TJ.primary }} /> : <Image size={22} style={{ color: '#d4cfc8' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                          {fig.kind} {fig.index}
                        </div>
                        <div className="text-xs truncate" style={{ color: '#666' }}>{fig.caption}</div>
                      </div>
                      <button onClick={() => insertFigureCitation(fig.index, figureCitationCustom.trim() || fig.kind)}
                        className="px-3 py-1.5 text-xs rounded-lg text-white font-semibold flex-shrink-0"
                        style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                        Citar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* ── Image Picker Modal ── */}
      {showImagePicker && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Insertar Imagen</h3>
              <button onClick={() => setShowImagePicker(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={17} /></button>
            </div>
            <div className="px-5 py-3 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Descripción / pie de figura</label>
                  <input value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="Descripción de la imagen..."
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none" style={{ borderColor: TJ.border }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>
                  Escala en documento: <strong style={{ color: TJ.primary }}>{imageScale}%</strong>
                  <span className="ml-2 text-xs font-normal" style={{ color: '#a8b8d8' }}>(puedes ajustarla después arrastrando los bordes)</span>
                </label>
                <input type="range" min={15} max={100} step={5} value={imageScale} onChange={e => setImageScale(Number(e.target.value))}
                  className="w-full" style={{ accentColor: TJ.primary }} />
                <div className="flex justify-between text-xs mt-0.5" style={{ color: '#a8b8d8' }}>
                  <span>15% — pequeña</span><span>50% — mediana</span><span>100% — completa</span>
                </div>
              </div>
            </div>
            <div className="flex border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              {(['repo', 'upload', 'url'] as const).map(tab => (
                <button key={tab} onClick={() => setImgTab(tab)}
                  className="px-4 py-2.5 text-xs font-bold border-b-2 transition-all"
                  style={{ borderColor: imgTab === tab ? TJ.primary : 'transparent', color: imgTab === tab ? TJ.primary : '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>
                  {tab === 'repo' ? 'Repositorio' : tab === 'upload' ? 'Subir' : 'URL'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto px-5 py-4">
              {imgTab === 'repo' && (
                <div className="space-y-2">
                  {media.filter(m => m.type === 'image').map(asset => (
                    <button key={asset.id} onClick={() => doInsertImage(asset.url, asset.name)}
                      className="w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3"
                      style={{ borderColor: TJ.border }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = TJ.primary)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = TJ.border)}>
                      <div className="w-14 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#f0ece6' }}>
                        {asset.url.startsWith('data:') || asset.url.startsWith('http') ? (
                          <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                        ) : <Image size={22} style={{ color: '#d4cfc8' }} />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{asset.name}</div>
                        <div className="text-xs" style={{ color: '#a8b8d8' }}>{asset.description}</div>
                      </div>
                    </button>
                  ))}
                  {media.filter(m => m.type === 'image').length === 0 && (
                    <p className="text-sm text-center py-8" style={{ color: '#a8b8d8' }}>No hay imágenes en el repositorio</p>
                  )}
                </div>
              )}
              {imgTab === 'upload' && (
                <div className="text-center py-12">
                  <button onClick={handleImageUpload}
                    className="flex flex-col items-center gap-2 mx-auto px-8 py-6 border-2 border-dashed rounded-xl transition-all"
                    style={{ borderColor: TJ.border, color: '#a8b8d8' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = TJ.primary; e.currentTarget.style.color = TJ.primary; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.color = '#a8b8d8'; }}>
                    <ImagePlus size={32} />
                    <span className="text-sm font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Seleccionar imagen</span>
                    <span className="text-xs">PNG, JPG, GIF, WebP</span>
                  </button>
                </div>
              )}
              {imgTab === 'url' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold mb-1" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>URL de la imagen</label>
                  <input value={imgUrlInput} onChange={e => setImgUrlInput(e.target.value)} placeholder="https://..."
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: TJ.border }}
                    onKeyDown={e => e.key === 'Enter' && imgUrlInput && doInsertImage(imgUrlInput, 'Imagen')} />
                  {imgUrlInput && <img src={imgUrlInput} alt="preview" className="w-full max-h-40 object-contain rounded-lg" style={{ border: `1px solid ${TJ.border}` }} />}
                  <button onClick={() => imgUrlInput && doInsertImage(imgUrlInput, 'Imagen')}
                    disabled={!imgUrlInput}
                    className="px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-50"
                    style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                    Insertar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}
