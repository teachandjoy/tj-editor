import { useState, useCallback } from 'react';
import { Upload, FileText, X, Plus, ChevronDown } from 'lucide-react';
import type { Topic, Offer } from '../../types';
import ModalPortal from '../ui/ModalPortal';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', gold: '#c5aa6f', border: '#e8e4de', text: '#2a2a32' };

interface Props {
  open: boolean;
  onClose: () => void;
  offers: Offer[];
  currentUserId: string;
  currentUserName: string;
  onImport: (topics: Topic[]) => void;
  onCreateOffer?: (offer: Offer) => void;
}

interface ParsedTopic {
  title: string;
  content: string;
  selected: boolean;
}

function parseHTMLToTopics(html: string): ParsedTopic[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const topics: ParsedTopic[] = [];

  // Try splitting by H1/H2 headings
  const headings = doc.querySelectorAll('h1, h2');
  if (headings.length > 0) {
    headings.forEach((heading, idx) => {
      let content = '';
      let sibling = heading.nextElementSibling;
      while (sibling && !['H1', 'H2'].includes(sibling.tagName)) {
        content += sibling.outerHTML;
        sibling = sibling.nextElementSibling;
      }
      topics.push({ title: heading.textContent?.trim() || `Tema ${idx + 1}`, content, selected: true });
    });
  } else {
    // Treat entire content as single topic
    topics.push({ title: 'Tema importado', content: doc.body.innerHTML, selected: true });
  }
  return topics;
}

export default function TopicImportDialog({ open, onClose, offers, currentUserId, currentUserName, onImport, onCreateOffer }: Props) {
  const [step, setStep] = useState<'upload' | 'organize'>('upload');
  const [parsedTopics, setParsedTopics] = useState<ParsedTopic[]>([]);
  const [offerId, setOfferId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [showNewOffer, setShowNewOffer] = useState(false);
  const [newOfferName, setNewOfferName] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFiles = useCallback((files: FileList) => {
    const allTopics: ParsedTopic[] = [];
    let remaining = files.length;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        let html = text;

        // If it's a .doc/.docx approximation (Word HTML), use as-is
        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          html = text;
        } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
          // Basic Word HTML extraction
          html = text;
        } else {
          // Plain text — wrap in paragraphs
          html = text.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
        }

        const parsed = parseHTMLToTopics(html);
        allTopics.push(...parsed);
        remaining--;
        if (remaining === 0) {
          setParsedTopics(allTopics);
          setStep('organize');
        }
      };
      if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        reader.readAsText(file); // Basic — real Word parsing would need mammoth.js
      } else {
        reader.readAsText(file);
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.htm,.doc,.docx,.txt';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) handleFiles(files);
    };
    input.click();
  };

  const handlePasteHTML = () => {
    const html = prompt('Pega el HTML o snippet aquí:');
    if (html) {
      const parsed = parseHTMLToTopics(html);
      setParsedTopics(parsed);
      setStep('organize');
    }
  };

  const handleImport = () => {
    setImporting(true);
    const selected = parsedTopics.filter(t => t.selected);
    const offer = offers.find(o => o.id === offerId);

    const newTopics: Topic[] = selected.map((parsed, idx) => ({
      id: `topic-${Date.now()}-${idx}`,
      moduleId: moduleId || '',
      offerId: offerId || '',
      title: parsed.title,
      description: '',
      status: 'en_desarrollo' as const,
      author: currentUserName,
      version: 'v1',
      date: new Date().toLocaleDateString('es-MX'),
      offerName: offer?.name || '',
      content: parsed.content,
      blocks: [],
      referenceIds: [],
      assignedEditors: [currentUserId],
      order: idx,
    }));

    onImport(newTopics);
    setImporting(false);
    handleClose();
  };

  const handleCreateOffer = () => {
    if (!newOfferName.trim() || !onCreateOffer) return;
    const newOffer: Offer = {
      id: `offer-${Date.now()}`,
      name: newOfferName.trim(),
      type: 'curso',
      institution: '',
      description: '',
      modules: [],
      identityId: '',
      order: offers.length,
    };
    onCreateOffer(newOffer);
    setOfferId(newOffer.id);
    setNewOfferName('');
    setShowNewOffer(false);
  };

  const handleClose = () => {
    setStep('upload');
    setParsedTopics([]);
    setOfferId('');
    setModuleId('');
    onClose();
  };

  const toggleTopic = (idx: number) => {
    setParsedTopics(prev => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t));
  };

  const updateTitle = (idx: number, title: string) => {
    setParsedTopics(prev => prev.map((t, i) => i === idx ? { ...t, title } : t));
  };

  if (!open) return null;

  const offerModules = offers.find(o => o.id === offerId)?.modules || [];
  const selectedCount = parsedTopics.filter(t => t.selected).length;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col modal-enter" style={{ border: `1px solid ${TJ.border}` }}>
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
            <h3 className="font-bold text-base" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
              {step === 'upload' ? 'Importar Temas' : `Organizar Temas (${selectedCount} seleccionados)`}
            </h3>
            <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-auto px-6 py-5">
            {step === 'upload' ? (
              <div className="space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
                  style={{ borderColor: TJ.border }}
                  onClick={handleBrowse}
                  onDragEnter={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = TJ.primary; }}
                  onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = TJ.border; }}
                >
                  <Upload size={32} className="mx-auto mb-3" style={{ color: '#a8b8d8' }} />
                  <p className="text-sm font-semibold mb-1" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>
                    Arrastra archivos aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs" style={{ color: '#a8b8d8' }}>
                    Soporta: .html, .htm, .doc, .docx, .txt — Importación individual o masiva
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: TJ.border }} />
                  <span className="text-xs font-semibold" style={{ color: '#a8b8d8' }}>O</span>
                  <div className="flex-1 h-px" style={{ background: TJ.border }} />
                </div>

                <button onClick={handlePasteHTML}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-sm"
                  style={{ borderColor: TJ.border, color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,75,133,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <FileText size={16} /> Pegar HTML / Snippet
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Assign to offer */}
                <div className="p-4 rounded-xl" style={{ background: '#f8f7f5', border: `1px solid ${TJ.border}` }}>
                  <p className="text-xs font-bold mb-3" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                    Asignar a oferta educativa
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <select value={offerId} onChange={e => { setOfferId(e.target.value); setModuleId(''); }}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none appearance-none"
                        style={{ borderColor: TJ.border }}>
                        <option value="">Sin oferta</option>
                        {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8b8d8' }} />
                    </div>
                    {offerId && offerModules.length > 0 && (
                      <div className="relative">
                        <select value={moduleId} onChange={e => setModuleId(e.target.value)}
                          className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none appearance-none"
                          style={{ borderColor: TJ.border }}>
                          <option value="">Sin módulo</option>
                          {offerModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8b8d8' }} />
                      </div>
                    )}
                  </div>
                  {!showNewOffer ? (
                    <button onClick={() => setShowNewOffer(true)}
                      className="flex items-center gap-1 text-xs mt-2 transition-colors"
                      style={{ color: TJ.primary }}>
                      <Plus size={11} /> Crear nueva oferta
                    </button>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <input value={newOfferName} onChange={e => setNewOfferName(e.target.value)}
                        placeholder="Nombre de la oferta"
                        className="flex-1 px-2 py-1.5 text-xs border rounded-lg focus:outline-none"
                        style={{ borderColor: TJ.border }} autoFocus />
                      <button onClick={handleCreateOffer}
                        className="px-2.5 py-1 text-xs rounded-lg text-white" style={{ background: TJ.primary }}>Crear</button>
                      <button onClick={() => setShowNewOffer(false)}
                        className="px-2.5 py-1 text-xs rounded-lg border" style={{ borderColor: TJ.border }}>Cancelar</button>
                    </div>
                  )}
                </div>

                {/* Topic list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>
                      Temas detectados ({parsedTopics.length})
                    </p>
                    <button onClick={() => setParsedTopics(prev => prev.map(t => ({ ...t, selected: !prev.every(p => p.selected) })))}
                      className="text-xs" style={{ color: TJ.primary }}>
                      {parsedTopics.every(t => t.selected) ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </button>
                  </div>
                  {parsedTopics.map((topic, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: topic.selected ? TJ.primary : TJ.border, background: topic.selected ? 'rgba(27,75,133,0.02)' : '#fff' }}>
                      <input type="checkbox" checked={topic.selected} onChange={() => toggleTopic(idx)}
                        style={{ accentColor: TJ.primary }} />
                      <div className="flex-1 min-w-0">
                        <input value={topic.title} onChange={e => updateTitle(idx, e.target.value)}
                          className="w-full text-sm font-semibold bg-transparent border-b border-transparent focus:border-blue-300 focus:outline-none"
                          style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }} />
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#a8b8d8' }}>
                          {topic.content.replace(/<[^>]+>/g, '').substring(0, 100)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: TJ.border }}>
            {step === 'organize' && (
              <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm rounded-lg border mr-auto" style={{ borderColor: TJ.border }}>
                Atrás
              </button>
            )}
            <button onClick={handleClose} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>Cancelar</button>
            {step === 'organize' && (
              <button onClick={handleImport} disabled={selectedCount === 0 || importing}
                className="px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-50"
                style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                Importar {selectedCount} tema{selectedCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
