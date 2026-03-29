import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { FileText, BookOpen, Image, BookMarked, Users, CheckCircle, Clock, AlertTriangle, Edit3, BarChart3, TrendingUp, Target, X } from 'lucide-react';
import type { TopicStatus } from '../types';
import StatusDistributionChart from '../components/dashboard/StatusDistributionChart';
import OfferProgressChart from '../components/dashboard/OfferProgressChart';
import ActivityChart from '../components/dashboard/ActivityChart';

import { TJ } from '../constants/theme';

const statusConfig: Record<TopicStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  aprobado:      { label: 'Aprobados',     color: '#276749', icon: CheckCircle },
  en_revision:   { label: 'En revisión',   color: '#92400e', icon: Clock },
  devuelto:      { label: 'Devueltos',     color: '#c53030', icon: AlertTriangle },
  en_desarrollo: { label: 'En desarrollo', color: '#1b4b85', icon: Edit3 },
};

// Helper to format file sizes
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardPage() {
  const { currentUser, topics, offers, media, references, users } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('general');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [tooltipCard, setTooltipCard] = useState<string | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCardHover = useCallback((label: string) => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setTooltipCard(label);
  }, []);

  const handleCardLeave = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setTooltipCard(null), 150);
  }, []);

  useEffect(() => {
    return () => { if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current); };
  }, []);

  if (!currentUser) return null;

  const isEditor = currentUser.role === 'editor';
  const visibleTopics = isEditor ? topics.filter(t => t.assignedEditors.includes(currentUser.id)) : topics;
  const filteredTopics = activeTab === 'general' ? visibleTopics : visibleTopics.filter(t => t.offerId === activeTab);
  const filteredOffer = offers.find(o => o.id === activeTab);

  const topicsByStatus = {
    aprobado: filteredTopics.filter(t => t.status === 'aprobado').length,
    en_revision: filteredTopics.filter(t => t.status === 'en_revision').length,
    devuelto: filteredTopics.filter(t => t.status === 'devuelto').length,
    en_desarrollo: filteredTopics.filter(t => t.status === 'en_desarrollo').length,
  };

  const completionPct = filteredTopics.length > 0
    ? Math.round((topicsByStatus.aprobado / filteredTopics.length) * 100)
    : 0;

  // Per-offer specific metrics
  const offerEditors = filteredOffer
    ? [...new Set(filteredOffer.modules.flatMap(m => m.assignedEditors))].length
    : 0;
  const offerRefs = filteredOffer
    ? references.filter(r => r.offerId === filteredOffer.id).length
    : references.length;
  const offerMedia = filteredOffer
    ? media.filter(m => m.offerId === filteredOffer.id).length
    : media.length;

  const generalStats = [
    { label: 'Temas totales', value: visibleTopics.length, icon: FileText, color: TJ.primary },
    { label: 'Ofertas activas', value: offers.length, icon: BookOpen, color: TJ.secondary },
    { label: 'Multimedia', value: media.length, icon: Image, color: TJ.gold },
    { label: 'Referencias', value: references.length, icon: BookMarked, color: '#276749' },
    { label: 'Usuarios', value: users.length, icon: Users, color: '#6b46c1' },
  ];

  const offerStats = filteredOffer ? [
    { label: 'Temas', value: filteredTopics.length, icon: FileText, color: TJ.primary },
    { label: 'Módulos', value: filteredOffer.modules.length, icon: BookOpen, color: TJ.secondary },
    { label: 'Editores', value: offerEditors, icon: Users, color: '#276749' },
    { label: 'Referencias', value: offerRefs, icon: BookMarked, color: TJ.gold },
    { label: 'Multimedia', value: offerMedia, icon: Image, color: '#6b46c1' },
    { label: '% Aprobado', value: `${completionPct}%`, icon: Target, color: completionPct >= 70 ? '#276749' : completionPct >= 40 ? '#92400e' : '#c53030' },
  ] : generalStats;

  const stats = activeTab === 'general' ? generalStats : offerStats;

  return (
    <div className="page-enter">
      <Header title="Dashboard" />
      <div className="p-3 md:p-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
              Bienvenido, {currentUser.name.split(' ').slice(0, 2).join(' ')}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#a8b8d8' }}>
              {activeTab === 'general' ? 'Panel de administración general' : `Vista detallada: ${filteredOffer?.name}`}
            </p>
          </div>
          {activeTab !== 'general' && filteredOffer && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold" style={{ color: '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>PROGRESO GENERAL</div>
                <div className="text-2xl font-bold" style={{ color: completionPct >= 70 ? '#276749' : TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>{completionPct}%</div>
              </div>
              <div style={{ width: 52, height: 52, position: 'relative' }}>
                <svg viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="26" cy="26" r="22" fill="none" stroke="#f0ece6" strokeWidth="5" />
                  <circle cx="26" cy="26" r="22" fill="none"
                    stroke={completionPct >= 70 ? '#276749' : TJ.primary}
                    strokeWidth="5"
                    strokeDasharray={`${(completionPct / 100) * 138.2} 138.2`}
                    strokeLinecap="round" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Offer tabs */}
        {!isEditor && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-3 px-3 md:mx-0 md:px-0">
            <button onClick={() => setActiveTab('general')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
              style={{ background: activeTab === 'general' ? TJ.primary : '#fff', color: activeTab === 'general' ? '#fff' : TJ.text, border: `1px solid ${activeTab === 'general' ? TJ.primary : TJ.border}`, fontFamily: 'Montserrat, sans-serif' }}>
              <BarChart3 size={14} /> Visión General
            </button>
            {offers.map(offer => (
              <button key={offer.id} onClick={() => setActiveTab(offer.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
                style={{ background: activeTab === offer.id ? TJ.primary : '#fff', color: activeTab === offer.id ? '#fff' : TJ.text, border: `1px solid ${activeTab === offer.id ? TJ.primary : TJ.border}`, fontFamily: 'Montserrat, sans-serif' }}>
                <BookOpen size={14} />
                {offer.name.length > 28 ? offer.name.slice(0, 28) + '…' : offer.name}
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 stagger-children">
          {stats.map(stat => {
            const Icon = stat.icon;
            const isExpanded = expandedCard === stat.label;
            const showTooltip = tooltipCard === stat.label && !isExpanded;

            // Build tooltip content per card
            let tooltipContent = '';
            if (stat.label === 'Temas totales' || stat.label === 'Temas') {
              tooltipContent = `Aprobados: ${topicsByStatus.aprobado} · Revisión: ${topicsByStatus.en_revision} · Desarrollo: ${topicsByStatus.en_desarrollo} · Devueltos: ${topicsByStatus.devuelto}`;
            } else if (stat.label === 'Ofertas activas') {
              const types = { diplomado: 0, curso: 0 };
              offers.forEach(o => { if (o.type === 'diplomado') types.diplomado++; else types.curso++; });
              tooltipContent = `Diplomados: ${types.diplomado} · Cursos: ${types.curso}`;
            } else if (stat.label === 'Multimedia') {
              const byType = { image: 0, video: 0, document: 0 };
              media.forEach(m => { byType[m.type]++; });
              tooltipContent = `Imágenes: ${byType.image} · Videos: ${byType.video} · Documentos: ${byType.document}`;
            } else if (stat.label === 'Referencias') {
              const byType: Record<string, number> = {};
              references.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1; });
              tooltipContent = Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(' · ');
            } else if (stat.label === 'Usuarios') {
              const byRole = { admin: 0, coordinador: 0, editor: 0 };
              users.forEach(u => { byRole[u.role]++; });
              tooltipContent = `Admin: ${byRole.admin} · Coordinadores: ${byRole.coordinador} · Editores: ${byRole.editor}`;
            } else if (stat.label === 'Módulos' && filteredOffer) {
              tooltipContent = `${filteredOffer.modules.length} módulos en ${filteredOffer.name}`;
            } else if (stat.label === 'Editores') {
              tooltipContent = `Editores asignados a esta oferta`;
            } else if (stat.label === '% Aprobado') {
              tooltipContent = `${topicsByStatus.aprobado} de ${filteredTopics.length} temas aprobados`;
            }

            return (
              <div key={stat.label} className="relative">
                <div
                  className="bg-white rounded-xl p-4 border cursor-pointer select-none"
                  style={{
                    borderColor: isExpanded ? stat.color : TJ.border,
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
                  }}
                  onClick={() => setExpandedCard(isExpanded ? null : stat.label)}
                  onMouseEnter={e => {
                    handleCardHover(stat.label);
                    e.currentTarget.style.boxShadow = `0 6px 24px ${stat.color}1a`;
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  }}
                  onMouseLeave={e => {
                    handleCardLeave();
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: '#a8b8d8', fontFamily: 'Montserrat, sans-serif' }}>{stat.label.toUpperCase()}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.color + '15' }}>
                      <Icon size={15} style={{ color: stat.color }} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: stat.color, fontFamily: 'Montserrat, sans-serif' }}>{stat.value}</div>
                </div>
                {/* Tooltip */}
                {showTooltip && tooltipContent && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 rounded-lg text-xs text-white whitespace-nowrap z-50 pointer-events-none"
                    style={{ background: '#2a2a32', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxWidth: 260, whiteSpace: 'normal', textAlign: 'center' }}
                  >
                    {tooltipContent}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #2a2a32' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Expanded detail panel */}
        {expandedCard && (
          <div className="mb-6 bg-white rounded-xl border overflow-hidden" style={{ borderColor: TJ.border, animation: 'fadeSlideIn 0.2s ease both' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: TJ.border, background: TJ.bg }}>
              <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                Detalle: {expandedCard}
              </h3>
              <button onClick={() => setExpandedCard(null)} className="p-1 rounded-lg transition-colors hover:bg-gray-200">
                <X size={16} style={{ color: '#a8b8d8' }} />
              </button>
            </div>
            <div className="p-3 md:p-5 max-h-72 overflow-y-auto overflow-x-auto">
              {(expandedCard === 'Temas totales' || expandedCard === 'Temas') && (
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: TJ.border }}>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Título</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Oferta</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Estado</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Autor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === 'general' ? visibleTopics : filteredTopics).map(t => (
                      <tr key={t.id} className="border-b cursor-pointer transition-colors hover:bg-gray-50" style={{ borderColor: TJ.border }} onClick={() => navigate(`/editor/${t.id}`)}>
                        <td className="py-2 font-medium" style={{ color: TJ.text }}>{t.title}</td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{t.offerName || '—'}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            t.status === 'aprobado' ? 'bg-green-50 text-green-700' :
                            t.status === 'en_revision' ? 'bg-yellow-50 text-yellow-700' :
                            t.status === 'devuelto' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                          }`}>{statusConfig[t.status].label}</span>
                        </td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{t.author}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {expandedCard === 'Ofertas activas' && (
                <table className="w-full text-sm min-w-[450px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: TJ.border }}>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Nombre</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Tipo</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Institución</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Módulos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map(o => (
                      <tr key={o.id} className="border-b cursor-pointer transition-colors hover:bg-gray-50" style={{ borderColor: TJ.border }} onClick={() => navigate('/topics')}>
                        <td className="py-2 font-medium" style={{ color: TJ.text }}>{o.name}</td>
                        <td className="py-2 capitalize" style={{ color: '#a8b8d8' }}>{o.type}</td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{o.institution}</td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{o.modules.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {expandedCard === 'Multimedia' && (
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: TJ.border }}>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Nombre</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Tipo</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Tamaño</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredOffer ? media.filter(m => m.offerId === filteredOffer.id) : media).map(m => (
                      <tr key={m.id} className="border-b transition-colors hover:bg-gray-50" style={{ borderColor: TJ.border }}>
                        <td className="py-2 font-medium" style={{ color: TJ.text }}>{m.name}</td>
                        <td className="py-2 capitalize" style={{ color: '#a8b8d8' }}>{m.type}</td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{formatSize(m.size)}</td>
                      </tr>
                    ))}
                    {(filteredOffer ? media.filter(m => m.offerId === filteredOffer.id) : media).length === 0 && (
                      <tr><td colSpan={3} className="py-4 text-center" style={{ color: '#a8b8d8' }}>Sin archivos multimedia</td></tr>
                    )}
                  </tbody>
                </table>
              )}
              {expandedCard === 'Referencias' && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: TJ.border }}>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Título</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Autores</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Tipo</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Año</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredOffer ? references.filter(r => r.offerId === filteredOffer.id) : references).map(r => (
                      <tr key={r.id} className="border-b transition-colors hover:bg-gray-50" style={{ borderColor: TJ.border }}>
                        <td className="py-2 font-medium" style={{ color: TJ.text }}>{r.title}</td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{r.authors}</td>
                        <td className="py-2 capitalize" style={{ color: '#a8b8d8' }}>{r.type}</td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{r.year}</td>
                      </tr>
                    ))}
                    {(filteredOffer ? references.filter(r => r.offerId === filteredOffer.id) : references).length === 0 && (
                      <tr><td colSpan={4} className="py-4 text-center" style={{ color: '#a8b8d8' }}>Sin referencias</td></tr>
                    )}
                  </tbody>
                </table>
              )}
              {expandedCard === 'Usuarios' && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: TJ.border }}>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Nombre</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Email</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b cursor-pointer transition-colors hover:bg-gray-50" style={{ borderColor: TJ.border }} onClick={() => navigate('/users')}>
                        <td className="py-2 font-medium" style={{ color: TJ.text }}>{u.name}</td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{u.email}</td>
                        <td className="py-2 capitalize" style={{ color: '#a8b8d8' }}>{u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {expandedCard === 'Módulos' && filteredOffer && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: TJ.border }}>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Módulo</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Temas</th>
                      <th className="text-left py-2 font-semibold" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Editores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOffer.modules.map(mod => (
                      <tr key={mod.id} className="border-b transition-colors hover:bg-gray-50" style={{ borderColor: TJ.border }}>
                        <td className="py-2 font-medium" style={{ color: TJ.text }}>{mod.name}</td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{filteredTopics.filter(t => t.moduleId === mod.id).length}</td>
                        <td className="py-2" style={{ color: '#a8b8d8' }}>{mod.assignedEditors.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {expandedCard === 'Editores' && (
                <p className="text-sm" style={{ color: '#a8b8d8' }}>
                  {filteredOffer
                    ? `${[...new Set(filteredOffer.modules.flatMap(m => m.assignedEditors))].length} editores asignados a ${filteredOffer.name}`
                    : 'Selecciona una oferta para ver los editores asignados.'}
                </p>
              )}
              {expandedCard === '% Aprobado' && (
                <div className="space-y-2">
                  {(Object.entries(statusConfig) as [TopicStatus, typeof statusConfig[TopicStatus]][]).map(([key, cfg]) => {
                    const StatusIcon = cfg.icon;
                    const count = topicsByStatus[key];
                    return (
                      <div key={key} className="flex items-center gap-3 py-1">
                        <StatusIcon size={14} style={{ color: cfg.color }} />
                        <span className="text-sm" style={{ color: TJ.text }}>{cfg.label}</span>
                        <span className="ml-auto text-sm font-bold" style={{ color: cfg.color, fontFamily: 'Montserrat, sans-serif' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Charts Section --- */}
        <div className="mb-6">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
            <BarChart3 size={18} /> Gráficas
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <StatusDistributionChart topics={filteredTopics} />
            <OfferProgressChart offers={offers} topics={visibleTopics} />
          </div>
          <ActivityChart topics={visibleTopics} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Status bars */}
          <div className="bg-white rounded-xl p-5 border card-hover" style={{ borderColor: TJ.border }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Estado de Temas</h3>
              {activeTab !== 'general' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(27,75,133,0.08)', color: TJ.primary }}>
                  {filteredOffer?.name}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {(Object.entries(statusConfig) as [TopicStatus, typeof statusConfig[TopicStatus]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const count = topicsByStatus[key];
                const total = filteredTopics.length || 1;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon size={13} style={{ color: cfg.color }} />
                        <span className="text-sm" style={{ color: TJ.text }}>{cfg.label}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: cfg.color, fontFamily: 'Montserrat, sans-serif' }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f0ece6' }}>
                      <div className="h-1.5 rounded-full transition-all duration-500" style={{ background: cfg.color, width: `${(count / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent topics / offer details */}
          {activeTab === 'general' ? (
            <div className="bg-white rounded-xl p-5 border card-hover" style={{ borderColor: TJ.border }}>
              <h3 className="font-bold text-sm mb-4" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Temas Recientes</h3>
              <div className="space-y-2">
                {filteredTopics.slice(0, 5).map(topic => (
                  <div key={topic.id} onClick={() => navigate(`/editor/${topic.id}`)}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{topic.title}</div>
                      <div className="text-xs" style={{ color: '#a8b8d8' }}>{topic.offerName || 'Sin oferta'} · {topic.author.split(' ').slice(0,2).join(' ')}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${
                      topic.status === 'aprobado' ? 'bg-green-50 text-green-700' :
                      topic.status === 'en_revision' ? 'bg-yellow-50 text-yellow-700' :
                      topic.status === 'devuelto' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                    }`}>{statusConfig[topic.status].label}</span>
                  </div>
                ))}
                {filteredTopics.length === 0 && <p className="text-sm" style={{ color: '#a8b8d8' }}>No hay temas</p>}
              </div>
            </div>
          ) : (
            /* Per-offer detail panel */
            <div className="space-y-4">
              {/* Offer info card */}
              {filteredOffer && (
                <div className="bg-white rounded-xl p-5 border card-hover" style={{ borderColor: TJ.border }}>
                  <h3 className="font-bold text-sm mb-3" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>Información de la Oferta</h3>
                  <dl className="space-y-1.5">
                    {[
                      ['Modalidad', filteredOffer.modality],
                      ['Duración', filteredOffer.duration],
                      ['Edición', filteredOffer.edition],
                      ['Autor(es)', filteredOffer.authors],
                      ['Público', filteredOffer.audience],
                    ].filter(([_, v]) => v).map(([label, value]) => (
                      <div key={label as string} className="flex gap-2">
                        <dt className="text-xs font-semibold flex-shrink-0" style={{ color: '#a8b8d8', fontFamily: 'Montserrat, sans-serif', width: 72 }}>{label}</dt>
                        <dd className="text-xs" style={{ color: TJ.text }}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {/* Modules */}
              {filteredOffer && filteredOffer.modules.length > 0 && (
                <div className="bg-white rounded-xl p-5 border card-hover" style={{ borderColor: TJ.border }}>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                    <TrendingUp size={14} /> Módulos
                  </h3>
                  <div className="space-y-2">
                    {filteredOffer.modules.map(mod => {
                      const modTopics = filteredTopics.filter(t => t.moduleId === mod.id);
                      const modApproved = modTopics.filter(t => t.status === 'aprobado').length;
                      const pct = modTopics.length > 0 ? Math.round((modApproved / modTopics.length) * 100) : 0;
                      return (
                        <div key={mod.id} className="p-3 rounded-lg" style={{ background: TJ.bg }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>{mod.name}</span>
                            <span className="text-xs" style={{ color: '#a8b8d8' }}>{modTopics.length} temas · {pct}% aprobado</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#e8e4de' }}>
                            <div className="h-1 rounded-full transition-all" style={{ background: pct >= 70 ? '#276749' : TJ.primary, width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
