'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ClipBlockProps {
  id: string;
  label: string;
  thumbnail?: string;
  duration: string;
  start: number;
  end: number;
  isSelected?: boolean;
  isLocked?: boolean;
  color?: string;
  onSelect: (id: string) => void;
  onResize?: (id: string, delta: number, side: 'left' | 'right') => void;
  className?: string;
}

export const ClipBlock: React.FC<ClipBlockProps> = ({
  id,
  label,
  thumbnail,
  duration,
  start,
  end,
  isSelected,
  isLocked,
  color = '#7c5cfc',
  onSelect,
  onResize,
  className,
}) => {
  const [isResizing, setIsResizing] = React.useState<'left' | 'right' | null>(null);
  
  const handleMouseDown = (e: React.MouseEvent, side: 'left' | 'right') => {
    if (isLocked || !onResize) return;
    e.stopPropagation();
    setIsResizing(side);
  };
  
  return (
    <div
      className={cn(
        'absolute top-1 bottom-1 rounded-md overflow-hidden cursor-pointer transition-all duration-150 group',
        isSelected ? 'ring-2 ring-white z-10' : 'hover:ring-2 hover:ring-white/50',
        isLocked && 'opacity-50',
        className
      )}
      style={{
        left: `${start}%`,
        width: `${end - start}%`,
        backgroundColor: color + '80'
      }}
      onClick={() => onSelect(id)}
    >
      {/* Thumbnail Background */}
      {thumbnail && (
        <img src={thumbnail} alt="" className="w-full h-full object-cover opacity-40" />
      )}
      
      {/* Clip Content */}
      <div className="absolute inset-0 p-1 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white font-medium truncate drop-shadow-lg">
            {label}
          </span>
          <span className="text-xs text-white/80 font-mono drop-shadow-lg">
            {duration}
          </span>
        </div>
        
        {/* Waveform Placeholder */}
        <div className="flex items-end gap-px h-4 opacity-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-white/60 rounded-t"
              style={{ height: `${20 + Math.random() * 80}%` }}
            />
          ))}
        </div>
      </div>
      
      {/* Resize Handles */}
      {!isLocked && onResize && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity"
            onMouseDown={(e) => handleMouseDown(e, 'left')}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity"
            onMouseDown={(e) => handleMouseDown(e, 'right')}
          />
        </>
      )}
      
      {/* Locked Indicator */}
      {isLocked && (
        <div className="absolute top-1 right-1 text-white/60">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}
    </div>
  );
};
