import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import Alert, { AlertType } from './Alert';

interface Toast {
  id: string;
  type: AlertType;
  message: string;
}

interface ToastContextType {
  showToast: (type: AlertType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Toast Provider - wraps your app to enable toast notifications
 * 
 * Usage:
 * 1. Wrap your app with <ToastProvider>
 * 2. Use const { showToast } = useToast() in components
 * 3. Call showToast('warning', 'No restaurants match your filters')
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: AlertType, message: string, duration: number = 4000) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, type, message };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container - fixed position at top-right */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="animate-slide-in-right"
            style={{
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            <Alert
              type={toast.type}
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
