/**
 * AURA Intent Parser Service
 * Parses natural language intent into structured editing parameters
 */

export interface ParsedIntent {
  targetDuration: number; // seconds
  energyLevel: 'low' | 'medium' | 'high';
  contentType: string;
  keyMoments: string[];
  styleKeywords: string[];
  platform?: 'tiktok' | 'reels' | 'youtube_shorts' | 'youtube' | 'linkedin' | 'x';
  vibe?: 'hype' | 'chill' | 'professional' | 'funny' | 'emotional';
  hasVoiceover?: boolean;
  hasMusic?: boolean;
  hasCaptions?: boolean;
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5';
}

export interface IntentExample {
  text: string;
  expected: Partial<ParsedIntent>;
}

/**
 * Parse intent text into structured parameters
 */
export function parseIntent(text: string, platform?: string, vibe?: string): ParsedIntent {
  const normalizedText = text.toLowerCase();
  
  const result: ParsedIntent = {
    targetDuration: detectDuration(normalizedText),
    energyLevel: detectEnergyLevel(normalizedText),
    contentType: detectContentType(normalizedText),
    keyMoments: detectKeyMoments(normalizedText),
    styleKeywords: detectStyleKeywords(normalizedText),
    platform: platform as ParsedIntent['platform'],
    vibe: vibe as ParsedIntent['vibe'],
    hasVoiceover: detectVoiceover(normalizedText),
    hasMusic: detectMusic(normalizedText),
    hasCaptions: detectCaptions(normalizedText),
    aspectRatio: detectAspectRatio(platform)
  };
  
  return result;
}

/**
 * Detect target duration from intent text
 */
function detectDuration(text: string): number {
  // Match patterns like "60s", "1 minute", "2 min", "30 second"
  const durationPatterns = [
    /(\d+)\s*(?:sec|s)\b/,
    /(\d+)\s*(?:min|m|minute|minutes)\b/,
    /(\d+)\s*(?:hour|h|hours)\b/,
    /under\s*(\d+)\s*(?:sec|s|min|m)/,
    /(?:around|about|approximately)\s*(\d+)\s*(?:sec|s|min|m)/
  ];
  
  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      if (pattern.toString().includes('min')) {
        return value * 60;
      } else if (pattern.toString().includes('hour')) {
        return value * 3600;
      } else {
        return value;
      }
    }
  }
  
  // Default based on keywords
  if (text.includes('short') || text.includes('quick')) return 15;
  if (text.includes('long') || text.includes('detailed')) return 120;
  
  // Default: 60 seconds
  return 60;
}

/**
 * Detect energy level from intent text
 */
function detectEnergyLevel(text: string): 'low' | 'medium' | 'high' {
  const highEnergyKeywords = [
    'hype', 'energetic', 'high energy', 'fast', 'fast-paced', 'intense',
    'exciting', 'dynamic', 'punchy', 'aggressive', 'workout', 'gym',
    'party', 'celebration', 'epic', 'dramatic'
  ];
  
  const lowEnergyKeywords = [
    'calm', 'relaxed', 'chill', 'slow', 'peaceful', 'meditative',
    'soothing', 'gentle', 'ambient', 'lo-fi', 'asmr'
  ];
  
  for (const keyword of highEnergyKeywords) {
    if (text.includes(keyword)) return 'high';
  }
  
  for (const keyword of lowEnergyKeywords) {
    if (text.includes(keyword)) return 'low';
  }
  
  return 'medium';
}

/**
 * Detect content type from intent text
 */
function detectContentType(text: string): string {
  const contentTypes: Record<string, string[]> = {
    'tutorial': ['tutorial', 'how-to', 'teach', 'learn', 'guide', 'explain'],
    'vlog': ['vlog', 'day in my life', 'daily', 'lifestyle'],
    'review': ['review', 'unboxing', 'first impressions', 'reaction'],
    'comedy': ['comedy', 'funny', 'skit', 'joke', 'meme', 'parody'],
    'fitness': ['fitness', 'workout', 'gym', 'exercise', 'training'],
    'cooking': ['cooking', 'recipe', 'food', 'chef', 'meal'],
    'travel': ['travel', 'trip', 'vacation', 'destination', 'adventure'],
    'beauty': ['beauty', 'makeup', 'skincare', 'grwm', 'get ready'],
    'tech': ['tech', 'technology', 'gadgets', 'software', 'app'],
    'music': ['music', 'song', 'cover', 'performance', 'dance'],
    'gaming': ['gaming', 'game', 'gameplay', 'walkthrough'],
    'business': ['business', 'entrepreneur', 'marketing', 'tips'],
    'storytime': ['story', 'storytime', 'experience', 'confession']
  };
  
  for (const [type, keywords] of Object.entries(contentTypes)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return type;
      }
    }
  }
  
  return 'general';
}

/**
 * Detect key moments requested
 */
function detectKeyMoments(text: string): string[] {
  const moments: string[] = [];
  
  const momentPatterns = {
    'hook': /(?:hook|intro|opening|first.*(?:sec|second))/,
    'intro': /(?:introduction|intro|start|beginning)/,
    'main': /(?:main|core|main content)/,
    'climax': /(?:climax|peak|best|highlight|moment)/,
    'conclusion': /(?:conclusion|ending|outro|wrap up|summary)/,
    'cta': /(?:cta|call.*action|subscribe|follow|like|comment|share)/,
    'transition': /(?:transition|cut to|then|next|after)/,
    'broll': /(?:b-roll|broll|cutaway|footage|overlay)/
  };
  
  for (const [moment, pattern] of Object.entries(momentPatterns)) {
    if (pattern.test(text)) {
      moments.push(moment);
    }
  }
  
  return moments;
}

/**
 * Detect style keywords
 */
function detectStyleKeywords(text: string): string[] {
  const keywords: string[] = [];
  
  const styleTerms = [
    'cinematic', 'minimal', 'clean', 'professional', 'aesthetic',
    'vintage', 'retro', 'modern', 'bold', 'colorful', 'dark',
    'bright', 'moody', 'warm', 'cool', 'saturated', 'desaturated',
    'grainy', 'smooth', 'sharp', 'soft', 'dreamy', 'gritty'
  ];
  
  for (const term of styleTerms) {
    if (text.includes(term)) {
      keywords.push(term);
    }
  }
  
  return keywords;
}

/**
 * Detect if voiceover is requested
 */
function detectVoiceover(text: string): boolean {
  const voiceoverKeywords = [
    'voiceover', 'voice over', 'narration', 'narrate', 'voice',
    'speak', 'talk', 'explain', 'commentary'
  ];
  
  return voiceoverKeywords.some(keyword => text.includes(keyword));
}

/**
 * Detect if music is requested
 */
function detectMusic(text: string): boolean {
  const musicKeywords = [
    'music', 'song', 'track', 'beat', 'soundtrack', 'score',
    'background music', 'bgm', 'trending sound', 'audio'
  ];
  
  // If explicitly mentioned
  if (musicKeywords.some(keyword => text.includes(keyword))) {
    return true;
  }
  
  // Music is default unless explicitly disabled
  if (text.includes('no music') || text.includes('without music')) {
    return false;
  }
  
  return true; // Default: include music
}

/**
 * Detect if captions are requested
 */
function detectCaptions(text: string): boolean {
  const captionKeywords = [
    'caption', 'subtitles', 'subs', 'text', 'words on screen',
    'karaoke', 'lyrics', 'transcript'
  ];
  
  if (captionKeywords.some(keyword => text.includes(keyword))) {
    return true;
  }
  
  // Captions are default for short-form platforms
  if (text.includes('tiktok') || text.includes('reels') || text.includes('shorts')) {
    return !text.includes('no caption');
  }
  
  return false;
}

/**
 * Detect aspect ratio based on platform
 */
function detectAspectRatio(platform?: string): '9:16' | '16:9' | '1:1' | '4:5' {
  switch (platform) {
    case 'tiktok':
    case 'reels':
    case 'youtube_shorts':
      return '9:16';
    case 'youtube':
      return '16:9';
    case 'linkedin':
      return '4:5';
    case 'x':
      return '16:9';
    default:
      return '9:16'; // Default to vertical for social
  }
}

/**
 * Generate intent suggestions based on partial input
 */
export function generateIntentSuggestions(partialText: string): string[] {
  const suggestions: string[] = [];
  
  const templates = [
    'Make a {duration} {contentType} video with {energy} energy for {platform}',
    'Create a {energy} {contentType} with trending music and captions',
    'Edit my footage into a {duration} {vibe} {contentType}',
    'Generate a {platform}-style {contentType} with {energy} vibes',
    'Turn my clips into a {duration} {vibe} video'
  ];
  
  const durations = ['15s', '30s', '60s', '90s'];
  const contentTypes = ['tutorial', 'vlog', 'review', 'comedy', 'fitness'];
  const energies = ['high', 'medium', 'low'];
  const vibes = ['hype', 'chill', 'professional', 'funny', 'emotional'];
  const platforms = ['TikTok', 'Reels', 'YouTube Shorts'];
  
  // Generate a few random suggestions
  for (let i = 0; i < 5; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    const suggestion = template
      .replace('{duration}', durations[Math.floor(Math.random() * durations.length)])
      .replace('{contentType}', contentTypes[Math.floor(Math.random() * contentTypes.length)])
      .replace('{energy}', energies[Math.floor(Math.random() * energies.length)])
      .replace('{vibe}', vibes[Math.floor(Math.random() * vibes.length)])
      .replace('{platform}', platforms[Math.floor(Math.random() * platforms.length)]);
    
    if (!suggestions.includes(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions;
}

/**
 * Validate intent parameters
 */
export function validateIntent(parsed: ParsedIntent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (parsed.targetDuration < 1 || parsed.targetDuration > 3600) {
    errors.push('Duration must be between 1 second and 1 hour');
  }
  
  if (!['low', 'medium', 'high'].includes(parsed.energyLevel)) {
    errors.push('Invalid energy level');
  }
  
  if (parsed.platform && !['tiktok', 'reels', 'youtube_shorts', 'youtube', 'linkedin', 'x'].includes(parsed.platform)) {
    errors.push('Invalid platform');
  }
  
  if (parsed.vibe && !['hype', 'chill', 'professional', 'funny', 'emotional'].includes(parsed.vibe)) {
    errors.push('Invalid vibe');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  parseIntent,
  generateIntentSuggestions,
  validateIntent
};
