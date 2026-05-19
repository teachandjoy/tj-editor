import { useState, useRef } from 'react';
import Header from '../components/layout/Header';
import { useApp } from '../store/context';
import { Download, Upload, Database, Clock, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { hasPermission } from '../utils/permissions';

const TJ = { primary: '#1b4b85', secondary: '#8b2f3a', gold: '#c5aa6f', border: '#e8e4de', text: '#2a2a32' };

export default function SettingsPage() {
  const { currentUser } = useApp();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [restoreMsg, setRestoreMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;
  const canEditSettings = hasPermission(currentUser, 'configuracion', 'editar');

  const handleBackup = async () => {
    setBackupStatus('loading');
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error('Error al descargar respaldo');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-tj-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setLastBackup(new Date().toLocaleString('es-MX'));
      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 3000);
    } catch {
      setBackupStatus('error');
      setTimeout(() => setBackupStatus('idle'), 3000);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreStatus('loading');
    setRestoreMsg('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al restaurar' }));
        throw new Error(err.error || 'Error al restaurar');
      }
      setRestoreStatus('success');
      setRestoreMsg('Respaldo restaurado correctamente. La pagina se recargara en 2 segundos...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setRestoreStatus('error');
      setRestoreMsg(err instanceof Error ? err.message : 'Error al restaurar el respaldo');
      setTimeout(() => setRestoreStatus('idle'), 5000);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="page-enter">
      <Header title="Configuracion" />
      <div className="p-6 max-w-2xl">
        {/* Backup Section */}
        <div className="bg-white rounded-xl p-6 border mb-5" style={{ borderColor: TJ.border }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(27,75,133,0.08)' }}>
              <Database size={20} style={{ color: TJ.primary }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
                Respaldo y Recuperacion
              </h2>
              <p className="text-xs" style={{ color: '#a8b8d8' }}>
                Gestiona los respaldos de la base de datos
              </p>
            </div>
          </div>

          {/* Last backup */}
          {lastBackup && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(39,103,73,0.06)' }}>
              <Clock size={14} style={{ color: '#276749' }} />
              <span className="text-xs" style={{ color: '#276749' }}>Ultimo respaldo: {lastBackup}</span>
            </div>
          )}

          {/* Download backup */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleBackup} disabled={backupStatus === 'loading'}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors"
              style={{ background: backupStatus === 'loading' ? '#a8b8d8' : TJ.primary, fontFamily: 'Montserrat, sans-serif', cursor: backupStatus === 'loading' ? 'wait' : 'pointer' }}
              onMouseEnter={e => { if (backupStatus !== 'loading') e.currentTarget.style.background = TJ.secondary; }}
              onMouseLeave={e => { if (backupStatus !== 'loading') e.currentTarget.style.background = TJ.primary; }}>
              {backupStatus === 'loading' ? <Loader2 size={15} className="animate-spin" /> : backupStatus === 'success' ? <Check size={15} /> : <Download size={15} />}
              {backupStatus === 'loading' ? 'Descargando...' : backupStatus === 'success' ? 'Descargado' : 'Descargar respaldo'}
            </button>

            {canEditSettings && (
              <label className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: 'rgba(197,170,111,0.15)', color: '#8b6914', fontFamily: 'Montserrat, sans-serif', border: `1px solid ${TJ.gold}` }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(197,170,111,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(197,170,111,0.15)'; }}>
                {restoreStatus === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {restoreStatus === 'loading' ? 'Restaurando...' : 'Restaurar respaldo'}
                <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleRestore} disabled={restoreStatus === 'loading'} />
              </label>
            )}
          </div>

          {/* Status messages */}
          {restoreMsg && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{
              background: restoreStatus === 'success' ? 'rgba(39,103,73,0.06)' : 'rgba(197,48,48,0.06)',
              color: restoreStatus === 'success' ? '#276749' : '#c53030',
            }}>
              {restoreStatus === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
              {restoreMsg}
            </div>
          )}

          {backupStatus === 'error' && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(197,48,48,0.06)', color: '#c53030' }}>
              <AlertTriangle size={14} /> Error al descargar el respaldo
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: TJ.border }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: TJ.primary, fontFamily: 'Montserrat, sans-serif' }}>
            Informacion del sistema
          </h3>
          <dl className="space-y-2">
            {[
              ['Base de datos', 'SQLite (server/data/app.db)'],
              ['Autoguardado', 'Activo (2s de inactividad)'],
              ['Reintentos', '3 con backoff exponencial'],
              ['Heartbeat', 'Cada 30 segundos'],
              ['Sesion', 'Persistente (7 dias)'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <dt className="text-xs font-semibold flex-shrink-0" style={{ color: '#a8b8d8', fontFamily: 'Montserrat, sans-serif', width: 100 }}>{label}</dt>
                <dd className="text-xs" style={{ color: TJ.text }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
