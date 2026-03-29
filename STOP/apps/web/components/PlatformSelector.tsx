'use client';

/**
 * AURA Platform Selector Component
 * Select target platform for video export
 */

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type PlatformType = 'tiktok' | 'reels' | 'youtube_shorts' | 'youtube' | 'linkedin' | 'x';

export interface Platform {
  id: PlatformType;
  name: string;
  icon: React.ReactNode;
  aspectRatio: string;
  maxDuration: number; // seconds
  description: string;
  bestFor: string[];
}

export interface PlatformSelectorProps {
  value: PlatformType;
  onChange: (platform: PlatformType) => void;
  className?: string;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const platforms: Platform[] = [
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      ),
      aspectRatio: '9:16',
      maxDuration: 180,
      description: 'Short-form vertical video',
      bestFor: ['Trends', 'Dance', 'Comedy', 'Quick tips']
    },
    {
      id: 'reels',
      name: 'Instagram Reels',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5 7.51-3.22-7.52-3.22 7.52-3.22L12 11l-5.5-3.22V17.5z"/>
        </svg>
      ),
      aspectRatio: '9:16',
      maxDuration: 90,
      description: 'Aesthetic vertical video with music',
      bestFor: ['Lifestyle', 'Beauty', 'Fashion', 'Food']
    },
    {
      id: 'youtube_shorts',
      name: 'YouTube Shorts',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
        </svg>
      ),
      aspectRatio: '9:16',
      maxDuration: 60,
      description: 'Quick vertical content for YouTube',
      bestFor: ['Tutorials', 'Highlights', 'Quick tips']
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
      aspectRatio: '16:9',
      maxDuration: 7200,
      description: 'Long-form horizontal video',
      bestFor: ['Tutorials', 'Vlogs', 'Reviews', 'Documentaries']
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      aspectRatio: '4:5',
      maxDuration: 600,
      description: 'Professional content for business',
      bestFor: ['Thought leadership', 'Company updates', 'Tips']
    },
    {
      id: 'x',
      name: 'X (Twitter)',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      aspectRatio: '16:9',
      maxDuration: 140,
      description: 'Short video content for X',
      bestFor: ['News', 'Opinions', 'Quick updates']
    }
  ];

  return (
    <div className={cn('grid grid-cols-3 lg:grid-cols-6 gap-3', className)}>
      {platforms.map((platform) => (
        <button
          key={platform.id}
          onClick={() => onChange(platform.id)}
          className={cn(
            'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105',
            value === platform.id
              ? 'border-accent-purple bg-accent-purple/10 shadow-lg shadow-accent-purple/20'
              : 'border-border bg-panel hover:border-gray-600'
          )}
        >
          {/* Icon */}
          <div className={cn(
            'transition-colors',
            value === platform.id ? 'text-accent-purple' : 'text-gray-400'
          )}>
            {platform.icon}
          </div>
          
          {/* Name */}
          <span className={cn(
            'text-sm font-medium',
            value === platform.id ? 'text-white' : 'text-gray-400'
          )}>
            {platform.name}
          </span>
          
          {/* Aspect Ratio Badge */}
          <span className="text-xs text-gray-500 font-mono">
            {platform.aspectRatio}
          </span>
          
          {/* Selected Indicator */}
          {value === platform.id && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-purple rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export interface PlatformInfoCardProps {
  platform: PlatformType;
  className?: string;
}

export const PlatformInfoCard: React.FC<PlatformInfoCardProps> = ({
  platform,
  className,
}) => {
  const platformInfo: Record<PlatformType, Platform> = {
    tiktok: {
      id: 'tiktok',
      name: 'TikTok',
      icon: null as any,
      aspectRatio: '9:16',
      maxDuration: 180,
      description: 'Short-form vertical video',
      bestFor: ['Trends', 'Dance', 'Comedy', 'Quick tips']
    },
    reels: {
      id: 'reels',
      name: 'Instagram Reels',
      icon: null as any,
      aspectRatio: '9:16',
      maxDuration: 90,
      description: 'Aesthetic vertical video with music',
      bestFor: ['Lifestyle', 'Beauty', 'Fashion', 'Food']
    },
    youtube_shorts: {
      id: 'youtube_shorts',
      name: 'YouTube Shorts',
      icon: null as any,
      aspectRatio: '9:16',
      maxDuration: 60,
      description: 'Quick vertical content for YouTube',
      bestFor: ['Tutorials', 'Highlights', 'Quick tips']
    },
    youtube: {
      id: 'youtube',
      name: 'YouTube',
      icon: null as any,
      aspectRatio: '16:9',
      maxDuration: 7200,
      description: 'Long-form horizontal video',
      bestFor: ['Tutorials', 'Vlogs', 'Reviews', 'Documentaries']
    },
    linkedin: {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: null as any,
      aspectRatio: '4:5',
      maxDuration: 600,
      description: 'Professional content for business',
      bestFor: ['Thought leadership', 'Company updates', 'Tips']
    },
    x: {
      id: 'x',
      name: 'X (Twitter)',
      icon: null as any,
      aspectRatio: '16:9',
      maxDuration: 140,
      description: 'Short video content for X',
      bestFor: ['News', 'Opinions', 'Quick updates']
    }
  };

  const info = platformInfo[platform];

  return (
    <div className={cn('p-4 bg-panel rounded-xl border border-border', className)}>
      <HStack gap="sm" className="mb-3">
        <span className="text-lg">{info.icon}</span>
        <div>
          <p className="font-semibold text-white">{info.name}</p>
          <p className="text-xs text-gray-400">{info.description}</p>
        </div>
      </HStack>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Aspect Ratio</p>
          <Badge variant="accent">{info.aspectRatio}</Badge>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Max Duration</p>
          <Badge variant="default">{info.maxDuration >= 60 ? `${info.maxDuration / 60}min` : `${info.maxDuration}s`}</Badge>
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-xs text-gray-500 mb-2">Best for</p>
        <div className="flex flex-wrap gap-1">
          {info.bestFor.map((item) => (
            <span key={item} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper components
function HStack({ children, gap = 'md', className }: { children: React.ReactNode; gap?: string; className?: string }) {
  return (
    <div className={cn('flex items-center', gap === 'sm' ? 'gap-2' : 'gap-3', className)}>
      {children}
    </div>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const variants: Record<string, string> = {
    default: 'bg-gray-700 text-gray-200',
    accent: 'bg-accent-purple/20 text-accent-purple'
  };
  
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant])}>
      {children}
    </span>
  );
}

export default PlatformSelector;
