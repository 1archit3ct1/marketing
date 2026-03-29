'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type VibeType = 'hype' | 'chill' | 'professional' | 'funny' | 'emotional';

export interface VibeTileProps {
  vibe: VibeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
}

export const VibeTile: React.FC<VibeTileProps> = ({
  vibe,
  label,
  icon,
  color,
  isSelected,
  onSelect,
  className,
}) => {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-200',
        isSelected
          ? 'border-white bg-white/10 scale-105'
          : 'border-border bg-panel hover:border-gray-600 hover:bg-panel/80',
        className
      )}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ backgroundColor: color + '20', color }}
      >
        {icon}
      </div>
      <span className={cn(
        'text-sm font-medium',
        isSelected ? 'text-white' : 'text-gray-400'
      )}>
        {label}
      </span>
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-accent-purple rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
};

export interface VibePickerProps {
  selectedVibe?: VibeType;
  onSelect: (vibe: VibeType) => void;
  className?: string;
}

export const VibePicker: React.FC<VibePickerProps> = ({
  selectedVibe,
  onSelect,
  className,
}) => {
  const vibes: Array<{ type: VibeType; label: string; icon: string; color: string }> = [
    { type: 'hype', label: 'Hype', icon: '⚡', color: '#f5820a' },
    { type: 'chill', label: 'Chill', icon: '🌊', color: '#00e5a0' },
    { type: 'professional', label: 'Professional', icon: '💼', color: '#7c5cfc' },
    { type: 'funny', label: 'Funny', icon: '😂', color: '#ff6b6b' },
    { type: 'emotional', label: 'Emotional', icon: '❤️', color: '#ec4899' }
  ];
  
  return (
    <div className={cn('grid grid-cols-5 gap-4', className)}>
      {vibes.map((vibe) => (
        <VibeTile
          key={vibe.type}
          vibe={vibe.type}
          label={vibe.label}
          icon={vibe.icon}
          color={vibe.color}
          isSelected={selectedVibe === vibe.type}
          onSelect={() => onSelect(vibe.type)}
        />
      ))}
    </div>
  );
};
