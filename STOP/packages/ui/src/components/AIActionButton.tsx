'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Button, type ButtonProps } from './Button';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface AIActionButtonProps extends ButtonProps {
  isProcessing?: boolean;
  credits?: number;
}

export const AIActionButton: React.FC<AIActionButtonProps> = ({
  children,
  isProcessing,
  credits,
  className,
  ...props
}) => {
  return (
    <Button
      variant="accent"
      isLoading={isProcessing}
      className={cn('relative', className)}
      {...props}
    >
      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {children}
      {credits !== undefined && (
        <span className="ml-2 text-xs opacity-80">
          ({credits} credits)
        </span>
      )}
    </Button>
  );
};

export interface AIGenerateButtonProps {
  onClick: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  className?: string;
}

export const AIGenerateButton: React.FC<AIGenerateButtonProps> = ({
  onClick,
  isGenerating,
  disabled,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isGenerating}
      className={cn(
        'inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-purple to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        isGenerating && 'animate-pulse',
        className
      )}
    >
      {isGenerating ? (
        <>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Generate with AI
        </>
      )}
    </button>
  );
};
