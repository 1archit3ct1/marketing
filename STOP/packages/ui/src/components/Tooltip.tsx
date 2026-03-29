'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(false);
  
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  
  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setShouldRender(true);
    }, delay);
  };
  
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    setTimeout(() => setShouldRender(false), 150);
  };
  
  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };
  
  if (!shouldRender) {
    return (
      <div
        className="relative inline-block"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>
    );
  }
  
  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      <div
        className={cn(
          'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md whitespace-nowrap transition-opacity duration-150',
          positionStyles[position],
          isVisible ? 'opacity-100' : 'opacity-0',
          className
        )}
      >
        {content}
        {/* Arrow */}
        <div
          className={cn(
            'absolute w-2 h-2 bg-gray-900 rotate-45',
            position === 'top' && 'left-1/2 -translate-x-1/2 -bottom-1',
            position === 'bottom' && 'left-1/2 -translate-x-1/2 -top-1',
            position === 'left' && 'top-1/2 -translate-y-1/2 -right-1',
            position === 'right' && 'top-1/2 -translate-y-1/2 -left-1'
          )}
        />
      </div>
    </div>
  );
};
