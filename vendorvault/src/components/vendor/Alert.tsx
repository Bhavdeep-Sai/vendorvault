'use client';

import React from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface AlertProps {
  type: 'warning' | 'success' | 'info' | 'error';
  title: string;
  message?: string;
  actions?: React.ReactNode;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({ type, title, message, actions, className = '' }) => {
  const alertConfig = {
    warning: {
      bgClass: 'bg-yellow-50 border-yellow-200',
      textClass: 'text-yellow-900',
      iconClass: 'text-yellow-600',
      icon: ExclamationTriangleIcon,
    },
    success: {
      bgClass: 'bg-green-50 border-green-200',
      textClass: 'text-green-900',
      iconClass: 'text-green-600',
      icon: CheckCircleIcon,
    },
    info: {
      bgClass: 'bg-blue-50 border-blue-200',
      textClass: 'text-blue-900',
      iconClass: 'text-blue-600',
      icon: InformationCircleIcon,
    },
    error: {
      bgClass: 'bg-red-50 border-red-200',
      textClass: 'text-red-900',
      iconClass: 'text-red-600',
      icon: ExclamationTriangleIcon,
    },
  };

  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${config.bgClass} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconClass}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.textClass}`}>
            {title}
          </h3>
          {message && (
            <p className={`mt-2 text-sm ${config.textClass.replace('900', '700')}`}>
              {message}
            </p>
          )}
          {actions && (
            <div className="mt-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alert;

