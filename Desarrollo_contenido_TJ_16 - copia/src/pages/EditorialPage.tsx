import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { CheckCircle, Clock, AlertTriangle, Edit3, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';
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
  const { currentUser, topics, updateTopic } = useApp();
  const navigate = useNavigate();
  const dragTopicId = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  if (!currentUser) return null;

  const visibleTopics = currentUser.role === 'editor'
    ? topics.filter(t => t.assignedEditors.includes(currentUser.id))
    : topics;

  const isCoordOrAdmin = currentUser.role !== 'editor';

  return (
    <div className="page-enter">
      <Header title="Flujo Editorial" />
      <div className="p-6">
        <p className="text-sm mb-5" style={{ color: '#a8b8d8' }}>
          Gestiona el estado de los temas en el proceso editorial. Arrastra o usa los botones para mover entre etapas.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => {
            const Icon = col.icon;
            const colTopics = visibleTopics.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="bg-white rounded-xl overflow-hidden border" style={{ borderColor: TJ.border }}>
                <div className="px-4 py-3 border-b flex items-center gap-2"
                  style={{ borderColor: TJ.border, borderTop: `3px solid ${col.color}` }}>
                  <Icon size={14} style={{ color: col.color }} />
                  <span className="font-bold text-sm" style={{ color: col.color, fontFamily: 'Montserrat, sans-serif' }}>{col.label}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: col.bg, color: col.color }}>{colTopics.length}</span>
                </div>
                  <div className="p-3 space-y-2 min-h-48"
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
                    {colTopics.map(topic => (
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
