import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  show: (message: string, type?: ToastItem['type']) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const showError = useCallback((message: string) => show(message, 'error'), [show]);
  const showSuccess = useCallback((message: string) => show(message, 'success'), [show]);

  return (
    <ToastContext.Provider value={{ show, showError, showSuccess }}>
      {children}
      <div style={{
        position: 'fixed',
        top: 22,
        right: 22,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {toasts.map(toast => (
          <ToastItemView key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItemView({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const color = toast.type === 'success' ? 'var(--accent-green)' : toast.type === 'error' ? '#8A4038' : 'var(--accent-blue)';
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i';

  return (
    <div className="glass-panel" style={{
      color: 'var(--text-primary)',
      padding: '12px 15px',
      borderRadius: 14,
      fontSize: 13,
      fontWeight: 650,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      minWidth: 220,
      maxWidth: 340,
    }}>
      <span style={{
        width: 22,
        height: 22,
        borderRadius: 8,
        background: color,
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: 12,
        fontWeight: 800,
      }}>
        {icon}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
