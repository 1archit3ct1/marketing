'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'muted';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: 'bg-border',
    muted: 'bg-gray-700'
  };
  
  return (
    <div
      className={cn(
        orientation === 'horizontal' 
          ? 'w-full h-px' 
          : 'h-full w-px',
        variantStyles[variant],
        className
      )}
      role="separator"
    />
  );
};
