'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}) => {
  const sizeStyles = {
    sm: 'w-9 h-5',
    md: 'w-11 h-6',
    lg: 'w-14 h-7'
  };
  
  const thumbSizes = {
    sm: 'w-4 h-4 -translate-x-4',
    md: 'w-5 h-5 -translate-x-5',
    lg: 'w-6 h-6 -translate-x-7'
  };
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2 focus:ring-offset-background',
          sizeStyles[size],
          checked ? 'bg-accent-purple' : 'bg-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'inline-block bg-white rounded-full transform transition-transform duration-200',
            checked ? thumbSizes[size] : 'w-4 h-4 translate-x-0.5',
            size === 'sm' && checked && '-translate-x-4',
            size === 'md' && checked && '-translate-x-5',
            size === 'lg' && checked && '-translate-x-7'
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <span className={cn('text-sm font-medium', disabled ? 'text-gray-500' : 'text-white')}>
              {label}
            </span>
          )}
          {description && (
            <p className={cn('text-xs', disabled ? 'text-gray-600' : 'text-gray-400')}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
