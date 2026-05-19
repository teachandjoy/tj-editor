import { useState, useEffect, useCallback } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { apiGet } from '../lib/api';
import { Shield, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditLogEntry } from '../types';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', gold: '#c5aa6f', border: '#e8e4de', text: '#2a2a32' };

const ACTION_LABELS: Record<string, string> = {
  'login.success': 'Inicio de sesión',
  'login.failed': 'Intento fallido',
  'logout': 'Cierre de sesión',
  'user.create': 'Usuario creado',
  'user.update': 'Usuario actualizado',
  'user.delete': 'Usuario eliminado',
  'topic.create': 'Tema creado',
  'topic.update': 'Tema actualizado',
  'topic.delete': 'Tema eliminado',
  'offer.create': 'Oferta creada',
  'offer.delete': 'Oferta eliminada',
  'permission.update': 'Permisos actualizados',
};

export default function AuditLogPage() {
  const { currentUser } = useApp();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [search, setSearch] = useState('');
  const limit = 25;

  const loadEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (filterAction) params.set('action', filterAction);
      const data = await apiGet<{ entries: AuditLogEntry[]; total: number }>(`/audit-log?${params}`);
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err) {
      console.error('[AuditLog] Error loading:', err);
    }
  }, [page, filterAction]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="page-enter">
        <Header title="Auditoría" />
        <div className="p-6 text-center" style={{ color: '#a8b8d8' }}>
          Solo los administradores pueden ver el log de auditoría.
        </div>
      </div>
    );
  }

  const filtered = search
    ? entries.filter(e =>
        e.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.action?.toLowerCase().includes(search.toLowerCase()) ||
        e.target_type?.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const totalPages = Math.ceil(total / limit);

  const handleExportCSV = () => {
    window.open('/api/audit-log/export', '_blank');
  };

  return (
    <div className="page-enter">
      <Header title="Auditoría de Acciones" actions={
        <button onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white font-semibold transition-colors"
          style={{ background: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}
          onMouseEnter={e => (e.currentTarget.style.background = TJ.secondary)}
          onMouseLeave={e => (e.currentTarget.style.background = TJ.primary)}>
          <Download size={15} /> Exportar CSV
        </button>
      } />

      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#a8b8d8' }} />
            <input
              type="text" placeholder="Buscar por usuario, acción..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{ borderColor: TJ.border }}
            />
          </div>
          <select
            value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0); }}
            className="px-3 py-2 text-sm rounded-lg border focus:outline-none"
            style={{ borderColor: TJ.border }}
          >
            <option value="">Todas las acciones</option>
            <option value="login">Inicios de sesión</option>
            <option value="user">Usuarios</option>
            <option value="topic">Temas</option>
            <option value="permission">Permisos</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: TJ.border }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#f8f7f5' }}>
                  <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Usuario</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Acción</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>Detalles</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs" style={{ color: TJ.text, fontFamily: 'Montserrat, sans-serif' }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.id} className="border-t hover:bg-gray-50" style={{ borderColor: TJ.border }}>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#a8b8d8' }}>
                      {new Date(entry.created_at).toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: TJ.text }}>
                      {entry.user_name || entry.user_id}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        background: entry.action.includes('delete') ? 'rgba(197,48,48,0.1)' :
                                   entry.action.includes('failed') ? 'rgba(139,47,58,0.1)' :
                                   entry.action.includes('create') ? 'rgba(39,103,73,0.1)' : 'rgba(27,75,133,0.08)',
                        color: entry.action.includes('delete') ? '#c53030' :
                               entry.action.includes('failed') ? '#8b2f3a' :
                               entry.action.includes('create') ? '#276749' : TJ.primary,
                      }}>
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#a8b8d8' }}>
                      {entry.target_type || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#a8b8d8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.details && typeof entry.details === 'object' ? JSON.stringify(entry.details) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#a8b8d8' }}>
                      {entry.ip_address || '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-sm" style={{ color: '#d4cfc8' }}>
                      <Shield size={24} className="mx-auto mb-2" />
                      No hay registros de auditoría
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: TJ.border }}>
              <span className="text-xs" style={{ color: '#a8b8d8' }}>
                Página {page + 1} de {totalPages} ({total} registros)
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30" style={{ borderColor: TJ.border }}>
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-30" style={{ borderColor: TJ.border }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
