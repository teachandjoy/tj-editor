import { WifiOff } from 'lucide-react';

export default function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  if (isOnline) return null;
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#8b2f3a', color: '#fff', padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <WifiOff size={16} />
      Sin conexión a internet — Los cambios se guardarán localmente y se sincronizarán al reconectarse.
    </div>
  );
}
