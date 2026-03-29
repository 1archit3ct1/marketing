'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className,
}) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  const variantStyles = {
    default: 'text-gray-400',
    accent: 'text-accent-purple'
  };
  
  return (
    <svg
      className={cn('animate-spin', sizeStyles[size], variantStyles[variant], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  variant?: 'overlay' | 'inline';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  variant = 'overlay',
}) => {
  if (!isLoading) return null;
  
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-3',
        variant === 'overlay' 
          ? 'absolute inset-0 bg-black/60 backdrop-blur-sm z-50' 
          : 'py-8'
      )}
    >
      <Spinner size="lg" variant="accent" />
      {message && (
        <p className="text-white font-medium">{message}</p>
      )}
    </div>
  );
};
