import { useState, useCallback } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { Plus, BookOpen, Trash2, X, ChevronDown, Search, Globe, Loader2 } from 'lucide-react';
import { formatReference } from '../utils/bibliography';
import type { BibliographyReference, ReferenceStyle } from '../types';
import { hasPermission } from '../utils/permissions';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', border: '#e8e4de', text: '#2a2a32' };
const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none';
const inputStyle = { borderColor: TJ.border };

export default function BibliographyPage() {
  const { currentUser, offers, references, addReference, deleteReference } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [offerFilter, setOfferFilter] = useState<string>('all');
  const [style, setStyle] = useState<ReferenceStyle>('apa');
  const [refType, setRefType] = useState<BibliographyReference['type']>('article');
  const [authors, setAuthors] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [journal, setJournal] = useState('');
  const [volume, setVolume] = useState('');
  const [issue, setIssue] = useState('');
  const [pages, setPages] = useState('');
  const [publisher, setPublisher] = useState('');
  const [city, setCity] = useState('');
  const [doi, setDoi] = useState('');
  const [url, setUrl] = useState('');
  const [edition, setEdition] = useState('');
  const [refOfferId, setRefOfferId] = useState('');
  const [moduleTag, setModuleTag] = useState('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const handleDOILookup = useCallback(async () => {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    try {
      let doiStr = lookupQuery.trim();
      // Extract DOI from URL
      const doiMatch = doiStr.match(/(?:doi\.org\/|DOI:\s*)(10\.\d{4,}\/[^\s]+)/i);
      if (doiMatch) doiStr = doiMatch[1];

      // Try CrossRef API
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doiStr)}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('No encontrado');
      const data = await res.json();
      const work = data.message;

      // Auto-fill fields
      if (work.author) {
        setAuthors(work.author.map((a: { family?: string; given?: string }) =>
          style === 'apa' ? `${a.family || ''}, ${(a.given || '').charAt(0)}.` : `${a.family || ''} ${(a.given || '').charAt(0)}`
        ).join(style === 'apa' ? ', & ' : ', '));
      }
      if (work.title?.[0]) setTitle(work.title[0]);
      if (work.published?.['date-parts']?.[0]?.[0]) setYear(String(work.published['date-parts'][0][0]));
      if (work['container-title']?.[0]) setJournal(work['container-title'][0]);
      if (work.volume) setVolume(work.volume);
      if (work.issue) setIssue(work.issue);
      if (work.page) setPages(work.page);
      if (work.DOI) setDoi(work.DOI);
      if (work.publisher) setPublisher(work.publisher);
      if (work.URL) setUrl(work.URL);

      // Detect type
      if (work.type === 'journal-article') setRefType('article');
      else if (work.type === 'book') setRefType('book');
      else if (work.type === 'book-chapter') setRefType('chapter');
      else if (work.type === 'proceedings-article') setRefType('conference');
    } catch {
      setLookupError('No se encontró la referencia. Verifica el DOI o URL.');
    } finally {
      setLookupLoading(false);
    }
  }, [lookupQuery, style]);

  if (!currentUser) return null;

  const canCreate = hasPermission(currentUser, 'referencias', 'crear');
  const canDelete = hasPermission(currentUser, 'referencias', 'eliminar');

  const resetForm = () => {
    setAuthors(''); setTitle(''); setYear(''); setJournal(''); setVolume(''); setIssue('');
    setPages(''); setPublisher(''); setCity(''); setDoi(''); setUrl(''); setEdition('');
    setRefOfferId(''); setModuleTag('');
  };

  const handleCreate = () => {
    if (!authors.trim() || !title.trim() || !year.trim()) return;
    const ref: BibliographyReference = {
      id: `ref-${Date.now()}`, style, type: refType, authors, title, year,
      journal: journal || undefined, volume: volume || undefined, issue: issue || undefined,
      pages: pages || undefined, publisher: publisher || undefined, city: city || undefined,
      doi: doi || undefined, url: url || undefined, edition: edition || undefined,
      offerId: refOfferId || undefined, moduleTag: moduleTag || undefined,
    };
    addReference(ref);
    resetForm();
    setShowCreate(false);
  };

  // Group by offer
  const filtered = offerFilter === 'all' ? references : references.filter(r => r.offerId === offerFilter);
  const grouped: Record<string, BibliographyReference[]> = {};
  filtered.forEach(r => {
    const key = r.offerId || '_general';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  return (
    <div className="page-enter">
      <Header title="Bibliografía" actions={
        canCreate ? (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white font-semibold"
            style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
            onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
            <Plus size={15} /> Nueva Referencia
          </button>
        ) : undefined
      } />

      <div className="p-3 md:p-6">
        {/* Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="relative">
            <select value={offerFilter} onChange={e => setOfferFilter(e.target.value)}
              className="pl-4 pr-8 py-2.5 text-sm border rounded-lg focus:outline-none appearance-none"
              style={{ borderColor: TJ.border, background: '#fff', fontFamily: 'Open Sans, sans-serif' }}>
              <option value="all">Todas las ofertas</option>
              {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8b8d8' }} />
          </div>
          <span className="text-sm" style={{ color: '#a8b8d8' }}>{filtered.length} referencia{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grouped list */}
        <div className="space-y-6">
          {Object.keys(grouped).map(key => {
            const offer = offers.find(o => o.id === key);
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                    {key === '_general' ? 'General' : offer?.name || key}
                  </div>
                  <div className="flex-1 h-px" style={{ background: TJ.border }} />
                </div>
                <div className="space-y-2">
                  {grouped[key].map((ref) => (
                    <div key={ref.id} className="bg-white rounded-xl border p-3 md:p-4 flex items-start gap-3" style={{ borderColor: TJ.border }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(27,75,133,0.08)', color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                            {ref.style.toUpperCase()}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0ece6', color: '#666' }}>{ref.type}</span>
                          {ref.moduleTag && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(197,170,111,0.15)', color: '#8b6914' }}>{ref.moduleTag}</span>}
                        </div>
                        <div className="text-sm" style={{ color: TJ.text }} dangerouslySetInnerHTML={{ __html: formatReference(ref, grouped[key].indexOf(ref) + 1) }} />
                      </div>
                      {canDelete && (
                        <button onClick={() => deleteReference(ref.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0" style={{ color: '#c53030' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: '#a8b8d8' }}>
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay referencias bibliográficas</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-auto" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-base" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Nueva Referencia Bibliográfica</h3>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="px-6 py-5">
              {/* DOI/URL Lookup */}
              <div className="mb-4 p-3 rounded-xl" style={{ background: '#f8f7f5', border: `1px solid ${TJ.border}` }}>
                <p className="text-xs font-bold mb-2" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                  <Globe size={12} className="inline mr-1" /> Autocompletar desde DOI o URL
                </p>
                <div className="flex gap-2">
                  <input className={inputCls} style={inputStyle}
                    value={lookupQuery} onChange={e => setLookupQuery(e.target.value)}
                    placeholder="Pega un DOI (10.xxxx/...) o URL de doi.org"
                    onKeyDown={e => e.key === 'Enter' && handleDOILookup()} />
                  <button onClick={handleDOILookup} disabled={lookupLoading || !lookupQuery.trim()}
                    className="px-3 py-1.5 text-xs rounded-lg text-white font-semibold whitespace-nowrap disabled:opacity-50 flex items-center gap-1"
                    style={{ background: TJ.primary }}>
                    {lookupLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
                  </button>
                </div>
                {lookupError && <p className="text-xs mt-1" style={{ color: '#c53030' }}>{lookupError}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Estilo</label>
                  <select className={inputCls} style={inputStyle} value={style} onChange={e => setStyle(e.target.value as ReferenceStyle)}>
                    <option value="apa">APA (7ma edición)</option>
                    <option value="vancouver">Vancouver</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Tipo de fuente</label>
                  <select className={inputCls} style={inputStyle} value={refType} onChange={e => setRefType(e.target.value as BibliographyReference['type'])}>
                    <option value="article">Artículo de revista</option>
                    <option value="book">Libro</option>
                    <option value="chapter">Capítulo</option>
                    <option value="website">Sitio web</option>
                    <option value="thesis">Tesis</option>
                    <option value="conference">Conferencia</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Autor(es) *</label>
                  <input className={inputCls} style={inputStyle} value={authors} onChange={e => setAuthors(e.target.value)} placeholder={style === 'apa' ? 'Apellido, N., & Apellido, N.' : 'Apellido N, Apellido N'} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Título *</label>
                  <input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Año *</label>
                  <input className={inputCls} style={inputStyle} value={year} onChange={e => setYear(e.target.value)} placeholder="2024" />
                </div>
                {(refType === 'article' || refType === 'conference') && (
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{refType === 'article' ? 'Revista' : 'Congreso'}</label>
                    <input className={inputCls} style={inputStyle} value={journal} onChange={e => setJournal(e.target.value)} />
                  </div>
                )}
                {refType === 'article' && <>
                  <div><label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Volumen</label><input className={inputCls} style={inputStyle} value={volume} onChange={e => setVolume(e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Número</label><input className={inputCls} style={inputStyle} value={issue} onChange={e => setIssue(e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Páginas</label><input className={inputCls} style={inputStyle} value={pages} onChange={e => setPages(e.target.value)} placeholder="112-128" /></div>
                  <div><label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>DOI</label><input className={inputCls} style={inputStyle} value={doi} onChange={e => setDoi(e.target.value)} /></div>
                </>}
                {(refType === 'book' || refType === 'chapter' || refType === 'thesis') && <>
                  <div><label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Editorial</label><input className={inputCls} style={inputStyle} value={publisher} onChange={e => setPublisher(e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Ciudad</label><input className={inputCls} style={inputStyle} value={city} onChange={e => setCity(e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Edición</label><input className={inputCls} style={inputStyle} value={edition} onChange={e => setEdition(e.target.value)} /></div>
                </>}
                {refType === 'website' && (
                  <div className="col-span-2"><label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>URL</label><input className={inputCls} style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
                )}
                {/* Org fields */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Oferta educativa</label>
                  <select className={inputCls} style={inputStyle} value={refOfferId} onChange={e => setRefOfferId(e.target.value)}>
                    <option value="">— General —</option>
                    {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Módulo / Tema (tag)</label>
                  <input className={inputCls} style={inputStyle} value={moduleTag} onChange={e => setModuleTag(e.target.value)} placeholder="Ej: Módulo 1" />
                </div>
              </div>

              {/* Preview */}
              {authors && title && year && (
                <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: '#f8f7f5', border: `1px solid ${TJ.border}` }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>VISTA PREVIA</p>
                  <div style={{ color: TJ.text }} dangerouslySetInnerHTML={{ __html: formatReference({ id: 'preview', style, type: refType, authors, title, year, journal, volume, issue, pages, publisher, city, doi, url, edition }, 1) }} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t sticky bottom-0 bg-white" style={{ borderColor: TJ.border }}>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>Cancelar</button>
              <button onClick={handleCreate} disabled={!authors.trim() || !title.trim() || !year.trim()}
                className="px-4 py-2 text-sm rounded-lg text-white font-semibold disabled:opacity-50"
                style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                Agregar Referencia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
