'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'left',
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  
  const setIsOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(value);
    }
    onOpenChange?.(value);
  };
  
  const alignStyles = {
    left: 'left-0',
    right: 'right-0'
  };
  
  return (
    <div className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              'absolute z-50 mt-2 min-w-[160px] bg-panel border border-border rounded-lg shadow-xl py-1',
              alignStyles[align]
            )}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
};

export interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  onClick,
  disabled,
  danger,
  className,
}) => {
  return (
    <button
      className={cn(
        'w-full text-left px-3 py-2 text-sm transition-colors',
        danger 
          ? 'text-red-500 hover:bg-red-500/10' 
          : 'text-white hover:bg-white/10',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export interface DropdownDividerProps {
  className?: string;
}

export const DropdownDivider: React.FC<DropdownDividerProps> = ({ className }) => {
  return (
    <div className={cn('my-1 h-px bg-border', className)} />
  );
};

export interface DropdownHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DropdownHeader: React.FC<DropdownHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider', className)}>
      {children}
    </div>
  );
};
