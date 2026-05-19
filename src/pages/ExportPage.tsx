import { useState } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { Download, FileText, Code, FileDown, ChevronDown, ChevronRight } from 'lucide-react';
import { exportTopicToHTML, exportTopicToWord, downloadFile } from '../utils/export';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', border: '#e8e4de', text: '#2a2a32' };

const statusConfig: Record<string, { label: string; cls: string }> = {
  en_desarrollo: { label: 'En desarrollo', cls: 'bg-blue-50 text-blue-700' },
  en_revision:   { label: 'En revisi\u00f3n',   cls: 'bg-yellow-50 text-yellow-700' },
  aprobado:      { label: 'Aprobado',      cls: 'bg-green-50 text-green-700' },
  devuelto:      { label: 'Devuelto',      cls: 'bg-red-50 text-red-700' },
};

export default function ExportPage() {
  const { currentUser, topics, offers, identities, references } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set(offers.map(o => o.id)));
  const [exportFormat, setExportFormat] = useState<'html' | 'word'>('html');

  if (!currentUser) return null;

  const visibleTopics = currentUser.role === 'editor'
    ? topics.filter(t => t.assignedEditors.includes(currentUser.id))
    : topics;

  // Group by offer
  const grouped: Record<string, typeof visibleTopics> = {};
  visibleTopics.forEach(t => {
    const key = t.offerId || '_general';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  const toggleOffer = (id: string) => {
    setExpandedOffers(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const toggleSelectAll = () => {
    setSelected(selected.size === visibleTopics.length ? new Set() : new Set(visibleTopics.map(t => t.id)));
  };

  const toggleSelectOffer = (offerId: string) => {
    const offerTopics = visibleTopics.filter(t => (t.offerId || '_general') === offerId);
    const allSelected = offerTopics.every(t => selected.has(t.id));
    setSelected(prev => {
      const s = new Set(prev);
      offerTopics.forEach(t => allSelected ? s.delete(t.id) : s.add(t.id));
      return s;
    });
  };

  const handleExportHTML = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    const html = exportTopicToHTML(topic, references);
    downloadFile(html, `${topic.title.replace(/[^a-z0-9]/gi, '_')}.html`);
  };

  const handleExportWord = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    exportTopicToWord(topic, references);
  };

  const handleBulkExport = () => {
    visibleTopics.filter(t => selected.has(t.id)).forEach(topic => {
      if (exportFormat === 'html') {
        const html = exportTopicToHTML(topic, references);
        downloadFile(html, `${topic.title.replace(/[^a-z0-9]/gi, '_')}.html`);
      } else {
        exportTopicToWord(topic, references);
      }
    });
  };

  return (
    <div className="page-enter">
      <Header title="Exportar" actions={
        <div className="flex gap-2 items-center">
          {selected.size > 0 && (
            <>
              <div className="relative">
                <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'html' | 'word')}
                  className="pl-3 pr-8 py-2 text-xs border rounded-lg focus:outline-none appearance-none font-semibold"
                  style={{ borderColor: TJ.border, fontFamily: 'Montserrat, sans-serif' }}>
                  <option value="html">HTML</option>
                  <option value="word">Word</option>
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8b8d8' }} />
              </div>
              <button onClick={handleBulkExport}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white font-semibold transition-all"
                style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
                onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
                <Download size={15} /> Exportar {selected.size} tema{selected.size !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      } />

      <div className="p-3 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm" style={{ color: '#a8b8d8' }}>
            Exporta temas en formato HTML o Word. Selecciona temas individuales o por oferta.
          </p>
          <button onClick={toggleSelectAll}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: TJ.border, color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
            {selected.size === visibleTopics.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        </div>

        <div className="space-y-3">
          {Object.keys(grouped).map(key => {
            const offer = offers.find(o => o.id === key);
            const offerTopics = grouped[key];
            const allOfferSelected = offerTopics.every(t => selected.has(t.id));
            const expanded = expandedOffers.has(key);
            return (
              <div key={key} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: TJ.border }}>
                <div className="flex items-center px-4 py-3 gap-3" style={{ borderBottom: expanded ? `1px solid ${TJ.border}` : 'none' }}>
                  <input type="checkbox" checked={allOfferSelected} onChange={() => toggleSelectOffer(key)}
                    style={{ accentColor: TJ.primary, width: 16, height: 16 }} />
                  <button onClick={() => toggleOffer(key)} className="text-gray-400">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1">
                    <span className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                      {key === '_general' ? 'Sin oferta asignada' : offer?.name || key}
                    </span>
                    <span className="text-xs ml-2" style={{ color: '#a8b8d8' }}>{offerTopics.length} temas</span>
                  </div>
                </div>
                {expanded && (
                  <div className="divide-y" style={{ borderColor: TJ.border }}>
                    {offerTopics.map(topic => {
                      const identity = identities.find(i => i.id === offer?.identityId);
                      const status = statusConfig[topic.status] || statusConfig.en_desarrollo;
                      const isSelected = selected.has(topic.id);
                      return (
                        <div key={topic.id} className="flex items-center px-4 py-3 gap-3 hover:bg-gray-50/50 transition-colors"
                          style={{ background: isSelected ? 'rgba(27,75,133,0.02)' : 'transparent' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(topic.id)}
                            style={{ accentColor: TJ.primary, width: 16, height: 16 }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{topic.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                              {identity && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(27,75,133,0.08)', color: TJ.primary }}>{identity.name}</span>}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: '#a8b8d8' }}>{topic.author} · {topic.version}</div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => handleExportHTML(topic.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-all font-semibold"
                              style={{ borderColor: TJ.border, color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,75,133,0.06)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <Code size={12} /> HTML
                            </button>
                            <button onClick={() => handleExportWord(topic.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-all font-semibold"
                              style={{ borderColor: TJ.border, color: TJ.secondary, fontFamily: 'Montserrat, sans-serif' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,47,58,0.06)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <FileDown size={12} /> Word
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {visibleTopics.length === 0 && (
            <div className="text-center py-16" style={{ color: '#a8b8d8' }}>
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay temas disponibles para exportar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
