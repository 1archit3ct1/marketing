"""
AURA Backend Test Configuration
Pytest fixtures and configuration for backend service tests
"""

import pytest
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture
def mock_clip_analysis():
    """Mock ClipAnalysis data for testing"""
    from services.SceneAnalysisService import ClipAnalysis, FaceDetection, QualityScore
    
    return ClipAnalysis(
        asset_id="test_clip_001",
        duration=30.0,
        fps=30,
        resolution={'width': 1920, 'height': 1080},
        engagement_potential=75,
        viral_score=70,
        faces=FaceDetection(count=1, timestamps=[0.0, 5.0, 10.0], confidence=0.95),
        quality=QualityScore(
            overall=85,
            sharpness=80,
            brightness=85,
            contrast=90,
            noise_level=10,
            stability=90
        )
    )


@pytest.fixture
def mock_intent():
    """Mock parsed intent data"""
    return {
        'target_duration': 60,
        'platform': 'tiktok',
        'vibe': 'hype',
        'energy_level': 'high',
        'has_captions': True
    }


@pytest.fixture
def mock_script():
    """Mock script text for testing"""
    return """
    Welcome to our product demo. Today we're showing you something incredible.
    This tool will change how you create content forever.
    Let's dive right in and see what makes it special.
    First, notice how intuitive the interface is.
    You can create professional videos in just minutes.
    """


@pytest.fixture
def mock_assets():
    """Mock available assets for testing"""
    return [
        {'asset_id': 'asset_001', 'duration': 15.0, 'description': 'person talking to camera'},
        {'asset_id': 'asset_002', 'duration': 10.0, 'description': 'product showcase'},
        {'asset_id': 'asset_003', 'duration': 20.0, 'description': 'screen recording demo'},
        {'asset_id': 'asset_004', 'duration': 12.0, 'description': 'happy customer testimonial'},
        {'asset_id': 'asset_005', 'duration': 8.0, 'description': 'call to action graphic'}
    ]


@pytest.fixture
def mock_video_features():
    """Mock video features for scene segmentation"""
    return {
        'duration_ms': 60000,
        'frame_timestamps': list(range(0, 60000, 1000)),
        'histogram_diffs': [0.1] * 60,
        'motion_levels': [0.5] * 60,
        'brightness_levels': [0.6] * 60
    }


@pytest.fixture
def mock_audio_features():
    """Mock audio features for scene segmentation"""
    return {
        'energy_curve': [0.6] * 60,
        'energy_timestamps': list(range(0, 60000, 1000)),
        'speech_segments': [
            {'start': 1000, 'end': 55000, 'confidence': 0.9}
        ]
    }


@pytest.fixture
def mock_face_features():
    """Mock face detection features"""
    return {
        'face_segments': [
            {'start': 0, 'end': 8000, 'count': 1},
            {'start': 50000, 'end': 60000, 'count': 1}
        ]
    }
