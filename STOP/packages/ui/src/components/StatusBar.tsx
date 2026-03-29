'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface StatusBarProps {
  children: React.ReactNode;
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('h-8 bg-panel border-t border-border px-4 flex items-center justify-between text-xs', className)}>
      {children}
    </div>
  );
};

export interface StatusBarLeftProps {
  children: React.ReactNode;
  className?: string;
}

export const StatusBarLeft: React.FC<StatusBarLeftProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {children}
    </div>
  );
};

export interface StatusBarRightProps {
  children: React.ReactNode;
  className?: string;
}

export const StatusBarRight: React.FC<StatusBarRightProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {children}
    </div>
  );
};

export interface StatusBarItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const StatusBarItem: React.FC<StatusBarItemProps> = ({
  children,
  icon,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 text-gray-400', className)}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
};

export interface StatusBarProgressProps {
  progress: number;
  label?: string;
  className?: string;
}

export const StatusBarProgress: React.FC<StatusBarProgressProps> = ({
  progress,
  label,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="text-gray-400">{label}</span>}
      <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-purple transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
    </div>
  );
};
