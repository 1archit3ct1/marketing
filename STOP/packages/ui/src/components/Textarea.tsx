'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  resize?: 'none' | 'both' | 'vertical' | 'horizontal';
  rows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, resize = 'vertical', rows = 4, ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-2.5 bg-panel border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const resizeStyles = {
      none: 'resize-none',
      both: 'resize',
      vertical: 'resize-y',
      horizontal: 'resize-x'
    };
    
    const errorStyles = error ? 'border-red-500 focus:ring-red-500' : '';
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={cn(baseStyles, errorStyles, resizeStyles[resize], className)}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
