import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none items-center max-w-sm w-full px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-full text-sm font-medium shadow-xl border flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
              toast.type === 'error'
                ? 'bg-rose-950 text-rose-200 border-rose-800'
                : toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                : 'bg-neutral-900 text-white border-neutral-700'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
