'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ThumbnailProps {
  src: string;
  alt: string;
  duration?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Thumbnail: React.FC<ThumbnailProps> = ({
  src,
  alt,
  duration,
  selected = false,
  onClick,
  className,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  
  return (
    <div
      className={cn(
        'relative aspect-video rounded-lg overflow-hidden cursor-pointer transition-all duration-200',
        selected 
          ? 'ring-2 ring-accent-purple ring-offset-2 ring-offset-background' 
          : 'hover:ring-2 hover:ring-gray-600 hover:ring-offset-2 hover:ring-offset-background',
        className
      )}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-800" />
      )}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onLoad={() => setIsLoading(false)}
      />
      {duration && (
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white font-mono">
          {duration}
        </div>
      )}
      {selected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-accent-purple rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
};

export interface ThumbnailGridProps {
  thumbnails: Array<{ src: string; alt: string; duration?: string; id?: string }>;
  selectedId?: string;
  onSelect?: (id: string) => void;
  columns?: number;
  className?: string;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  thumbnails,
  selectedId,
  onSelect,
  columns = 4,
  className,
}) => {
  const columnStyles = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  };
  
  return (
    <div className={cn('grid gap-3', columnStyles[columns as keyof typeof columnStyles], className)}>
      {thumbnails.map((thumb, index) => (
        <Thumbnail
          key={thumb.id || index}
          src={thumb.src}
          alt={thumb.alt}
          duration={thumb.duration}
          selected={selectedId === (thumb.id || String(index))}
          onClick={() => onSelect?.(thumb.id || String(index))}
        />
      ))}
    </div>
  );
};
