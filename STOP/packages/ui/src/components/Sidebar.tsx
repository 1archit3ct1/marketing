'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface SidebarProps {
  children: React.ReactNode;
  width?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapse?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  children,
  width = 280,
  collapsible = false,
  collapsed = false,
  onCollapse,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-panel border-r border-border flex flex-col h-full transition-all duration-300',
        collapsed && 'w-0 overflow-hidden'
      )}
      style={{ width: collapsed ? 0 : width }}
    >
      {collapsible && (
        <button
          onClick={onCollapse}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-accent-purple rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform z-10"
        >
          <svg className={cn('w-3 h-3 transition-transform', collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {!collapsed && children}
    </div>
  );
};

export interface SidebarHeaderProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  children,
  actions,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-b border-border', className)}>
      {children}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

export interface SidebarContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('flex-1 overflow-y-auto p-4', className)}>
      {children}
    </div>
  );
};

export interface SidebarFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('px-4 py-3 border-t border-border bg-black/20', className)}>
      {children}
    </div>
  );
};

export interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  children,
  className,
}) => {
  return (
    <div className={cn('mb-4 last:mb-0', className)}>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
        {title}
      </h3>
      {children}
    </div>
  );
};

export interface SidebarItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  children,
  icon,
  isActive,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-accent-purple/20 text-white'
          : 'text-gray-400 hover:text-white hover:bg-white/5',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};
