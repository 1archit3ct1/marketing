'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface PanelProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
}) => {
  const baseStyles = 'bg-panel rounded-xl';
  
  const variantStyles = {
    default: 'border border-border',
    elevated: 'shadow-lg shadow-black/50',
    bordered: 'border-2 border-border'
  };
  
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };
  
  return (
    <div className={cn(baseStyles, variantStyles[variant], paddingStyles[padding], className)}>
      {children}
    </div>
  );
};

export interface PanelHeaderProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  children,
  actions,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-b border-border', className)}>
      {children}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export interface PanelBodyProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export const PanelBody: React.FC<PanelBodyProps> = ({
  children,
  className,
  scrollable = false,
}) => {
  return (
    <div className={cn('px-4 py-4', scrollable && 'overflow-y-auto max-h-[calc(100vh-200px)]', className)}>
      {children}
    </div>
  );
};

export interface PanelFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const PanelFooter: React.FC<PanelFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('px-4 py-3 border-t border-border bg-black/20', className)}>
      {children}
    </div>
  );
};
