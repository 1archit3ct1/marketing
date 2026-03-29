'use client';

/**
 * AURA Draft Variant Picker Component
 * 3 side-by-side preview cards for variant selection
 * 
 * Variants:
 * - Safe & Proven: Follows platform best practices
 * - Experimental: Trend-chasing with bold choices
 * - Minimal: Clean and straightforward
 */

import React, { useState } from 'react';
import { Card, CardBody } from '@aura/ui/components/Card';
import { Badge } from '@aura/ui/components/Badge';
import { Button } from '@aura/ui/components/Button';
import { VStack, HStack } from '@aura/ui/components/Stack';
import { Typography } from '@aura/ui/components/Typography';
import { ProgressBar } from '@aura/ui/components/ProgressBar';

export type VariantType = 'safe' | 'experimental' | 'minimal';

export interface DraftVariant {
  id: string;
  type: VariantType;
  name: string;
  description: string;
  badge: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  duration: string;
  engagementScore: number;
  clipCount: number;
  cutFrequency: number;
  transitionStyle: string;
  strengths: string[];
  bestFor: string[];
}

export interface DraftVariantPickerProps {
  variants: DraftVariant[];
  selectedId?: string;
  onSelect: (variantId: string) => void;
  onApply: (variantId: string) => void;
  onRegenerate?: (variantType: VariantType) => void;
  isLoading?: boolean;
  className?: string;
}

export const DraftVariantPicker: React.FC<DraftVariantPickerProps> = ({
  variants,
  selectedId,
  onSelect,
  onApply,
  onRegenerate,
  isLoading = false,
  className
}) => {
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="w-full py-12">
        <VStack align="center" gap="md">
          <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
          <Typography variant="body" className="text-gray-400">
            Generating your draft variants...
          </Typography>
          <Typography variant="caption" className="text-gray-500">
            This typically takes 30-60 seconds
          </Typography>
        </VStack>
      </div>
    );
  }

  if (!variants || variants.length === 0) {
    return (
      <div className="w-full py-12 text-center">
        <Typography variant="body" className="text-gray-400">
          No variants generated yet
        </Typography>
      </div>
    );
  }

  const getVariantConfig = (type: VariantType) => {
    const configs = {
      safe: {
        color: '#00e5a0',
        icon: '✓',
        gradient: 'from-emerald-500/20 to-green-500/20'
      },
      experimental: {
        color: '#7c5cfc',
        icon: '⚡',
        gradient: 'from-purple-500/20 to-pink-500/20'
      },
      minimal: {
        color: '#00bcd4',
        icon: '◦',
        gradient: 'from-cyan-500/20 to-blue-500/20'
      }
    };
    return configs[type];
  };

  return (
    <div className={`w-full ${className || ''}`}>
      {/* Header */}
      <div className="mb-6">
        <Typography variant="h4">Your Draft is Ready!</Typography>
        <Typography variant="caption" className="text-gray-400 mt-1">
          Choose the variant that best matches your vision, or generate more options
        </Typography>
      </div>

      {/* Variant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {variants.map((variant) => {
          const config = getVariantConfig(variant.type);
          const isSelected = selectedId === variant.id;
          const isHovered = hoveredVariant === variant.id;

          return (
            <Card
              key={variant.id}
              variant={isSelected ? 'elevated' : 'default'}
              padding="none"
              className={`overflow-hidden cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'ring-2 ring-accent-purple scale-105'
                  : isHovered
                  ? 'scale-102 shadow-xl'
                  : ''
              }`}
              onClick={() => onSelect(variant.id)}
              onMouseEnter={() => setHoveredVariant(variant.id)}
              onMouseLeave={() => setHoveredVariant(null)}
            >
              {/* Thumbnail/Preview */}
              <div className={`relative aspect-video bg-gradient-to-br ${config.gradient}`}>
                {variant.thumbnailUrl ? (
                  <img
                    src={variant.thumbnailUrl}
                    alt={variant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                      style={{ backgroundColor: `${config.color}30`, color: config.color }}
                    >
                      {config.icon}
                    </div>
                  </div>
                )}

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white font-mono">
                  {variant.duration}
                </div>

                {/* Engagement Score */}
                <div className="absolute top-2 left-2">
                  <EngagementScoreBadge score={variant.engagementScore} />
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute inset-0 bg-accent-purple/20 flex items-center justify-center">
                    <div className="w-12 h-12 bg-accent-purple rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <CardBody className="p-4">
                <VStack gap="sm">
                  {/* Title & Badge */}
                  <HStack justify="between" className="w-full">
                    <Typography variant="h4" className="text-base">
                      {variant.name}
                    </Typography>
                    <Badge variant="accent" size="sm">
                      {variant.badge}
                    </Badge>
                  </HStack>

                  {/* Description */}
                  <Typography variant="caption" className="text-gray-400">
                    {variant.description}
                  </Typography>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <StatItem label="Clips" value={variant.clipCount.toString()} />
                    <StatItem label="Cuts/min" value={variant.cutFrequency.toString()} />
                  </div>

                  {/* Transition Style */}
                  <div className="flex items-center gap-2 mt-1">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <Typography variant="caption" className="text-gray-500">
                      {variant.transitionStyle} transitions
                    </Typography>
                  </div>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Variant Details (when selected) */}
      {selectedId && (
        <VariantDetails
          variant={variants.find(v => v.id === selectedId)!}
          onRegenerate={onRegenerate}
        />
      )}

      {/* Action Buttons */}
      <HStack justify="between" className="w-full pt-4 border-t border-border">
        <Button variant="ghost" onClick={() => onSelect('')}>
          Clear Selection
        </Button>
        <HStack gap="sm">
          <Button variant="secondary" disabled={!selectedId}>
            Preview Full
          </Button>
          <Button
            variant="accent"
            onClick={() => selectedId && onApply(selectedId)}
            disabled={!selectedId}
            className="px-6"
          >
            Apply to Project
          </Button>
        </HStack>
      </HStack>
    </div>
  );
};

/**
 * Engagement Score Badge Component
 */
interface EngagementScoreBadgeProps {
  score: number;
}

const EngagementScoreBadge: React.FC<EngagementScoreBadgeProps> = ({ score }) => {
  const getColor = (s: number) => {
    if (s >= 70) return { bg: 'bg-accent-green', text: 'text-accent-green', label: 'High' };
    if (s >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'Medium' };
    return { bg: 'bg-red-500', text: 'text-red-500', label: 'Low' };
  };

  const colors = getColor(score);

  return (
    <div className={`${colors.bg}/20 px-2 py-1 rounded-full border border-${colors.bg.replace('bg-', '')}/30`}>
      <div className="flex items-center gap-1">
        <span className={`text-xs font-semibold ${colors.text}`}>{score}</span>
        <span className="text-xs text-gray-400">score</span>
      </div>
    </div>
  );
};

/**
 * Stat Item Component
 */
interface StatItemProps {
  label: string;
  value: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value }) => (
  <div className="bg-panel rounded-lg p-2 text-center">
    <Typography variant="body" className="text-sm font-semibold text-white">
      {value}
    </Typography>
    <Typography variant="caption" className="text-gray-500">
      {label}
    </Typography>
  </div>
);

/**
 * Variant Details Component
 */
interface VariantDetailsProps {
  variant: DraftVariant;
  onRegenerate?: (variantType: VariantType) => void;
}

const VariantDetails: React.FC<VariantDetailsProps> = ({ variant, onRegenerate }) => {
  return (
    <Card variant="default" padding="md" className="mb-6">
      <VStack gap="md">
        <Typography variant="h4">Why this variant works:</Typography>
        
        <HStack gap="lg" className="w-full">
          {/* Strengths */}
          <div className="flex-1">
            <Typography variant="caption" className="text-gray-400 mb-2 block">Strengths</Typography>
            <ul className="space-y-1">
              {variant.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* Best For */}
          <div className="flex-1">
            <Typography variant="caption" className="text-gray-400 mb-2 block">Best For</Typography>
            <div className="flex flex-wrap gap-2">
              {variant.bestFor.map((useCase, i) => (
                <Badge key={i} variant="default" size="sm">
                  {useCase}
                </Badge>
              ))}
            </div>
          </div>
        </HStack>

        {/* Regenerate Option */}
        {onRegenerate && (
          <div className="pt-4 border-t border-border">
            <Typography variant="caption" className="text-gray-400 mb-2 block">
              Want a different take?
            </Typography>
            <Button variant="ghost" size="sm" onClick={() => onRegenerate(variant.type)}>
              Regenerate this variant
            </Button>
          </div>
        )}
      </VStack>
    </Card>
  );
};

export default DraftVariantPicker;
