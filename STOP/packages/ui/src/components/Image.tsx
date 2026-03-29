'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  loading?: 'lazy' | 'eager';
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  className?: string;
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  fallback,
  loading = 'lazy',
  aspectRatio,
  objectFit = 'cover',
  className,
  ...props
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const objectFitStyles = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down'
  };
  
  return (
    <div
      className={cn('relative overflow-hidden bg-panel', aspectRatio)}
    >
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-800" />
      )}
      {hasError && fallback ? (
        <div className="w-full h-full flex items-center justify-center bg-panel text-gray-500">
          {fallback}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={loading}
          className={cn('w-full h-full', objectFitStyles[objectFit], className)}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          {...props}
        />
      )}
    </div>
  );
};
