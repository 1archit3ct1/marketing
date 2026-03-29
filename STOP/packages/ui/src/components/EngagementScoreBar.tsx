'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface EngagementScoreBarProps {
  score: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EngagementScoreBar: React.FC<EngagementScoreBarProps> = ({
  score,
  showLabel = true,
  size = 'md',
  className,
}) => {
  const normalizedScore = Math.min(100, Math.max(0, score));
  
  const getColor = (s: number) => {
    if (s >= 70) return { bg: 'bg-accent-green', text: 'text-accent-green', label: 'High' };
    if (s >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'Medium' };
    return { bg: 'bg-red-500', text: 'text-red-500', label: 'Low' };
  };
  
  const colors = getColor(normalizedScore);
  
  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };
  
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-400">Engagement Prediction</span>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold', colors.text)}>{colors.label}</span>
            <span className={cn('text-sm font-bold', colors.text)}>{Math.round(normalizedScore)}</span>
          </div>
        </div>
      )}
      <div className={cn('w-full bg-gray-700 rounded-full overflow-hidden', sizeStyles[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
          style={{ width: `${normalizedScore}%` }}
        />
      </div>
      {/* Gradient scale indicator */}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-red-500">0</span>
        <span className="text-xs text-yellow-500">50</span>
        <span className="text-xs text-accent-green">100</span>
      </div>
    </div>
  );
};

export interface EngagementScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const EngagementScoreGauge: React.FC<EngagementScoreGaugeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const normalizedScore = Math.min(100, Math.max(0, score));
  
  const sizeStyles = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };
  
  const getColor = (s: number) => {
    if (s >= 70) return '#00e5a0';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };
  
  const color = getColor(normalizedScore);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
  
  return (
    <div className={cn('relative inline-flex items-center justify-center', sizeStyles[size], className)}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth="8"
        />
        {/* Score circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(normalizedScore)}</span>
          <span className="text-xs text-gray-400">score</span>
        </div>
      )}
    </div>
  );
};
