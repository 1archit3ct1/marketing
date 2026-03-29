"""
AURA Script-to-Video Service
Converts a script into a full video edit by matching footage to script segments

Pipeline:
1. Segment script into sentences/beats
2. Analyze footage library → matches each script segment to best footage clip by semantic similarity
3. Build timeline: footage clip per sentence, duration matched to spoken word count
4. Generate voiceover via TTS (ElevenLabs API) or prompts user to record
5. Add matching captions from script text
6. Returns full edit with side-by-side script + timeline view
"""

import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict, field
from datetime import datetime
import re


@dataclass
class ScriptSegment:
    """A segment of the script (sentence or beat)"""
    id: str
    text: str
    start_time: int  # milliseconds (estimated from word count)
    end_time: int  # milliseconds
    word_count: int
    estimated_duration: int  # milliseconds
    matched_asset_id: Optional[str] = None
    matched_clip_start: int = 0  # source trim start in ms
    matched_clip_end: int = 0  # source trim end in ms
    semantic_score: float = 0.0  # similarity score 0-100


@dataclass
class ScriptMetadata:
    """Metadata about the script"""
    total_word_count: int
    total_segments: int
    estimated_duration: int  # milliseconds
    language: str = 'en'
    tone: Optional[str] = None
    has_dialogue: bool = False
    speakers: List[str] = field(default_factory=list)


@dataclass
class ScriptTimeline:
    """Complete script-to-video timeline"""
    script: str
    segments: List[ScriptSegment]
    metadata: ScriptMetadata
    voiceover_asset_id: Optional[str] = None
    captions: List[Dict] = field(default_factory=list)
    timeline_clips: List[Dict] = field(default_factory=list)


class ScriptToVideoService:
    """
    Converts text scripts into video edits by matching footage and generating voiceover
    """

    # Average speaking pace: words per minute
    SPEECH_RATES = {
        'slow': 100,      # documentary, serious
        'normal': 130,    # standard pace
        'fast': 160,      # energetic, TikTok
        'very_fast': 190  # hype, trailer
    }

    # Default speech rate in WPM
    DEFAULT_SPEECH_RATE = 130

    def __init__(self, semantic_match_service=None):
        """
        Initialize service
        
        Args:
            semantic_match_service: SemanticClipMatchService instance for footage matching
        """
        self.semantic_match_service = semantic_match_service

    def segment_script(self, script_text: str) -> List[str]:
        """
        Segment script into sentences/beats
        
        Args:
            script_text: Full script text
            
        Returns:
            List of script segments (sentences)
        """
        if not script_text or not script_text.strip():
            return []

        # Clean up script
        script_text = script_text.strip()
        
        # Split on sentence boundaries (period, exclamation, question mark)
        # Keep the delimiter for better TTS
        segments = re.split(r'(?<=[.!?])\s+', script_text)
        
        # Filter empty segments
        segments = [s.strip() for s in segments if s.strip()]
        
        return segments

    def estimate_segment_duration(self, text: str, speech_rate: int = None) -> int:
        """
        Estimate duration of a segment based on word count
        
        Args:
            text: Segment text
            speech_rate: Words per minute (default: DEFAULT_SPEECH_RATE)
            
        Returns:
            Estimated duration in milliseconds
        """
        if speech_rate is None:
            speech_rate = self.DEFAULT_SPEECH_RATE

        word_count = len(text.split())
        
        # Duration in seconds = (word_count / words_per_minute) * 60
        duration_seconds = (word_count / speech_rate) * 60
        duration_ms = int(duration_seconds * 1000)
        
        # Add small buffer for natural pauses (10%)
        duration_ms = int(duration_ms * 1.1)
        
        return duration_ms

    def count_words(self, text: str) -> int:
        """Count words in text"""
        return len(text.split())

    def detect_language(self, text: str) -> str:
        """
        Detect script language (simplified - in production use langdetect)
        
        For now, returns 'en' default. Production would use:
        - langdetect library
        - Or API call to language detection service
        """
        # Placeholder - would implement proper language detection
        return 'en'

    def detect_tone(self, text: str) -> Optional[str]:
        """
        Detect script tone from keywords
        
        Returns:
            Tone: 'professional', 'casual', 'dramatic', 'humorous', etc.
        """
        text_lower = text.lower()
        
        tone_indicators = {
            'professional': ['welcome', 'introduction', 'presenting', 'demonstrate', 'explain'],
            'casual': ['hey', 'what\'s up', 'let\'s', 'gonna', 'wanna', 'cool'],
            'dramatic': ['discover', 'reveal', 'shocking', 'incredible', 'unbelievable'],
            'humorous': ['funny', 'joke', 'hilarious', 'lol', 'haha', 'kidding'],
            'educational': ['learn', 'tutorial', 'guide', 'tips', 'how to', 'steps']
        }
        
        scores = {}
        for tone, keywords in tone_indicators.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            scores[tone] = score
        
        if max(scores.values()) > 0:
            return max(scores, key=scores.get)
        
        return None

    def create_script_segments(
        self,
        script_text: str,
        speech_rate: int = None
    ) -> List[ScriptSegment]:
        """
        Create structured segments from script
        
        Args:
            script_text: Full script
            speech_rate: Optional speech rate override
            
        Returns:
            List of ScriptSegment objects
        """
        raw_segments = self.segment_script(script_text)
        
        if not raw_segments:
            return []

        segments = []
        current_time = 0

        for i, text in enumerate(raw_segments):
            word_count = self.count_words(text)
            duration = self.estimate_segment_duration(text, speech_rate)
            
            segment = ScriptSegment(
                id=f"seg_{i}_{datetime.now().strftime('%H%M%S%f')}",
                text=text,
                start_time=current_time,
                end_time=current_time + duration,
                word_count=word_count,
                estimated_duration=duration
            )
            
            segments.append(segment)
            current_time += duration

        return segments

    def match_footage_to_segments(
        self,
        segments: List[ScriptSegment],
        available_assets: List[Dict[str, Any]]
    ) -> List[ScriptSegment]:
        """
        Match available footage to script segments using semantic similarity
        
        Args:
            segments: Script segments
            available_assets: List of available video assets with metadata
            
        Returns:
            Segments with matched asset_ids
        """
        if not self.semantic_match_service:
            # Fallback: round-robin assignment if no semantic service
            for i, segment in enumerate(segments):
                if available_assets:
                    asset = available_assets[i % len(available_assets)]
                    segment.matched_asset_id = asset.get('asset_id')
                    segment.matched_clip_start = 0
                    segment.matched_clip_end = int(asset.get('duration', 10) * 1000)
            return segments

        # Use semantic matching service
        for segment in segments:
            match_result = self.semantic_match_service.find_best_match(
                query_text=segment.text,
                available_assets=available_assets
            )
            
            if match_result:
                segment.matched_asset_id = match_result.get('asset_id')
                segment.matched_clip_start = match_result.get('clip_start', 0)
                segment.matched_clip_end = match_result.get('clip_end', 0)
                segment.semantic_score = match_result.get('similarity_score', 0)

        return segments

    def generate_voiceover(
        self,
        script_text: str,
        voice_id: str = 'default',
        language: str = 'en'
    ) -> Dict[str, Any]:
        """
        Generate voiceover from script using TTS
        
        Args:
            script_text: Full script
            voice_id: TTS voice ID (ElevenLabs voice ID)
            language: Language code
            
        Returns:
            Job info with asset_id when complete
        """
        # This would call ElevenLabs API or similar TTS service
        # For now, returns a placeholder job structure
        
        return {
            'job_id': f"tts_{datetime.now().isoformat()}",
            'status': 'processing',
            'voice_id': voice_id,
            'language': language,
            'text_length': len(script_text),
            'estimated_duration': self.estimate_segment_duration(script_text),
            'asset_id': None  # Will be populated when TTS completes
        }

    def generate_captions_from_script(
        self,
        segments: List[ScriptSegment],
        style_preset: str = 'tiktok_bold'
    ) -> List[Dict]:
        """
        Generate caption track from script segments
        
        Args:
            segments: Script segments with timing
            style_preset: Caption style preset
            
        Returns:
            List of caption objects
        """
        captions = []
        
        style_presets = {
            'tiktok_bold': {
                'font_family': 'Inter',
                'font_size': 52,
                'font_weight': 'bold',
                'color': '#ffffff',
                'stroke_color': '#000000',
                'stroke_width': 3,
                'position': 'bottom',
                'background': None
            },
            'minimal': {
                'font_family': 'DM Sans',
                'font_size': 36,
                'font_weight': 'normal',
                'color': '#ffffff',
                'stroke_color': 'transparent',
                'stroke_width': 0,
                'position': 'bottom',
                'background': None,
                'opacity': 0.9
            },
            'karaoke': {
                'font_family': 'Clash Display',
                'font_size': 48,
                'font_weight': 'bold',
                'color': '#ffffff',
                'stroke_color': '#000000',
                'stroke_width': 2,
                'position': 'center',
                'word_highlight_color': '#f5820a'
            },
            'cinematic': {
                'font_family': 'DM Sans',
                'font_size': 42,
                'font_weight': 'normal',
                'color': '#f0f0f0',
                'stroke_color': '#000000',
                'stroke_width': 1,
                'position': 'bottom_third',
                'background': 'gradient_fade'
            }
        }
        
        style = style_presets.get(style_preset, style_presets['tiktok_bold'])
        
        for segment in segments:
            caption = {
                'id': f"caption_{segment.id}",
                'segment_id': segment.id,
                'text': segment.text,
                'start_time': segment.start_time,
                'end_time': segment.end_time,
                'duration': segment.estimated_duration,
                'style': style.copy(),
                'words': self._generate_word_timings(segment)
            }
            captions.append(caption)
        
        return captions

    def _generate_word_timings(self, segment: ScriptSegment) -> List[Dict]:
        """
        Generate word-level timings for caption animation
        
        Args:
            segment: Script segment
            
        Returns:
            List of word timing objects
        """
        words = segment.text.split()
        word_count = len(words)
        
        if word_count == 0:
            return []
        
        duration_per_word = segment.estimated_duration / word_count
        
        word_timings = []
        current_time = segment.start_time
        
        for i, word in enumerate(words):
            # Add slight variation for natural feel
            word_duration = int(duration_per_word * (0.8 + (i % 3) * 0.1))
            
            word_timings.append({
                'id': f"word_{segment.id}_{i}",
                'text': word,
                'start_time': current_time,
                'end_time': current_time + word_duration,
                'duration': word_duration
            })
            
            current_time += word_duration
        
        return word_timings

    def build_timeline(
        self,
        segments: List[ScriptSegment],
        available_assets: List[Dict[str, Any]],
        project_settings: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Build complete timeline from matched segments
        
        Args:
            segments: Script segments with matched footage
            available_assets: Asset metadata
            project_settings: Platform, resolution, etc.
            
        Returns:
            Complete timeline state JSON
        """
        if project_settings is None:
            project_settings = {}

        # Create asset lookup
        asset_map = {a['asset_id']: a for a in available_assets}
        
        # Build clip list
        timeline_clips = []
        
        for segment in segments:
            if not segment.matched_asset_id:
                continue
                
            asset = asset_map.get(segment.matched_asset_id)
            if not asset:
                continue
            
            clip = {
                'id': f"clip_{segment.id}",
                'asset_id': segment.matched_asset_id,
                'track_id': 'track_video_1',
                'start': segment.start_time,
                'duration': segment.estimated_duration,
                'trim_start': segment.matched_clip_start,
                'trim_end': segment.matched_clip_end,
                'speed': 1.0,
                'effects': [],
                'transitions': [],
                'metadata': {
                    'segment_id': segment.id,
                    'script_text': segment.text,
                    'semantic_score': segment.semantic_score
                }
            }
            
            # Add transition if not first clip
            if len(timeline_clips) > 0:
                clip['transitions'] = [{
                    'type': 'dissolve',
                    'duration': 200
                }]
            
            timeline_clips.append(clip)
        
        # Calculate total duration
        total_duration = sum(s.estimated_duration for s in segments) if segments else 0
        
        # Get platform resolution
        platform = project_settings.get('platform', 'tiktok')
        width, height = self._get_platform_resolution(platform)
        
        return {
            'duration': total_duration,
            'fps': 30,
            'width': width,
            'height': height,
            'clips': timeline_clips,
            'tracks': self._create_default_tracks(),
            'metadata': {
                'source': 'script_to_video',
                'platform': platform,
                'total_segments': len(segments)
            }
        }

    def _get_platform_resolution(self, platform: str) -> tuple:
        """Get resolution for platform"""
        platform_ratios = {
            'tiktok': (1080, 1920),
            'reels': (1080, 1920),
            'youtube_shorts': (1080, 1920),
            'youtube': (1920, 1080),
            'linkedin': (1080, 1350),
            'x': (1920, 1080)
        }
        return platform_ratios.get(platform, (1080, 1920))

    def _create_default_tracks(self) -> List[Dict]:
        """Create default track structure"""
        return [
            {'id': 'track_video_1', 'name': 'Video 1', 'type': 'video', 'color': '#7c5cfc', 'order': 0},
            {'id': 'track_video_2', 'name': 'Video 2', 'type': 'video', 'color': '#00e5a0', 'order': 1},
            {'id': 'track_audio_voice', 'name': 'Voice', 'type': 'audio', 'color': '#f5820a', 'order': 2},
            {'id': 'track_audio_music', 'name': 'Music', 'type': 'audio', 'color': '#ec4899', 'order': 3},
            {'id': 'track_captions', 'name': 'Captions', 'type': 'caption', 'color': '#00bcd4', 'order': 4}
        ]

    def process_script(
        self,
        script_text: str,
        available_assets: List[Dict[str, Any]],
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Main entry point: process script into complete video edit
        
        Args:
            script_text: Full script text
            available_assets: List of available video assets
            options: Processing options
            
        Returns:
            Complete edit with timeline, captions, voiceover job
        """
        if options is None:
            options = {}

        # Step 1: Create script segments
        speech_rate = options.get('speech_rate', self.DEFAULT_SPEECH_RATE)
        segments = self.create_script_segments(script_text, speech_rate)
        
        if not segments:
            return {
                'success': False,
                'error': 'No valid script segments found',
                'segments': []
            }

        # Step 2: Detect metadata
        language = self.detect_language(script_text)
        tone = self.detect_tone(script_text)
        
        metadata = ScriptMetadata(
            total_word_count=sum(s.word_count for s in segments),
            total_segments=len(segments),
            estimated_duration=sum(s.estimated_duration for s in segments),
            language=language,
            tone=tone
        )

        # Step 3: Match footage to segments
        segments = self.match_footage_to_segments(segments, available_assets)

        # Step 4: Build timeline
        project_settings = {
            'platform': options.get('platform', 'tiktok'),
            'caption_style': options.get('caption_style', 'tiktok_bold')
        }
        timeline = self.build_timeline(segments, available_assets, project_settings)

        # Step 5: Generate captions
        captions = self.generate_captions_from_script(
            segments,
            style_preset=options.get('caption_style', 'tiktok_bold')
        )

        # Step 6: Generate voiceover (optional)
        voiceover_job = None
        if options.get('generate_voiceover', True):
            voiceover_job = self.generate_voiceover(
                script_text,
                voice_id=options.get('voice_id', 'default'),
                language=language
            )

        # Build result
        result = {
            'success': True,
            'script': {
                'original': script_text,
                'segments': [asdict(s) for s in segments],
                'metadata': asdict(metadata)
            },
            'timeline': timeline,
            'captions': captions,
            'voiceover': voiceover_job,
            'created_at': datetime.now().isoformat()
        }

        return result


def script_to_video_api(
    script_text: str,
    available_assets: List[Dict[str, Any]],
    options: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    API-friendly wrapper for script-to-video processing
    
    Args:
        script_text: Full script
        available_assets: Available footage
        options: Processing options
        
    Returns:
        JSON-serializable result
    """
    service = ScriptToVideoService()
    result = service.process_script(script_text, available_assets, options)
    return result


if __name__ == "__main__":
    # Example usage
    sample_script = """
    Welcome to our product demo. Today we're showing you something incredible.
    This tool will change how you create content forever.
    Let's dive right in and see what makes it special.
    First, notice how intuitive the interface is.
    You can create professional videos in just minutes.
    """

    mock_assets = [
        {'asset_id': 'asset_001', 'duration': 15.0, 'description': 'person talking to camera'},
        {'asset_id': 'asset_002', 'duration': 10.0, 'description': 'product showcase'},
        {'asset_id': 'asset_003', 'duration': 20.0, 'description': 'screen recording demo'},
        {'asset_id': 'asset_004', 'duration': 12.0, 'description': 'happy customer testimonial'},
        {'asset_id': 'asset_005', 'duration': 8.0, 'description': 'call to action graphic'}
    ]

    options = {
        'speech_rate': 140,
        'platform': 'tiktok',
        'caption_style': 'tiktok_bold',
        'generate_voiceover': True,
        'voice_id': 'elevenlabs_rachel'
    }

    result = script_to_video_api(sample_script, mock_assets, options)

    print("\n=== Script-to-Video Result ===")
    print(f"Success: {result['success']}")
    print(f"Total segments: {result['script']['metadata']['total_segments']}")
    print(f"Total duration: {result['script']['metadata']['estimated_duration']}ms")
    print(f"Timeline clips: {len(result['timeline']['clips'])}")
    print(f"Captions: {len(result['captions'])}")
    print(f"Voiceover job: {result['voiceover']['job_id'] if result['voiceover'] else 'N/A'}")
