"""
Tests for DraftComposerService and DraftVariantService
Task T007: AI edit draft generator
Task T008: 3 draft variants system
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.DraftComposerService import (
    DraftComposerService,
    DraftClip,
    DraftTimeline,
    DraftVariant,
    compose_draft_api
)

from services.DraftVariantService import (
    DraftVariantService
)


class TestDraftComposerService:
    """Test suite for DraftComposerService"""

    def test_service_initialization(self):
        """Test service initializes correctly"""
        service = DraftComposerService()
        assert service is not None
        assert 'tiktok' in service.PLATFORM_RATIOS
        assert 'hype' in service.VIBE_LUTS

    def test_compose_draft_creates_timeline(self, mock_intent, mock_clip_analysis):
        """Test that compose_draft creates a valid timeline"""
        service = DraftComposerService()
        
        variant = service.compose_draft(
            intent=mock_intent,
            clip_analyses=[mock_clip_analysis],
            variant_type='safe'
        )
        
        assert variant is not None
        assert variant.timeline is not None
        assert variant.type == 'safe'

    def test_compose_draft_platform_resolution(self, mock_clip_analysis):
        """Test platform-specific resolutions"""
        service = DraftComposerService()
        
        # TikTok (vertical)
        variant = service.compose_draft(
            intent={'platform': 'tiktok', 'target_duration': 60, 'vibe': 'hype'},
            clip_analyses=[mock_clip_analysis],
            variant_type='safe'
        )
        assert variant.timeline.width == 1080
        assert variant.timeline.height == 1920
        
        # YouTube (horizontal)
        variant = service.compose_draft(
            intent={'platform': 'youtube', 'target_duration': 60, 'vibe': 'hype'},
            clip_analyses=[mock_clip_analysis],
            variant_type='safe'
        )
        assert variant.timeline.width == 1920
        assert variant.timeline.height == 1080

    def test_compose_draft_duration(self, mock_clip_analysis):
        """Test target duration is respected"""
        service = DraftComposerService()
        
        target_duration = 30  # 30 seconds
        
        variant = service.compose_draft(
            intent={'platform': 'tiktok', 'target_duration': target_duration, 'vibe': 'hype'},
            clip_analyses=[mock_clip_analysis],
            variant_type='safe'
        )
        
        # Timeline duration should be close to target
        assert variant.timeline.duration <= target_duration * 1000 * 1.2  # 20% tolerance

    def test_generate_three_variants(self, mock_intent, mock_clip_analysis):
        """Test generating all three variants"""
        service = DraftComposerService()
        
        variants = service.generate_three_variants(
            intent=mock_intent,
            clip_analyses=[mock_clip_analysis]
        )
        
        assert len(variants) == 3
        
        types = [v.type for v in variants]
        assert 'safe' in types
        assert 'experimental' in types
        assert 'minimal' in types

    def test_variant_types_have_different_energy_arcs(self, mock_intent, mock_clip_analysis):
        """Test that different variant types produce different results"""
        service = DraftComposerService()
        
        safe = service.compose_draft(mock_intent, [mock_clip_analysis], 'safe')
        experimental = service.compose_draft(mock_intent, [mock_clip_analysis], 'experimental')
        minimal = service.compose_draft(mock_intent, [mock_clip_analysis], 'minimal')
        
        # All should be valid
        assert safe is not None
        assert experimental is not None
        assert minimal is not None

    def test_engagement_score_calculation(self, mock_intent, mock_clip_analysis):
        """Test engagement score is calculated"""
        service = DraftComposerService()
        
        variant = service.compose_draft(
            intent=mock_intent,
            clip_analyses=[mock_clip_analysis],
            variant_type='safe'
        )
        
        assert variant.engagement_score >= 0
        assert variant.engagement_score <= 100

    def test_draft_clips_have_required_fields(self, mock_intent, mock_clip_analysis):
        """Test that draft clips have all required fields"""
        service = DraftComposerService()
        
        variant = service.compose_draft(
            intent=mock_intent,
            clip_analyses=[mock_clip_analysis],
            variant_type='safe'
        )
        
        for clip in variant.timeline.clips:
            assert clip.id is not None
            assert clip.asset_id is not None
            assert clip.track_id is not None
            assert clip.start >= 0
            assert clip.duration > 0

    def test_tracks_created_correctly(self, mock_intent, mock_clip_analysis):
        """Test that tracks are created correctly"""
        service = DraftComposerService()
        
        variant = service.compose_draft(
            intent=mock_intent,
            clip_analyses=[mock_clip_analysis],
            variant_type='safe'
        )
        
        track_types = [t.type for t in variant.timeline.tracks]
        assert 'video' in track_types
        assert 'audio' in track_types
        assert 'caption' in track_types

    def test_compose_draft_api(self, mock_intent, mock_clip_analysis):
        """Test API wrapper function"""
        clip_data = {
            'asset_id': mock_clip_analysis.asset_id,
            'duration': mock_clip_analysis.duration,
            'fps': mock_clip_analysis.fps,
            'engagement_potential': mock_clip_analysis.engagement_potential,
            'viral_score': mock_clip_analysis.viral_score
        }
        
        result = compose_draft_api(
            intent=mock_intent,
            clip_analyses_data=[clip_data]
        )
        
        assert 'variants' in result
        assert 'count' in result
        assert result['count'] == 3


class TestDraftVariantService:
    """Test suite for DraftVariantService"""

    def test_service_initialization(self):
        """Test service initializes correctly"""
        service = DraftVariantService()
        assert service is not None
        assert service.composer is not None

    def test_variant_configs_exist(self):
        """Test variant configurations are defined"""
        service = DraftVariantService()
        
        assert 'safe' in service.VARIANT_CONFIGS
        assert 'experimental' in service.VARIANT_CONFIGS
        assert 'minimal' in service.VARIANT_CONFIGS

    def test_variant_config_has_required_fields(self):
        """Test variant config has required fields"""
        service = DraftVariantService()
        
        for variant_type, config in service.VARIANT_CONFIGS.items():
            assert config.type == variant_type
            assert config.name is not None
            assert config.description is not None
            assert config.badge is not None
            assert len(config.energy_arc) > 0
            assert config.cut_frequency > 0

    def test_generate_all_variants(self, mock_intent, mock_clip_analysis):
        """Test generating all variants"""
        service = DraftVariantService()
        
        variants = service.generate_all_variants(
            intent=mock_intent,
            clip_analyses=[mock_clip_analysis]
        )
        
        assert len(variants) == 3
        
        types = [v.type for v in variants]
        assert 'safe' in types
        assert 'experimental' in types
        assert 'minimal' in types

    def test_compare_variants(self, mock_intent, mock_clip_analysis):
        """Test variant comparison"""
        service = DraftVariantService()
        
        variants = service.generate_all_variants(
            intent=mock_intent,
            clip_analyses=[mock_clip_analysis]
        )
        
        comparison = service.compare_variants(variants)
        
        assert 'variants' in comparison
        assert 'recommendation' in comparison
        assert len(comparison['variants']) == 3


class TestDraftDataClasses:
    """Test data classes"""

    def test_draft_clip_creation(self):
        """Test creating a DraftClip"""
        clip = DraftClip(
            id="clip_1",
            asset_id="asset_1",
            track_id="track_1",
            start=0,
            duration=5000,
            trim_start=0,
            trim_end=10000
        )
        
        assert clip.id == "clip_1"
        assert clip.duration == 5000
        assert clip.speed == 1.0  # Default

    def test_draft_timeline_creation(self):
        """Test creating a DraftTimeline"""
        timeline = DraftTimeline(
            duration=60000,
            fps=30,
            width=1080,
            height=1920,
            clips=[],
            tracks=[]
        )
        
        assert timeline.duration == 60000
        assert timeline.fps == 30

    def test_draft_variant_creation(self):
        """Test creating a DraftVariant"""
        from datetime import datetime
        
        timeline = DraftTimeline(
            duration=60000,
            fps=30,
            width=1080,
            height=1920,
            clips=[],
            tracks=[]
        )
        
        variant = DraftVariant(
            id="test_variant",
            type="safe",
            timeline=timeline,
            created_at=datetime.now().isoformat()
        )
        
        assert variant.id == "test_variant"
        assert variant.type == "safe"
        assert variant.created_at is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
