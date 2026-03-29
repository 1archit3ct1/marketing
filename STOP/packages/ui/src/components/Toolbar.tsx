'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ToolbarProps {
  children: React.ReactNode;
  variant?: 'default' | 'compact';
  className?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  variant = 'default',
  className,
}) => {
  return (
    <div className={cn(
      'flex items-center gap-1 bg-panel border-b border-border px-4',
      variant === 'default' ? 'h-12' : 'h-10',
      className
    )}>
      {children}
    </div>
  );
};

export interface ToolbarGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ToolbarGroup: React.FC<ToolbarGroupProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1 px-2 border-r border-border last:border-r-0', className)}>
      {children}
    </div>
  );
};

export interface ToolbarButtonProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  children,
  icon,
  isActive,
  isDisabled,
  tooltip,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={tooltip}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-accent-purple text-white'
          : 'text-gray-400 hover:text-white hover:bg-white/10',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};

export interface ToolbarIconButtonProps {
  icon: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
}

export const ToolbarIconButton: React.FC<ToolbarIconButtonProps> = ({
  icon,
  isActive,
  isDisabled,
  tooltip,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={tooltip}
      className={cn(
        'p-2 rounded-lg transition-all duration-200',
        isActive
          ? 'bg-accent-purple text-white'
          : 'text-gray-400 hover:text-white hover:bg-white/10',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon}
    </button>
  );
};

export interface ToolbarDividerProps {
  className?: string;
}

export const ToolbarDivider: React.FC<ToolbarDividerProps> = ({ className }) => {
  return (
    <div className={cn('w-px h-6 bg-border mx-2', className)} />
  );
};
