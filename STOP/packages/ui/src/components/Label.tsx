'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({
  children,
  htmlFor,
  required,
  optional,
  className,
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'block text-sm font-medium text-gray-300',
        className
      )}
    >
      {children}
      {required && <span className="text-accent-purple ml-1">*</span>}
      {optional && <span className="text-gray-500 ml-1 text-xs">(optional)</span>}
    </label>
  );
};
