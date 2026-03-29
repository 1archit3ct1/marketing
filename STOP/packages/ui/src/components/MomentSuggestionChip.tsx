'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type SuggestionType = 'cut' | 'trim' | 'caption' | 'beat' | 'cta' | 'hook' | 'transition' | 'color' | 'audio';

export interface MomentSuggestionChipProps {
  type: SuggestionType;
  message: string;
  onApply: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const MomentSuggestionChip: React.FC<MomentSuggestionChipProps> = ({
  type,
  message,
  onApply,
  onDismiss,
  className,
}) => {
  const typeConfig = {
    cut: { icon: '✂️', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Cut' },
    trim: { icon: '📏', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Trim' },
    caption: { icon: '📝', color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Caption' },
    beat: { icon: '🎵', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', label: 'Beat Sync' },
    cta: { icon: '📣', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'CTA' },
    hook: { icon: '🪝', color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Hook' },
    transition: { icon: '✨', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', label: 'Transition' },
    color: { icon: '🎨', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', label: 'Color' },
    audio: { icon: '🔊', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Audio' }
  };
  
  const config = typeConfig[type];
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all duration-200 hover:scale-105',
        config.color,
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{message}</span>
      <button
        onClick={onApply}
        className="ml-1 px-2 py-0.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
      >
        Apply
      </button>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-0.5 hover:bg-white/10 rounded transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export interface MomentSuggestionListProps {
  suggestions: Array<{
    id: string;
    type: SuggestionType;
    message: string;
  }>;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
  className?: string;
}

export const MomentSuggestionList: React.FC<MomentSuggestionListProps> = ({
  suggestions,
  onApply,
  onDismiss,
  className,
}) => {
  if (suggestions.length === 0) {
    return (
      <div className={cn('text-center py-4 text-gray-500 text-sm', className)}>
        <p>No suggestions at this moment</p>
      </div>
    );
  }
  
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {suggestions.map((suggestion) => (
        <MomentSuggestionChip
          key={suggestion.id}
          type={suggestion.type}
          message={suggestion.message}
          onApply={() => onApply(suggestion.id)}
          onDismiss={() => onDismiss(suggestion.id)}
        />
      ))}
    </div>
  );
};
