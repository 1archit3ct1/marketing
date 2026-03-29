"""
Tests for SceneSegmentationService
Task T011: Moment graph — primary creative interface
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.SceneSegmentationService import (
    SceneSegmentationService,
    SceneType,
    SceneMoment,
    segment_video_api
)


class TestSceneSegmentationService:
    """Test suite for SceneSegmentationService"""

    def test_service_initialization(self):
        """Test service initializes correctly"""
        service = SceneSegmentationService()
        assert service is not None
        assert service.SCENE_CHANGE_THRESHOLD == 0.3
        assert service.HOOK_DURATION_MAX == 3000

    def test_segment_video_creates_moments(self, mock_video_features, mock_audio_features, mock_face_features):
        """Test that segment_video creates moments from video features"""
        service = SceneSegmentationService()
        
        result = service.segment_video(
            asset_id="test_video_001",
            video_features=mock_video_features,
            audio_features=mock_audio_features,
            face_features=mock_face_features
        )
        
        assert result is not None
        assert result.source_asset_id == "test_video_001"
        assert result.total_duration_ms == 60000
        assert len(result.moments) > 0

    def test_moment_has_required_fields(self, mock_video_features, mock_audio_features, mock_face_features):
        """Test that each moment has required fields"""
        service = SceneSegmentationService()
        
        result = service.segment_video(
            asset_id="test_video_001",
            video_features=mock_video_features,
            audio_features=mock_audio_features,
            face_features=mock_face_features
        )
        
        for moment in result.moments:
            assert moment.id is not None
            assert moment.start_ms >= 0
            assert moment.end_ms > moment.start_ms
            assert moment.duration_ms > 0
            assert isinstance(moment.engagement_score, float)
            assert 0 <= moment.engagement_score <= 100

    def test_hook_detection(self):
        """Test that first moment is detected as hook"""
        service = SceneSegmentationService()
        
        # Create features with short first segment
        video_features = {
            'duration_ms': 30000,
            'frame_timestamps': [0, 2000, 10000, 20000, 30000],
            'histogram_diffs': [0.1, 0.8, 0.1, 0.1, 0.1],
            'motion_levels': [0.8, 0.8, 0.5, 0.5, 0.5],
            'brightness_levels': [0.6] * 5
        }
        
        result = service.segment_video(
            asset_id="test_hook",
            video_features=video_features,
            audio_features={},
            face_features={}
        )
        
        if len(result.moments) > 0:
            first_moment = result.moments[0]
            assert first_moment.scene_type in [SceneType.HOOK, SceneType.INTRO]

    def test_engagement_score_calculation(self, mock_video_features, mock_audio_features, mock_face_features):
        """Test engagement score is calculated correctly"""
        service = SceneSegmentationService()
        
        result = service.segment_video(
            asset_id="test_video_001",
            video_features=mock_video_features,
            audio_features=mock_audio_features,
            face_features=mock_face_features
        )
        
        for moment in result.moments:
            assert 0 <= moment.engagement_score <= 100
            assert isinstance(moment.engagement_factors, dict)

    def test_suggestions_generated(self, mock_video_features, mock_audio_features, mock_face_features):
        """Test that suggestions are generated for moments"""
        service = SceneSegmentationService()
        
        result = service.segment_video(
            asset_id="test_video_001",
            video_features=mock_video_features,
            audio_features=mock_audio_features,
            face_features=mock_face_features
        )
        
        for moment in result.moments:
            assert isinstance(moment.suggestions, list)

    def test_scene_labeling(self, mock_video_features, mock_audio_features, mock_face_features):
        """Test that scenes are properly labeled"""
        service = SceneSegmentationService()
        
        result = service.segment_video(
            asset_id="test_video_001",
            video_features=mock_video_features,
            audio_features=mock_audio_features,
            face_features=mock_face_features
        )
        
        valid_labels = ['Hook', 'Intro', 'Demo', 'Main', 'CTA', 'Pause', 'Transition', 'B-Roll']
        for moment in result.moments:
            assert moment.label in valid_labels or moment.label.startswith('Merged')

    def test_split_moment(self):
        """Test splitting a moment at a specific point"""
        service = SceneSegmentationService()
        
        moment = SceneMoment(
            id="test_moment",
            scene_type=SceneType.MAIN,
            start_ms=0,
            end_ms=10000,
            duration_ms=10000,
            label="Main",
            description="Test moment"
        )
        
        first, second = service.split_moment(moment, 5000)
        
        assert first.start_ms == 0
        assert first.end_ms == 5000
        assert second.start_ms == 5000
        assert second.end_ms == 10000
        assert first.duration_ms == 5000
        assert second.duration_ms == 5000

    def test_split_moment_invalid_point(self):
        """Test that splitting at invalid point raises error"""
        service = SceneSegmentationService()
        
        moment = SceneMoment(
            id="test_moment",
            scene_type=SceneType.MAIN,
            start_ms=0,
            end_ms=10000,
            duration_ms=10000,
            label="Main"
        )
        
        with pytest.raises(ValueError):
            service.split_moment(moment, -100)
        
        with pytest.raises(ValueError):
            service.split_moment(moment, 15000)

    def test_segment_video_api(self, mock_video_features, mock_audio_features, mock_face_features):
        """Test the API wrapper function"""
        result = segment_video_api(
            asset_id="test_api",
            video_features=mock_video_features,
            audio_features=mock_audio_features,
            face_features=mock_face_features
        )
        
        assert 'moments' in result
        assert 'total_duration_ms' in result
        assert 'source_asset_id' in result
        assert result['source_asset_id'] == "test_api"


class TestSceneType:
    """Test SceneType enum"""

    def test_scene_type_values(self):
        """Test all scene type values exist"""
        assert SceneType.HOOK.value == "hook"
        assert SceneType.INTRO.value == "intro"
        assert SceneType.DEMO.value == "demo"
        assert SceneType.MAIN.value == "main"
        assert SceneType.CTA.value == "cta"
        assert SceneType.UNKNOWN.value == "unknown"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
