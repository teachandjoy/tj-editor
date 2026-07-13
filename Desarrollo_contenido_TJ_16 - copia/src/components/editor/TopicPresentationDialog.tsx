import { useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Clipboard,
  Image,
  Italic,
  List,
  ListOrdered,
  Music2,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  Underline as UnderlineIcon,
  X,
} from 'lucide-react';
import type { MediaAsset, TopicObjective, TopicPresentation } from '../../types';
import { createEmbedToken } from '../../utils/topicPresentation';
import ModalPortal from '../ui/ModalPortal';

interface ObjectiveEditorProps {
  objective: TopicObjective;
  onChange: (html: string) => void;
  onRemove: () => void;
}

function ObjectiveEditor({ objective, onChange, onRemove }: ObjectiveEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: objective.html,
    onUpdate: ({ editor: updatedEditor }) => onChange(updatedEditor.getHTML()),
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== objective.html) {
      editor.commands.setContent(objective.html);
    }
  }, [editor, objective.html]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-1 border-b bg-slate-50 p-1.5">
        <button type="button" className={editor.isActive('bold') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></button>
        <button type="button" className={editor.isActive('italic') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></button>
        <button type="button" className={editor.isActive('underline') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></button>
        <button type="button" className={editor.isActive('bulletList') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} /></button>
        <button type="button" className={editor.isActive('orderedList') ? 'tj-mini-tool active' : 'tj-mini-tool'} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></button>
        <div className="flex-1" />
        <button type="button" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" onClick={onRemove}>
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
      <EditorContent editor={editor} className="tj-objective-editor min-h-20 p-3 text-sm" />
    </div>
  );
}

interface TopicPresentationDialogProps {
  topicId: string;
  topicTitle: string;
  initialValue: TopicPresentation;
  media: MediaAsset[];
  onClose: () => void;
  onSave: (presentation: TopicPresentation) => void;
}

type Tab = 'objectives' | 'header' | 'audio' | 'embed';

export default function TopicPresentationDialog({
  topicId,
  topicTitle,
  initialValue,
  media,
  onClose,
  onSave,
}: TopicPresentationDialogProps) {
  const [tab, setTab] = useState<Tab>('objectives');
  const [draft, setDraft] = useState<TopicPresentation>(() => structuredClone(initialValue));
  const [copied, setCopied] = useState(false);
  const images = useMemo(() => media.filter(asset => asset.type === 'image' && asset.url), [media]);
  const audioFiles = useMemo(() => media.filter(asset => asset.type === 'audio' && asset.url), [media]);
  const embedUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/preview/${encodeURIComponent(topicId)}?embed=1&token=${encodeURIComponent(draft.embed.token)}`;
  const embedCode = `<iframe src="${embedUrl}" title="${topicTitle.replace(/"/g, '&quot;')}" width="100%" height="720" loading="lazy" referrerpolicy="no-referrer" style="border:0"></iframe>`;

  const addObjective = () => {
    setDraft(current => ({
      ...current,
      objectives: [...current.objectives, { id: `objective-${Date.now()}`, html: '<p>Nuevo objetivo</p>' }],
    }));
  };

  const copyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof List }> = [
    { id: 'objectives', label: 'Objetivos', icon: List },
    { id: 'header', label: 'Encabezado', icon: Image },
    { id: 'audio', label: 'Audio', icon: Music2 },
    { id: 'embed', label: 'Moodle', icon: Share2 },
  ];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-4" onMouseDown={onClose}>
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-800">Elementos del tema</h2>
              <p className="text-xs text-slate-500">{topicTitle}</p>
            </div>
            <button type="button" className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="flex gap-1 overflow-x-auto border-b bg-slate-50 px-5 pt-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className="flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm"
                style={{ background: tab === id ? '#fff' : 'transparent', color: tab === id ? '#1b4b85' : '#64748b', fontWeight: tab === id ? 700 : 500 }}
                onClick={() => setTab(id)}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {tab === 'objectives' && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="max-w-2xl text-sm text-slate-600">Cada objetivo se exporta como un elemento de lista y adopta el diseño “Objetivos” de la identidad corporativa.</p>
                  <button type="button" className="flex items-center gap-2 rounded-lg bg-[#1b4b85] px-3 py-2 text-xs font-semibold text-white" onClick={addObjective}>
                    <Plus size={14} /> Agregar
                  </button>
                </div>
                {draft.objectives.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-400">No hay objetivos configurados.</div>}
                {draft.objectives.map((objective, index) => (
                  <ObjectiveEditor
                    key={objective.id}
                    objective={objective}
                    onChange={html => setDraft(current => ({
                      ...current,
                      objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, html } : item),
                    }))}
                    onRemove={() => setDraft(current => ({
                      ...current,
                      objectives: current.objectives.filter(item => item.id !== objective.id),
                    }))}
                  />
                ))}
              </div>
            )}

            {tab === 'header' && (
              <div className="space-y-4">
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <input type="checkbox" checked={draft.header.enabled} onChange={event => setDraft(current => ({ ...current, header: { ...current.header, enabled: event.target.checked } }))} />
                  <span><strong className="block text-sm text-slate-800">Mostrar imagen de encabezado</strong><span className="text-xs text-slate-500">No se exporta cuando está desactivada.</span></span>
                </label>
                <label className="block text-sm font-semibold text-slate-700">Imagen del repositorio
                  <select className="mt-1 w-full rounded-lg border px-3 py-2.5 font-normal" value={images.some(image => image.url === draft.header.url) ? draft.header.url : ''} onChange={event => setDraft(current => ({ ...current, header: { ...current.header, url: event.target.value } }))}>
                    <option value="">Seleccionar imagen…</option>
                    {images.map(image => <option key={image.id} value={image.url}>{image.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">O URL pública
                  <input className="mt-1 w-full rounded-lg border px-3 py-2.5 font-normal" type="url" value={draft.header.url} onChange={event => setDraft(current => ({ ...current, header: { ...current.header, url: event.target.value } }))} placeholder="https://…" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Texto alternativo
                  <input className="mt-1 w-full rounded-lg border px-3 py-2.5 font-normal" value={draft.header.alt} onChange={event => setDraft(current => ({ ...current, header: { ...current.header, alt: event.target.value } }))} placeholder={topicTitle} />
                </label>
                {draft.header.url && <img src={draft.header.url} alt={draft.header.alt || topicTitle} className="max-h-64 w-full rounded-lg border object-cover" />}
              </div>
            )}

            {tab === 'audio' && (
              <div className="space-y-4">
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <input type="checkbox" checked={draft.audio.enabled} onChange={event => setDraft(current => ({ ...current, audio: { ...current.audio, enabled: event.target.checked } }))} />
                  <span><strong className="block text-sm text-slate-800">Incluir reproductor</strong><span className="text-xs text-slate-500">No se exporta cuando está desactivado.</span></span>
                </label>
                <label className="block text-sm font-semibold text-slate-700">Tipo
                  <select className="mt-1 w-full rounded-lg border px-3 py-2.5 font-normal" value={draft.audio.kind} onChange={event => setDraft(current => ({ ...current, audio: { ...current.audio, kind: event.target.value as 'music' | 'audiobook' } }))}>
                    <option value="music">Música / audio</option>
                    <option value="audiobook">Audiolibro</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">Archivo del repositorio
                  <select className="mt-1 w-full rounded-lg border px-3 py-2.5 font-normal" value={audioFiles.some(audio => audio.url === draft.audio.url) ? draft.audio.url : ''} onChange={event => setDraft(current => ({ ...current, audio: { ...current.audio, url: event.target.value } }))}>
                    <option value="">Seleccionar audio…</option>
                    {audioFiles.map(audio => <option key={audio.id} value={audio.url}>{audio.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">O URL pública de MP3/audio
                  <input className="mt-1 w-full rounded-lg border px-3 py-2.5 font-normal" type="url" value={draft.audio.url} onChange={event => setDraft(current => ({ ...current, audio: { ...current.audio, url: event.target.value } }))} placeholder="https://…/audio.mp3" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Título
                  <input className="mt-1 w-full rounded-lg border px-3 py-2.5 font-normal" value={draft.audio.title} onChange={event => setDraft(current => ({ ...current, audio: { ...current.audio, title: event.target.value } }))} placeholder="Escucha complementaria" />
                </label>
                {draft.audio.url && <audio className="w-full" controls preload="metadata" src={draft.audio.url} />}
              </div>
            )}

            {tab === 'embed' && (
              <div className="space-y-4">
                <label className="flex items-center gap-3 rounded-lg border p-4">
                  <input
                    type="checkbox"
                    checked={draft.embed.enabled}
                    onChange={event => setDraft(current => ({
                      ...current,
                      embed: {
                        enabled: event.target.checked,
                        token: event.target.checked && !current.embed.token ? createEmbedToken() : current.embed.token,
                      },
                    }))}
                  />
                  <span><strong className="block text-sm text-slate-800">Permitir incrustación controlada</strong><span className="text-xs text-slate-500">Moodle obtiene siempre la versión actual del tema mediante un token revocable.</span></span>
                </label>
                {draft.embed.enabled && (
                  <>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                      <span>Regenerar el token invalida inmediatamente las incrustaciones anteriores.</span>
                      <button type="button" className="flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 font-semibold" onClick={() => setDraft(current => ({ ...current, embed: { enabled: true, token: createEmbedToken() } }))}>
                        <RefreshCw size={13} /> Regenerar
                      </button>
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">Código para Moodle
                      <textarea className="mt-1 min-h-36 w-full rounded-lg border bg-slate-50 p-3 font-mono text-xs font-normal" readOnly value={embedCode} />
                    </label>
                    <button type="button" className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-[#1b4b85]" onClick={copyEmbed}>
                      <Clipboard size={15} /> {copied ? 'Copiado' : 'Copiar código'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t px-5 py-4">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={onClose}>Cancelar</button>
            <button type="button" className="flex items-center gap-2 rounded-lg bg-[#1b4b85] px-4 py-2 text-sm font-semibold text-white" onClick={() => onSave(draft)}>
              <Save size={15} /> Guardar elementos
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
