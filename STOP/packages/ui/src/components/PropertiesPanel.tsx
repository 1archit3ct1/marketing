'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface PropertiesPanelProps {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  title,
  children,
  isOpen = true,
  onClose,
  className,
}) => {
  if (!isOpen) return null;
  
  return (
    <div className={cn('w-80 bg-panel border-l border-border flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
};

export interface PropertyGroupProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const PropertyGroup: React.FC<PropertyGroupProps> = ({
  label,
  children,
  defaultOpen = true,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  return (
    <div className={cn('mb-4', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full py-2 text-xs font-semibold text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
      >
        <svg
          className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {label}
      </button>
      {isOpen && (
        <div className="mt-2 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

export interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const PropertyRow: React.FC<PropertyRowProps> = ({
  label,
  children,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <label className="text-sm text-gray-400 flex-shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
};
