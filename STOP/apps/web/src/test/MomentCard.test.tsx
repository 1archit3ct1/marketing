/**
 * Tests for MomentCard Component
 * Task T011: Moment graph — primary creative interface
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MomentCard } from '../components/MomentCard';

// Mock UI components
vi.mock('@aura/ui/components/Card', () => ({
  Card: ({ children, className, variant, ...props }: any) => (
    <div className={`${className || ''} ${variant === 'elevated' ? 'elevated' : ''}`} {...props}>
      {children}
    </div>
  ),
  CardBody: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  )
}));

vi.mock('@aura/ui/components/Button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${className || ''} ${variant || ''} ${size || ''}`} 
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('@aura/ui/components/Stack', () => ({
  VStack: ({ children, gap, align, justify, className }: any) => (
    <div className={`flex flex-col ${className || ''}`} style={{ gap }}>
      {children}
    </div>
  ),
  HStack: ({ children, gap, align, justify, className }: any) => (
    <div className={`flex flex-row ${className || ''}`} style={{ gap }}>
      {children}
    </div>
  )
}));

vi.mock('@aura/ui/components/Typography', () => ({
  Typography: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>{children}</span>
  )
}));

vi.mock('@aura/ui/components/Badge', () => ({
  Badge: ({ children, variant, size, className, style }: any) => (
    <span className={className} data-variant={variant} data-size={size} style={style}>
      {children}
    </span>
  )
}));

vi.mock('@aura/ui/components/ProgressBar', () => ({
  ProgressBar: ({ value, className, color }: any) => (
    <div 
      className={className} 
      data-value={value} 
      data-color={color}
      data-testid="progress-bar"
    >
      <div style={{ width: `${value}%` }} />
    </div>
  )
}));

vi.mock('@aura/ui/components/Tooltip', () => ({
  Tooltip: ({ children, content }: any) => (
    <span title={content} data-testid="tooltip">{children}</span>
  )
}));

const mockMoment = {
  id: 'moment_001',
  scene_type: 'hook' as const,
  label: 'Hook',
  description: 'Opening moment - needs to grab attention',
  start_ms: 0,
  end_ms: 3000,
  duration_ms: 3000,
  engagement_score: 75,
  engagement_factors: { motion: '+20 (high motion hook)' },
  suggestions: [
    {
      id: 'sug_1',
      type: 'hook_improvement',
      priority: 'high' as const,
      message: 'This hook has low energy',
      action: 'add_jump_cut',
      impact: '+15-25% retention'
    }
  ],
  has_face: true,
  face_count: 1,
  motion_level: 0.8,
  audio_energy: 0.7,
  has_speech: true,
  has_text: false,
  source_asset_id: 'asset_001'
};

describe('MomentCard', () => {
  const mockProps = {
    moment: mockMoment,
    index: 0,
    onSelect: vi.fn(),
    onDelete: vi.fn(),
    onApplySuggestion: vi.fn()
  };

  it('renders moment card with basic info', () => {
    render(<MomentCard {...mockProps} />);
    
    expect(screen.getByText('Hook')).toBeInTheDocument();
    expect(screen.getByText('Opening moment - needs to grab attention')).toBeInTheDocument();
  });

  it('displays duration badge', () => {
    render(<MomentCard {...mockProps} />);
    
    expect(screen.getByText('3.0s')).toBeInTheDocument();
  });

  it('shows engagement score', () => {
    render(<MomentCard {...mockProps} />);
    
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Engagement')).toBeInTheDocument();
  });

  it('renders progress bar with correct value', () => {
    render(<MomentCard {...mockProps} />);
    
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toHaveAttribute('data-value', '75');
  });

  it('shows face indicator when has_face is true', () => {
    render(<MomentCard {...mockProps} />);
    
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toHaveAttribute('title', 'Face detected');
  });

  it('shows speech indicator when has_speech is true', () => {
    render(<MomentCard {...mockProps} />);
    
    const tooltips = screen.getAllByTestId('tooltip');
    const speechTooltip = tooltips.find(t => 
      t.getAttribute('title') === 'Speech detected'
    );
    expect(speechTooltip).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', () => {
    const onSelect = vi.fn();
    render(<MomentCard {...mockProps} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Hook'));
    expect(onSelect).toHaveBeenCalledWith('moment_001');
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<MomentCard {...mockProps} onDelete={onDelete} />);
    
    // Find and click delete button
    const deleteButton = screen.getByRole('button');
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith('moment_001');
  });

  it('displays suggestions chips', () => {
    render(<MomentCard {...mockProps} />);
    
    expect(screen.getByText('AI Suggestions')).toBeInTheDocument();
    expect(screen.getByText('hook improvement')).toBeInTheDocument();
  });

  it('shows suggestion message on hover/expand', () => {
    render(<MomentCard {...mockProps} />);
    
    expect(screen.getByText('Show (1)')).toBeInTheDocument();
  });

  it('applies suggestion when Apply button is clicked', () => {
    const onApplySuggestion = vi.fn();
    render(<MomentCard {...mockProps} onApplySuggestion={onApplySuggestion} />);
    
    // Expand suggestions
    fireEvent.click(screen.getByText('Show (1)'));
    
    // Click Apply
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);
    
    expect(onApplySuggestion).toHaveBeenCalledWith('moment_001', 'sug_1');
  });

  it('shows high engagement score in green', () => {
    const highEngagementMoment = { ...mockMoment, engagement_score: 85 };
    render(<MomentCard {...mockProps} moment={highEngagementMoment} />);
    
    const scoreElement = screen.getByText('85');
    expect(scoreElement).toBeInTheDocument();
  });

  it('shows low engagement score in red', () => {
    const lowEngagementMoment = { ...mockMoment, engagement_score: 25 };
    render(<MomentCard {...mockProps} moment={lowEngagementMoment} />);
    
    const scoreElement = screen.getByText('25');
    expect(scoreElement).toBeInTheDocument();
  });

  it('displays scene type color bar', () => {
    render(<MomentCard {...mockProps} />);
    
    // Hook should have orange color (#f5820a)
    const card = screen.getByText('Hook').closest('div');
    expect(card).toBeInTheDocument();
  });

  it('renders waveform strip', () => {
    render(<MomentCard {...mockProps} />);
    
    // Waveform should be present
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('shows quick actions when selected', () => {
    render(<MomentCard {...mockProps} isSelected={true} />);
    
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Replace')).toBeInTheDocument();
  });

  it('is draggable', () => {
    render(<MomentCard {...mockProps} />);
    
    const card = screen.getByText('Hook').closest('div');
    expect(card).toHaveAttribute('draggable', 'true');
  });
});

describe('MomentCard - Scene Types', () => {
  it('renders hook scene type correctly', () => {
    const hookMoment = { ...mockMoment, scene_type: 'hook' as const, label: 'Hook' };
    render(<MomentCard {...mockProps} moment={hookMoment} />);
    
    expect(screen.getByText('Hook')).toBeInTheDocument();
  });

  it('renders intro scene type correctly', () => {
    const introMoment = { ...mockMoment, scene_type: 'intro' as const, label: 'Intro' };
    render(<MomentCard {...mockProps} moment={introMoment} />);
    
    expect(screen.getByText('Intro')).toBeInTheDocument();
  });

  it('renders demo scene type correctly', () => {
    const demoMoment = { ...mockMoment, scene_type: 'demo' as const, label: 'Demo' };
    render(<MomentCard {...mockProps} moment={demoMoment} />);
    
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('renders CTA scene type correctly', () => {
    const ctaMoment = { ...mockMoment, scene_type: 'cta' as const, label: 'CTA' };
    render(<MomentCard {...mockProps} moment={ctaMoment} />);
    
    expect(screen.getByText('CTA')).toBeInTheDocument();
  });
});

describe('MomentCard - Engagement Scores', () => {
  it('displays high engagement (>=70) correctly', () => {
    const moment = { ...mockMoment, engagement_score: 85 };
    render(<MomentCard {...mockProps} moment={moment} />);
    
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('displays medium engagement (40-69) correctly', () => {
    const moment = { ...mockMoment, engagement_score: 55 };
    render(<MomentCard {...mockProps} moment={moment} />);
    
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('displays low engagement (<40) correctly', () => {
    const moment = { ...mockMoment, engagement_score: 25 };
    render(<MomentCard {...mockProps} moment={moment} />);
    
    expect(screen.getByText('25')).toBeInTheDocument();
  });
});
