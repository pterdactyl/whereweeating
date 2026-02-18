import React from 'react';

export type AlertType = 'error' | 'warning' | 'info' | 'success';

interface AlertProps {
  type: AlertType;
  message: string;
  onClose?: () => void;
  className?: string;
}

/**
 * Reusable Alert component for inline error/warning/info messages
 * Best for: Form errors, validation messages, duplicate warnings that need to stay visible
 */
export default function Alert({ type, message, onClose, className = '' }: AlertProps) {
  const styles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-400',
      text: 'text-red-600',
      icon: '⚠️',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-400',
      text: 'text-yellow-800',
      icon: '⚠️',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-400',
      text: 'text-blue-600',
      icon: 'ℹ️',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-400',
      text: 'text-green-600',
      icon: '✓',
    },
  };

  const style = styles[type];

  return (
    <div
      role="alert"
      className={`border ${style.border} ${style.bg} ${style.text} px-3 py-2 rounded text-sm flex items-center justify-between ${className}`}
    >
      <span className="flex items-center gap-2">
        <span>{style.icon}</span>
        <span>{message}</span>
      </span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-gray-500 hover:text-gray-700"
          aria-label="Close alert"
        >
          ×
        </button>
      )}
    </div>
  );
}
