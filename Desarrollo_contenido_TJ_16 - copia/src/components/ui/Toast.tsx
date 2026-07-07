import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { AlertCircle, CheckCircle, X, WifiOff } from 'lucide-react';
import { onToast } from '../../lib/toast-bus';

type ToastType = 'error' | 'success' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// Standalone toast container for use without provider pattern
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    return onToast((message, type) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts(prev => {
        const recent = prev.find(t => t.message === message && Date.now() - t.timestamp < 3000);
        if (recent) return prev;
        return [...prev, { id, message, type, timestamp: Date.now() }];
      });
    });
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      setToasts(prev => prev.filter(t => Date.now() - t.timestamp < 5000));
    }, 1000);
    return () => clearInterval(timer);
  }, [toasts.length]);

  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-2 p-3 rounded-lg shadow-lg border text-sm animate-slide-in ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-green-50 border-green-200 text-green-800'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> :
           toast.type === 'warning' ? <WifiOff size={16} className="flex-shrink-0 mt-0.5" /> :
           <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => dismiss(toast.id)} className="flex-shrink-0 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => {
      // Deduplicate identical messages within 3s
      const recent = prev.find(t => t.message === message && Date.now() - t.timestamp < 3000);
      if (recent) return prev;
      return [...prev, { id, message, type, timestamp: Date.now() }];
    });
  }, []);

  // Bridge toast-bus events from non-React code (store, api)
  useEffect(() => {
    return onToast((message, type) => showToast(message, type));
  }, [showToast]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Auto-dismiss after 5s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      setToasts(prev => prev.filter(t => Date.now() - t.timestamp < 5000));
    }, 1000);
    return () => clearInterval(timer);
  }, [toasts.length]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-2 p-3 rounded-lg shadow-lg border text-sm animate-slide-in ${
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-green-50 border-green-200 text-green-800'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> :
             toast.type === 'warning' ? <WifiOff size={16} className="flex-shrink-0 mt-0.5" /> :
             <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} className="flex-shrink-0 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
