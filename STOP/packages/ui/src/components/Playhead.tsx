'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface PlayheadProps {
  position: number; // 0-100 percentage
  isPlaying?: boolean;
  onPositionChange?: (position: number) => void;
  className?: string;
}

export const Playhead: React.FC<PlayheadProps> = ({
  position,
  isPlaying,
  onPositionChange,
  className,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onPositionChange) return;
    setIsDragging(true);
    updatePosition(e);
  };
  
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !onPositionChange) return;
    updatePosition(e);
  }, [isDragging, onPositionChange]);
  
  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);
  
  const updatePosition = (e: MouseEvent) => {
    if (!containerRef.current || !onPositionChange) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    onPositionChange(percentage);
  };
  
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  return (
    <div
      ref={containerRef}
      className={cn('relative h-full w-full', className)}
      onMouseDown={handleMouseDown}
    >
      {/* Playhead Line */}
      <div
        className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-20"
        style={{ left: `${position}%` }}
      >
        {/* Playhead Handle */}
        <div className="absolute -top-1 -translate-x-1/2">
          <div className={cn(
            'w-3 h-3 bg-red-500 rotate-45 transform',
            isPlaying && 'animate-pulse'
          )} />
        </div>
      </div>
      
      {/* Click Target Area */}
      <div
        className="absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-ew-resize hover:bg-red-500/10 z-30"
        style={{ left: `${position}%` }}
      />
    </div>
  );
};

export interface TimecodeRulerProps {
  duration: number; // in seconds
  zoom: number;
  className?: string;
}

export const TimecodeRuler: React.FC<TimecodeRulerProps> = ({
  duration,
  zoom,
  className,
}) => {
  const majorInterval = duration / 10;
  const minorInterval = majorInterval / 5;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={cn('relative h-6 bg-panel border-b border-border', className)}>
      {/* Major Intervals */}
      {[...Array(11)].map((_, i) => {
        const time = i * majorInterval;
        return (
          <div
            key={i}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${i * 10}%` }}
          >
            <div className="h-3 w-px bg-gray-500" />
            <span className="text-xs text-gray-400 font-mono mt-0.5">
              {formatTime(time)}
            </span>
          </div>
        );
      })}
      
      {/* Minor Intervals */}
      {[...Array(50)].map((_, i) => {
        const time = i * minorInterval;
        if (i % 5 === 0) return null; // Skip major intervals
        return (
          <div
            key={i}
            className="absolute bottom-0"
            style={{ left: `${i * 2}%` }}
          >
            <div className="h-2 w-px bg-gray-600" />
          </div>
        );
      })}
    </div>
  );
};
