'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  tooltip?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'default', size = 'md', icon, tooltip, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantStyles = {
      default: 'bg-panel text-white border border-border hover:bg-gray-800 focus:ring-gray-500',
      ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10 focus:ring-white',
      accent: 'bg-accent-purple text-white hover:opacity-90 focus:ring-accent-purple',
      danger: 'bg-red-600/20 text-red-500 hover:bg-red-600/30 focus:ring-red-500'
    };
    
    const sizeStyles = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-3'
    };
    
    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };
    
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        title={tooltip}
        {...props}
      >
        <span className={cn(iconSizes[size])}>{icon}</span>
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
