'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  showValue = true,
  disabled = false,
  className,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
          {showValue && (
            <span className="text-sm text-gray-400 font-mono">{value}</span>
          )}
        </div>
      )}
      <div className="relative h-5 flex items-center">
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
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="absolute w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div
          className={cn(
            'absolute h-4 w-4 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-150',
            'ring-2 ring-accent-purple',
            disabled && 'opacity-50'
          )}
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
};
