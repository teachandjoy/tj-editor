import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { Search, Plus, FileText, Eye, Filter, X, ChevronDown, Upload } from 'lucide-react';
import TopicImportDialog from '../components/topics/TopicImportDialog';
import type { TopicStatus, Topic } from '../types';
import { hasPermission } from '../utils/permissions';
import { TJ } from '../constants/theme';
import ModalPortal from '../components/ui/ModalPortal';

const statusConfig: Record<TopicStatus, { label: string; cls: string }> = {
  en_desarrollo: { label: 'En desarrollo', cls: 'bg-blue-50 text-blue-700' },
  en_revision: { label: 'En revisión', cls: 'bg-yellow-50 text-yellow-700' },
  aprobado: { label: 'Aprobado', cls: 'bg-green-50 text-green-700' },
  devuelto: { label: 'Devuelto', cls: 'bg-red-50 text-red-700' },
};


export default function TopicsPage() {
  const { currentUser, topics, offers, templates, addTopic, updateTopic } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [offerFilter, setOfferFilter] = useState<string>('all');
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOfferId, setNewOfferId] = useState('');
  const [newModuleId, setNewModuleId] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Handle navigation from academic page with pre-fill
  useEffect(() => {
    const isNew = searchParams.get('new');
    if (isNew) {
      setNewTitle(searchParams.get('title') || '');
      setNewOfferId(searchParams.get('offerId') || '');
      setNewModuleId(searchParams.get('moduleId') || '');
      setShowNewTopic(true);
    }
  }, [searchParams]);

  if (!currentUser) return null;

  const canCreate = hasPermission(currentUser, 'temas', 'crear');
  const canEdit = hasPermission(currentUser, 'temas', 'editar');
  const canPublish = hasPermission(currentUser, 'temas', 'publicar');

  const visibleTopics = currentUser.role === 'editor'
    ? topics.filter(t => t.assignedEditors.includes(currentUser.id))
    : topics;

  const filteredTopics = visibleTopics.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (offerFilter !== 'all' && t.offerId !== offerFilter) return false;
    return true;
  });

  // Group by offer then module
  const grouped: Record<string, Record<string, Topic[]>> = {};
  filteredTopics.forEach(t => {
    const oKey = t.offerId || '_general';
    const mKey = t.moduleId || '_general';
    if (!grouped[oKey]) grouped[oKey] = {};
    if (!grouped[oKey][mKey]) grouped[oKey][mKey] = [];
    grouped[oKey][mKey].push(t);
  });

  const visibleOffers = currentUser.role === 'editor'
    ? offers.filter(o => o.modules.some(m => m.assignedEditors.includes(currentUser.id)))
    : offers;

  const handleCreateTopic = () => {
    if (!newTitle.trim()) return;
    const offer = offers.find(o => o.id === newOfferId);
    const template = templates.find(t => t.id === newTemplateId);
    const blocks = template ? template.sections.map((s, i) => ({
      id: `block-${Date.now()}-${i}`,
      type: 'section' as const,
      content: '',
      sectionTitle: s.title,
      order: i + 1,
    })) : [];

    const topic: Topic = {
      id: `topic-${Date.now()}`,
      moduleId: newModuleId || '',
      offerId: newOfferId || '',
      title: newTitle,
      description: newDesc,
      status: 'en_desarrollo',
      author: currentUser.name,
      version: 'v1',
      date: new Date().toLocaleDateString('es-MX'),
      offerName: offer?.name || '',
      content: '',
      blocks,
      referenceIds: [],
      assignedEditors: [currentUser.id],
      templateId: newTemplateId || undefined,
      order: topics.length + 1,
    };
    addTopic(topic);
    setShowNewTopic(false);
    setNewTitle(''); setNewDesc(''); setNewOfferId(''); setNewModuleId(''); setNewTemplateId('');
    navigate(`/editor/${topic.id}`);
  };

  const offerModules = offers.find(o => o.id === newOfferId)?.modules || [];

  return (
    <div className="page-enter">
      <Header title="Temas" actions={
        canCreate ? (
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border font-semibold transition-colors"
              style={{ borderColor: TJ.border, color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(27,75,133,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Upload size={15} /> Importar
            </button>
            <button onClick={() => setShowNewTopic(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white font-semibold transition-colors"
              style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
              onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
              <Plus size={15} /> Nuevo Tema
            </button>
          </div>
        ) : undefined
      } />

      <div className="p-3 md:p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8b8d8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar temas..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none"
              style={{ borderColor: TJ.border, background: '#fff' }}
              onFocus={e => { e.currentTarget.style.borderColor = TJ.primary; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,75,133,0.08)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = TJ.border; e.currentTarget.style.boxShadow = 'none'; }} />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8b8d8' }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm border rounded-lg focus:outline-none appearance-none"
              style={{ borderColor: TJ.border, background: '#fff', fontFamily: 'Open Sans, sans-serif' }}>
              <option value="all">Todos los estados</option>
              {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8b8d8' }} />
          </div>
          <div className="relative">
            <select value={offerFilter} onChange={e => setOfferFilter(e.target.value)}
              className="pl-4 pr-8 py-2.5 text-sm border rounded-lg focus:outline-none appearance-none"
              style={{ borderColor: TJ.border, background: '#fff', fontFamily: 'Open Sans, sans-serif' }}>
              <option value="all">Todas las ofertas</option>
              {visibleOffers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8b8d8' }} />
          </div>
        </div>

        {/* Grouped topics */}
        <div className="space-y-6">
          {Object.keys(grouped).map(oKey => {
            const offer = offers.find(o => o.id === oKey);
            return (
              <div key={oKey}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                    {oKey === '_general' ? 'Sin oferta asignada' : offer?.name || oKey}
                  </div>
                  <div className="flex-1 h-px" style={{ background: TJ.border }} />
                </div>
                {Object.keys(grouped[oKey]).map(mKey => {
                  const mod = offer?.modules.find(m => m.id === mKey);
                  return (
                    <div key={mKey} className="mb-4">
                      {mod && (
                        <div className="text-xs font-semibold mb-2 ml-1" style={{ color: '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>
                          {mod.name}
                        </div>
                      )}
                      <div className="space-y-2">
                        {grouped[oKey][mKey].map(topic => (
                          <div key={topic.id}
                            className="bg-white rounded-xl p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:shadow-md transition-shadow cursor-pointer"
                            style={{ border: `1px solid ${TJ.border}` }}
                            onClick={() => navigate(`/editor/${topic.id}`)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{topic.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[topic.status].cls}`}>
                                  {statusConfig[topic.status].label}
                                </span>
                              </div>
                              <div className="text-xs mt-1" style={{ color: '#a8b8d8' }}>
                                {topic.author} · {topic.version} · {topic.date}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {canPublish && (
                                <select value={topic.status} onChange={e => updateTopic(topic.id, { status: e.target.value as TopicStatus })}
                                  onClick={e => e.stopPropagation()}
                                  className="text-xs px-2 py-1.5 border rounded-lg focus:outline-none"
                                  style={{ borderColor: TJ.border, fontFamily: 'Open Sans, sans-serif' }}>
                                  {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                              )}
                              {canEdit && (
                                <button onClick={(e) => { e.stopPropagation(); navigate(`/editor/${topic.id}`); }}
                                  className="p-2 rounded-lg hover:bg-blue-50 transition-colors" style={{ color: TJ.primary }} title="Editar">
                                  <FileText size={16} />
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/preview/${topic.id}`); }}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: '#a8b8d8' }} title="Vista previa">
                                <Eye size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredTopics.length === 0 && (
            <div className="text-center py-16" style={{ color: '#a8b8d8' }}>
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay temas disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* New Topic Modal */}
      {showNewTopic && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-auto" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-base" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Nuevo Tema</h3>
              <button onClick={() => setShowNewTopic(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Título del tema *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título del tema"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: TJ.border }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Descripción</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-none"
                  style={{ borderColor: TJ.border }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Oferta educativa</label>
                <select value={newOfferId} onChange={e => { setNewOfferId(e.target.value); setNewModuleId(''); }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: TJ.border }}>
                  <option value="">Seleccionar...</option>
                  {visibleOffers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              {newOfferId && offerModules.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Módulo</label>
                  <select value={newModuleId} onChange={e => setNewModuleId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{ borderColor: TJ.border }}>
                    <option value="">Sin módulo</option>
                    {offerModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Plantilla</label>
                <select value={newTemplateId} onChange={e => setNewTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: TJ.border }}>
                  <option value="">Sin plantilla</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: TJ.border }}>
              <button onClick={() => setShowNewTopic(false)} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: TJ.border }}>Cancelar</button>
              <button onClick={handleCreateTopic} className="px-4 py-2 text-sm rounded-lg text-white font-semibold" style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                Crear y Editar
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {/* Import Dialog */}
      <TopicImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        offers={visibleOffers}
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
        onImport={(importedTopics) => { importedTopics.forEach(t => addTopic(t)); }}
        onCreateOffer={undefined}
      />
    </div>
  );
}
