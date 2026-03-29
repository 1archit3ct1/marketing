/**
 * Tests for MomentGraph Component
 * Task T011: Moment graph — primary creative interface
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MomentGraph } from '../components/MomentGraph';

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
      className={`${className || ''} ${variant || ''}`} 
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
  Badge: ({ children, variant, size, className }: any) => (
    <span className={className} data-variant={variant} data-size={size}>{children}</span>
  )
}));

vi.mock('@aura/ui/components/Toggle', () => ({
  Toggle: ({ leftLabel, rightLabel, value, onChange }: any) => (
    <div 
      data-testid="toggle" 
      data-value={value}
      onClick={() => onChange(!value)}
      className="cursor-pointer"
    >
      <span>{leftLabel}</span>
      <span>{rightLabel}</span>
    </div>
  )
}));

vi.mock('@aura/ui/components/Modal', () => ({
  Modal: ({ isOpen, children, onClose, title }: any) => (
    isOpen ? (
      <div data-testid="modal" data-title={title}>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        {children}
      </div>
    ) : null
  )
}));

vi.mock('../components/MomentCard', () => ({
  MomentCard: ({ moment, isSelected, onSelect }: any) => (
    <div 
      data-testid="moment-card" 
      data-id={moment.id}
      data-selected={isSelected}
      onClick={() => onSelect?.(moment.id)}
      className="moment-card"
    >
      <span>{moment.label}</span>
    </div>
  )
}));

const mockMomentData = {
  moments: [
    {
      id: 'moment_001',
      scene_type: 'hook' as const,
      label: 'Hook',
      description: 'Opening moment',
      start_ms: 0,
      end_ms: 3000,
      duration_ms: 3000,
      engagement_score: 75,
      engagement_factors: {},
      suggestions: [],
      has_face: true,
      face_count: 1,
      motion_level: 0.8,
      audio_energy: 0.7,
      has_speech: true,
      has_text: false,
      source_asset_id: 'asset_001'
    },
    {
      id: 'moment_002',
      scene_type: 'intro' as const,
      label: 'Intro',
      description: 'Introduction segment',
      start_ms: 3000,
      end_ms: 8000,
      duration_ms: 5000,
      engagement_score: 65,
      engagement_factors: {},
      suggestions: [],
      has_face: true,
      face_count: 1,
      motion_level: 0.5,
      audio_energy: 0.6,
      has_speech: true,
      has_text: false,
      source_asset_id: 'asset_001'
    },
    {
      id: 'moment_003',
      scene_type: 'cta' as const,
      label: 'CTA',
      description: 'Call to action',
      start_ms: 55000,
      end_ms: 60000,
      duration_ms: 5000,
      engagement_score: 70,
      engagement_factors: {},
      suggestions: [],
      has_face: true,
      face_count: 1,
      motion_level: 0.6,
      audio_energy: 0.7,
      has_speech: true,
      has_text: true,
      source_asset_id: 'asset_001'
    }
  ],
  total_duration_ms: 60000,
  source_asset_id: 'asset_001',
  created_at: '2024-01-01T00:00:00Z'
};

describe('MomentGraph', () => {
  const mockProps = {
    data: mockMomentData,
    isLoading: false,
    viewMode: 'moment' as const,
    onViewModeChange: vi.fn(),
    onMomentSelect: vi.fn(),
    onMomentDelete: vi.fn(),
    onMomentAdd: vi.fn(),
    onMomentReorder: vi.fn()
  };

  it('renders moment graph header', () => {
    render(<MomentGraph {...mockProps} />);
    
    expect(screen.getByText('Moment Graph')).toBeInTheDocument();
  });

  it('displays moment count badge', () => {
    render(<MomentGraph {...mockProps} />);
    
    expect(screen.getByText('3 moments')).toBeInTheDocument();
  });

  it('renders moment cards', () => {
    render(<MomentGraph {...mockProps} />);
    
    const cards = screen.getAllByTestId('moment-card');
    expect(cards).toHaveLength(3);
  });

  it('displays total duration', () => {
    render(<MomentGraph {...mockProps} />);
    
    expect(screen.getByText('Total: 1:00')).toBeInTheDocument();
  });

  it('shows average engagement score', () => {
    render(<MomentGraph {...mockProps} />);
    
    // Average of 75, 65, 70 = 70
    expect(screen.getByText('Avg Engagement')).toBeInTheDocument();
    expect(screen.getByText('70/100')).toBeInTheDocument();
  });

  it('shows high score moments count', () => {
    render(<MomentGraph {...mockProps} />);
    
    // Moments with score >= 70: moment_001 (75), moment_003 (70)
    expect(screen.getByText('High Score Moments')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows moments needing improvement', () => {
    render(<MomentGraph {...mockProps} />);
    
    // Moments with score < 40: none
    expect(screen.getByText('Needs Improvement')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('calls onMomentSelect when card is clicked', () => {
    const onMomentSelect = vi.fn();
    render(<MomentGraph {...mockProps} onMomentSelect={onMomentSelect} />);
    
    const cards = screen.getAllByTestId('moment-card');
    fireEvent.click(cards[0]);
    
    expect(onMomentSelect).toHaveBeenCalledWith('moment_001');
  });

  it('calls onMomentAdd when add button is clicked', () => {
    const onMomentAdd = vi.fn();
    render(<MomentGraph {...mockProps} onMomentAdd={onMomentAdd} />);
    
    const addButton = screen.getByText('Add Moment');
    fireEvent.click(addButton);
    
    expect(onMomentAdd).toHaveBeenCalled();
  });

  it('opens add moment modal', () => {
    render(<MomentGraph {...mockProps} />);
    
    const addButton = screen.getByText('Add Moment');
    fireEvent.click(addButton);
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows view mode toggle', () => {
    render(<MomentGraph {...mockProps} />);
    
    expect(screen.getByTestId('toggle')).toBeInTheDocument();
    expect(screen.getByText('Moment')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('calls onViewModeChange when toggle is clicked', () => {
    const onViewModeChange = vi.fn();
    render(<MomentGraph {...mockProps} onViewModeChange={onViewModeChange} />);
    
    const toggle = screen.getByTestId('toggle');
    fireEvent.click(toggle);
    
    expect(onViewModeChange).toHaveBeenCalledWith('timeline');
  });

  it('renders timeline view when viewMode is timeline', () => {
    render(<MomentGraph {...mockProps} viewMode="timeline" />);
    
    expect(screen.getByText('Timeline View')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<MomentGraph {...mockProps} isLoading={true} />);
    
    expect(screen.getByText('Analyzing your video...')).toBeInTheDocument();
    expect(screen.getByText('Detecting scenes, faces, and engagement patterns')).toBeInTheDocument();
  });

  it('renders empty state when no moments', () => {
    render(<MomentGraph {...mockProps} data={{ moments: [], total_duration_ms: 0, source_asset_id: 'test', created_at: 'test' }} />);
    
    expect(screen.getByText('No moments yet')).toBeInTheDocument();
    expect(screen.getByText('Add First Moment')).toBeInTheDocument();
  });

  it('displays add moment modal with type options', () => {
    render(<MomentGraph {...mockProps} />);
    
    const addButton = screen.getByText('Add Moment');
    fireEvent.click(addButton);
    
    expect(screen.getByText('B-Roll')).toBeInTheDocument();
    expect(screen.getByText('From Library')).toBeInTheDocument();
    expect(screen.getByText('AI Generated')).toBeInTheDocument();
  });

  it('shows drag hint in header', () => {
    render(<MomentGraph {...mockProps} />);
    
    expect(screen.getByText(/Drag to reorder/i)).toBeInTheDocument();
  });

  it('displays moment descriptions', () => {
    render(<MomentGraph {...mockProps} />);
    
    expect(screen.getByText('Opening moment')).toBeInTheDocument();
    expect(screen.getByText('Introduction segment')).toBeInTheDocument();
    expect(screen.getByText('Call to action')).toBeInTheDocument();
  });
});

describe('MomentGraph - Empty State', () => {
  it('shows upload video option in empty state', () => {
    render(<MomentGraph 
      data={{ moments: [], total_duration_ms: 0, source_asset_id: 'test', created_at: 'test' }}
      isLoading={false}
      onMomentAdd={vi.fn()}
    />);
    
    expect(screen.getByText('Upload Video')).toBeInTheDocument();
  });

  it('explains moment graph purpose in empty state', () => {
    render(<MomentGraph 
      data={{ moments: [], total_duration_ms: 0, source_asset_id: 'test', created_at: 'test' }}
      isLoading={false}
      onMomentAdd={vi.fn()}
    />);
    
    expect(screen.getByText(/Upload a video to automatically detect scenes/i)).toBeInTheDocument();
  });
});

describe('MomentGraph - Stats', () => {
  it('calculates correct average engagement', () => {
    const testData = {
      moments: [
        { ...mockMomentData.moments[0], engagement_score: 80 },
        { ...mockMomentData.moments[1], engagement_score: 60 },
        { ...mockMomentData.moments[2], engagement_score: 70 }
      ],
      total_duration_ms: 60000,
      source_asset_id: 'test',
      created_at: 'test'
    };
    
    render(<MomentGraph {...mockProps} data={testData} />);
    
    // Average: (80 + 60 + 70) / 3 = 70
    expect(screen.getByText('70/100')).toBeInTheDocument();
  });

  it('shows color-coded engagement scores', () => {
    render(<MomentGraph {...mockProps} />);
    
    // Should show stats bar with engagement info
    expect(screen.getByText('Avg Engagement')).toBeInTheDocument();
  });
});
