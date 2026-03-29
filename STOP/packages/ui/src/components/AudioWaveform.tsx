'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface AudioWaveformProps {
  data?: number[];
  className?: string;
  barWidth?: number;
  barGap?: number;
  height?: number;
  color?: string;
  playing?: boolean;
  progress?: number; // 0-100
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  data = [],
  className,
  barWidth = 3,
  barGap = 2,
  height = 60,
  color = '#7c5cfc',
  playing = false,
  progress = 0,
}) => {
  // Generate fake waveform data if none provided
  const waveform = data.length > 0 ? data : generateFakeWaveform(100);
  
  return (
    <div
      className={cn('flex items-center gap-[var(--bar-gap)]', className)}
      style={{ height: `${height}px`, '--bar-gap': `${barGap}px` } as React.CSSProperties}
    >
      {waveform.map((value, index) => {
        const barHeight = (value / 100) * height;
        const isPast = (index / waveform.length) * 100 < progress;
        
        return (
          <div
            key={index}
            className={cn(
              'rounded-full transition-all duration-150',
              playing && 'animate-pulse'
            )}
            style={{
              width: `${barWidth}px`,
              height: `${barHeight}px`,
              backgroundColor: isPast ? color : 'rgba(124, 92, 252, 0.5)',
              animationDelay: playing ? `${index * 50}ms` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

function generateFakeWaveform(count: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < count; i++) {
    // Generate a more natural-looking waveform
    const base = Math.sin(i * 0.1) * 30 + 50;
    const noise = Math.random() * 40;
    data.push(Math.min(100, Math.max(10, base + noise)));
  }
  return data;
}

export interface AudioVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  className,
}) => {
  return (
    <div className={cn('flex items-end gap-1 h-8', className)}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 bg-accent-purple rounded-full transition-all duration-300',
            isPlaying && 'animate-bounce'
          )}
          style={{
            height: isPlaying ? `${20 + Math.random() * 60}%` : '20%',
            animationDelay: `${i * 100}ms`,
            animationDuration: '600ms',
          }}
        />
      ))}
    </div>
  );
};
