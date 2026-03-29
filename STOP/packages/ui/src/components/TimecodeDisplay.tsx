'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs);
}

export interface TimecodeDisplayProps {
  time: number; // in seconds
  format?: 'mm:ss' | 'mm:ss:ff';
  frameRate?: number;
  className?: string;
}

export const TimecodeDisplay: React.FC<TimecodeDisplayProps> = ({
  time,
  format = 'mm:ss:ff',
  frameRate = 30,
  className,
}) => {
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * frameRate);
    
    if (format === 'mm:ss') {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={cn('font-mono text-white', className)}>
      {formatTimecode(time)}
    </div>
  );
};

export interface CurrentTimeDisplayProps {
  currentTime: number;
  duration: number;
  className?: string;
}

export const CurrentTimeDisplay: React.FC<CurrentTimeDisplayProps> = ({
  currentTime,
  duration,
  className,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="font-mono text-white">{formatTime(currentTime)}</span>
      <span className="text-gray-500">/</span>
      <span className="font-mono text-gray-400">{formatTime(duration)}</span>
    </div>
  );
};

export interface FrameCounterProps {
  frame: number;
  totalFrames: number;
  frameRate?: number;
  className?: string;
}

export const FrameCounter: React.FC<FrameCounterProps> = ({
  frame,
  totalFrames,
  frameRate = 30,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <span className="font-mono text-white">
        Frame {frame} / {totalFrames}
      </span>
      <span className="text-gray-500">
        ({frameRate} fps)
      </span>
    </div>
  );
};
