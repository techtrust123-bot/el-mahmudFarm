import React from 'react';
import Button from './Button';

/**
 * Alert/Toast component
 */
const Alert = ({ 
  type = 'info', 
  title = '', 
  message = '', 
  onClose = null,
  closeable = true 
}) => {
  const types = {
    success: {
      icon: '✓',
      bg: 'bg-green-50 dark:bg-green-900',
      border: 'border-green-200 dark:border-green-700',
      title: 'text-green-800 dark:text-green-200',
      text: 'text-green-700 dark:text-green-300',
      icon_color: 'text-green-600 dark:text-green-400',
    },
    error: {
      icon: '✕',
      bg: 'bg-red-50 dark:bg-red-900',
      border: 'border-red-200 dark:border-red-700',
      title: 'text-red-800 dark:text-red-200',
      text: 'text-red-700 dark:text-red-300',
      icon_color: 'text-red-600 dark:text-red-400',
    },
    warning: {
      icon: '!',
      bg: 'bg-yellow-50 dark:bg-yellow-900',
      border: 'border-yellow-200 dark:border-yellow-700',
      title: 'text-yellow-800 dark:text-yellow-200',
      text: 'text-yellow-700 dark:text-yellow-300',
      icon_color: 'text-yellow-600 dark:text-yellow-400',
    },
    info: {
      icon: 'i',
      bg: 'bg-blue-50 dark:bg-blue-900',
      border: 'border-blue-200 dark:border-blue-700',
      title: 'text-blue-800 dark:text-blue-200',
      text: 'text-blue-700 dark:text-blue-300',
      icon_color: 'text-blue-600 dark:text-blue-400',
    },
  };

  const style = types[type];

  return (
    <div className={`
      p-4 rounded-lg border-l-4 flex items-start gap-3
      ${style.bg} ${style.border}
    `}>
      <div className={`text-lg font-bold mt-0.5 ${style.icon_color}`}>
        {style.icon}
      </div>
      <div className="flex-1">
        {title && <h3 className={`font-semibold mb-1 ${style.title}`}>{title}</h3>}
        <p className={style.text}>{message}</p>
      </div>
      {closeable && onClose && (
        <button
          onClick={onClose}
          className={`text-xl font-bold ${style.icon_color} hover:opacity-70`}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Alert;
