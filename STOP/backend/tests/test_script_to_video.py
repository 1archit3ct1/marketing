"""
Tests for ScriptToVideoService
Task T010: Script-to-video mode
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.ScriptToVideoService import (
    ScriptToVideoService,
    ScriptSegment,
    ScriptMetadata,
    script_to_video_api
)


class TestScriptToVideoService:
    """Test suite for ScriptToVideoService"""

    def test_service_initialization(self):
        """Test service initializes correctly"""
        service = ScriptToVideoService()
        assert service is not None
        assert service.DEFAULT_SPEECH_RATE == 130

    def test_segment_script(self):
        """Test script segmentation into sentences"""
        service = ScriptToVideoService()
        
        script = "Hello world. This is a test. How are you?"
        segments = service.segment_script(script)
        
        assert len(segments) == 3
        assert segments[0] == "Hello world."
        assert segments[1] == "This is a test."
        assert segments[2] == "How are you?"

    def test_segment_script_empty(self):
        """Test segmentation with empty script"""
        service = ScriptToVideoService()
        
        segments = service.segment_script("")
        assert len(segments) == 0
        
        segments = service.segment_script("   ")
        assert len(segments) == 0

    def test_count_words(self):
        """Test word counting"""
        service = ScriptToVideoService()
        
        assert service.count_words("Hello world") == 2
        assert service.count_words("One") == 1
        assert service.count_words("") == 0
        assert service.count_words("  multiple   spaces  ") == 2

    def test_estimate_segment_duration(self):
        """Test duration estimation from text"""
        service = ScriptToVideoService()
        
        # 13 words at 130 WPM = 6 seconds
        text = "This is a test sentence with thirteen words in it here now"
        duration = service.estimate_segment_duration(text)
        
        # Should be approximately 6000ms (with 10% buffer)
        assert duration > 5000
        assert duration < 10000

    def test_estimate_segment_duration_custom_rate(self):
        """Test duration estimation with custom speech rate"""
        service = ScriptToVideoService()
        
        text = "Ten words here now test one two three four five"
        
        # At 100 WPM (slower)
        duration_slow = service.estimate_segment_duration(text, speech_rate=100)
        
        # At 160 WPM (faster)
        duration_fast = service.estimate_segment_duration(text, speech_rate=160)
        
        assert duration_slow > duration_fast

    def test_create_script_segments(self):
        """Test creating structured segments from script"""
        service = ScriptToVideoService()
        
        script = "First sentence. Second sentence. Third sentence."
        segments = service.create_script_segments(script)
        
        assert len(segments) == 3
        assert all(isinstance(s, ScriptSegment) for s in segments)
        
        # Check timing is sequential
        for i in range(1, len(segments)):
            assert segments[i].start_time >= segments[i-1].end_time

    def test_create_script_segments_timing(self):
        """Test that segment timings are correct"""
        service = ScriptToVideoService()
        
        script = "Hello world."
        segments = service.create_script_segments(script)
        
        assert len(segments) == 1
        assert segments[0].start_time == 0
        assert segments[0].end_time > 0
        assert segments[0].word_count == 2
        assert segments[0].estimated_duration > 0

    def test_detect_tone(self):
        """Test tone detection from script"""
        service = ScriptToVideoService()
        
        professional_script = "Welcome to our introduction. We will demonstrate the features."
        tone = service.detect_tone(professional_script)
        assert tone == 'professional'
        
        casual_script = "Hey what's up! Let's check this out, it's gonna be cool."
        tone = service.detect_tone(casual_script)
        assert tone == 'casual'
        
        educational_script = "Learn how to use this tutorial with our step by step guide."
        tone = service.detect_tone(educational_script)
        assert tone == 'educational'

    def test_generate_captions_from_script(self):
        """Test caption generation from segments"""
        service = ScriptToVideoService()
        
        segments = [
            ScriptSegment(
                id="seg_1",
                text="Hello world",
                start_time=0,
                end_time=1000,
                word_count=2,
                estimated_duration=1000
            ),
            ScriptSegment(
                id="seg_2",
                text="Second caption",
                start_time=1000,
                end_time=2000,
                word_count=2,
                estimated_duration=1000
            )
        ]
        
        captions = service.generate_captions_from_script(segments, style_preset='tiktok_bold')
        
        assert len(captions) == 2
        assert captions[0]['text'] == "Hello world"
        assert captions[1]['text'] == "Second caption"
        
        # Check style is applied
        assert captions[0]['style']['font_weight'] == 'bold'

    def test_generate_word_timings(self):
        """Test word-level timing generation"""
        service = ScriptToVideoService()
        
        segment = ScriptSegment(
            id="seg_1",
            text="One two three four five",
            start_time=0,
            end_time=5000,
            word_count=5,
            estimated_duration=5000
        )
        
        word_timings = service._generate_word_timings(segment)
        
        assert len(word_timings) == 5
        assert word_timings[0]['text'] == "One"
        assert word_timings[0]['start_time'] == 0
        
        # Check timings are sequential
        for i in range(1, len(word_timings)):
            assert word_timings[i]['start_time'] >= word_timings[i-1]['end_time']

    def test_process_script_full(self, mock_script, mock_assets):
        """Test full script processing pipeline"""
        service = ScriptToVideoService()
        
        result = service.process_script(
            script_text=mock_script,
            available_assets=mock_assets,
            options={'speech_rate': 140, 'platform': 'tiktok'}
        )
        
        assert result['success'] == True
        assert 'script' in result
        assert 'timeline' in result
        assert 'captions' in result
        assert 'voiceover' in result
        
        # Check metadata
        assert result['script']['metadata']['total_segments'] > 0
        assert result['script']['metadata']['total_word_count'] > 0

    def test_process_script_empty(self):
        """Test processing empty script"""
        service = ScriptToVideoService()
        
        result = service.process_script(
            script_text="",
            available_assets=[]
        )
        
        assert result['success'] == False
        assert 'error' in result

    def test_build_timeline(self, mock_assets):
        """Test timeline building"""
        service = ScriptToVideoService()
        
        segments = [
            ScriptSegment(
                id="seg_1",
                text="First part",
                start_time=0,
                end_time=2000,
                word_count=2,
                estimated_duration=2000,
                matched_asset_id="asset_001",
                matched_clip_start=0,
                matched_clip_end=15000
            )
        ]
        
        timeline = service.build_timeline(segments, mock_assets)
        
        assert timeline['duration'] > 0
        assert len(timeline['clips']) == 1
        assert len(timeline['tracks']) > 0

    def test_get_platform_resolution(self):
        """Test platform resolution lookup"""
        service = ScriptToVideoService()
        
        # Vertical formats
        assert service._get_platform_resolution('tiktok') == (1080, 1920)
        assert service._get_platform_resolution('reels') == (1080, 1920)
        
        # Horizontal formats
        assert service._get_platform_resolution('youtube') == (1920, 1080)
        
        # Default
        assert service._get_platform_resolution('unknown') == (1080, 1920)

    def test_script_to_video_api(self, mock_script, mock_assets):
        """Test API wrapper function"""
        result = script_to_video_api(
            script_text=mock_script,
            available_assets=mock_assets,
            options={'platform': 'tiktok'}
        )
        
        assert 'success' in result
        assert 'script' in result
        assert 'timeline' in result


class TestScriptSegment:
    """Test ScriptSegment dataclass"""

    def test_script_segment_creation(self):
        """Test creating a ScriptSegment"""
        segment = ScriptSegment(
            id="test_1",
            text="Test text",
            start_time=0,
            end_time=1000,
            word_count=2,
            estimated_duration=1000
        )
        
        assert segment.id == "test_1"
        assert segment.text == "Test text"
        assert segment.word_count == 2
        assert segment.matched_asset_id is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
