import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import {
  ChevronDown, ChevronRight, Edit, Trash2, Plus, GripVertical,
  BookOpen, Layers, FileText, UserPlus, X, Check
} from 'lucide-react';
import type { Offer, Module } from '../types';
import { hasPermission } from '../utils/permissions';
import { TJ } from '../constants/theme';
import ModalPortal from '../components/ui/ModalPortal';


const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1b4b85]';
const inputStyle = { borderColor: TJ.border, fontFamily: 'Open Sans, sans-serif' };

interface ModalField {
  label: string; id: string; type?: string; placeholder?: string; rows?: number;
  options?: { value: string; label: string }[];
}

function Modal({ title, onClose, onSave, children }: {
  title: string; onClose: () => void; onSave: () => void; children: React.ReactNode;
}) {
  return (
    <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-auto" style={{ border: `1px solid ${TJ.border}` }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: TJ.border }}>
          <h3 className="font-bold text-base" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: TJ.border }}>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50" style={{ borderColor: TJ.border }}>Cancelar</button>
          <button onClick={onSave} className="px-4 py-2 text-sm rounded-lg text-white font-semibold transition-colors" style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
            onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
            Guardar
          </button>
        </div>
      </div>
    </div></ModalPortal>
  );
}

function FormField({ label, id: _id, type = 'text', placeholder, rows, options, value, onChange }: ModalField & { value: string; onChange: (v: string) => void }) {
  return (
    <div className="page-enter">
      <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{label}</label>
      {options ? (
        <select className={inputCls} style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : rows ? (
        <textarea className={inputCls} style={inputStyle} placeholder={placeholder} rows={rows} value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <input type={type} className={inputCls} style={inputStyle} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}

export default function AcademicPage() {
  const { currentUser, offers, users, topics, identities, setOffers, addOffer, updateOffer, deleteOffer, addModule, updateModule, deleteModule, assignEditor, removeEditor, updateTopic } = useApp();
  const navigate = useNavigate();
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set(['offer-1']));
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Offer modal state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerForm, setOfferForm] = useState({
    name: '', type: 'diplomado', edition: '', authors: '', description: '',
    audience: '', modality: 'eLearning', duration: '', prereqs: '', purpose: '', identityId: '',
  });

  // Module modal state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<{ module: Module; offerId: string } | null>(null);
  const [moduleOfferId, setModuleOfferId] = useState('');
  const [moduleForm, setModuleForm] = useState({ name: '', objectives: '' });

  // Topic inline add
  const [addingTopicModuleId, setAddingTopicModuleId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');

  // Assign
  const [assignTarget, setAssignTarget] = useState<{ type: 'module' | 'topic'; id: string; offerId: string } | null>(null);

  // Drag
  const dragIdx = useRef<number | null>(null);
  const dragModIdx = useRef<{ offerId: string; idx: number } | null>(null);
  const dragTopicRef = useRef<{ topicId: string; moduleId: string; offerId: string } | null>(null);

  if (!currentUser) return null;
  const editors = users.filter(u => u.role === 'editor');
  const canEdit = hasPermission(currentUser, 'ofertas', 'editar');
  const canCreate = hasPermission(currentUser, 'ofertas', 'crear');
  const canDelete = hasPermission(currentUser, 'ofertas', 'eliminar');

  const visibleOffers = currentUser.role === 'editor'
    ? offers.filter(o => o.modules.some(m => m.assignedEditors.includes(currentUser.id)))
    : offers;

  const toggleOffer = (id: string) => setExpandedOffers(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });
  const toggleModule = (id: string) => setExpandedModules(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  // Offer CRUD
  const openNewOffer = () => {
    setEditingOffer(null);
    setOfferForm({ name: '', type: 'diplomado', edition: '', authors: '', description: '', audience: '', modality: 'eLearning', duration: '', prereqs: '', purpose: '', identityId: '' });
    setShowOfferModal(true);
  };
  const openEditOffer = (o: Offer) => {
    setEditingOffer(o);
    setOfferForm({ name: o.name, type: o.type, edition: o.edition || '', authors: o.authors || '', description: o.description, audience: o.audience || '', modality: o.modality || 'eLearning', duration: o.duration || '', prereqs: o.prereqs || '', purpose: o.purpose || '', identityId: o.identityId || '' });
    setShowOfferModal(true);
  };
  const saveOffer = () => {
    if (!offerForm.name.trim()) return;
    if (editingOffer) {
      updateOffer(editingOffer.id, offerForm as Partial<Offer>);
    } else {
      const newOffer: Offer = {
        id: `offer-${Date.now()}`, institution: 'Teach & Joy', modules: [], order: offers.length + 1,
        ...offerForm, type: offerForm.type as Offer['type'], modality: offerForm.modality as Offer['modality'],
      };
      addOffer(newOffer);
    }
    setShowOfferModal(false);
  };

  // Module CRUD
  const openNewModule = (offerId: string) => {
    setEditingModule(null);
    setModuleOfferId(offerId);
    setModuleForm({ name: '', objectives: '' });
    setShowModuleModal(true);
  };
  const openEditModule = (mod: Module, offerId: string) => {
    setEditingModule({ module: mod, offerId });
    setModuleOfferId(offerId);
    setModuleForm({ name: mod.name, objectives: mod.objectives || '' });
    setShowModuleModal(true);
  };
  const saveModule = () => {
    if (!moduleForm.name.trim()) return;
    if (editingModule) {
      updateModule(editingModule.offerId, editingModule.module.id, moduleForm);
    } else {
      const offer = offers.find(o => o.id === moduleOfferId);
      const mod: Module = {
        id: `mod-${Date.now()}`, offerId: moduleOfferId,
        name: moduleForm.name, description: '', objectives: moduleForm.objectives,
        topics: [], assignedEditors: [], order: (offer?.modules.length || 0) + 1,
      };
      addModule(moduleOfferId, mod);
    }
    setShowModuleModal(false);
  };

  // Topic quick add
  const handleAddTopic = (offerId: string, moduleId: string) => {
    if (!newTopicName.trim()) return;
    navigate(`/topics?new=1&title=${encodeURIComponent(newTopicName)}&offerId=${offerId}&moduleId=${moduleId}`);
    setAddingTopicModuleId(null);
    setNewTopicName('');
  };

  // Drag offers
  const handleOfferDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleOfferDrop = (idx: number) => {
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const reordered = [...offers];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(idx, 0, moved);
    setOffers(reordered);
    dragIdx.current = null;
  };

  // Drag modules
  const handleModDragStart = (offerId: string, idx: number) => { dragModIdx.current = { offerId, idx }; };
  const handleModDrop = (offerId: string, dropIdx: number) => {
    if (!dragModIdx.current || dragModIdx.current.offerId !== offerId || dragModIdx.current.idx === dropIdx) return;
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;
    const mods = [...offer.modules];
    const [moved] = mods.splice(dragModIdx.current.idx, 1);
    mods.splice(dropIdx, 0, moved);
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, modules: mods } : o));
    dragModIdx.current = null;
  };

  // Drag topics within modules
  const handleTopicDragStart = (topicId: string, moduleId: string, offerId: string) => {
    dragTopicRef.current = { topicId, moduleId, offerId };
  };
  const handleTopicDrop = (targetTopicId: string, moduleId: string) => {
    if (!dragTopicRef.current || dragTopicRef.current.topicId === targetTopicId) return;
    const modTopics = topics.filter(t => t.moduleId === moduleId).sort((a, b) => (a.order || 0) - (b.order || 0));
    const fromIdx = modTopics.findIndex(t => t.id === dragTopicRef.current!.topicId);
    const toIdx = modTopics.findIndex(t => t.id === targetTopicId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...modTopics];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    reordered.forEach((t, i) => updateTopic(t.id, { order: i + 1 }));
    dragTopicRef.current = null;
  };

  // Assign panel
  const getAssigned = (type: 'module' | 'topic', id: string, offerId: string) => {
    if (type === 'topic') return topics.find(t => t.id === id)?.assignedEditors || [];
    return offers.find(o => o.id === offerId)?.modules.find(m => m.id === id)?.assignedEditors || [];
  };

  return (
    <div className="page-enter" style={{ minHeight: '100vh' }}>
      <Header title="Gestión Académica" actions={
        canCreate ? (
          <button onClick={openNewOffer}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white font-semibold transition-colors"
            style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
            onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
            <Plus size={15} /> Nueva Oferta
          </button>
        ) : undefined
      } />

      <div className="p-3 md:p-6">
        <div className="mb-5">
          <p className="text-sm" style={{ color: '#a8b8d8' }}>
            Organiza ofertas educativas, módulos y temas · <strong style={{ color: TJ.text }}>{visibleOffers.length}</strong> ofertas activas
          </p>
        </div>

        <div className="space-y-3">
          {visibleOffers.map((offer, offerIdx) => (
            <div
              key={offer.id}
              draggable={canEdit}
              onDragStart={() => handleOfferDragStart(offerIdx)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleOfferDrop(offerIdx)}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
              style={{ border: `1px solid ${TJ.border}` }}
            >
              {/* Offer header */}
              <div className="flex items-center px-4 py-3.5 gap-3">
                {canEdit && (
                  <div className="cursor-grab text-gray-300 hover:text-gray-400 transition-colors" title="Arrastrar para reordenar">
                    <GripVertical size={16} />
                  </div>
                )}
                <button onClick={() => toggleOffer(offer.id)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  {expandedOffers.has(offer.id) ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                </button>
                <BookOpen size={17} style={{ color: TJ.primary, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{offer.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(197,170,111,0.15)', color: '#8b6914' }}>{offer.type}</span>
                    {offer.modality && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(27,75,133,0.08)', color: TJ.primary }}>{offer.modality}</span>}
                  </div>
                  {offer.authors && <p className="text-xs mt-0.5" style={{ color: '#a8b8d8' }}>{offer.authors}{offer.edition ? ` · Edición ${offer.edition}` : ''}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && <>
                    <button onClick={() => openEditOffer(offer)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Editar oferta" style={{ color: TJ.primary }}>
                      <Edit size={14} />
                    </button>
                    <button onClick={() => openNewModule(offer.id)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Añadir módulo" style={{ color: TJ.primary }}>
                      <Plus size={14} />
                    </button>
                    {canDelete && <button onClick={() => { if (confirm('¿Eliminar esta oferta?')) deleteOffer(offer.id); }} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#c53030' }} title="Eliminar">
                      <Trash2 size={14} />
                    </button>}
                  </>}
                </div>
              </div>

              {/* Modules */}
              {expandedOffers.has(offer.id) && (
                <div style={{ borderTop: `1px solid ${TJ.border}`, background: '#f8f7f5' }}>
                  {offer.modules.map((mod, modIdx) => (
                    <div
                      key={mod.id}
                      draggable={canEdit}
                      onDragStart={() => handleModDragStart(offer.id, modIdx)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleModDrop(offer.id, modIdx)}
                      style={{ borderBottom: `1px solid ${TJ.border}` }}
                    >
                      {/* Module header */}
                      <div className="flex items-center px-4 py-3 pl-10 gap-2.5">
                        {canEdit && <div className="cursor-grab text-gray-300"><GripVertical size={14} /></div>}
                        <button onClick={() => toggleModule(mod.id)} className="text-gray-400 hover:text-gray-600">
                          {expandedModules.has(mod.id) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                        <Layers size={15} style={{ color: '#c5aa6f', flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm" style={{ color: TJ.text }}>{mod.name}</div>
                          {mod.objectives && <p className="text-xs mt-0.5" style={{ color: '#a8b8d8' }}>{mod.objectives.slice(0, 80)}{mod.objectives.length > 80 ? '…' : ''}</p>}
                          {mod.assignedEditors.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {users.filter(u => mod.assignedEditors.includes(u.id)).map(e => (
                                <span key={e.id} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(39,103,73,0.1)', color: '#276749' }}>
                                  {e.name.split(' ').slice(0, 2).join(' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(27,75,133,0.08)', color: TJ.primary }}>
                            {topics.filter(t => t.moduleId === mod.id).length} temas
                          </span>
                          <button onClick={() => setAssignTarget({ type: 'module', id: mod.id, offerId: offer.id })}
                            className="p-1.5 rounded-lg hover:bg-green-50 transition-colors" title="Asignar editores" style={{ color: '#276749' }}>
                            <UserPlus size={13} />
                          </button>
                          {canEdit && <>
                            <button onClick={() => openEditModule(mod, offer.id)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" style={{ color: TJ.primary }}>
                              <Edit size={13} />
                            </button>
                            <button onClick={() => { if (confirm('¿Eliminar módulo?')) deleteModule(offer.id, mod.id); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#c53030' }}>
                              <Trash2 size={13} />
                            </button>
                          </>}
                        </div>
                      </div>

                      {/* Topics inside module */}
                      {expandedModules.has(mod.id) && (
                        <div style={{ background: '#fff' }}>
                          {topics.filter(t => t.moduleId === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map(topic => (
                            <div key={topic.id}
                              draggable={canEdit}
                              onDragStart={(e) => { e.stopPropagation(); handleTopicDragStart(topic.id, mod.id, offer.id); }}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => { e.stopPropagation(); handleTopicDrop(topic.id, mod.id); }}
                              className="flex items-center px-4 py-2.5 pl-16 gap-2.5 border-t cursor-pointer hover:bg-blue-50/30 transition-colors" style={{ borderColor: '#f0ece6' }}
                              onClick={() => navigate(`/editor/${topic.id}`)}>
                              <FileText size={13} style={{ color: '#a8b8d8', flexShrink: 0 }} />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm" style={{ color: TJ.text }}>{topic.title}</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                topic.status === 'aprobado' ? 'bg-green-50 text-green-700' :
                                topic.status === 'en_revision' ? 'bg-yellow-50 text-yellow-700' :
                                topic.status === 'devuelto' ? 'bg-red-50 text-red-700' :
                                'bg-blue-50 text-blue-700'
                              }`}>
                                {topic.status === 'en_desarrollo' ? 'En desarrollo' : topic.status === 'en_revision' ? 'En revisión' : topic.status === 'aprobado' ? 'Aprobado' : 'Devuelto'}
                              </span>
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/editor/${topic.id}`); }}
                                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" style={{ color: TJ.primary }} title="Editar">
                                <Edit size={13} />
                              </button>
                            </div>
                          ))}

                          {/* Add topic inline */}
                          {addingTopicModuleId === mod.id ? (
                            <div className="flex items-center gap-2 px-4 py-2 pl-16 border-t" style={{ borderColor: '#f0ece6' }}>
                              <input
                                value={newTopicName}
                                onChange={e => setNewTopicName(e.target.value)}
                                placeholder="Título del tema..."
                                className={inputCls}
                                style={{ ...inputStyle, flex: 1 }}
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleAddTopic(offer.id, mod.id); if (e.key === 'Escape') { setAddingTopicModuleId(null); setNewTopicName(''); } }}
                              />
                              <button onClick={() => handleAddTopic(offer.id, mod.id)}
                                className="p-1.5 rounded-lg text-white" style={{ background: TJ.primary }}>
                                <Check size={14} />
                              </button>
                              <button onClick={() => { setAddingTopicModuleId(null); setNewTopicName(''); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setAddingTopicModuleId(mod.id)}
                              className="flex items-center gap-1 text-xs px-4 py-2 pl-16 w-full hover:bg-gray-50 transition-colors border-t"
                              style={{ color: TJ.primary, borderColor: '#f0ece6' }}>
                              <Plus size={13} /> Agregar tema
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add module */}
                  {canEdit && (
                    <button onClick={() => openNewModule(offer.id)}
                      className="flex items-center gap-1.5 text-sm px-4 py-3 pl-10 w-full hover:bg-gray-100 transition-colors"
                      style={{ color: TJ.primary }}>
                      <Plus size={14} /> Agregar módulo
                    </button>
                  )}
                  {offer.modules.length === 0 && !canEdit && (
                    <div className="py-6 text-center text-sm" style={{ color: '#a8b8d8' }}>Sin módulos asignados</div>
                  )}
                </div>
              )}
            </div>
          ))}

          {visibleOffers.length === 0 && (
            <div className="text-center py-16" style={{ color: '#a8b8d8' }}>
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay ofertas educativas disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <Modal title={editingOffer ? 'Editar Oferta Educativa' : 'Nueva Oferta Educativa'} onClose={() => setShowOfferModal(false)} onSave={saveOffer}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Nombre *" id="of-name" placeholder="Ej: Diplomado en Anestesia Regional" value={offerForm.name} onChange={v => setOfferForm(p => ({ ...p, name: v }))} />
            </div>
            <FormField label="Tipo" id="of-type" options={[{ value: 'diplomado', label: 'Diplomado' }, { value: 'curso', label: 'Curso' }]} value={offerForm.type} onChange={v => setOfferForm(p => ({ ...p, type: v }))} />
            <FormField label="Modalidad" id="of-mod" options={[{ value: 'eLearning', label: 'e-Learning' }, { value: 'bLearning', label: 'b-Learning' }, { value: 'presencial', label: 'Presencial' }]} value={offerForm.modality} onChange={v => setOfferForm(p => ({ ...p, modality: v }))} />
            <FormField label="Fecha / Edición" id="of-ed" placeholder="Ej: 2024-1, 3ra edición" value={offerForm.edition} onChange={v => setOfferForm(p => ({ ...p, edition: v }))} />
            <FormField label="Duración total" id="of-dur" placeholder="Ej: 120 horas" value={offerForm.duration} onChange={v => setOfferForm(p => ({ ...p, duration: v }))} />
            <div className="sm:col-span-2">
              <FormField label="Autor(es) / Institución" id="of-auth" placeholder="Responsable académico o entidad" value={offerForm.authors} onChange={v => setOfferForm(p => ({ ...p, authors: v }))} />
            </div>
            <div className="sm:col-span-2">
              <FormField label="Descripción breve" id="of-desc" placeholder="Descripción de la oferta educativa..." rows={2} value={offerForm.description} onChange={v => setOfferForm(p => ({ ...p, description: v }))} />
            </div>
            <FormField label="Público objetivo" id="of-aud" placeholder="Ej: Médicos en formación" value={offerForm.audience} onChange={v => setOfferForm(p => ({ ...p, audience: v }))} />
            <FormField label="Requisitos previos" id="of-pre" placeholder="Ej: Licenciatura en Medicina" value={offerForm.prereqs} onChange={v => setOfferForm(p => ({ ...p, prereqs: v }))} />
            <div className="sm:col-span-2">
              <FormField label="Propósito general" id="of-purp" placeholder="Lo que el estudiante logrará al finalizar..." rows={2} value={offerForm.purpose} onChange={v => setOfferForm(p => ({ ...p, purpose: v }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Identidad Corporativa</label>
              <select className={inputCls} style={inputStyle} value={offerForm.identityId} onChange={e => setOfferForm(p => ({ ...p, identityId: e.target.value }))}>
                <option value="">— Sin identidad —</option>
                {identities.map(id => <option key={id.id} value={id.id}>{id.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Module Modal */}
      {showModuleModal && (
        <Modal title={editingModule ? 'Editar Módulo' : 'Nuevo Módulo'} onClose={() => setShowModuleModal(false)} onSave={saveModule}>
          <FormField label="Nombre del módulo *" id="mod-name" placeholder="Ej: Módulo 1: Fundamentos Anatómicos" value={moduleForm.name} onChange={v => setModuleForm(p => ({ ...p, name: v }))} />
          <FormField label="Objetivos del módulo" id="mod-obj" placeholder="¿Qué logrará el estudiante al finalizar este módulo?" rows={3} value={moduleForm.objectives} onChange={v => setModuleForm(p => ({ ...p, objectives: v }))} />
        </Modal>
      )}

      {/* Assign Modal */}
      {assignTarget && (
        <ModalPortal><div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col" style={{ border: `1px solid ${TJ.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-base" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Asignar Editores</h3>
              <button onClick={() => setAssignTarget(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-2" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {editors.map(editor => {
                const assigned = getAssigned(assignTarget.type, assignTarget.id, assignTarget.offerId);
                const isAssigned = assigned.includes(editor.id);
                return (
                  <label key={editor.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all"
                    style={{ borderColor: isAssigned ? TJ.primary : TJ.border, background: isAssigned ? 'rgba(27,75,133,0.04)' : '#fff' }}>
                    <input type="checkbox" checked={isAssigned}
                      onChange={() => isAssigned ? removeEditor(assignTarget.type, assignTarget.id, editor.id, assignTarget.offerId) : assignEditor(assignTarget.type, assignTarget.id, editor.id, assignTarget.offerId)}
                      className="accent-blue-700" />
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ background: TJ.primary }}>
                      {editor.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: TJ.text }}>{editor.name}</div>
                      <div className="text-xs" style={{ color: '#a8b8d8' }}>{editor.email}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="px-6 py-3 border-t text-right" style={{ borderColor: TJ.border }}>
              <button onClick={() => setAssignTarget(null)} className="px-4 py-2 text-sm rounded-lg text-white font-semibold" style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                Listo
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}
