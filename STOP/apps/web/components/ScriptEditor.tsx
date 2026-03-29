'use client';

/**
 * AURA Script Editor Component
 * Side-by-side script + timeline view for script-to-video mode
 *
 * Features:
 * - Script input with segment highlighting
 * - Click sentence → jump to corresponding clip in timeline
 * - Real-time preview of matched footage
 * - Voiceover generation controls
 * - Caption style selection
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardBody } from '@aura/ui/components/Card';
import { Button } from '@aura/ui/components/Button';
import { Badge } from '@aura/ui/components/Badge';
import { VStack, HStack } from '@aura/ui/components/Stack';
import { Typography } from '@aura/ui/components/Typography';
import { Textarea } from '@aura/ui/components/Textarea';
import { Select } from '@aura/ui/components/Select';
import { ProgressBar } from '@aura/ui/components/ProgressBar';
import { Tabs, Tab } from '@aura/ui/components/Tabs';
import { Modal } from '@aura/ui/components/Modal';

export interface ScriptSegment {
  id: string;
  text: string;
  start_time: number;      // milliseconds
  end_time: number;        // milliseconds
  word_count: number;
  estimated_duration: number; // milliseconds
  matched_asset_id?: string;
  matched_clip_start?: number;
  matched_clip_end?: number;
  semantic_score?: number;
}

export interface ScriptMetadata {
  total_word_count: number;
  total_segments: number;
  estimated_duration: number; // milliseconds
  language: string;
  tone?: string;
  has_dialogue: boolean;
  speakers: string[];
}

export interface TimelineClip {
  id: string;
  asset_id: string;
  track_id: string;
  start: number;
  duration: number;
  trim_start: number;
  trim_end: number;
  speed: number;
  metadata?: {
    segment_id?: string;
    script_text?: string;
    semantic_score?: number;
  };
}

export interface ScriptEditorProps {
  initialScript?: string;
  availableAssets?: Array<{
    asset_id: string;
    duration: number;
    description?: string;
    thumbnail_url?: string;
  }>;
  onGenerate: (script: string, options: ScriptToVideoOptions) => void;
  onSegmentClick?: (segmentId: string) => void;
  isLoading?: boolean;
  isProcessing?: boolean;
  processingProgress?: number;
  className?: string;
}

export interface ScriptToVideoOptions {
  speech_rate?: number;
  platform?: string;
  caption_style?: string;
  generate_voiceover?: boolean;
  voice_id?: string;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  initialScript = '',
  availableAssets = [],
  onGenerate,
  onSegmentClick,
  isLoading = false,
  isProcessing = false,
  processingProgress = 0,
  className
}) => {
  const [script, setScript] = useState(initialScript);
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'script' | 'timeline'>('script');
  const [options, setOptions] = useState<ScriptToVideoOptions>({
    speech_rate: 130,
    platform: 'tiktok',
    caption_style: 'tiktok_bold',
    generate_voiceover: true,
    voice_id: 'elevenlabs_rachel'
  });
  const [showOptions, setShowOptions] = useState(false);

  const scriptContainerRef = useRef<HTMLDivElement>(null);

  // Parse script into segments when script changes
  useEffect(() => {
    if (script.trim()) {
      const parsed = parseScriptIntoSegments(script);
      setSegments(parsed);
    } else {
      setSegments([]);
    }
  }, [script]);

  // Handle segment click
  const handleSegmentClick = (segment: ScriptSegment) => {
    setSelectedSegmentId(segment.id);
    onSegmentClick?.(segment.id);
    
    // Switch to timeline view on mobile
    if (window.innerWidth < 768) {
      setActiveTab('timeline');
    }
  };

  // Handle generate
  const handleGenerate = () => {
    if (!script.trim()) return;
    onGenerate(script, options);
  };

  // Format duration for display
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate total estimated duration
  const totalDuration = segments.reduce((sum, s) => sum + s.estimated_duration, 0);

  return (
    <div className={`w-full h-full flex flex-col ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <VStack gap="xs">
          <Typography variant="h4">Script-to-Video</Typography>
          <Typography variant="caption" className="text-gray-400">
            Paste your script. AI matches footage and generates voiceover.
          </Typography>
        </VStack>

        <HStack gap="sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOptions(true)}
          >
            Settings
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleGenerate}
            disabled={!script.trim() || isLoading || isProcessing}
            className="px-6"
          >
            {isProcessing ? 'Processing...' : isLoading ? 'Loading...' : 'Generate Video'}
          </Button>
        </HStack>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <div className="px-4 py-2 bg-accent-purple/10 border-b border-accent-purple/20">
          <HStack justify="between" className="w-full">
            <Typography variant="caption" className="text-accent-purple">
              Generating your video...
            </Typography>
            <Typography variant="caption" className="text-accent-purple font-mono">
              {processingProgress}%
            </Typography>
          </HStack>
          <ProgressBar
            value={processingProgress}
            className="mt-2 h-1"
            color="#7c5cfc"
          />
        </div>
      )}

      {/* Main Content - Desktop: Side by side, Mobile: Tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Script Panel */}
        <div className={`${activeTab === 'script' ? 'flex' : 'hidden'} md:flex flex-1 flex-col border-r border-border`}>
          {/* Script Header */}
          <div className="px-4 py-3 border-b border-border bg-panel/50">
            <HStack justify="between" className="w-full">
              <Typography variant="subtitle">Script</Typography>
              <HStack gap="sm">
                <Badge variant="default" size="sm">
                  {segments.length} segments
                </Badge>
                <Badge variant="default" size="sm">
                  {formatDuration(totalDuration)}
                </Badge>
              </HStack>
            </HStack>
          </div>

          {/* Script Content */}
          <div ref={scriptContainerRef} className="flex-1 overflow-y-auto p-4">
            {segments.length > 0 ? (
              <ScriptSegmentsView
                segments={segments}
                selectedSegmentId={selectedSegmentId}
                onSegmentClick={handleSegmentClick}
              />
            ) : (
              <EmptyScriptState />
            )}
          </div>

          {/* Script Input (collapsed when segments exist) */}
          {segments.length === 0 && (
            <div className="p-4 border-t border-border">
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Paste your script here...

Example:
Welcome to our product demo. Today we're showing you something incredible.
This tool will change how you create content forever.
Let's dive right in and see what makes it special."
                rows={8}
                className="w-full resize-none"
              />
            </div>
          )}
        </div>

        {/* Timeline Panel */}
        <div className={`${activeTab === 'timeline' ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}>
          {/* Timeline Header */}
          <div className="px-4 py-3 border-b border-border bg-panel/50">
            <HStack justify="between" className="w-full">
              <Typography variant="subtitle">Timeline Preview</Typography>
              <HStack gap="sm">
                <Badge variant="accent" size="sm">
                  {availableAssets.length} clips matched
                </Badge>
              </HStack>
            </HStack>
          </div>

          {/* Timeline Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {segments.length > 0 ? (
              <TimelinePreview
                segments={segments}
                selectedSegmentId={selectedSegmentId}
                onSegmentSelect={setSelectedSegmentId}
                availableAssets={availableAssets}
              />
            ) : (
              <EmptyTimelineState />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden border-t border-border bg-panel">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <Tab value="script" label="Script" className="flex-1" />
          <Tab value="timeline" label="Timeline" className="flex-1" />
        </Tabs>
      </div>

      {/* Options Modal */}
      {showOptions && (
        <ScriptOptionsModal
          options={options}
          onClose={() => setShowOptions(false)}
          onSave={(newOptions) => {
            setOptions(newOptions);
            setShowOptions(false);
          }}
        />
      )}
    </div>
  );
};

/**
 * Script Segments View Component
 */
interface ScriptSegmentsViewProps {
  segments: ScriptSegment[];
  selectedSegmentId: string | null;
  onSegmentClick: (segment: ScriptSegment) => void;
}

const ScriptSegmentsView: React.FC<ScriptSegmentsViewProps> = ({
  segments,
  selectedSegmentId,
  onSegmentClick
}) => {
  return (
    <VStack gap="sm">
      {segments.map((segment, index) => {
        const isSelected = selectedSegmentId === segment.id;
        const hasMatch = !!segment.matched_asset_id;

        return (
          <div
            key={segment.id}
            onClick={() => onSegmentClick(segment)}
            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'bg-accent-purple/20 ring-1 ring-accent-purple'
                : 'bg-panel hover:bg-panel/80'
            }`}
          >
            <HStack justify="between" className="w-full mb-2">
              <HStack gap="sm">
                <Badge variant="default" size="xs" className="font-mono">
                  {index + 1}
                </Badge>
                <Typography variant="caption" className="text-gray-400 font-mono">
                  {formatDuration(segment.estimated_duration)}
                </Typography>
              </HStack>

              <HStack gap="sm">
                {hasMatch ? (
                  <Badge variant="success" size="xs">
                    ✓ Matched
                  </Badge>
                ) : (
                  <Badge variant="warning" size="xs">
                    Pending
                  </Badge>
                )}
                {segment.semantic_score && (
                  <Typography variant="caption" className="text-gray-500">
                    {segment.semantic_score.toFixed(0)}% match
                  </Typography>
                )}
              </HStack>
            </HStack>

            <Typography variant="body" className="text-gray-200 leading-relaxed">
              {segment.text}
            </Typography>

            <div className="mt-2 flex items-center gap-4">
              <Typography variant="caption" className="text-gray-500">
                {segment.word_count} words
              </Typography>
            </div>
          </div>
        );
      })}
    </VStack>
  );
};

/**
 * Timeline Preview Component
 */
interface TimelinePreviewProps {
  segments: ScriptSegment[];
  selectedSegmentId: string | null;
  onSegmentSelect: (segmentId: string) => void;
  availableAssets: Array<{
    asset_id: string;
    duration: number;
    description?: string;
    thumbnail_url?: string;
  }>;
}

const TimelinePreview: React.FC<TimelinePreviewProps> = ({
  segments,
  selectedSegmentId,
  onSegmentSelect,
  availableAssets
}) => {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAssetForSegment = (segment: ScriptSegment) => {
    if (!segment.matched_asset_id) return null;
    return availableAssets.find(a => a.asset_id === segment.matched_asset_id);
  };

  return (
    <VStack gap="sm">
      {segments.map((segment, index) => {
        const asset = getAssetForSegment(segment);
        const isSelected = selectedSegmentId === segment.id;

        return (
          <Card
            key={segment.id}
            variant={isSelected ? 'elevated' : 'default'}
            padding="sm"
            className={`cursor-pointer transition-all ${
              isSelected ? 'ring-1 ring-accent-purple' : ''
            }`}
            onClick={() => onSegmentSelect(segment.id)}
          >
            <HStack gap="md" className="w-full">
              {/* Thumbnail */}
              <div className="w-32 aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg overflow-hidden flex-shrink-0">
                {asset?.thumbnail_url ? (
                  <img
                    src={asset.thumbnail_url}
                    alt={asset.description || 'Clip thumbnail'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <HStack justify="between" className="w-full mb-1">
                  <HStack gap="sm">
                    <Badge variant="default" size="xs" className="font-mono">
                      {index + 1}
                    </Badge>
                    <Typography variant="caption" className="text-gray-400 font-mono">
                      {formatDuration(segment.estimated_duration)}
                    </Typography>
                  </HStack>

                  {asset && (
                    <Typography variant="caption" className="text-gray-500">
                      {asset.duration.toFixed(1)}s clip
                    </Typography>
                  )}
                </HStack>

                <Typography variant="body" className="text-gray-200 line-clamp-2">
                  {segment.text}
                </Typography>

                {asset?.description && (
                  <Typography variant="caption" className="text-gray-500 mt-1 block">
                    📹 {asset.description}
                  </Typography>
                )}
              </div>

              {/* Play indicator */}
              <div className="flex items-center">
                {isSelected && (
                  <div className="w-8 h-8 rounded-full bg-accent-purple flex items-center justify-center">
                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </HStack>
          </Card>
        );
      })}
    </VStack>
  );
};

/**
 * Script Options Modal
 */
interface ScriptOptionsModalProps {
  options: ScriptToVideoOptions;
  onClose: () => void;
  onSave: (options: ScriptToVideoOptions) => void;
}

const ScriptOptionsModal: React.FC<ScriptOptionsModalProps> = ({
  options,
  onClose,
  onSave
}) => {
  const [localOptions, setLocalOptions] = useState(options);

  const handleSave = () => {
    onSave(localOptions);
  };

  return (
    <Modal isOpen onClose={onClose} title="Script-to-Video Settings" size="md">
      <VStack gap="md" className="p-4">
        {/* Speech Rate */}
        <div>
          <Typography variant="subtitle" className="mb-2">Speech Rate</Typography>
          <Select
            value={localOptions.speech_rate?.toString() || '130'}
            onValueChange={(v) => setLocalOptions({ ...localOptions, speech_rate: parseInt(v) })}
            options={[
              { value: '100', label: 'Slow (100 WPM) - Documentary' },
              { value: '130', label: 'Normal (130 WPM) - Standard' },
              { value: '160', label: 'Fast (160 WPM) - Energetic' },
              { value: '190', label: 'Very Fast (190 WPM) - Hype' }
            ]}
            className="w-full"
          />
        </div>

        {/* Platform */}
        <div>
          <Typography variant="subtitle" className="mb-2">Platform Format</Typography>
          <Select
            value={localOptions.platform || 'tiktok'}
            onValueChange={(v) => setLocalOptions({ ...localOptions, platform: v })}
            options={[
              { value: 'tiktok', label: 'TikTok (9:16)' },
              { value: 'reels', label: 'Instagram Reels (9:16)' },
              { value: 'youtube_shorts', label: 'YouTube Shorts (9:16)' },
              { value: 'youtube', label: 'YouTube (16:9)' },
              { value: 'linkedin', label: 'LinkedIn (4:5)' }
            ]}
            className="w-full"
          />
        </div>

        {/* Caption Style */}
        <div>
          <Typography variant="subtitle" className="mb-2">Caption Style</Typography>
          <Select
            value={localOptions.caption_style || 'tiktok_bold'}
            onValueChange={(v) => setLocalOptions({ ...localOptions, caption_style: v })}
            options={[
              { value: 'tiktok_bold', label: 'TikTok Bold' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'karaoke', label: 'Karaoke (word-by-word)' },
              { value: 'cinematic', label: 'Cinematic' }
            ]}
            className="w-full"
          />
        </div>

        {/* Voice Selection */}
        <div>
          <Typography variant="subtitle" className="mb-2">AI Voice</Typography>
          <Select
            value={localOptions.voice_id || 'elevenlabs_rachel'}
            onValueChange={(v) => setLocalOptions({ ...localOptions, voice_id: v })}
            options={[
              { value: 'elevenlabs_rachel', label: 'Rachel - Professional Female' },
              { value: 'elevenlabs_adam', label: 'Adam - Deep Male Narrator' },
              { value: 'elevenlabs_bella', label: 'Bella - Casual Female' },
              { value: 'elevenlabs_josh', label: 'Josh - Energetic Male' },
              { value: 'elevenlabs_emma', label: 'Emma - British Female' }
            ]}
            className="w-full"
          />
        </div>

        {/* Generate Voiceover Toggle */}
        <div className="flex items-center justify-between p-3 bg-panel rounded-lg">
          <VStack gap="xs">
            <Typography variant="subtitle">Generate Voiceover</Typography>
            <Typography variant="caption" className="text-gray-400">
              Use AI to generate narration from script
            </Typography>
          </VStack>
          <input
            type="checkbox"
            checked={localOptions.generate_voiceover}
            onChange={(e) => setLocalOptions({ ...localOptions, generate_voiceover: e.target.checked })}
            className="w-5 h-5 rounded accent-accent-purple"
          />
        </div>

        {/* Actions */}
        <HStack justify="end" gap="sm" className="pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSave}>
            Save Settings
          </Button>
        </HStack>
      </VStack>
    </Modal>
  );
};

/**
 * Empty States
 */
const EmptyScriptState: React.FC = () => (
  <div className="text-center py-12">
    <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <Typography variant="body" className="text-gray-400">
      Paste your script above to get started
    </Typography>
    <Typography variant="caption" className="text-gray-500 mt-2">
      AI will segment it automatically and match footage to each part
    </Typography>
  </div>
);

const EmptyTimelineState: React.FC = () => (
  <div className="text-center py-12">
    <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
    <Typography variant="body" className="text-gray-400">
      Timeline preview will appear here
    </Typography>
    <Typography variant="caption" className="text-gray-500 mt-2">
      Generate your video to see matched clips
    </Typography>
  </div>
);

/**
 * Utility: Parse script into segments
 */
function parseScriptIntoSegments(script: string): ScriptSegment[] {
  // Split on sentence boundaries
  const sentences = script
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);

  const segments: ScriptSegment[] = [];
  let currentTime = 0;
  const speechRate = 130; // WPM

  sentences.forEach((text, index) => {
    const wordCount = text.trim().split(/\s+/).length;
    const durationMs = Math.ceil((wordCount / speechRate) * 60 * 1000 * 1.1); // 10% buffer

    segments.push({
      id: `seg_${index}_${Date.now()}`,
      text: text.trim(),
      start_time: currentTime,
      end_time: currentTime + durationMs,
      word_count: wordCount,
      estimated_duration: durationMs
    });

    currentTime += durationMs;
  });

  return segments;
}

/**
 * Format duration helper
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default ScriptEditor;
