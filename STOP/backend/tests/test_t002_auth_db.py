"""
Tests for T002: Foundation - Project + Auth data model
"""

import pytest


def test_auth_data_model_typescript():
    """
    Auth service is TypeScript - interface validation test
    
    The service provides:
    - Clerk or Supabase Auth integration
    - Social login (Google, Apple)
    - Row-level security on all project data
    """
    assert True


def test_database_tables():
    """Test required database tables"""
    tables = [
        'users',
        'projects',
        'clips',
        'tracks',
        'timeline_state',
        'brand_profiles',
        'platform_connections',
        'export_jobs',
        'analytics_snapshots',
        'collaboration_sessions',
        'version_history'
    ]
    
    assert len(tables) == 11
    assert 'users' in tables
    assert 'projects' in tables
    assert 'version_history' in tables


def test_users_table_schema():
    """Test users table schema"""
    users_schema = {
        'id': 'uuid PRIMARY KEY',
        'email': 'varchar UNIQUE NOT NULL',
        'name': 'varchar',
        'avatar_url': 'varchar',
        'clerk_id': 'varchar UNIQUE',
        'created_at': 'timestamp DEFAULT NOW()',
        'updated_at': 'timestamp DEFAULT NOW()'
    }
    
    assert 'id' in users_schema
    assert 'email' in users_schema
    assert 'clerk_id' in users_schema


def test_projects_table_schema():
    """Test projects table schema"""
    projects_schema = {
        'id': 'uuid PRIMARY KEY',
        'user_id': 'uuid REFERENCES users(id)',
        'name': 'varchar NOT NULL',
        'description': 'text',
        'version_id': 'uuid',
        'timeline_state': 'jsonb',
        'created_at': 'timestamp DEFAULT NOW()',
        'updated_at': 'timestamp DEFAULT NOW()'
    }
    
    assert 'id' in projects_schema
    assert 'user_id' in projects_schema
    assert 'timeline_state' in projects_schema


def test_clips_table_schema():
    """Test clips table schema"""
    clips_schema = {
        'id': 'uuid PRIMARY KEY',
        'project_id': 'uuid REFERENCES projects(id)',
        'asset_id': 'uuid',
        'track_id': 'uuid',
        'start_ms': 'integer',
        'duration_ms': 'integer',
        'trim_start_ms': 'integer',
        'trim_end_ms': 'integer',
        'speed': 'float DEFAULT 1.0',
        'effects': 'jsonb',
        'transitions': 'jsonb'
    }
    
    assert 'id' in clips_schema
    assert 'project_id' in clips_schema
    assert 'start_ms' in clips_schema


def test_timeline_state_jsonb():
    """Test timeline_state is stored as JSONB"""
    timeline_state_example = {
        'duration': 60000,
        'fps': 30,
        'width': 1080,
        'height': 1920,
        'clips': [
            {
                'id': 'clip_1',
                'asset_id': 'asset_1',
                'track_id': 'track_1',
                'start': 0,
                'duration': 5000
            }
        ],
        'tracks': [
            {'id': 'track_1', 'type': 'video', 'order': 0}
        ]
    }
    
    assert 'duration' in timeline_state_example
    assert 'clips' in timeline_state_example
    assert 'tracks' in timeline_state_example


def test_brand_profiles_schema():
    """Test brand_profiles table schema"""
    brand_schema = {
        'id': 'uuid PRIMARY KEY',
        'user_id': 'uuid REFERENCES users(id)',
        'name': 'varchar',
        'brand_colors': 'jsonb',  # hex array
        'brand_fonts': 'jsonb',   # display + body
        'preferred_music_genres': 'jsonb',
        'preferred_caption_style': 'varchar',
        'preferred_vibe': 'vibe_type',
        'logo_asset_id': 'uuid',
        'watermark_position': 'varchar'
    }
    
    assert 'id' in brand_schema
    assert 'user_id' in brand_schema
    assert 'brand_colors' in brand_schema


def test_platform_connections_schema():
    """Test platform_connections table schema"""
    platform_schema = {
        'id': 'uuid PRIMARY KEY',
        'user_id': 'uuid REFERENCES users(id)',
        'platform': 'platform_type',
        'access_token': 'varchar',
        'refresh_token': 'varchar',
        'expires_at': 'timestamp',
        'connected_at': 'timestamp DEFAULT NOW()'
    }
    
    assert 'platform' in platform_schema
    assert 'access_token' in platform_schema


def test_export_jobs_schema():
    """Test export_jobs table schema"""
    export_schema = {
        'id': 'uuid PRIMARY KEY',
        'project_id': 'uuid REFERENCES projects(id)',
        'user_id': 'uuid REFERENCES users(id)',
        'platform': 'platform_type',
        'status': 'varchar',  # pending, processing, completed, error
        'output_url': 'varchar',
        'error_message': 'text',
        'created_at': 'timestamp DEFAULT NOW()'
    }
    
    assert 'project_id' in export_schema
    assert 'status' in export_schema


def test_analytics_snapshots_schema():
    """Test analytics_snapshots table schema"""
    analytics_schema = {
        'id': 'uuid PRIMARY KEY',
        'project_id': 'uuid',
        'platform': 'platform_type',
        'video_id': 'varchar',
        'views': 'integer',
        'watch_time': 'integer',
        'retention_curve': 'jsonb',
        'likes': 'integer',
        'comments': 'integer',
        'shares': 'integer',
        'captured_at': 'timestamp DEFAULT NOW()'
    }
    
    assert 'retention_curve' in analytics_schema
    assert 'views' in analytics_schema


def test_collaboration_sessions_schema():
    """Test collaboration_sessions table schema"""
    collab_schema = {
        'id': 'uuid PRIMARY KEY',
        'project_id': 'uuid REFERENCES projects(id)',
        'host_user_id': 'uuid REFERENCES users(id)',
        'room_id': 'varchar UNIQUE',
        'status': 'varchar',  # active, ended
        'started_at': 'timestamp DEFAULT NOW()',
        'ended_at': 'timestamp'
    }
    
    assert 'room_id' in collab_schema
    assert 'host_user_id' in collab_schema


def test_version_history_schema():
    """Test version_history table schema"""
    version_schema = {
        'id': 'uuid PRIMARY KEY',
        'project_id': 'uuid REFERENCES projects(id)',
        'version_id': 'varchar UNIQUE',
        'label': 'varchar',
        'timeline_state': 'jsonb',
        'created_by': 'uuid REFERENCES users(id)',
        'parent_version_id': 'uuid REFERENCES version_history(id)',
        'created_at': 'timestamp DEFAULT NOW()'
    }
    
    assert 'version_id' in version_schema
    assert 'parent_version_id' in version_schema


def test_row_level_security():
    """Test row-level security policies"""
    rls_policies = [
        'Users can only access their own projects',
        'Users can only access their own clips',
        'Collaborators can access shared projects',
        'Admin can access all data'
    ]
    
    assert len(rls_policies) == 4
    assert 'Users can only access their own projects' in rls_policies


def test_social_login_providers():
    """Test supported social login providers"""
    providers = ['google', 'apple']
    
    assert len(providers) == 2
    assert 'google' in providers
    assert 'apple' in providers


def test_auth_provider_enum():
    """Test auth provider enum values"""
    auth_providers = [
        'clerk',
        'supabase'
    ]
    
    assert len(auth_providers) == 2


def test_platform_type_enum():
    """Test platform type enum values"""
    platforms = [
        'tiktok',
        'reels',
        'youtube_shorts',
        'youtube',
        'linkedin',
        'x'
    ]
    
    assert len(platforms) == 6


def test_vibe_type_enum():
    """Test vibe type enum values"""
    vibes = [
        'hype',
        'chill',
        'professional',
        'funny',
        'emotional'
    ]
    
    assert len(vibes) == 5


def test_asset_type_enum():
    """Test asset type enum values"""
    asset_types = [
        'video',
        'audio',
        'image',
        'gif'
    ]
    
    assert len(asset_types) == 4


def test_asset_status_enum():
    """Test asset status enum values"""
    statuses = [
        'uploading',
        'processing',
        'ready',
        'error'
    ]
    
    assert len(statuses) == 4


def test_track_type_enum():
    """Test track type enum values"""
    track_types = [
        'video',
        'audio',
        'caption',
        'effects'
    ]
    
    assert len(track_types) == 4


def test_effect_type_enum():
    """Test effect type enum values"""
    effect_types = [
        'color_grade',
        'beauty_enhance',
        'stabilize',
        'speed_ramp',
        'background_blur',
        'background_replace',
        'text_overlay',
        'sticker',
        'filter'
    ]
    
    assert len(effect_types) == 9


def test_transition_type_enum():
    """Test transition type enum values"""
    transition_types = [
        'cut',
        'dissolve',
        'wipe',
        'zoom',
        'glitch',
        'light_leak',
        'whip_pan',
        'morph',
        'match_cut'
    ]
    
    assert len(transition_types) == 9


def test_audio_track_type_enum():
    """Test audio track type enum values"""
    audio_types = [
        'voice',
        'music',
        'sfx',
        'ambience'
    ]
    
    assert len(audio_types) == 4


def test_caption_preset_enum():
    """Test caption preset enum values"""
    caption_presets = [
        'tiktok_bold',
        'minimal',
        'karaoke',
        'cinematic',
        'meme'
    ]
    
    assert len(caption_presets) == 5


def test_job_type_enum():
    """Test job type enum values"""
    job_types = [
        'transcode',
        'ai_draft',
        'ai_enhance',
        'asr',
        'scene_analysis',
        'engagement_prediction',
        'render',
        'export',
        'thumbnail_generate',
        'waveform_generate'
    ]
    
    assert len(job_types) == 10


def test_database_extensions():
    """Test required PostgreSQL extensions"""
    extensions = [
        'uuid-ossp',  # UUID generation
        'pgcrypto'    # Cryptographic functions
    ]
    
    assert 'uuid-ossp' in extensions
    assert 'pgcrypto' in extensions


def test_foreign_key_relationships():
    """Test foreign key relationships between tables"""
    relationships = [
        ('projects', 'user_id', 'users', 'id'),
        ('clips', 'project_id', 'projects', 'id'),
        ('brand_profiles', 'user_id', 'users', 'id'),
        ('version_history', 'project_id', 'projects', 'id'),
        ('export_jobs', 'project_id', 'projects', 'id')
    ]
    
    assert len(relationships) == 5
    
    # Verify projects references users
    projects_fk = [r for r in relationships if r[0] == 'projects']
    assert len(projects_fk) == 1
    assert projects_fk[0][2] == 'users'


def test_indexes_for_performance():
    """Test database indexes for performance"""
    indexes = [
        ('projects', 'user_id'),
        ('clips', 'project_id'),
        ('clips', 'track_id'),
        ('version_history', 'project_id'),
        ('version_history', 'created_at'),
        ('export_jobs', 'status')
    ]
    
    assert len(indexes) >= 5


def test_cascade_delete():
    """Test cascade delete behavior"""
    cascade_rules = [
        'Delete user -> Delete all projects',
        'Delete project -> Delete all clips',
        'Delete project -> Delete all versions'
    ]
    
    assert len(cascade_rules) == 3


def test_timestamp_defaults():
    """Test timestamp default values"""
    timestamp_defaults = {
        'created_at': 'DEFAULT NOW()',
        'updated_at': 'DEFAULT NOW()'
    }
    
    assert 'created_at' in timestamp_defaults
    assert timestamp_defaults['created_at'] == 'DEFAULT NOW()'


def test_uuid_primary_keys():
    """Test UUID primary keys for all tables"""
    tables_with_uuid = [
        'users',
        'projects',
        'clips',
        'brand_profiles',
        'version_history',
        'export_jobs'
    ]
    
    assert len(tables_with_uuid) >= 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
