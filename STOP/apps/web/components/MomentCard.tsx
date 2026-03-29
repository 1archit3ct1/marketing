'use client';

/**
 * AURA Moment Card Component
 * Individual scene/moment card in the Moment Graph
 *
 * Displays:
 * - Thumbnail with duration badge
 * - Scene label (Hook, Intro, Demo, CTA)
 * - Engagement prediction score (0-100 bar)
 * - Audio waveform strip
 * - Suggestions chips
 */

import React, { useState, useRef } from 'react';
import { Card, CardBody } from '@aura/ui/components/Card';
import { Badge } from '@aura/ui/components/Badge';
import { Button } from '@aura/ui/components/Button';
import { VStack, HStack } from '@aura/ui/components/Stack';
import { Typography } from '@aura/ui/components/Typography';
import { ProgressBar } from '@aura/ui/components/ProgressBar';
import { Tooltip } from '@aura/ui/components/Tooltip';

export type SceneType = 'hook' | 'intro' | 'demo' | 'main' | 'transition' | 'cta' | 'b_roll' | 'pause' | 'unknown';

export interface MomentSuggestion {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  message: string;
  action: string;
  impact: string;
}

export interface MomentCardData {
  id: string;
  scene_type: SceneType;
  label: string;
  description: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  engagement_score: number;
  engagement_factors: Record<string, string>;
  suggestions: MomentSuggestion[];
  has_face: boolean;
  face_count: number;
  motion_level: number;
  audio_energy: number;
  has_speech: boolean;
  has_text: boolean;
  source_asset_id: string;
  thumbnail_url?: string;
  waveform_data?: number[];
}

export interface MomentCardProps {
  moment: MomentCardData;
  index: number;
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: (momentId: string) => void;
  onDoubleClick?: (momentId: string) => void;
  onDelete?: (momentId: string) => void;
  onSplit?: (momentId: string, splitPointMs: number) => void;
  onApplySuggestion?: (momentId: string, suggestionId: string) => void;
  onDragStart?: (e: React.DragEvent, momentId: string, index: number) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, momentId: string, index: number) => void;
  className?: string;
}

export const MomentCard: React.FC<MomentCardProps> = ({
  moment,
  index,
  isSelected = false,
  isDragging = false,
  onSelect,
  onDoubleClick,
  onDelete,
  onSplit,
  onApplySuggestion,
  onDragStart,
  onDragOver,
  onDrop,
  className
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', moment.id);
    onDragStart?.(e, moment.id, index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.(e, moment.id, index);
  };

  const handleClick = () => {
    onSelect?.(moment.id);
  };

  const handleDoubleClick = () => {
    onDoubleClick?.(moment.id);
  };

  const formatDuration = (ms: number) => {
    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    return `${minutes}:${remainingSeconds.padStart(5, '0')}`;
  };

  const getSceneTypeColor = (type: SceneType) => {
    const colors: Record<SceneType, string> = {
      hook: '#f5820a',      // Orange - attention grabbing
      intro: '#7c5cfc',     // Purple - branded
      demo: '#00e5a0',      // Green - positive
      main: '#00bcd4',      // Cyan - neutral
      transition: '#9ca3af', // Gray - transitional
      cta: '#ec4899',       // Pink - action
      b_roll: '#8b5cf6',    // Violet - supplementary
      pause: '#6b7280',     // Gray - quiet
      unknown: '#9ca3af'    // Gray - unknown
    };
    return colors[type] || colors.unknown;
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return '#00e5a0';  // Green - high
    if (score >= 40) return '#fbbf24';  // Yellow - medium
    return '#ef4444';                    // Red - low
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return '#ef4444';
    if (priority === 'medium') return '#fbbf24';
    return '#9ca3af';
  };

  const sceneColor = getSceneTypeColor(moment.scene_type);
  const engagementColor = getEngagementColor(moment.engagement_score);

  return (
    <Card
      ref={cardRef}
      variant={isSelected ? 'elevated' : 'default'}
      padding="none"
      className={`
        relative overflow-hidden transition-all duration-200
        ${isSelected ? 'ring-2 ring-accent-purple scale-[1.02]' : ''}
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${className || ''}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Scene Type Color Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: sceneColor }}
      />

      <CardBody className="p-3">
        <VStack gap="sm" className="w-full">
          {/* Thumbnail Row */}
          <HStack gap="sm" className="w-full">
            {/* Thumbnail */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg overflow-hidden">
                {moment.thumbnail_url ? (
                  <img
                    src={moment.thumbnail_url}
                    alt={moment.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {moment.has_face ? (
                      <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                )}
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white font-mono">
                {formatDuration(moment.duration_ms)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <HStack justify="between" className="w-full mb-1">
                <HStack gap="xs">
                  <Badge
                    variant="default"
                    size="xs"
                    className="font-medium"
                    style={{ backgroundColor: `${sceneColor}20`, color: sceneColor }}
                  >
                    {moment.label}
                  </Badge>
                  {moment.has_face && (
                    <Tooltip content="Face detected">
                      <span className="text-gray-400">👤</span>
                    </Tooltip>
                  )}
                  {moment.has_speech && (
                    <Tooltip content="Speech detected">
                      <span className="text-gray-400">🎤</span>
                    </Tooltip>
                  )}
                </HStack>

                {/* Delete Button (on hover) */}
                <Button
                  variant="ghost"
                  size="xs"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(moment.id);
                  }}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </HStack>

              <Typography variant="caption" className="text-gray-400 line-clamp-1">
                {moment.description}
              </Typography>
            </div>
          </HStack>

          {/* Engagement Score Bar */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <Typography variant="caption" className="text-gray-500">
                Engagement
              </Typography>
              <Typography
                variant="caption"
                className="font-semibold"
                style={{ color: engagementColor }}
              >
                {moment.engagement_score.toFixed(0)}
              </Typography>
            </div>
            <ProgressBar
              value={moment.engagement_score}
              className="h-1.5"
              color={engagementColor}
            />
            
            {/* Engagement Factors (on hover/select) */}
            {isSelected && moment.engagement_factors && Object.keys(moment.engagement_factors).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(moment.engagement_factors).map(([key, value]) => (
                  <Badge key={key} variant="default" size="xs" className="text-xs">
                    {value}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Waveform Strip */}
          <div className="w-full h-6 bg-panel rounded overflow-hidden">
            <WaveformStrip
              data={moment.waveform_data}
              audioEnergy={moment.audio_energy}
              hasSpeech={moment.has_speech}
            />
          </div>

          {/* Suggestions Chips */}
          {moment.suggestions && moment.suggestions.length > 0 && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-1">
                <Typography variant="caption" className="text-gray-500">
                  AI Suggestions
                </Typography>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                >
                  {showSuggestions ? 'Hide' : `Show (${moment.suggestions.length})`}
                </Button>
              </div>

              {showSuggestions ? (
                <VStack gap="xs" className="w-full">
                  {moment.suggestions.map((suggestion) => (
                    <SuggestionChip
                      key={suggestion.id}
                      suggestion={suggestion}
                      onApply={() => onApplySuggestion?.(moment.id, suggestion.id)}
                    />
                  ))}
                </VStack>
              ) : (
                <HStack gap="xs" className="w-full flex-wrap">
                  {moment.suggestions.slice(0, 2).map((suggestion) => (
                    <SuggestionChip
                      key={suggestion.id}
                      suggestion={suggestion}
                      compact
                      onApply={() => onApplySuggestion?.(moment.id, suggestion.id)}
                    />
                  ))}
                  {moment.suggestions.length > 2 && (
                    <Badge variant="default" size="xs">
                      +{moment.suggestions.length - 2} more
                    </Badge>
                  )}
                </HStack>
              )}
            </div>
          )}

          {/* Quick Actions (on select) */}
          {isSelected && (
            <HStack gap="xs" className="w-full pt-2 border-t border-border">
              <Button variant="ghost" size="xs" className="flex-1">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </Button>
              <Button variant="ghost" size="xs" className="flex-1">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </Button>
              <Button variant="ghost" size="xs" className="flex-1">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Replace
              </Button>
            </HStack>
          )}
        </VStack>
      </CardBody>

      {/* Drag Handle Indicator */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
    </Card>
  );
};

/**
 * Waveform Strip Component
 */
interface WaveformStripProps {
  data?: number[];
  audioEnergy: number;
  hasSpeech: boolean;
}

const WaveformStrip: React.FC<WaveformStripProps> = ({ data, audioEnergy, hasSpeech }) => {
  // Generate mock waveform if no data provided
  const bars = data || Array.from({ length: 24 }, () => Math.random() * audioEnergy);

  return (
    <div className="w-full h-full flex items-center justify-center gap-px px-1">
      {bars.map((value, i) => {
        const height = Math.max(4, Math.min(100, value * 100));
        const color = hasSpeech && i > 4 && i < bars.length - 4 ? '#7c5cfc' : '#6b7280';
        
        return (
          <div
            key={i}
            className="flex-1 rounded-full transition-all duration-100"
            style={{
              height: `${height}%`,
              backgroundColor: color,
              opacity: 0.5 + (value * 0.5)
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * Suggestion Chip Component
 */
interface SuggestionChipProps {
  suggestion: MomentSuggestion;
  compact?: boolean;
  onApply?: () => void;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({
  suggestion,
  compact = false,
  onApply
}) => {
  const priorityColor = getPriorityColor(suggestion.priority);

  if (compact) {
    return (
      <Tooltip content={suggestion.message}>
        <div
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: `${priorityColor}20`, color: priorityColor }}
          onClick={onApply}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityColor }} />
          <span>{suggestion.type.replace('_', ' ')}</span>
        </div>
      </Tooltip>
    );
  }

  return (
    <div
      className="w-full p-2 rounded-lg border transition-all hover:shadow-md cursor-pointer"
      style={{
        backgroundColor: `${priorityColor}10`,
        borderColor: `${priorityColor}30`
      }}
      onClick={onApply}
    >
      <HStack justify="between" className="w-full">
        <VStack gap="xs" className="flex-1">
          <HStack gap="xs">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: priorityColor }}
            />
            <Typography variant="caption" className="font-medium capitalize" style={{ color: priorityColor }}>
              {suggestion.type.replace('_', ' ')}
            </Typography>
          </HStack>
          <Typography variant="caption" className="text-gray-300">
            {suggestion.message}
          </Typography>
          <Typography variant="caption" className="text-accent-green">
            {suggestion.impact}
          </Typography>
        </VStack>
        <Button variant="accent" size="xs" onClick={(e) => {
          e.stopPropagation();
          onApply?.();
        }}>
          Apply
        </Button>
      </HStack>
    </div>
  );
};

export default MomentCard;
