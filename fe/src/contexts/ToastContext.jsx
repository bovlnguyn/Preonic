import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((message, type = 'info') => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const toast = {
    success: (msg) => push(msg, 'success'),
    error:   (msg) => push(msg, 'error'),
    warning: (msg) => push(msg, 'warning'),
    info:    (msg) => push(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={styles.wrap}>
        {toasts.map(t => (
          <div key={t.id} style={{ ...styles.toast, ...styles[t.type] }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const styles = {
  wrap: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  toast: {
    padding: '12px 18px',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    minWidth: 220,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    animation: 'toast-in 0.25s ease',
  },
  success: { background: '#16a34a' },
  error:   { background: '#dc2626' },
  warning: { background: '#d97706' },
  info:    { background: '#2563eb' },
};

export default ToastContext;