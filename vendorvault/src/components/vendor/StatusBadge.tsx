'use client';

import React from 'react';
import { CheckIcon, ClockIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    
    switch (normalizedStatus) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'LICENSED':
      case 'VERIFIED':
        return {
          color: 'green',
          bgClass: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckIcon className="w-4 h-4" />,
          label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        };
      case 'PENDING':
      case 'SUBMITTED':
      case 'IN_REVIEW':
      case 'UNDER_REVIEW':
        return {
          color: 'yellow',
          bgClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <ClockIcon className="w-4 h-4" />,
          label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        };
      case 'REJECTED':
      case 'EXPIRED':
      case 'TERMINATED':
      case 'FAILED':
        return {
          color: 'red',
          bgClass: 'bg-red-100 text-red-800 border-red-200',
          icon: <XMarkIcon className="w-4 h-4" />,
          label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        };
      case 'DRAFT':
      case 'INCOMPLETE':
        return {
          color: 'gray',
          bgClass: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <ExclamationTriangleIcon className="w-4 h-4" />,
          label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        };
      case 'NEGOTIATION':
      case 'IN_PROGRESS':
        return {
          color: 'blue',
          bgClass: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <ClockIcon className="w-4 h-4" />,
          label: 'In Negotiation'
        };
      default:
        return {
          color: 'gray',
          bgClass: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <ExclamationTriangleIcon className="w-4 h-4" />,
          label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        };
    }
  };

  const config = getStatusConfig(status);
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full border font-medium
      ${config.bgClass} ${sizeClasses[size]}
    `}>
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};

export default StatusBadge;

