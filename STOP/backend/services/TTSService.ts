/**
 * AURA TTS Service
 * Text-to-Speech service using ElevenLabs API
 * 
 * Features:
 * - Multiple voice options
 * - Voice cloning support
 * - Multi-language synthesis
 * - Word-level timestamps
 * - SSML support for prosody control
 */

import crypto from 'crypto';

export interface TTSJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  text: string;
  voice_id: string;
  language: string;
  model_id: string;
  asset_id?: string;
  audio_url?: string;
  duration_ms?: number;
  word_timestamps?: WordTimestamp[];
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface WordTimestamp {
  word: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
}

export interface VoiceProfile {
  voice_id: string;
  name: string;
  category: 'premade' | 'cloned' | 'professional';
  language?: string;
  accent?: string;
  gender: 'male' | 'female';
  age_range?: string;
  use_case?: string;
  preview_url?: string;
  settings?: VoiceSettings;
}

export interface VoiceSettings {
  stability: number;      // 0-1: Higher = more consistent, Lower = more expressive
  similarity_boost: number; // 0-1: Higher = closer to original voice
  style?: number;         // 0-1: Style exaggeration (for Turbo models)
  use_speaker_boost?: boolean;
}

export interface TTSOptions {
  voice_id?: string;
  language?: string;
  model_id?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  generate_timestamps?: boolean;
  output_format?: 'mp3' | 'wav' | 'pcm' | 'flac';
  sample_rate?: number;
}

export interface ElevenLabsResponse {
  audio_base64?: string;
  audio_url?: string;
  alignment?: number[][];  // Character-to-audio alignment
  normalized_alignment?: number[][];
}

/**
 * Default voices available in AURA
 */
export const DEFAULT_VOICES: VoiceProfile[] = [
  {
    voice_id: 'elevenlabs_rachel',
    name: 'Rachel',
    category: 'premade',
    language: 'en',
    accent: 'American',
    gender: 'female',
    age_range: '25-35',
    use_case: 'Narration, tutorials, professional content',
    settings: { stability: 0.7, similarity_boost: 0.75 }
  },
  {
    voice_id: 'elevenlabs_adam',
    name: 'Adam',
    category: 'premade',
    language: 'en',
    accent: 'American',
    gender: 'male',
    age_range: '30-40',
    use_case: 'Documentary, deep narration',
    settings: { stability: 0.75, similarity_boost: 0.7 }
  },
  {
    voice_id: 'elevenlabs_bella',
    name: 'Bella',
    category: 'premade',
    language: 'en',
    accent: 'American',
    gender: 'female',
    age_range: '20-30',
    use_case: 'Casual, friendly content',
    settings: { stability: 0.65, similarity_boost: 0.8 }
  },
  {
    voice_id: 'elevenlabs_josh',
    name: 'Josh',
    category: 'premade',
    language: 'en',
    accent: 'American',
    gender: 'male',
    age_range: '25-35',
    use_case: 'Energetic, hype content',
    settings: { stability: 0.6, similarity_boost: 0.85 }
  },
  {
    voice_id: 'elevenlabs_emma',
    name: 'Emma',
    category: 'premade',
    language: 'en',
    accent: 'British',
    gender: 'female',
    age_range: '25-35',
    use_case: 'Professional, educational',
    settings: { stability: 0.7, similarity_boost: 0.75 }
  }
];

/**
 * Supported languages for TTS
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' }
];

/**
 * TTS Service for ElevenLabs integration
 */
export class TTSService {
  private apiKey: string;
  private baseUrl: string = 'https://api.elevenlabs.io/v1';
  private jobStore: Map<string, TTSJob> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSJob> {
    const jobId = this.generateJobId();
    const voiceId = options.voice_id || 'elevenlabs_rachel';
    const language = options.language || 'en';
    const modelId = options.model_id || 'eleven_multilingual_v2';

    // Create job record
    const job: TTSJob = {
      job_id: jobId,
      status: 'pending',
      text,
      voice_id: voiceId,
      language,
      model_id: modelId,
      created_at: new Date().toISOString()
    };

    this.jobStore.set(jobId, job);

    try {
      // Update status
      job.status = 'processing';

      // Call ElevenLabs API
      const response = await this.callElevenLabs(text, voiceId, options);

      // In production: upload audio to S3/R2 and get asset_id
      // For now, simulate completion
      job.status = 'completed';
      job.audio_url = response.audio_url;
      job.duration_ms = this.estimateDuration(text);
      job.completed_at = new Date().toISOString();

      // Generate word timestamps if requested
      if (options.generate_timestamps) {
        job.word_timestamps = this.generateWordTimestamps(text, job.duration_ms);
      }

      // Update store
      this.jobStore.set(jobId, job);

      return job;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completed_at = new Date().toISOString();
      this.jobStore.set(jobId, job);
      throw error;
    }
  }

  /**
   * Call ElevenLabs Text-to-Speech API
   */
  private async callElevenLabs(
    text: string,
    voiceId: string,
    options: TTSOptions
  ): Promise<ElevenLabsResponse> {
    if (!this.apiKey) {
      // Mock response for development without API key
      return this.mockElevenLabsResponse(text, voiceId);
    }

    const url = `${this.baseUrl}/text-to-speech/${voiceId}`;
    
    const body = {
      text,
      model_id: options.model_id || 'eleven_multilingual_v2',
      voice_settings: {
        stability: options.stability ?? 0.7,
        similarity_boost: options.similarity_boost ?? 0.75,
        style: options.style,
        use_speaker_boost: options.use_speaker_boost ?? true
      },
      pronunciation_dictionary_locators: [],
      output_format: options.output_format || 'mp3_44100_128'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`ElevenLabs API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    // Get audio as buffer
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // In production, upload to storage and return URL
    // For now, return base64
    return {
      audio_base64: audioBase64,
      audio_url: `data:audio/mpeg;base64,${audioBase64}`
    };
  }

  /**
   * Mock ElevenLabs response for development
   */
  private mockElevenLabsResponse(
    text: string,
    voiceId: string
  ): ElevenLabsResponse {
    console.log(`[TTS Mock] Generating speech for voice: ${voiceId}, text length: ${text.length}`);
    
    // Return a placeholder URL
    return {
      audio_url: `/api/tts/mock/${voiceId}/${crypto.createHash('md5').update(text).digest('hex')}.mp3`
    };
  }

  /**
   * Estimate audio duration from text
   * Based on average speech rate of ~150 words per minute
   */
  private estimateDuration(text: string): number {
    const wordCount = text.trim().split(/\s+/).length;
    const wordsPerSecond = 2.5; // ~150 WPM
    return Math.ceil((wordCount / wordsPerSecond) * 1000);
  }

  /**
   * Generate word-level timestamps from text
   * In production, use ElevenLabs alignment response
   */
  private generateWordTimestamps(text: string, totalDuration: number): WordTimestamp[] {
    const words = text.trim().split(/\s+/);
    const timestamps: WordTimestamp[] = [];
    
    const avgWordDuration = totalDuration / words.length;
    let currentTime = 0;

    for (let i = 0; i < words.length; i++) {
      // Add slight variation for natural feel
      const variation = 0.8 + (i % 5) * 0.1;
      const duration = Math.ceil(avgWordDuration * variation);
      
      timestamps.push({
        word: words[i],
        start_ms: currentTime,
        end_ms: currentTime + duration,
        confidence: 0.95
      });
      
      currentTime += duration;
    }

    return timestamps;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `tts_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): TTSJob | undefined {
    return this.jobStore.get(jobId);
  }

  /**
   * List all jobs
   */
  listJobs(): TTSJob[] {
    return Array.from(this.jobStore.values());
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<VoiceProfile[]> {
    if (!this.apiKey) {
      return DEFAULT_VOICES;
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        return DEFAULT_VOICES;
      }

      const data = await response.json();
      
      // Map ElevenLabs voices to our format
      return data.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category || 'premade',
        language: voice.labels?.language || 'en',
        accent: voice.labels?.accent,
        gender: voice.labels?.gender || 'male',
        age_range: voice.labels?.age,
        use_case: voice.labels?.use_case,
        preview_url: voice.preview_url,
        settings: voice.settings
      }));
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return DEFAULT_VOICES;
    }
  }

  /**
   * Clone a voice from audio sample
   */
  async cloneVoice(
    name: string,
    audioFile: Buffer | string,
    description?: string
  ): Promise<VoiceProfile> {
    if (!this.apiKey) {
      // Mock voice clone
      const mockVoice: VoiceProfile = {
        voice_id: `cloned_${Date.now()}`,
        name,
        category: 'cloned',
        gender: 'male',
        settings: { stability: 0.7, similarity_boost: 0.8 }
      };
      return mockVoice;
    }

    const url = `${this.baseUrl}/voices/add`;
    
    // In production, upload audio file to FormData
    const formData = new FormData();
    formData.append('name', name);
    formData.append('files', audioFile instanceof Buffer 
      ? new Blob([audioFile]) 
      : audioFile);
    if (description) {
      formData.append('description', description);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to clone voice');
    }

    const data = await response.json();
    
    return {
      voice_id: data.voice_id,
      name,
      category: 'cloned',
      gender: 'male', // Would detect from audio
      settings: { stability: 0.7, similarity_boost: 0.8 }
    };
  }

  /**
   * Delete a cloned voice
   */
  async deleteVoice(voiceId: string): Promise<boolean> {
    if (!this.apiKey) {
      return true;
    }

    const url = `${this.baseUrl}/voices/${voiceId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'xi-api-key': this.apiKey
      }
    });

    return response.ok;
  }

  /**
   * Generate speech with SSML support
   */
  async generateSpeechWithSSML(
    ssmlText: string,
    options: TTSOptions = {}
  ): Promise<TTSJob> {
    // ElevenLabs supports SSML-like tags in text
    // <break time="500ms" />, <prosody rate="slow">, etc.
    
    return this.generateSpeech(ssmlText, options);
  }

  /**
   * Batch generate speech for multiple segments
   */
  async batchGenerate(
    segments: Array<{ text: string; id?: string }>,
    options: TTSOptions = {}
  ): Promise<Map<string, TTSJob>> {
    const jobs = new Map<string, TTSJob>();

    for (const segment of segments) {
      const job = await this.generateSpeech(segment.text, options);
      const key = segment.id || job.job_id;
      jobs.set(key, job);
    }

    return jobs;
  }

  /**
   * Get character cost for pricing
   */
  getCharacterCount(text: string): number {
    return text.length;
  }

  /**
   * Estimate cost based on characters
   * Pricing as of 2024: ~$0.30 per 1K characters for standard model
   */
  estimateCost(text: string, modelId?: string): number {
    const charCount = this.getCharacterCount(text);
    const pricePerThousand = modelId?.includes('turbo') ? 0.10 : 0.30;
    return (charCount / 1000) * pricePerThousand;
  }
}

/**
 * Default export for easy importing
 */
export default TTSService;
