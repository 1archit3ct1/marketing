'use client';

/**
 * AURA Moment Graph Component
 * Primary creative interface - horizontal card-based view of video scenes/moments
 *
 * Features:
 * - Drag cards to reorder
 * - Click card → open clip detail panel
 * - Delete card → remove segment
 * - Add card → open B-roll/clip picker
 * - Toggle: Moment View ↔ Timeline View
 */

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardBody } from '@aura/ui/components/Card';
import { Button } from '@aura/ui/components/Button';
import { Badge } from '@aura/ui/components/Badge';
import { VStack, HStack } from '@aura/ui/components/Stack';
import { Typography } from '@aura/ui/components/Typography';
import { Toggle } from '@aura/ui/components/Toggle';
import { MomentCard, MomentCardData } from './MomentCard';
import { Modal } from '@aura/ui/components/Modal';

export interface MomentGraphData {
  moments: MomentCardData[];
  total_duration_ms: number;
  source_asset_id: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface MomentGraphProps {
  data?: MomentGraphData;
  isLoading?: boolean;
  viewMode?: 'moment' | 'timeline';
  onViewModeChange?: (mode: 'moment' | 'timeline') => void;
  onMomentSelect?: (momentId: string) => void;
  onMomentDelete?: (momentId: string) => void;
  onMomentAdd?: () => void;
  onMomentReorder?: (fromIndex: number, toIndex: number) => void;
  onMomentSplit?: (momentId: string, splitPointMs: number) => void;
  onApplySuggestion?: (momentId: string, suggestionId: string) => void;
  onSwitchToTimeline?: () => void;
  className?: string;
}

export const MomentGraph: React.FC<MomentGraphProps> = ({
  data,
  isLoading = false,
  viewMode = 'moment',
  onViewModeChange,
  onMomentSelect,
  onMomentDelete,
  onMomentAdd,
  onMomentReorder,
  onMomentSplit,
  onApplySuggestion,
  onSwitchToTimeline,
  className
}) => {
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const moments = data?.moments || [];

  // Handle moment selection
  const handleSelect = useCallback((momentId: string) => {
    setSelectedMomentId(momentId);
    onMomentSelect?.(momentId);
  }, [onMomentSelect]);

  // Handle moment deletion
  const handleDelete = useCallback((momentId: string) => {
    onMomentDelete?.(momentId);
    if (selectedMomentId === momentId) {
      setSelectedMomentId(null);
    }
  }, [onMomentDelete, selectedMomentId]);

  // Handle drag start
  const handleDragStart = useCallback((
    e: React.DragEvent,
    momentId: string,
    index: number
  ) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  // Handle drop (reorder)
  const handleDrop = useCallback((
    e: React.DragEvent,
    targetMomentId: string,
    targetIndex: number
  ) => {
    e.preventDefault();
    
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onMomentReorder?.(draggedIndex, targetIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, onMomentReorder]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Handle add moment
  const handleAddMoment = () => {
    setShowAddModal(true);
  };

  // Handle confirm add
  const handleConfirmAdd = () => {
    onMomentAdd?.();
    setShowAddModal(false);
  };

  // Format total duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate stats
  const totalEngagement = moments.length > 0
    ? moments.reduce((sum, m) => sum + m.engagement_score, 0) / moments.length
    : 0;

  const highEngagementCount = moments.filter(m => m.engagement_score >= 70).length;
  const lowEngagementCount = moments.filter(m => m.engagement_score < 40).length;

  if (isLoading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className || ''}`}>
        <VStack align="center" gap="md">
          <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
          <Typography variant="body" className="text-gray-400">
            Analyzing your video...
          </Typography>
          <Typography variant="caption" className="text-gray-500">
            Detecting scenes, faces, and engagement patterns
          </Typography>
        </VStack>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <VStack gap="xs">
          <HStack gap="sm">
            <Typography variant="h4">Moment Graph</Typography>
            {moments.length > 0 && (
              <Badge variant="default" size="sm">
                {moments.length} moments
              </Badge>
            )}
          </HStack>
          <Typography variant="caption" className="text-gray-400">
            Drag to reorder • Click to edit • Double-click to open details
          </Typography>
        </VStack>

        <HStack gap="sm">
          {/* View Mode Toggle */}
          <HStack gap="xs" className="px-3 py-1.5 bg-panel rounded-lg">
            <Toggle
              leftLabel="Moment"
              rightLabel="Timeline"
              value={viewMode === 'timeline'}
              onChange={(checked) => onViewModeChange?.(checked ? 'timeline' : 'moment')}
            />
          </HStack>

          {/* Add Moment Button */}
          <Button variant="secondary" size="sm" onClick={handleAddMoment}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Moment
          </Button>

          {/* Switch to Timeline Button (alternative) */}
          {viewMode === 'moment' && (
            <Button variant="ghost" size="sm" onClick={onSwitchToTimeline}>
              Full Timeline
            </Button>
          )}
        </HStack>
      </div>

      {/* Stats Bar */}
      {moments.length > 0 && (
        <div className="px-4 py-2 bg-panel/50 border-b border-border">
          <HStack justify="between" className="w-full">
            <HStack gap="md">
              <StatItem
                label="Avg Engagement"
                value={`${totalEngagement.toFixed(0)}/100`}
                color={totalEngagement >= 60 ? '#00e5a0' : totalEngagement >= 40 ? '#fbbf24' : '#ef4444'}
              />
              <StatItem
                label="High Score Moments"
                value={highEngagementCount.toString()}
                color="#00e5a0"
              />
              <StatItem
                label="Needs Improvement"
                value={lowEngagementCount.toString()}
                color="#ef4444"
              />
            </HStack>

            <Typography variant="caption" className="text-gray-500">
              Total: {formatDuration(data?.total_duration_ms || 0)}
            </Typography>
          </HStack>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'moment' ? (
        /* Moment Graph View */
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden p-4"
        >
          {moments.length > 0 ? (
            <div className="flex gap-3 h-full items-start">
              {moments.map((moment, index) => (
                <div
                  key={moment.id}
                  className={`
                    flex-shrink-0 w-72 transition-all duration-200
                    ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                    ${dragOverIndex === index ? 'translate-x-2' : ''}
                  `}
                  style={{ maxHeight: 'calc(100% - 2rem)' }}
                >
                  <MomentCard
                    moment={moment}
                    index={index}
                    isSelected={selectedMomentId === moment.id}
                    isDragging={draggedIndex === index}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    onSplit={onMomentSplit}
                    onApplySuggestion={onApplySuggestion}
                    onDragStart={handleDragStart}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                  />
                </div>
              ))}

              {/* Add Card Placeholder */}
              <div
                className="flex-shrink-0 w-72 h-64 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-accent-purple hover:bg-accent-purple/5 transition-all"
                onClick={handleAddMoment}
              >
                <VStack align="center" gap="sm">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <Typography variant="caption" className="text-gray-500">
                    Add moment
                  </Typography>
                </VStack>
              </div>
            </div>
          ) : (
            <EmptyState onAdd={handleAddMoment} />
          )}
        </div>
      ) : (
        /* Timeline View (placeholder - would render full timeline) */
        <div className="flex-1 p-4">
          <TimelineViewPlaceholder moments={moments} />
        </div>
      )}

      {/* Add Moment Modal */}
      {showAddModal && (
        <AddMomentModal
          onClose={() => setShowAddModal(false)}
          onConfirm={handleConfirmAdd}
        />
      )}
    </div>
  );
};

/**
 * Stat Item Component
 */
interface StatItemProps {
  label: string;
  value: string;
  color?: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color }) => (
  <HStack gap="xs">
    <Typography variant="caption" className="text-gray-500">
      {label}:
    </Typography>
    <Typography variant="caption" className="font-semibold" style={{ color }}>
      {value}
    </Typography>
  </HStack>
);

/**
 * Empty State Component
 */
interface EmptyStateProps {
  onAdd: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onAdd }) => (
  <div className="w-full h-full flex items-center justify-center">
    <VStack align="center" gap="md">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
      <VStack align="center" gap="xs">
        <Typography variant="h4">No moments yet</Typography>
        <Typography variant="caption" className="text-gray-400 text-center max-w-md">
          Upload a video to automatically detect scenes, or manually add moments to build your story
        </Typography>
      </VStack>
      <HStack gap="sm">
        <Button variant="accent" onClick={onAdd}>
          Add First Moment
        </Button>
        <Button variant="ghost">
          Upload Video
        </Button>
      </HStack>
    </VStack>
  </div>
);

/**
 * Timeline View Placeholder
 */
interface TimelineViewPlaceholderProps {
  moments: MomentCardData[];
}

const TimelineViewPlaceholder: React.FC<TimelineViewPlaceholderProps> = ({ moments }) => (
  <Card variant="default" padding="md" className="h-full">
    <VStack align="center" justify="center" gap="md" className="h-full">
      <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
      <VStack align="center" gap="xs">
        <Typography variant="h4">Timeline View</Typography>
        <Typography variant="caption" className="text-gray-400">
          Switch to Moment Graph for card-based editing
        </Typography>
      </VStack>
      <Typography variant="body" className="text-gray-500">
        {moments.length} moments • Total duration: {formatDuration(moments.reduce((sum, m) => sum + m.duration_ms, 0))}
      </Typography>
    </VStack>
  </Card>
);

/**
 * Add Moment Modal
 */
interface AddMomentModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const AddMomentModal: React.FC<AddMomentModalProps> = ({ onClose, onConfirm }) => {
  const [selectedType, setSelectedType] = useState<'broll' | 'clip' | 'generated'>('broll');

  return (
    <Modal isOpen onClose={onClose} title="Add Moment" size="lg">
      <VStack gap="md" className="p-4">
        {/* Type Selection */}
        <div>
          <Typography variant="subtitle" className="mb-3">Select Moment Type</Typography>
          <HStack gap="sm" className="w-full">
            <TypeOptionCard
              type="broll"
              label="B-Roll"
              description="Add supplementary footage"
              icon="🎬"
              isSelected={selectedType === 'broll'}
              onClick={() => setSelectedType('broll')}
            />
            <TypeOptionCard
              type="clip"
              label="From Library"
              description="Choose from your clips"
              icon="📁"
              isSelected={selectedType === 'clip'}
              onClick={() => setSelectedType('clip')}
            />
            <TypeOptionCard
              type="generated"
              label="AI Generated"
              description="Generate with AI"
              icon="✨"
              isSelected={selectedType === 'generated'}
              onClick={() => setSelectedType('generated')}
            />
          </HStack>
        </div>

        {/* Content based on selection */}
        {selectedType === 'broll' && (
          <div className="p-4 bg-panel rounded-lg">
            <Typography variant="caption" className="text-gray-400">
              Search and select from B-roll library...
            </Typography>
          </div>
        )}

        {selectedType === 'clip' && (
          <div className="p-4 bg-panel rounded-lg">
            <Typography variant="caption" className="text-gray-400">
              Select from your uploaded clips...
            </Typography>
          </div>
        )}

        {selectedType === 'generated' && (
          <div className="p-4 bg-panel rounded-lg">
            <Typography variant="caption" className="text-gray-400 mb-2 block">
              Describe what you want to generate:
            </Typography>
            <textarea
              className="w-full p-3 bg-background border border-border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-purple"
              rows={3}
              placeholder="e.g., 'Aerial shot of a city at sunset'"
            />
          </div>
        )}

        {/* Actions */}
        <HStack justify="end" gap="sm" className="pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={onConfirm}>
            Add Moment
          </Button>
        </HStack>
      </VStack>
    </Modal>
  );
};

/**
 * Type Option Card
 */
interface TypeOptionCardProps {
  type: string;
  label: string;
  description: string;
  icon: string;
  isSelected: boolean;
  onClick: () => void;
}

const TypeOptionCard: React.FC<TypeOptionCardProps> = ({
  label,
  description,
  icon,
  isSelected,
  onClick
}) => (
  <div
    onClick={onClick}
    className={`
      flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all
      ${isSelected
        ? 'border-accent-purple bg-accent-purple/10'
        : 'border-border bg-panel hover:border-accent-purple/50'
      }
    `}
  >
    <VStack align="center" gap="xs">
      <span className="text-2xl">{icon}</span>
      <Typography variant="subtitle" className="text-sm">{label}</Typography>
      <Typography variant="caption" className="text-gray-500 text-center">
        {description}
      </Typography>
    </VStack>
  </div>
);

/**
 * Format duration helper
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default MomentGraph;
