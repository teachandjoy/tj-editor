import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
let addToastFn: ((msg: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  if (addToastFn) addToastFn(message, type);
}

const icons = { success: CheckCircle, error: AlertTriangle, info: Info };
const colors = {
  success: { bg: '#f0fff4', border: '#c6f6d5', text: '#276749' },
  error: { bg: '#fff5f5', border: '#fed7d7', text: '#c53030' },
  info: { bg: '#ebf8ff', border: '#bee3f8', text: '#2b6cb0' },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => { addToastFn = addToast; return () => { addToastFn = null; }; }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => {
        const Icon = icons[t.type];
        const c = colors[t.type];
        return (
          <div key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 280, maxWidth: 400,
              animation: 'slideIn .25s ease-out',
            }}>
            <Icon size={16} style={{ color: c.text, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: c.text, flex: 1, fontFamily: 'Open Sans, sans-serif' }}>{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: 2, flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}
