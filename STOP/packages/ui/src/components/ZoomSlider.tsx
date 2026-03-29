'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ZoomSliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  showLabels?: boolean;
  className?: string;
}

export const ZoomSlider: React.FC<ZoomSliderProps> = ({
  value,
  min = 25,
  max = 400,
  onChange,
  showLabels = true,
  className,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showLabels && (
        <span className="text-xs text-gray-400 w-8">{min}%</span>
      )}
      <div className="flex-1 relative h-5 flex items-center">
        {/* Track */}
        <div className="absolute w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
          {/* Fill */}
          <div
            className="h-full bg-accent-purple rounded-full transition-all duration-150"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute h-4 w-4 bg-white rounded-full shadow-lg pointer-events-none ring-2 ring-accent-purple"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      {showLabels && (
        <span className="text-xs text-gray-400 w-8 text-right">{max}%</span>
      )}
    </div>
  );
};

export interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  className?: string;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={onZoomOut}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
        title="Zoom Out"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <span className="text-xs text-gray-400 w-12 text-center font-mono">
        {Math.round(zoom)}%
      </span>
      <button
        onClick={onZoomIn}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
        title="Zoom In"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button
        onClick={onZoomFit}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
        title="Fit to Screen"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
};
