'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface InspectorPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  title,
  children,
  className,
}) => {
  return (
    <div className={cn('w-72 bg-panel border-l border-border flex flex-col h-full', className)}>
      {title && (
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
};

export interface InspectorSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const InspectorSection: React.FC<InspectorSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = true,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  return (
    <div className={cn('mb-4 last:mb-0', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
      >
        {icon && <span className="text-gray-400">{icon}</span>}
        <svg
          className={cn('w-3 h-3 text-gray-400 transition-transform', isOpen && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium text-white">{title}</span>
      </button>
      {isOpen && (
        <div className="mt-2 px-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

export interface InspectorFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const InspectorField: React.FC<InspectorFieldProps> = ({
  label,
  children,
  className,
}) => {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
};
