'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small' | 'caption' | 'mono';
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  children,
  className,
  as,
}) => {
  const baseStyles = 'text-white';
  
  const variantStyles = {
    h1: 'font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight',
    h2: 'font-display text-3xl md:text-4xl font-semibold tracking-tight',
    h3: 'font-display text-2xl md:text-3xl font-medium',
    h4: 'font-display text-xl font-medium',
    body: 'font-body text-base leading-relaxed',
    small: 'font-body text-sm',
    caption: 'font-body text-xs text-gray-400',
    mono: 'font-mono text-sm bg-panel px-2 py-1 rounded'
  };
  
  const Component = as || {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    body: 'p',
    small: 'small',
    caption: 'span',
    mono: 'code'
  }[variant] || 'p';
  
  return (
    <Component className={cn(baseStyles, variantStyles[variant], className)}>
      {children}
    </Component>
  );
};

// Convenience components
export const H1: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Typography variant="h1" as="h1" className={className}>{children}</Typography>
);

export const H2: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Typography variant="h2" as="h2" className={className}>{children}</Typography>
);

export const H3: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Typography variant="h3" as="h3" className={className}>{children}</Typography>
);

export const H4: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Typography variant="h4" as="h4" className={className}>{children}</Typography>
);

export const Body: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Typography variant="body" as="p" className={className}>{children}</Typography>
);

export const Small: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Typography variant="small" as="small" className={className}>{children}</Typography>
);

export const Caption: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Typography variant="caption" as="span" className={className}>{children}</Typography>
);

export const Mono: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <Typography variant="mono" as="code" className={className}>{children}</Typography>
);
