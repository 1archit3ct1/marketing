'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  disabled?: boolean;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  options,
  label,
  error,
  disabled = false,
  orientation = 'vertical',
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-3">
          {label}
        </label>
      )}
      <div className={cn(
        'flex gap-4',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col'
      )}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
              value === option.value
                ? 'border-accent-purple bg-accent-purple/10'
                : 'border-border hover:border-gray-600',
              disabled || option.disabled ? 'opacity-50 cursor-not-allowed' : ''
            )}
          >
            <input
              type="radio"
              name="radio-group"
              value={option.value}
              checked={value === option.value}
              onChange={() => !disabled && !option.disabled && onChange(option.value)}
              disabled={disabled || option.disabled}
              className="sr-only"
            />
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                value === option.value
                  ? 'border-accent-purple'
                  : 'border-gray-500'
              )}
            >
              {value === option.value && (
                <div className="w-2.5 h-2.5 rounded-full bg-accent-purple" />
              )}
            </div>
            <div>
              <div className={cn(
                'text-sm font-medium',
                disabled || option.disabled ? 'text-gray-500' : 'text-white'
              )}>
                {option.label}
              </div>
              {option.description && (
                <div className={cn(
                  'text-xs mt-0.5',
                  disabled || option.disabled ? 'text-gray-600' : 'text-gray-400'
                )}>
                  {option.description}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
