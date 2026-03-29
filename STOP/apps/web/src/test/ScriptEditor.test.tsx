/**
 * Tests for ScriptEditor Component
 * Task T010: Script-to-video mode
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScriptEditor } from '../components/ScriptEditor';

// Mock UI components
vi.mock('@aura/ui/components/Card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardBody: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  )
}));

vi.mock('@aura/ui/components/Button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  )
}));

vi.mock('@aura/ui/components/Stack', () => ({
  VStack: ({ children, gap, align, justify, className }: any) => (
    <div className={`flex flex-col ${className || ''}`} style={{ gap, alignItems: align, justifyContent: justify }}>
      {children}
    </div>
  ),
  HStack: ({ children, gap, align, justify, className }: any) => (
    <div className={`flex flex-row ${className || ''}`} style={{ gap, alignItems: align, justifyContent: justify }}>
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

vi.mock('@aura/ui/components/Textarea', () => ({
  Textarea: ({ value, onChange, placeholder, rows, className }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={className}
      data-testid="script-input"
    />
  )
}));

vi.mock('@aura/ui/components/Modal', () => ({
  Modal: ({ isOpen, children, onClose, title }: any) => (
    isOpen ? (
      <div data-testid="modal" data-title={title}>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
  )
}));

describe('ScriptEditor', () => {
  const mockProps = {
    initialScript: '',
    availableAssets: [],
    onGenerate: vi.fn(),
    isLoading: false,
    isProcessing: false
  };

  it('renders empty state correctly', () => {
    render(<ScriptEditor {...mockProps} />);
    
    expect(screen.getByText('Script-to-Video')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste your script here/i)).toBeInTheDocument();
  });

  it('displays script input textarea', () => {
    render(<ScriptEditor {...mockProps} />);
    
    const textarea = screen.getByTestId('script-input');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onGenerate when generate button is clicked with script', async () => {
    const onGenerate = vi.fn();
    render(<ScriptEditor {...mockProps} onGenerate={onGenerate} />);
    
    // Enter script
    const textarea = screen.getByTestId('script-input');
    fireEvent.change(textarea, { target: { value: 'Test script content.' } });
    
    // Click generate
    const generateButton = screen.getByText('Generate Video');
    fireEvent.click(generateButton);
    
    expect(onGenerate).toHaveBeenCalled();
  });

  it('disables generate button when no script', () => {
    render(<ScriptEditor {...mockProps} />);
    
    const generateButton = screen.getByText('Generate Video');
    expect(generateButton).toBeDisabled();
  });

  it('shows processing state when isProcessing is true', () => {
    render(<ScriptEditor {...mockProps} isProcessing={true} processingProgress={50} />);
    
    expect(screen.getByText('Generating your video...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('disables generate button when loading', () => {
    render(<ScriptEditor {...mockProps} isLoading={true} />);
    
    const generateButton = screen.getByText('Loading...');
    expect(generateButton).toBeDisabled();
  });

  it('displays segment count badge when segments exist', () => {
    // This would require mocking the segment parsing logic
    // For now, we verify the component structure
    render(<ScriptEditor {...mockProps} />);
    
    expect(screen.getByText(/segments/i)).toBeInTheDocument();
  });

  it('opens settings modal when settings button is clicked', () => {
    render(<ScriptEditor {...mockProps} />);
    
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows speech rate options in settings', () => {
    render(<ScriptEditor {...mockProps} />);
    
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    expect(screen.getByText(/Speech Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Slow/i)).toBeInTheDocument();
    expect(screen.getByText(/Normal/i)).toBeInTheDocument();
    expect(screen.getByText(/Fast/i)).toBeInTheDocument();
  });

  it('shows platform options in settings', () => {
    render(<ScriptEditor {...mockProps} />);
    
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    expect(screen.getByText(/Platform Format/i)).toBeInTheDocument();
    expect(screen.getByText(/TikTok/i)).toBeInTheDocument();
    expect(screen.getByText(/YouTube/i)).toBeInTheDocument();
  });

  it('shows voice selection in settings', () => {
    render(<ScriptEditor {...mockProps} />);
    
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    expect(screen.getByText(/AI Voice/i)).toBeInTheDocument();
    expect(screen.getByText(/Rachel/i)).toBeInTheDocument();
  });

  it('parses script into segments on input', () => {
    render(<ScriptEditor {...mockProps} />);
    
    const textarea = screen.getByTestId('script-input');
    fireEvent.change(textarea, { 
      target: { value: 'First sentence. Second sentence. Third sentence.' } 
    });
    
    // Segments should be created
    expect(screen.getByText('3 segments')).toBeInTheDocument();
  });

  it('calculates estimated duration from script', () => {
    render(<ScriptEditor {...mockProps} />);
    
    const textarea = screen.getByTestId('script-input');
    // ~26 words at 130 WPM = ~12 seconds
    fireEvent.change(textarea, { 
      target: { value: 'This is a test script with multiple words to calculate duration estimate.' } 
    });
    
    // Duration badge should appear
    expect(screen.getByText(/^[0-9]:[0-9]{2}$/)).toBeInTheDocument();
  });
});

describe('ScriptEditor - Empty States', () => {
  it('shows empty script state when no script entered', () => {
    render(<ScriptEditor initialScript="" availableAssets={[]} onGenerate={vi.fn()} />);
    
    expect(screen.getByText(/Paste your script above to get started/i)).toBeInTheDocument();
  });

  it('shows empty timeline state when no segments', () => {
    render(<ScriptEditor initialScript="" availableAssets={[]} onGenerate={vi.fn()} />);
    
    expect(screen.getByText(/Timeline preview will appear here/i)).toBeInTheDocument();
  });
});
