import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Edit, Monitor, Smartphone } from 'lucide-react';
import { useApp } from '../store/context';
import { apiGet } from '../lib/api';
import { sanitizeHtml } from '../lib/sanitize';
import type { BibliographyReference, CorporateIdentity, Topic } from '../types';
import { buildTopicDocument, buildTopicFragment, buildTopicStyles } from '../utils/topic-export';
import { downloadFile } from '../utils/export';
import { TJ } from '../constants/theme';

interface EmbedBundle {
  topic: Topic;
  identity?: CorporateIdentity;
  references: BibliographyReference[];
}

export default function PreviewPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { topics, offers, identities, references } = useApp();
  const [viewMode, setViewMode] = useState<'editor' | 'moodle' | 'movil'>('editor');
  const [embedBundle, setEmbedBundle] = useState<EmbedBundle | null>(null);
  const [embedError, setEmbedError] = useState('');
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const embedMode = search.get('embed') === '1';
  const embedToken = search.get('token') || '';

  useEffect(() => {
    if (!embedMode || !topicId) return;
    setEmbedError('');
    apiGet<EmbedBundle>(`/topics/${encodeURIComponent(topicId)}?embedToken=${encodeURIComponent(embedToken)}`)
      .then(setEmbedBundle)
      .catch(() => setEmbedError('La incrustación no está disponible o el token fue revocado.'));
  }, [embedMode, embedToken, topicId]);

  const storedTopic = topics.find(topic => topic.id === topicId);
  const topic = embedMode ? embedBundle?.topic : storedTopic;
  const offer = offers.find(item => item.id === storedTopic?.offerId);
  const identity = embedMode ? embedBundle?.identity : identities.find(item => item.id === offer?.identityId);
  const topicReferences = embedMode
    ? (embedBundle?.references || [])
    : references.filter(reference => storedTopic?.referenceIds.includes(reference.id));
  const fontUrl = identity?.fontPrimaryImportUrl && /^https?:\/\//i.test(identity.fontPrimaryImportUrl)
    ? identity.fontPrimaryImportUrl
    : '';

  if (embedMode) {
    if (embedError) {
      return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-sm text-rose-700">{embedError}</div>;
    }
    if (!topic) {
      return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Cargando tema…</div>;
    }
    const fragment = buildTopicFragment({ topic, references: topicReferences, identity });
    return (
      <>
        {fontUrl && <link href={fontUrl} rel="stylesheet" />}
        <style>{buildTopicStyles(identity, false)}</style>
        <div
          className="min-h-screen"
          style={{ background: identity?.colorBackground || '#f5f5f5', padding: 16 }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(fragment) }}
        />
      </>
    );
  }

  if (!topic) return <div className="p-8" style={{ color: '#a8b8d8' }}>Tema no encontrado</div>;

  const fragment = buildTopicFragment({ topic, references: topicReferences, identity });
  const documentHtml = buildTopicDocument({ topic, references: topicReferences, identity });
  const handleExportMoodle = () => {
    downloadFile(documentHtml, `${topic.title.replace(/[^a-z0-9]/gi, '_')}_moodle.html`);
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#e8e6e2' }}>
      {fontUrl && <link href={fontUrl} rel="stylesheet" />}
      <style>{buildTopicStyles(identity, false)}</style>
      <div className="flex flex-shrink-0 items-center justify-between border-b bg-white px-5 py-3" style={{ borderColor: TJ.border }}>
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 hover:bg-gray-100" style={{ color: '#666' }}><ArrowLeft size={17} /></button>
          <span className="truncate text-sm font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Vista previa: {topic.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/editor/${topic.id}`)} className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white sm:flex" style={{ background: TJ.primary }}>
            <Edit size={13} /> Editor
          </button>
          <button onClick={handleExportMoodle} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: TJ.border, color: TJ.text }}>
            <Download size={13} /> Exportar Moodle
          </button>
          <div className="hidden items-center rounded-lg border p-0.5 md:flex" style={{ borderColor: TJ.border, background: '#f8f7f5' }}>
            {([
              { id: 'editor' as const, label: 'Estudio', icon: Monitor },
              { id: 'moodle' as const, label: 'Moodle', icon: Monitor },
              { id: 'movil' as const, label: 'Móvil', icon: Smartphone },
            ]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setViewMode(id)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs"
                style={{ background: viewMode === id ? '#fff' : 'transparent', color: viewMode === id ? TJ.primary : '#a8b8d8', fontWeight: viewMode === id ? 700 : 400, boxShadow: viewMode === id ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-1 justify-center overflow-auto p-3 md:p-8">
        {viewMode === 'moodle' ? (
          <iframe title="Vista Moodle" srcDoc={documentHtml} className="min-h-[900px] w-full max-w-[980px] border-0 bg-white shadow-xl" />
        ) : (
          <div
            className="h-fit bg-white shadow-xl"
            style={{ width: viewMode === 'movil' ? 390 : '100%', maxWidth: viewMode === 'movil' ? 390 : 900, padding: viewMode === 'movil' ? 12 : 24 }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(fragment) }}
          />
        )}
      </div>
    </div>
  );
}
