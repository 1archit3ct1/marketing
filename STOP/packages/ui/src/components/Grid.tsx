'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface GridProps {
  children: React.ReactNode;
  columns?: number | string;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns = 1,
  gap = 'md',
  className,
}) => {
  const gapStyles = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6'
  };
  
  const columnsStyle = typeof columns === 'number'
    ? `grid-cols-${columns}`
    : columns;
  
  return (
    <div className={cn('grid', columnsStyle, gapStyles[gap], className)}>
      {children}
    </div>
  );
};

export interface GridItemProps {
  children: React.ReactNode;
  colspan?: number;
  rowspan?: number;
  className?: string;
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  colspan,
  rowspan,
  className,
}) => {
  return (
    <div
      className={cn(
        colspan && `col-span-${colspan}`,
        rowspan && `row-span-${rowspan}`,
        className
      )}
    >
      {children}
    </div>
  );
};
