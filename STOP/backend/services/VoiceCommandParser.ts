/**
 * AURA Voice Command Parser Service
 * Parses voice commands into structured editing operations
 * 
 * Uses Whisper for transcription + GPT-4o function calling for intent parsing
 */

export type CommandType = 
  | 'cut'
  | 'trim'
  | 'speed'
  | 'delete'
  | 'add'
  | 'replace'
  | 'style'
  | 'duration'
  | 'navigation'
  | 'playback'
  | 'caption'
  | 'audio'
  | 'effect';

export interface ParsedCommand {
  type: CommandType;
  action: string;
  parameters: Record<string, any>;
  confidence: number;
  originalText: string;
  timelineOperation?: TimelineOperation;
}

export interface TimelineOperation {
  type: 'mutation' | 'ai_service' | 'render_param';
  operation: string;
  payload: Record<string, any>;
}

/**
 * Voice Command Parser
 * Transcribes and parses voice commands into structured operations
 */
export class VoiceCommandParser {
  private commandPatterns: CommandPattern[];

  constructor() {
    this.commandPatterns = this.initializeCommandPatterns();
  }

  /**
   * Parse voice command text into structured operation
   */
  async parseCommand(audioBlob: Blob): Promise<ParsedCommand> {
    // Step 1: Transcribe audio using Whisper
    const transcript = await this.transcribeWithWhisper(audioBlob);
    
    // Step 2: Parse transcript into structured command
    return this.parseTranscript(transcript);
  }

  /**
   * Parse text transcript into structured command
   */
  async parseTranscript(transcript: string): Promise<ParsedCommand> {
    const normalizedText = transcript.toLowerCase().trim();

    // Try pattern matching first (faster, no API call)
    const patternMatch = this.matchPattern(normalizedText);
    if (patternMatch) {
      return patternMatch;
    }

    // Fall back to LLM parsing for complex commands
    return this.parseWithLLM(normalizedText);
  }

  /**
   * Transcribe audio using Whisper API
   */
  private async transcribeWithWhisper(audioBlob: Blob): Promise<string> {
    // In production, call Whisper API
    // For now, this is a placeholder
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    // Mock response for development
    // In production:
    // const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    //   body: formData
    // });
    // const data = await response.json();
    // return data.text;

    return 'mock transcript';
  }

  /**
   * Parse command using LLM (GPT-4o with function calling)
   */
  private async parseWithLLM(text: string): Promise<ParsedCommand> {
    // In production, call GPT-4o with function definitions
    const functions = [
      {
        name: 'cut_timeline',
        description: 'Cut or split the timeline at a specific position',
        parameters: {
          type: 'object',
          properties: {
            timecode: { type: 'string', description: 'Timecode like "0:42" or "at 5 seconds"' }
          },
          required: ['timecode']
        }
      },
      {
        name: 'trim_clip',
        description: 'Trim a clip duration',
        parameters: {
          type: 'object',
          properties: {
            direction: { type: 'string', enum: ['start', 'end', 'both'] },
            amount: { type: 'string', description: 'Amount to trim like "2 seconds" or "shorter"' }
          }
        }
      },
      {
        name: 'change_speed',
        description: 'Change playback speed of a clip or section',
        parameters: {
          type: 'object',
          properties: {
            section: { type: 'string', description: 'Which section like "first 5 seconds"' },
            speed: { type: 'string', description: 'Speed like "faster", "slower", "2x"' }
          }
        }
      },
      {
        name: 'delete_content',
        description: 'Delete a clip or section',
        parameters: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'What to delete like "clip where I say um"' }
          }
        }
      },
      {
        name: 'add_element',
        description: 'Add an element to the timeline',
        parameters: {
          type: 'object',
          properties: {
            element: { type: 'string', description: 'What to add like "beat drop", "transition"' },
            position: { type: 'string', description: 'Where to add it' }
          }
        }
      },
      {
        name: 'replace_element',
        description: 'Replace an element with something else',
        parameters: {
          type: 'object',
          properties: {
            current: { type: 'string', description: 'What to replace' },
            replacement: { type: 'string', description: 'What to replace with' }
          }
        }
      },
      {
        name: 'change_style',
        description: 'Change visual style or appearance',
        parameters: {
          type: 'object',
          properties: {
            element: { type: 'string', description: 'What to style like "captions", "background"' },
            style: { type: 'string', description: 'How to style it like "bigger", "more minimal"' }
          }
        }
      },
      {
        name: 'change_duration',
        description: 'Change overall video duration',
        parameters: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Target duration like "30 seconds"' }
          }
        }
      }
    ];

    // Mock LLM response for development
    // In production, call OpenAI API with function calling
    return this.heuristicParse(text);
  }

  /**
   * Heuristic parsing for common commands
   */
  private heuristicParse(text: string): ParsedCommand {
    // Cut commands
    if (text.includes('cut') && (text.includes('at') || text.includes('where'))) {
      const timecode = this.extractTimecode(text);
      return {
        type: 'cut',
        action: 'split_timeline',
        parameters: { timecode },
        confidence: 0.9,
        originalText: text,
        timelineOperation: {
          type: 'mutation',
          operation: 'splitClip',
          payload: { position: this.timecodeToMs(timecode) }
        }
      };
    }

    // Speed commands
    if (text.includes('faster') || text.includes('slower') || text.includes('speed')) {
      const speed = text.includes('faster') ? 1.5 : text.includes('slower') ? 0.75 : 1.0;
      const section = this.extractSection(text);
      return {
        type: 'speed',
        action: 'change_speed',
        parameters: { speed, section },
        confidence: 0.85,
        originalText: text,
        timelineOperation: {
          type: 'mutation',
          operation: 'updateClipSpeed',
          payload: { speed, section }
        }
      };
    }

    // Delete commands
    if (text.includes('remove') || text.includes('delete')) {
      const target = this.extractDeleteTarget(text);
      return {
        type: 'delete',
        action: 'delete_content',
        parameters: { target },
        confidence: 0.85,
        originalText: text,
        timelineOperation: {
          type: 'mutation',
          operation: 'removeClip',
          payload: { criteria: target }
        }
      };
    }

    // Add commands
    if (text.includes('add') && (text.includes('beat') || text.includes('transition') || text.includes('effect'))) {
      const element = this.extractElement(text);
      const position = this.extractPosition(text);
      return {
        type: 'add',
        action: 'add_element',
        parameters: { element, position },
        confidence: 0.8,
        originalText: text,
        timelineOperation: {
          type: 'ai_service',
          operation: 'addElement',
          payload: { element, position }
        }
      };
    }

    // Style commands
    if (text.includes('make') && (text.includes('bigger') || text.includes('smaller') || text.includes('minimal'))) {
      const element = this.extractStyledElement(text);
      const style = this.extractStyle(text);
      return {
        type: 'style',
        action: 'change_style',
        parameters: { element, style },
        confidence: 0.85,
        originalText: text,
        timelineOperation: {
          type: 'mutation',
          operation: 'updateStyle',
          payload: { element, style }
        }
      };
    }

    // Duration commands
    if (text.includes('shorten') || text.includes('lengthen') || text.includes('seconds')) {
      const target = this.extractDuration(text);
      return {
        type: 'duration',
        action: 'change_duration',
        parameters: { target },
        confidence: 0.8,
        originalText: text,
        timelineOperation: {
          type: 'ai_service',
          operation: 'adjustDuration',
          payload: { targetDurationMs: this.durationToMs(target) }
        }
      };
    }

    // Default: unknown command
    return {
      type: 'navigation',
      action: 'unknown',
      parameters: {},
      confidence: 0.5,
      originalText: text
    };
  }

  /**
   * Initialize command patterns for quick matching
   */
  private initializeCommandPatterns(): CommandPattern[] {
    return [
      {
        pattern: /cut (?:the )?(?:pause|clip)?(?: at )?(\d+:\d+|\d+ seconds?)/i,
        handler: (match) => ({
          type: 'cut' as CommandType,
          action: 'split_timeline',
          parameters: { timecode: match[1] },
          confidence: 0.95
        })
      },
      {
        pattern: /make (?:the )?(?:first )?(\d+ seconds?) faster/i,
        handler: (match) => ({
          type: 'speed' as CommandType,
          action: 'increase_speed',
          parameters: { section: match[1], speed: 1.5 },
          confidence: 0.9
        })
      },
      {
        pattern: /add (?:a )?(beat drop|transition|effect)(?: at )?(.*)/i,
        handler: (match) => ({
          type: 'add' as CommandType,
          action: 'add_element',
          parameters: { element: match[1], position: match[2] || 'current position' },
          confidence: 0.85
        })
      },
      {
        pattern: /remove (?:the )?clip (?:where )?(?:i )?(?:say|have) (.*)/i,
        handler: (match) => ({
          type: 'delete' as CommandType,
          action: 'delete_by_content',
          parameters: { keyword: match[1] },
          confidence: 0.85
        })
      },
      {
        pattern: /make (?:the )?captions (bigger|smaller)/i,
        handler: (match) => ({
          type: 'style' as CommandType,
          action: 'update_captions',
          parameters: { element: 'captions', style: match[1] },
          confidence: 0.9
        })
      },
      {
        pattern: /shorten (?:this to|to) (\d+ seconds?)/i,
        handler: (match) => ({
          type: 'duration' as CommandType,
          action: 'reduce_duration',
          parameters: { target: match[1] },
          confidence: 0.85
        })
      },
      {
        pattern: /swap (?:the )?background (?:to)?(?: a)?(?: more)? (minimal|colorful|dark|bright)/i,
        handler: (match) => ({
          type: 'replace' as CommandType,
          action: 'replace_background',
          parameters: { style: match[1] },
          confidence: 0.85
        })
      }
    ];
  }

  /**
   * Match text against known patterns
   */
  private matchPattern(text: string): ParsedCommand | null {
    for (const { pattern, handler } of this.commandPatterns) {
      const match = text.match(pattern);
      if (match) {
        const result = handler(match);
        return {
          ...result,
          originalText: text,
          timelineOperation: this.commandToOperation(result)
        };
      }
    }
    return null;
  }

  /**
   * Convert parsed command to timeline operation
   */
  private commandToOperation(command: any): TimelineOperation | undefined {
    switch (command.type) {
      case 'cut':
        return {
          type: 'mutation',
          operation: 'splitClip',
          payload: { position: this.timecodeToMs(command.parameters.timecode) }
        };
      case 'speed':
        return {
          type: 'mutation',
          operation: 'updateClipSpeed',
          payload: command.parameters
        };
      case 'delete':
        return {
          type: 'mutation',
          operation: 'removeClip',
          payload: { criteria: command.parameters.keyword }
        };
      case 'add':
        return {
          type: 'ai_service',
          operation: 'addElement',
          payload: command.parameters
        };
      case 'style':
        return {
          type: 'mutation',
          operation: 'updateStyle',
          payload: command.parameters
        };
      case 'duration':
        return {
          type: 'ai_service',
          operation: 'adjustDuration',
          payload: { targetDurationMs: this.durationToMs(command.parameters.target) }
        };
      default:
        return undefined;
    }
  }

  // Helper extraction methods

  private extractTimecode(text: string): string {
    const match = text.match(/(\d+:\d+|\d+ seconds?)/i);
    return match ? match[1] : '0:00';
  }

  private extractSection(text: string): string {
    const match = text.match(/(first \d+ seconds?|last \d+ seconds?|beginning|end)/i);
    return match ? match[1] : 'selected clip';
  }

  private extractDeleteTarget(text: string): string {
    const match = text.match(/(?:where|that) (.*)/i);
    return match ? match[1] : 'selected';
  }

  private extractElement(text: string): string {
    const match = text.match(/add (a )?(.*) (?:at)/i);
    return match ? match[2] : 'element';
  }

  private extractPosition(text: string): string {
    const match = text.match(/at (.*)/i);
    return match ? match[1] : 'current position';
  }

  private extractStyledElement(text: string): string {
    const match = text.match(/make (?:the )?(.*) (?:bigger|smaller|more)/i);
    return match ? match[1] : 'element';
  }

  private extractStyle(text: string): string {
    if (text.includes('bigger')) return 'increase_size';
    if (text.includes('smaller')) return 'decrease_size';
    if (text.includes('minimal')) return 'minimal';
    return 'default';
  }

  private extractDuration(text: string): string {
    const match = text.match(/(\d+ seconds?)/i);
    return match ? match[1] : '60 seconds';
  }

  private timecodeToMs(timecode: string): number {
    const match = timecode.match(/(\d+):(\d+)/);
    if (match) {
      return (parseInt(match[1]) * 60 + parseInt(match[2])) * 1000;
    }
    const seconds = parseInt(timecode);
    return seconds * 1000;
  }

  private durationToMs(duration: string): number {
    const match = duration.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]) * 1000;
    }
    return 60000;
  }
}

interface CommandPattern {
  pattern: RegExp;
  handler: (match: RegExpMatchArray) => Partial<ParsedCommand>;
}

// Utility function for quick parsing
export function parseVoiceCommand(text: string): Promise<ParsedCommand> {
  const parser = new VoiceCommandParser();
  return parser.parseTranscript(text);
}

export default VoiceCommandParser;
