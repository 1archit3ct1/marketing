-- ============================================
-- AURA Database Schema
-- PostgreSQL with Row-Level Security
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE platform_type AS ENUM (
  'tiktok',
  'reels',
  'youtube_shorts',
  'youtube',
  'linkedin',
  'x'
);

CREATE TYPE vibe_type AS ENUM (
  'hype',
  'chill',
  'professional',
  'funny',
  'emotional'
);

CREATE TYPE asset_type AS ENUM (
  'video',
  'audio',
  'image',
  'gif'
);

CREATE TYPE asset_status AS ENUM (
  'uploading',
  'processing',
  'ready',
  'error'
);

CREATE TYPE track_type AS ENUM (
  'video',
  'audio',
  'caption',
  'effects'
);

CREATE TYPE effect_type AS ENUM (
  'color_grade',
  'beauty_enhance',
  'stabilize',
  'speed_ramp',
  'background_blur',
  'background_replace',
  'text_overlay',
  'sticker',
  'filter'
);

CREATE TYPE transition_type AS ENUM (
  'cut',
  'dissolve',
  'wipe',
  'zoom',
  'glitch',
  'light_leak',
  'whip_pan',
  'morph',
  'match_cut'
);

CREATE TYPE audio_track_type AS ENUM (
  'voice',
  'music',
  'sfx',
  'ambience'
);

CREATE TYPE caption_preset AS ENUM (
  'tiktok_bold',
  'minimal',
  'karaoke',
  'cinematic',
  'meme'
);

CREATE TYPE job_type AS ENUM (
  'transcode',
  'ai_draft',
  'ai_enhance',
  'asr',
  'scene_analysis',
  'engagement_prediction',
  'render',
  'export',
  'thumbnail_generate',
  'avatar_generate',
  'background_generate'
);

CREATE TYPE job_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

CREATE TYPE render_status AS ENUM (
  'queued',
  'processing',
  'completed',
  'error'
);

CREATE TYPE export_format AS ENUM (
  'mp4',
  'mov',
  'gif'
);

CREATE TYPE export_codec AS ENUM (
  'h264',
  'h265',
  'prores'
);

CREATE TYPE user_plan AS ENUM (
  'free',
  'pro',
  'team',
  'enterprise'
);

CREATE TYPE member_role AS ENUM (
  'owner',
  'admin',
  'editor',
  'viewer'
);

CREATE TYPE draft_variant_type AS ENUM (
  'safe',
  'experimental',
  'minimal'
);

CREATE TYPE watermark_position AS ENUM (
  'top_left',
  'top_right',
  'bottom_left',
  'bottom_right'
);

CREATE TYPE suggestion_type AS ENUM (
  'cut',
  'trim',
  'caption',
  'beat',
  'cta',
  'hook',
  'transition',
  'color',
  'audio'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (managed by Clerk/Supabase Auth, mirrored here)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(512),
  plan user_plan DEFAULT 'free',
  credits INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role DEFAULT 'editor',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(workspace_id, user_id)
);

-- Brand Profiles
CREATE TABLE brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  brand_colors TEXT[] DEFAULT ARRAY['#7c5cfc', '#00e5a0', '#f5820a'],
  brand_fonts JSONB DEFAULT '{"display": "Clash Display", "body": "DM Sans"}',
  preferred_music_genres TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferred_caption_style caption_preset DEFAULT 'tiktok_bold',
  preferred_vibe vibe_type DEFAULT 'hype',
  logo_asset_id UUID,
  watermark_position watermark_position DEFAULT 'bottom_right',
  intro_clip_id UUID,
  outro_clip_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  timeline_state JSONB NOT NULL DEFAULT '{}',
  duration INTEGER DEFAULT 0, -- in seconds
  fps INTEGER DEFAULT 30,
  resolution JSONB DEFAULT '{"width": 1080, "height": 1920, "aspect_ratio": "9:16"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version_id UUID,
  is_template BOOLEAN DEFAULT FALSE
);

-- Version History
CREATE TABLE version_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  label VARCHAR(255) NOT NULL,
  timeline_state JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  parent_version_id UUID REFERENCES version_history(id)
);

-- Assets
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type asset_type NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_url VARCHAR(512) NOT NULL,
  proxy_url VARCHAR(512),
  thumbnail_url VARCHAR(512),
  waveform_url VARCHAR(512),
  duration INTEGER, -- in milliseconds
  size BIGINT NOT NULL, -- in bytes
  mime_type VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  status asset_status DEFAULT 'uploading',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clips
CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  track_id UUID,
  track_type track_type NOT NULL,
  track_order INTEGER NOT NULL,
  start_time INTEGER NOT NULL, -- in milliseconds (timeline position)
  duration INTEGER NOT NULL, -- in milliseconds
  trim_start INTEGER DEFAULT 0, -- in milliseconds (source trim)
  trim_end INTEGER, -- in milliseconds (source trim)
  speed DECIMAL(5,2) DEFAULT 1.00,
  effects JSONB DEFAULT '[]',
  transitions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform Cuts
CREATE TABLE platform_cuts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  timeline_state JSONB NOT NULL,
  aspect_ratio VARCHAR(10) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  export_url VARCHAR(512),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Draft Variants
CREATE TABLE draft_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type draft_variant_type NOT NULL,
  intent_id UUID,
  timeline_state JSONB NOT NULL,
  preview_url VARCHAR(512),
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intents
CREATE TABLE intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  voice_recording_url VARCHAR(512),
  platform platform_type NOT NULL,
  vibe vibe_type NOT NULL,
  parsed_intent JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Captions
CREATE TABLE captions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  segments JSONB NOT NULL DEFAULT '[]',
  style JSONB DEFAULT '{}',
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audio Tracks
CREATE TABLE audio_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type audio_track_type NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  clips JSONB DEFAULT '[]',
  volume DECIMAL(5,2) DEFAULT 1.00,
  is_muted BOOLEAN DEFAULT FALSE,
  effects JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS & INTELLIGENCE
-- ============================================

-- Platform Connections (OAuth tokens)
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  platform_user_id VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Analytics Snapshots
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform_cut_id UUID REFERENCES platform_cuts(id) ON DELETE SET NULL,
  platform platform_type NOT NULL,
  platform_post_id VARCHAR(255),
  metrics JSONB DEFAULT '{}',
  retention_curve JSONB DEFAULT '[]',
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trends
CREATE TABLE trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform platform_type NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  audio_id VARCHAR(255),
  usage_count INTEGER DEFAULT 0,
  growth_rate DECIMAL(10,2) DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COLLABORATION
-- ============================================

-- Collaboration Sessions
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES users(id),
  access_code VARCHAR(10) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  color VARCHAR(7) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  timecode_ms INTEGER NOT NULL,
  content TEXT NOT NULL,
  annotation_data JSONB,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RENDER & EXPORT
-- ============================================

-- Export Jobs
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform_cut_id UUID REFERENCES platform_cuts(id) ON DELETE SET NULL,
  format export_format DEFAULT 'mp4',
  codec export_codec DEFAULT 'h264',
  resolution JSONB,
  fps INTEGER,
  bitrate INTEGER,
  status render_status DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  output_url VARCHAR(512),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Render Queue
CREATE TABLE render_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  export_job_id UUID NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
  worker_id VARCHAR(100),
  priority INTEGER DEFAULT 0,
  status job_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================
-- JOB QUEUE
-- ============================================

-- Jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type job_type NOT NULL,
  status job_status DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  data JSONB NOT NULL,
  result JSONB,
  error_message TEXT,
  progress INTEGER DEFAULT 0,
  worker_id VARCHAR(100),
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEMPLATES & MARKETPLACE
-- ============================================

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  platform platform_type,
  vibe vibe_type,
  preview_video_url VARCHAR(512),
  thumbnail_url VARCHAR(512),
  timeline_structure JSONB NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT TRUE,
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Purchases
CREATE TABLE template_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);

-- Projects
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_projects_brand_profile_id ON projects(brand_profile_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Assets
CREATE INDEX idx_assets_project_id ON assets(project_id);
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_type ON assets(type);

-- Clips
CREATE INDEX idx_clips_project_id ON clips(project_id);
CREATE INDEX idx_clips_asset_id ON clips(asset_id);
CREATE INDEX idx_clips_track_type ON clips(track_type);

-- Platform Cuts
CREATE INDEX idx_platform_cuts_project_id ON platform_cuts(project_id);
CREATE INDEX idx_platform_cuts_platform ON platform_cuts(platform);

-- Version History
CREATE INDEX idx_version_history_project_id ON version_history(project_id);
CREATE INDEX idx_version_history_created_at ON version_history(created_at DESC);

-- Analytics
CREATE INDEX idx_analytics_snapshots_project_id ON analytics_snapshots(project_id);
CREATE INDEX idx_analytics_snapshots_platform ON analytics_snapshots(platform);
CREATE INDEX idx_analytics_snapshots_captured_at ON analytics_snapshots(captured_at DESC);

-- Jobs
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled_at ON jobs(scheduled_at);
CREATE INDEX idx_jobs_priority ON jobs(priority DESC);

-- Comments
CREATE INDEX idx_comments_project_id ON comments(project_id);
CREATE INDEX idx_comments_timecode ON comments(timecode_ms);

-- Trends
CREATE INDEX idx_trends_platform ON trends(platform);
CREATE INDEX idx_trends_valid_until ON trends(valid_until);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_purchases ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Projects policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (user_id = auth.uid());

-- Assets policies
CREATE POLICY "Users can view their own assets"
  ON assets FOR SELECT
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create assets"
  ON assets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Version History policies
CREATE POLICY "Users can view version history"
  ON version_history FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE user_id = auth.uid()
    )
  );

-- Comments policies
CREATE POLICY "Users can view comments"
  ON comments FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE user_id = auth.uid() OR
      id IN (
        SELECT project_id FROM collaboration_sessions
        WHERE id IN (
          SELECT session_id FROM session_participants
          WHERE user_id = auth.uid() AND left_at IS NULL
        )
      )
    )
  );

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clips_updated_at
  BEFORE UPDATE ON clips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_profiles_updated_at
  BEFORE UPDATE ON brand_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate access code for collaboration sessions
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.access_code := SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
  NEW.expires_at := NOW() + INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_collab_access_code
  BEFORE INSERT ON collaboration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION generate_access_code();

-- ============================================
-- VIEWS
-- ============================================

-- Project summary view
CREATE VIEW project_summaries AS
SELECT
  p.id,
  p.name,
  p.duration,
  p.fps,
  p.resolution,
  p.created_at,
  p.updated_at,
  u.name as owner_name,
  u.avatar_url as owner_avatar,
  COUNT(DISTINCT a.id) as asset_count,
  COUNT(DISTINCT c.id) as clip_count,
  COUNT(DISTINCT pc.id) as platform_cut_count
FROM projects p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN assets a ON p.id = a.project_id
LEFT JOIN clips c ON p.id = c.project_id
LEFT JOIN platform_cuts pc ON p.id = pc.project_id
GROUP BY p.id, u.name, u.avatar_url;

-- User analytics view
CREATE VIEW user_analytics AS
SELECT
  u.id,
  u.email,
  u.name,
  u.plan,
  u.credits,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT a.id) as asset_count,
  COUNT(DISTINCT t.id) as template_count,
  SUM(COALESCE(tp.amount, 0)) as template_revenue
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
LEFT JOIN assets a ON u.id = a.user_id
LEFT JOIN templates t ON u.id = t.creator_id
LEFT JOIN template_purchases tp ON t.id = tp.template_id
GROUP BY u.id, u.email, u.name, u.plan, u.credits;
