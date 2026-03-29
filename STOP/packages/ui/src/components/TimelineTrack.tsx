'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface TimelineTrackProps {
  id: string;
  label: string;
  type: 'video' | 'audio' | 'caption' | 'effects';
  color: string;
  clips: Array<{
    id: string;
    start: number;
    duration: number;
    label?: string;
    thumbnail?: string;
  }>;
  isSelected?: boolean;
  onSelect: (id: string) => void;
  className?: string;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  id,
  label,
  type,
  color,
  clips,
  isSelected,
  onSelect,
  className,
}) => {
  const typeStyles = {
    video: 'bg-gray-800',
    audio: 'bg-gray-800/50',
    caption: 'bg-gray-800/30',
    effects: 'bg-gray-800/30'
  };
  
  return (
    <div className={cn('flex h-16 border-b border-border', className)}>
      {/* Track Header */}
      <div className="w-32 flex-shrink-0 p-2 border-r border-border bg-panel">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-medium text-gray-300 truncate">{label}</span>
        </div>
      </div>
      
      {/* Track Content */}
      <div className={cn('flex-1 relative', typeStyles[type])}>
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="absolute top-1 bottom-1 rounded-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
            style={{
              left: `${(clip.start / 100) * 100}%`,
              width: `${(clip.duration / 100) * 100}%`,
              backgroundColor: color + '80'
            }}
            onClick={() => onSelect(clip.id)}
          >
            {clip.thumbnail && (
              <img src={clip.thumbnail} alt="" className="w-full h-full object-cover opacity-50" />
            )}
            {clip.label && (
              <span className="absolute bottom-0 left-0 right-0 px-1 text-xs text-white truncate bg-black/50">
                {clip.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export interface TimelineTracksProps {
  tracks: Array<{
    id: string;
    label: string;
    type: 'video' | 'audio' | 'caption' | 'effects';
    color: string;
    clips: Array<{
      id: string;
      start: number;
      duration: number;
      label?: string;
      thumbnail?: string;
    }>;
  }>;
  selectedClipId?: string;
  onSelectClip: (clipId: string, trackId: string) => void;
  className?: string;
}

export const TimelineTracks: React.FC<TimelineTracksProps> = ({
  tracks,
  selectedClipId,
  onSelectClip,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {tracks.map((track) => (
        <TimelineTrack
          key={track.id}
          {...track}
          isSelected={selectedClipId !== undefined}
          onSelect={(clipId) => onSelectClip(clipId, track.id)}
        />
      ))}
    </div>
  );
};
