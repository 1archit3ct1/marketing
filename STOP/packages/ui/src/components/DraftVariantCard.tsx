'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Card } from './Card';
import { Badge } from './Badge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type DraftVariantType = 'safe' | 'experimental' | 'minimal';

export interface DraftVariantCardProps {
  type: DraftVariantType;
  thumbnail?: string;
  duration: string;
  engagementScore?: number;
  isSelected?: boolean;
  onSelect: () => void;
  className?: string;
}

export const DraftVariantCard: React.FC<DraftVariantCardProps> = ({
  type,
  thumbnail,
  duration,
  engagementScore,
  isSelected,
  onSelect,
  className,
}) => {
  const variantConfig = {
    safe: {
      title: 'Safe & Proven',
      description: 'Follows platform best practices',
      badge: 'Proven',
      badgeVariant: 'success' as const
    },
    experimental: {
      title: 'Experimental',
      description: 'Trend-chasing with bold choices',
      badge: 'Trending',
      badgeVariant: 'accent' as const
    },
    minimal: {
      title: 'Minimal',
      description: 'Clean and straightforward',
      badge: 'Clean',
      badgeVariant: 'default' as const
    }
  };
  
  const config = variantConfig[type];
  
  return (
    <Card
      variant={isSelected ? 'accent' : 'default'}
      padding="none"
      hoverable
      onClick={onSelect}
      className={cn(
        'overflow-hidden cursor-pointer transition-all duration-200',
        isSelected && 'ring-2 ring-accent-purple',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-800">
        {thumbnail ? (
          <img src={thumbnail} alt={config.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white font-mono">
          {duration}
        </div>
        
        {/* Engagement Score */}
        {engagementScore !== undefined && (
          <div className="absolute top-2 left-2">
            <div className={cn(
              'px-2 py-1 rounded-full text-xs font-semibold',
              engagementScore >= 70 ? 'bg-accent-green text-black' :
              engagementScore >= 40 ? 'bg-yellow-500 text-black' :
              'bg-red-500 text-white'
            )}>
              {engagementScore} score
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white">{config.title}</h3>
          <Badge variant={config.badgeVariant} size="sm">
            {config.badge}
          </Badge>
        </div>
        <p className="text-xs text-gray-400">{config.description}</p>
      </div>
    </Card>
  );
};

export interface DraftVariantPickerProps {
  variants: Array<{
    id: string;
    type: DraftVariantType;
    thumbnail?: string;
    duration: string;
    engagementScore?: number;
  }>;
  selectedId?: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const DraftVariantPicker: React.FC<DraftVariantPickerProps> = ({
  variants,
  selectedId,
  onSelect,
  className,
}) => {
  return (
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      {variants.map((variant) => (
        <DraftVariantCard
          key={variant.id}
          type={variant.type}
          thumbnail={variant.thumbnail}
          duration={variant.duration}
          engagementScore={variant.engagementScore}
          isSelected={selectedId === variant.id}
          onSelect={() => onSelect(variant.id)}
        />
      ))}
    </div>
  );
};
