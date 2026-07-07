// Simple event bus for toast notifications from non-React code (store, api layer)
type ToastType = 'error' | 'success' | 'warning';
type ToastListener = (message: string, type: ToastType) => void;

const listeners: Set<ToastListener> = new Set();

export function onToast(listener: ToastListener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emitToast(message: string, type: ToastType = 'error') {
  listeners.forEach(fn => fn(message, type));
}
