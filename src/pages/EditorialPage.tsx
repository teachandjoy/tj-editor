import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { CheckCircle, Clock, AlertTriangle, Edit3, ArrowRight, ArrowLeft, RotateCcw, LayoutGrid, List, Filter, Users } from 'lucide-react';
import type { TopicStatus } from '../types';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', gold: '#c5aa6f', border: '#e8e4de', text: '#2a2a32' };

const columns: { status: TopicStatus; label: string; icon: typeof Edit3; color: string; bg: string; border: string }[] = [
  { status: 'en_desarrollo', label: 'En Desarrollo',   icon: Edit3,         color: '#1b4b85', bg: '#eff6ff', border: '#bfdbfe' },
  { status: 'en_revision',   label: 'En Revisión',     icon: Clock,         color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  { status: 'devuelto',      label: 'Devuelto',        icon: AlertTriangle, color: '#c53030', bg: '#fff5f5', border: '#fed7d7' },
  { status: 'aprobado',      label: 'Aprobado',        icon: CheckCircle,   color: '#276749', bg: '#f0fff4', border: '#c6f6d5' },
];

// All possible transitions: forward AND backward
const allStatuses: TopicStatus[] = ['en_desarrollo', 'en_revision', 'devuelto', 'aprobado'];
const statusLabels: Record<TopicStatus, string> = {
  en_desarrollo: 'En Desarrollo', en_revision: 'En Revisión',
  devuelto: 'Devuelto', aprobado: 'Aprobado',
};

export default function EditorialPage() {
  const { currentUser, topics, offers, users, updateTopic } = useApp();
  const navigate = useNavigate();
  const dragTopicId = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');
  const [filterOffer, setFilterOffer] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  if (!currentUser) return null;

  const visibleTopics = currentUser.role === 'editor'
    ? topics.filter(t => t.assignedEditors.includes(currentUser.id))
    : topics;

  const afterOfferFilter = filterOffer === 'all'
    ? visibleTopics
    : visibleTopics.filter(t => t.offerId === filterOffer);

  const filteredTopics = filterUser === 'all'
    ? afterOfferFilter
    : afterOfferFilter.filter(t => t.assignedEditors.includes(filterUser) || t.assignedCoordinators.includes(filterUser) || t.author === users.find(u => u.id === filterUser)?.name);

  // Get unique offers from visible topics for the filter
  const topicOffers = Array.from(new Set(visibleTopics.map(t => t.offerId).filter(Boolean)));
  const offerNames: Record<string, string> = {};
  offers.forEach(o => { offerNames[o.id] = o.name; });

  // Users for filter: admin sees all, coordinador sees assigned, editor sees self only
  const filterableUsers = currentUser.role === 'admin'
    ? users
    : currentUser.role === 'coordinador'
      ? users.filter(u => u.id === currentUser.id || u.role === 'editor')
      : [currentUser];

  const isCoordOrAdmin = currentUser.role !== 'editor';

  return (
    <div className="page-enter">
      <Header title="Flujo Editorial" />
      <div className="p-6">
        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <p className="text-sm flex-1" style={{ color: '#a8b8d8' }}>
            Gestiona el estado de los temas en el proceso editorial.
          </p>

          {/* Offer filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} style={{ color: '#a8b8d8' }} />
            <select value={filterOffer} onChange={e => setFilterOffer(e.target.value)}
              className="text-xs border rounded-lg px-2 py-1.5 bg-white"
              style={{ borderColor: TJ.border, color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>
              <option value="all">Todas las ofertas</option>
              {topicOffers.map(oid => (
                <option key={oid} value={oid!}>{offerNames[oid!] || oid}</option>
              ))}
            </select>
          </div>

          {/* User filter */}
          {filterableUsers.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Users size={13} style={{ color: '#a8b8d8' }} />
              <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                className="text-xs border rounded-lg px-2 py-1.5 bg-white"
                style={{ borderColor: TJ.border, color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>
                <option value="all">Todos los usuarios</option>
                {filterableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: TJ.border }}>
            <button onClick={() => setViewMode('full')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: viewMode === 'full' ? TJ.primary : 'white',
                color: viewMode === 'full' ? 'white' : '#a8b8d8',
                fontFamily: 'Montserrat, sans-serif',
              }}>
              <LayoutGrid size={13} /> Completa
            </button>
            <button onClick={() => setViewMode('compact')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: viewMode === 'compact' ? TJ.primary : 'white',
                color: viewMode === 'compact' ? 'white' : '#a8b8d8',
                fontFamily: 'Montserrat, sans-serif',
              }}>
              <List size={13} /> Compacta
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => {
            const Icon = col.icon;
            const colTopics = filteredTopics.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="bg-white rounded-xl overflow-hidden border" style={{ borderColor: TJ.border }}>
                <div className="px-4 py-3 border-b flex items-center gap-2"
                  style={{ borderColor: TJ.border, borderTop: `3px solid ${col.color}` }}>
                  <Icon size={14} style={{ color: col.color }} />
                  <span className="font-bold text-sm" style={{ color: col.color, fontFamily: 'Montserrat, sans-serif' }}>{col.label}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: col.bg, color: col.color }}>{colTopics.length}</span>
                </div>
                  <div className={`p-3 space-y-2 ${viewMode === 'compact' ? 'min-h-24' : 'min-h-48'}`}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.status); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => {
                    if (dragTopicId.current) {
                      updateTopic(dragTopicId.current, { status: col.status });
                      dragTopicId.current = null;
                      setDragOverCol(null);
                    }
                  }}
                  style={{ outline: dragOverCol === col.status ? `2px dashed ${col.color}` : 'none', borderRadius: 12 }}>

                  {/* COMPACT VIEW */}
                  {viewMode === 'compact' && colTopics.map(topic => (
                    <div key={topic.id}
                      draggable={isCoordOrAdmin}
                      onDragStart={() => { dragTopicId.current = topic.id; }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                      style={{ background: col.bg, borderColor: col.border }}>
                      <span className="flex-1 truncate font-semibold" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>
                        {topic.title}
                      </span>
                      {topic.offerName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-[80px]"
                          style={{ background: 'rgba(27,75,133,0.08)', color: TJ.primary }}>
                          {topic.offerName}
                        </span>
                      )}
                      <button onClick={() => navigate(`/editor/${topic.id}`)}
                        className="p-0.5 rounded hover:bg-white/50 transition-colors flex-shrink-0"
                        style={{ color: col.color }} title="Abrir editor">
                        <Edit3 size={11} />
                      </button>
                    </div>
                  ))}

                  {/* FULL VIEW */}
                  {viewMode === 'full' && colTopics.map(topic => (
                      <div key={topic.id}
                        draggable={isCoordOrAdmin}
                        onDragStart={() => { dragTopicId.current = topic.id; }}
                        className="p-3 rounded-xl border text-sm cursor-grab active:cursor-grabbing"
                        style={{ background: col.bg, borderColor: col.border }}>
                      <div className="font-semibold mb-1" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>
                        {topic.title}
                      </div>
                      <div className="text-xs mb-2" style={{ color: '#a8b8d8' }}>
                        {topic.author} · {topic.offerName || '—'}
                      </div>

                      {isCoordOrAdmin && (
                        <div className="mt-2">
                          {/* Status selector — allows moving to any state */}
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {allStatuses.filter(s => s !== col.status).map(s => {
                              const target = columns.find(c => c.status === s)!;
                              const isForward = allStatuses.indexOf(s) > allStatuses.indexOf(col.status) && s !== 'devuelto';
                              const isDevolver = s === 'devuelto';
                              return (
                                <button key={s}
                                  onClick={() => updateTopic(topic.id, { status: s })}
                                  className="flex items-center gap-0.5 px-2 py-0.5 text-xs rounded-lg border transition-all"
                                  style={{
                                    borderColor: target.border,
                                    color: target.color,
                                    background: 'transparent',
                                    fontFamily: 'Montserrat, sans-serif',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = target.bg)}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                  title={`Mover a ${statusLabels[s]}`}>
                                  {isDevolver
                                    ? <><RotateCcw size={9} /> {statusLabels[s]}</>
                                    : isForward
                                      ? <><ArrowRight size={9} /> {statusLabels[s]}</>
                                      : <><ArrowLeft size={9} /> {statusLabels[s]}</>
                                  }
                                </button>
                              );
                            })}
                          </div>
                          <button onClick={() => navigate(`/editor/${topic.id}`)}
                            className="text-xs px-2 py-0.5 rounded-lg border transition-colors w-full text-center"
                            style={{ borderColor: col.border, color: col.color }}>
                            Abrir editor
                          </button>
                        </div>
                      )}

                      {!isCoordOrAdmin && (
                        <button onClick={() => navigate(`/editor/${topic.id}`)}
                          className="text-xs px-2 py-1 rounded-lg border transition-colors"
                          style={{ borderColor: col.border, color: col.color }}>
                          Editar
                        </button>
                      )}
                    </div>
                  ))}
                  {colTopics.length === 0 && (
                    <div className="text-xs text-center py-8" style={{ color: '#d4cfc8' }}>
                      Sin temas en esta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
