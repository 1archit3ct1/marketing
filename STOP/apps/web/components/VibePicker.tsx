'use client';

/**
 * AURA Vibe Picker Component
 * 5 mood tiles for selecting the creative vibe
 */

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
  icon: string;
  description: string;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
}

export const VibeTile: React.FC<VibeTileProps> = ({
  vibe,
  label,
  icon,
  description,
  color,
  isSelected,
  onSelect,
  className,
}) => {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 hover:scale-105',
        isSelected
          ? 'border-white bg-white/10 shadow-lg shadow-white/10'
          : 'border-border bg-panel hover:border-gray-600 hover:bg-panel/80',
        className
      )}
    >
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-lg"
        style={{ 
          backgroundColor: `${color}20`,
          color,
          boxShadow: `0 4px 20px ${color}40`
        }}
      >
        {icon}
      </div>
      
      {/* Label */}
      <span className={cn(
        'text-sm font-semibold',
        isSelected ? 'text-white' : 'text-gray-400'
      )}>
        {label}
      </span>
      
      {/* Description */}
      <span className="text-xs text-gray-500 text-center line-clamp-2">
        {description}
      </span>
      
      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-accent-purple rounded-full flex items-center justify-center shadow-lg">
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
  const vibes: Array<{ 
    type: VibeType; 
    label: string; 
    icon: string; 
    description: string;
    color: string 
  }> = [
    { 
      type: 'hype', 
      label: 'Hype', 
      icon: '⚡', 
      description: 'High energy, fast cuts, trending sounds, bold transitions',
      color: '#f5820a' // Orange
    },
    { 
      type: 'chill', 
      label: 'Chill', 
      icon: '🌊', 
      description: 'Relaxed pacing, smooth transitions, lo-fi vibes',
      color: '#00e5a0' // Green
    },
    { 
      type: 'professional', 
      label: 'Professional', 
      icon: '💼', 
      description: 'Clean edits, corporate style, polished look',
      color: '#7c5cfc' // Purple
    },
    { 
      type: 'funny', 
      label: 'Funny', 
      icon: '😂', 
      description: 'Comedy timing, meme effects, playful energy',
      color: '#ff6b6b' // Red
    },
    { 
      type: 'emotional', 
      label: 'Emotional', 
      icon: '❤️', 
      description: 'Storytelling focus, cinematic moments, heartfelt',
      color: '#ec4899' // Pink
    }
  ];
  
  return (
    <div className={cn('grid grid-cols-5 gap-3', className)}>
      {vibes.map((vibe) => (
        <VibeTile
          key={vibe.type}
          vibe={vibe.type}
          label={vibe.label}
          icon={vibe.icon}
          description={vibe.description}
          color={vibe.color}
          isSelected={selectedVibe === vibe.type}
          onSelect={() => onSelect(vibe.type)}
        />
      ))}
    </div>
  );
};

export default VibePicker;
