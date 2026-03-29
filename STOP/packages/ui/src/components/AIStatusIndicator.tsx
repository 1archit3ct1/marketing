'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type AIStatus = 'idle' | 'processing' | 'success' | 'error';

export interface AIStatusIndicatorProps {
  status: AIStatus;
  label?: string;
  message?: string;
  className?: string;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  status,
  label,
  message,
  className,
}) => {
  const statusConfig = {
    idle: {
      icon: (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'text-gray-400',
      bg: 'bg-gray-800'
    },
    processing: {
      icon: (
        <svg className="w-5 h-5 text-accent-purple animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ),
      color: 'text-accent-purple',
      bg: 'bg-accent-purple/10'
    },
    success: {
      icon: (
        <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      color: 'text-accent-green',
      bg: 'bg-accent-green/10'
    },
    error: {
      icon: (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    }
  };
  
  const config = statusConfig[status];
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('p-2 rounded-lg', config.bg)}>
        {config.icon}
      </div>
      {(label || message) && (
        <div>
          {label && (
            <p className={cn('text-sm font-medium', config.color)}>
              {label}
            </p>
          )}
          {message && (
            <p className="text-xs text-gray-400">{message}</p>
          )}
        </div>
      )}
    </div>
  );
};

export interface AIProcessingBarProps {
  progress: number;
  stage: string;
  eta?: string;
  className?: string;
}

export const AIProcessingBar: React.FC<AIProcessingBarProps> = ({
  progress,
  stage,
  eta,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{stage}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
          {eta && (
            <span className="text-xs text-gray-500">ETA: {eta}</span>
          )}
        </div>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-purple to-purple-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
