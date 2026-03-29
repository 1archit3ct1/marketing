// @aura/types - Shared Type Definitions for AURA

// ============================================
// Core Project Types
// ============================================

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  brand_profile_id?: string;
  timeline_state: TimelineState;
  platform_cuts: PlatformCut[];
  created_at: string;
  updated_at: string;
  version_id: string;
}

export interface TimelineState {
  tracks: Track[];
  clips: Clip[];
  effects: Effect[];
  audio: AudioTrack[];
  captions: Caption[];
  duration: number; // in seconds
  fps: number;
  resolution: Resolution;
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'caption' | 'effects';
  label: string;
  color: string;
  order: number;
  isLocked?: boolean;
  isMuted?: boolean;
}

export interface Clip {
  id: string;
  track_id: string;
  asset_id: string;
  start: number; // in seconds (timeline position)
  duration: number; // in seconds
  trim_start: number; // in seconds (source trim)
  trim_end: number; // in seconds (source trim)
  speed: number; // 0.1 to 10
  effects: AppliedEffect[];
  transitions: Transition[];
}

export interface Resolution {
  width: number;
  height: number;
  aspect_ratio: string;
}

// ============================================
// Asset Types
// ============================================

export interface Asset {
  id: string;
  project_id: string;
  type: 'video' | 'audio' | 'image' | 'gif';
  filename: string;
  original_url: string;
  proxy_url?: string;
  thumbnail_url?: string;
  waveform_url?: string;
  duration?: number;
  size: number;
  mime_type: string;
  metadata: AssetMetadata;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  created_at: string;
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  bitrate?: number;
  audio_channels?: number;
  audio_sample_rate?: number;
}

// ============================================
// AI & Intent Types
// ============================================

export interface Intent {
  id: string;
  project_id: string;
  text: string;
  voice_recording_url?: string;
  platform: PlatformType;
  vibe: VibeType;
  parsed_intent: ParsedIntent;
  created_at: string;
}

export interface ParsedIntent {
  target_duration: number;
  energy_level: 'low' | 'medium' | 'high';
  content_type: string;
  key_moments: string[];
  style_keywords: string[];
}

export type PlatformType = 'tiktok' | 'reels' | 'youtube_shorts' | 'youtube' | 'linkedin' | 'x';

export type VibeType = 'hype' | 'chill' | 'professional' | 'funny' | 'emotional';

export interface DraftVariant {
  id: string;
  project_id: string;
  type: 'safe' | 'experimental' | 'minimal';
  timeline_state: TimelineState;
  preview_url: string;
  engagement_score: number;
  created_at: string;
}

// ============================================
// Effect & Transition Types
// ============================================

export interface Effect {
  id: string;
  type: EffectType;
  name: string;
  parameters: Record<string, unknown>;
}

export type EffectType = 
  | 'color_grade'
  | 'beauty_enhance'
  | 'stabilize'
  | 'speed_ramp'
  | 'background_blur'
  | 'background_replace'
  | 'text_overlay'
  | 'sticker'
  | 'filter';

export interface AppliedEffect {
  effect_id: string;
  clip_start: number;
  clip_end: number;
  intensity: number;
  parameters: Record<string, unknown>;
}

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number;
  parameters?: Record<string, unknown>;
}

export type TransitionType = 
  | 'cut'
  | 'dissolve'
  | 'wipe'
  | 'zoom'
  | 'glitch'
  | 'light_leak'
  | 'whip_pan'
  | 'morph'
  | 'match_cut';

// ============================================
// Audio Types
// ============================================

export interface AudioTrack {
  id: string;
  type: 'voice' | 'music' | 'sfx' | 'ambience';
  asset_id?: string;
  clips: AudioClip[];
  volume: number;
  is_muted: boolean;
  effects: AudioEffect[];
}

export interface AudioClip {
  id: string;
  start: number;
  duration: number;
  trim_start: number;
  trim_end: number;
  fade_in?: number;
  fade_out?: number;
}

export interface AudioEffect {
  type: 'eq' | 'compression' | 'noise_reduction' | 'de_ess' | 'normalize' | 'ducking';
  parameters: Record<string, unknown>;
}

// ============================================
// Caption Types
// ============================================

export interface Caption {
  id: string;
  track_id: string;
  segments: CaptionSegment[];
  style: CaptionStyle;
}

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: WordTiming[];
  speaker_id?: string;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface CaptionStyle {
  preset: 'tiktok_bold' | 'minimal' | 'karaoke' | 'cinematic' | 'meme';
  font_family: string;
  font_size: number;
  color: string;
  stroke_color: string;
  stroke_width: number;
  background_color?: string;
  background_opacity?: number;
  position: 'bottom' | 'center' | 'top';
  animation?: string;
}

// ============================================
// Brand & Platform Types
// ============================================

export interface BrandProfile {
  id: string;
  user_id: string;
  name: string;
  brand_colors: string[];
  brand_fonts: { display: string; body: string };
  preferred_music_genres: string[];
  preferred_caption_style: CaptionStyle['preset'];
  preferred_vibe: VibeType;
  logo_asset_id?: string;
  watermark_position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  intro_clip_id?: string;
  outro_clip_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformCut {
  id: string;
  project_id: string;
  platform: PlatformType;
  timeline_state: TimelineState;
  aspect_ratio: string;
  status: 'draft' | 'rendering' | 'ready' | 'exported';
  export_url?: string;
  metadata: PlatformMetadata;
}

export interface PlatformMetadata {
  title?: string;
  description?: string;
  hashtags: string[];
  thumbnail_url?: string;
  scheduled_at?: string;
  published_at?: string;
  published_url?: string;
}

// ============================================
// Analytics Types
// ============================================

export interface AnalyticsSnapshot {
  id: string;
  project_id: string;
  platform: PlatformType;
  published_at: string;
  metrics: PlatformMetrics;
  retention_curve: RetentionDataPoint[];
  captured_at: string;
}

export interface PlatformMetrics {
  views: number;
  watch_time: number;
  avg_watch_duration: number;
  likes: number;
  comments: number;
  shares: number;
  click_through_rate?: number;
}

export interface RetentionDataPoint {
  timestamp: number;
  retention_percentage: number;
}

// ============================================
// Collaboration Types
// ============================================

export interface CollaborationSession {
  id: string;
  project_id: string;
  host_user_id: string;
  participants: Participant[];
  created_at: string;
  expires_at: string;
}

export interface Participant {
  user_id: string;
  name: string;
  avatar_url?: string;
  color: string;
  cursor_position?: { x: number; y: number };
  playhead_position?: number;
  joined_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  timecode_ms: number;
  content: string;
  annotation_data?: AnnotationData;
  resolved: boolean;
  created_at: string;
}

export interface AnnotationData {
  type: 'drawing' | 'arrow' | 'circle' | 'text' | 'rectangle';
  coordinates: number[];
  color: string;
}

// ============================================
// Version History Types
// ============================================

export interface VersionHistory {
  id: string;
  project_id: string;
  version_id: string;
  label: string;
  timeline_state: TimelineState;
  created_by: string;
  created_at: string;
  parent_version_id?: string;
}

// ============================================
// Render & Export Types
// ============================================

export interface RenderJob {
  id: string;
  project_id: string;
  platform_cut_id?: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  output_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface ExportSettings {
  format: 'mp4' | 'mov' | 'gif';
  codec: 'h264' | 'h265' | 'prores';
  resolution: Resolution;
  fps: number;
  bitrate: number;
  audio_bitrate: number;
}

// ============================================
// User & Auth Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  credits: number;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  members: WorkspaceMember[];
  created_at: string;
}

export interface WorkspaceMember {
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_at: string;
  joined_at?: string;
}

// ============================================
// Template & Marketplace Types
// ============================================

export interface Template {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  category: string;
  platform: PlatformType;
  vibe: VibeType;
  preview_video_url: string;
  thumbnail_url: string;
  timeline_structure: TimelineState;
  price: number;
  is_free: boolean;
  downloads: number;
  rating: number;
  created_at: string;
}

// ============================================
// Trend & Intelligence Types
// ============================================

export interface Trend {
  id: string;
  platform: PlatformType;
  type: 'sound' | 'format' | 'caption_style' | 'transition';
  title: string;
  description: string;
  audio_id?: string;
  usage_count: number;
  growth_rate: number;
  valid_from: string;
  valid_until: string;
}

export interface EngagementPrediction {
  moment_id: string;
  score: number;
  factors: PredictionFactor[];
  suggestions: Suggestion[];
}

export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  message: string;
  apply_action: string;
}

export type SuggestionType = 
  | 'cut'
  | 'trim'
  | 'caption'
  | 'beat'
  | 'cta'
  | 'hook'
  | 'transition'
  | 'color'
  | 'audio';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// ============================================
// Job Queue Types
// ============================================

export interface Job {
  id: string;
  type: JobType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  data: Record<string, unknown>;
  result?: unknown;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export type JobType = 
  | 'transcode'
  | 'ai_draft'
  | 'ai_enhance'
  | 'asr'
  | 'scene_analysis'
  | 'engagement_prediction'
  | 'render'
  | 'export'
  | 'thumbnail_generate'
  | 'avatar_generate'
  | 'background_generate';
