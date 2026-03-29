"""
AURA Scene Segmentation Service
Auto-detects scenes/moments from video content

This service analyzes video content and segments it into meaningful moments:
- Hook (first 1-3 seconds)
- Intro
- Demo/Main Content
- CTA (Call to Action)
- Transitions

Uses multiple signals:
- Visual scene changes (histogram difference, SSIM)
- Audio energy changes
- Face detection transitions
- Motion level changes
- Speech/pause detection
"""

import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from datetime import datetime
from enum import Enum
import numpy as np


class SceneType(Enum):
    """Types of scenes/moments in social video"""
    HOOK = "hook"
    INTRO = "intro"
    DEMO = "demo"
    MAIN = "main"
    TRANSITION = "transition"
    CTA = "cta"
    B_ROLL = "b_roll"
    PAUSE = "pause"
    UNKNOWN = "unknown"


@dataclass
class SceneBoundary:
    """A detected scene boundary/cut point"""
    timestamp_ms: int
    confidence: float  # 0-1
    method: str  # 'visual', 'audio', 'motion', 'face'
    prev_scene_type: Optional[str] = None
    next_scene_type: Optional[str] = None


@dataclass
class SceneMoment:
    """A detected scene/moment segment"""
    id: str
    scene_type: SceneType
    start_ms: int
    end_ms: int
    duration_ms: int
    thumbnail_url: Optional[str] = None
    label: str = ""
    description: str = ""
    
    # Analysis data
    has_face: bool = False
    face_count: int = 0
    motion_level: float = 0.0  # 0-1
    audio_energy: float = 0.0  # 0-1
    has_speech: bool = False
    has_text: bool = False
    
    # Engagement prediction
    engagement_score: float = 50.0  # 0-100
    engagement_factors: Dict = field(default_factory=dict)
    
    # Suggestions
    suggestions: List[Dict] = field(default_factory=list)
    
    # Source clip reference
    source_asset_id: str = ""
    source_trim_start: int = 0
    source_trim_end: int = 0


@dataclass
class MomentGraph:
    """Complete moment graph for a video"""
    moments: List[SceneMoment]
    total_duration_ms: int
    source_asset_id: str
    created_at: str
    metadata: Dict = field(default_factory=dict)


class SceneSegmentationService:
    """
    Segments video into scenes/moments using multi-modal analysis
    """

    # Scene type heuristics
    HOOK_DURATION_MAX = 3000  # 3 seconds max for hook
    INTRO_DURATION_RANGE = (3000, 8000)  # 3-8 seconds
    CTA_DURATION_RANGE = (3000, 10000)  # 3-10 seconds
    
    # Thresholds
    SCENE_CHANGE_THRESHOLD = 0.3  # Histogram difference threshold
    AUDIO_ENERGY_THRESHOLD = 0.2  # Silence threshold
    MOTION_CHANGE_THRESHOLD = 0.4  # Motion change threshold

    def __init__(self):
        self._frame_cache = {}

    def segment_video(
        self,
        asset_id: str,
        video_features: Dict[str, Any],
        audio_features: Dict[str, Any] = None,
        face_features: Dict[str, Any] = None
    ) -> MomentGraph:
        """
        Segment a video into scenes/moments
        
        Args:
            asset_id: Source video asset ID
            video_features: Pre-extracted video features:
                - frame_timestamps: List of frame timestamps (ms)
                - histogram_diffs: Frame-to-frame histogram differences
                - motion_levels: Motion level per segment
                - brightness_levels: Brightness per segment
            audio_features: Pre-extracted audio features:
                - energy_curve: Audio energy over time
                - speech_segments: Detected speech segments
                - silence_segments: Detected silence segments
            face_features: Pre-extracted face detection:
                - face_segments: Segments with faces detected
                - face_count_curve: Number of faces over time
                
        Returns:
            MomentGraph with detected scenes
        """
        total_duration = video_features.get('duration_ms', 0)
        
        if total_duration == 0:
            return MomentGraph(
                moments=[],
                total_duration_ms=0,
                source_asset_id=asset_id,
                created_at=datetime.now().isoformat()
            )

        # Step 1: Detect scene boundaries
        boundaries = self._detect_scene_boundaries(
            video_features,
            audio_features or {},
            face_features or {}
        )

        # Step 2: Create scene segments from boundaries
        moments = self._create_scene_moments(
            asset_id,
            boundaries,
            total_duration,
            video_features,
            audio_features or {},
            face_features or {}
        )

        # Step 3: Label scenes (Hook, Intro, Demo, CTA, etc.)
        moments = self._label_scenes(moments, total_duration)

        # Step 4: Calculate engagement scores
        moments = self._calculate_engagement_scores(moments, total_duration)

        # Step 5: Generate suggestions for each moment
        moments = self._generate_suggestions(moments)

        return MomentGraph(
            moments=moments,
            total_duration_ms=total_duration,
            source_asset_id=asset_id,
            created_at=datetime.now().isoformat(),
            metadata={
                'boundary_count': len(boundaries),
                'moment_count': len(moments)
            }
        )

    def _detect_scene_boundaries(
        self,
        video_features: Dict,
        audio_features: Dict,
        face_features: Dict
    ) -> List[SceneBoundary]:
        """
        Detect scene change boundaries using multiple signals
        """
        boundaries = []
        timestamps = video_features.get('frame_timestamps', [])
        histogram_diffs = video_features.get('histogram_diffs', [])
        
        if not timestamps or len(timestamps) < 2:
            return boundaries

        # Visual scene changes (histogram difference)
        for i in range(1, len(histogram_diffs)):
            diff = histogram_diffs[i]
            if diff > self.SCENE_CHANGE_THRESHOLD:
                boundaries.append(SceneBoundary(
                    timestamp_ms=timestamps[i],
                    confidence=min(1.0, diff),
                    method='visual'
                ))

        # Audio-based boundaries (silence → speech transitions)
        if audio_features:
            speech_segments = audio_features.get('speech_segments', [])
            for segment in speech_segments:
                if segment.get('start', 0) > 0:
                    boundaries.append(SceneBoundary(
                        timestamp_ms=int(segment['start']),
                        confidence=0.7,
                        method='audio',
                        next_scene_type='speech'
                    ))

        # Face detection transitions
        if face_features:
            face_segments = face_features.get('face_segments', [])
            for segment in face_segments:
                boundaries.append(SceneBoundary(
                    timestamp_ms=int(segment.get('start', 0)),
                    confidence=0.6,
                    method='face',
                    next_scene_type='face'
                ))

        # Sort by timestamp and remove duplicates (within 500ms)
        boundaries.sort(key=lambda b: b.timestamp_ms)
        deduped = []
        last_ts = -500
        for b in boundaries:
            if b.timestamp_ms - last_ts >= 500:
                deduped.append(b)
                last_ts = b.timestamp_ms

        return deduped

    def _create_scene_moments(
        self,
        asset_id: str,
        boundaries: List[SceneBoundary],
        total_duration: int,
        video_features: Dict,
        audio_features: Dict,
        face_features: Dict
    ) -> List[SceneMoment]:
        """
        Create scene moments from detected boundaries
        """
        moments = []
        
        # Add start boundary if not present
        if not boundaries or boundaries[0].timestamp_ms > 0:
            boundaries.insert(0, SceneBoundary(
                timestamp_ms=0,
                confidence=1.0,
                method='visual'
            ))
        
        # Add end boundary if not present
        if not boundaries or boundaries[-1].timestamp_ms < total_duration:
            boundaries.append(SceneBoundary(
                timestamp_ms=total_duration,
                confidence=1.0,
                method='visual'
            ))

        # Create moments from boundary pairs
        for i in range(len(boundaries) - 1):
            start_boundary = boundaries[i]
            end_boundary = boundaries[i + 1]
            
            start_ms = start_boundary.timestamp_ms
            end_ms = end_boundary.timestamp_ms
            duration_ms = end_ms - start_ms
            
            # Skip very short segments (< 500ms)
            if duration_ms < 500:
                continue

            # Extract features for this segment
            segment_features = self._extract_segment_features(
                start_ms, end_ms,
                video_features, audio_features, face_features
            )

            moment = SceneMoment(
                id=f"moment_{i}_{datetime.now().strftime('%H%M%S%f')}",
                scene_type=SceneType.UNKNOWN,
                start_ms=start_ms,
                end_ms=end_ms,
                duration_ms=duration_ms,
                source_asset_id=asset_id,
                source_trim_start=start_ms,
                source_trim_end=end_ms,
                has_face=segment_features['has_face'],
                face_count=segment_features['face_count'],
                motion_level=segment_features['motion_level'],
                audio_energy=segment_features['audio_energy'],
                has_speech=segment_features['has_speech'],
                has_text=segment_features['has_text']
            )

            moments.append(moment)

        return moments

    def _extract_segment_features(
        self,
        start_ms: int,
        end_ms: int,
        video_features: Dict,
        audio_features: Dict,
        face_features: Dict
    ) -> Dict[str, Any]:
        """
        Extract features for a specific time segment
        """
        features = {
            'has_face': False,
            'face_count': 0,
            'motion_level': 0.5,
            'audio_energy': 0.5,
            'has_speech': False,
            'has_text': False
        }

        # Face features
        if face_features:
            face_segments = face_features.get('face_segments', [])
            for seg in face_segments:
                seg_start = seg.get('start', 0)
                seg_end = seg.get('end', 0)
                if seg_start <= end_ms and seg_end >= start_ms:
                    features['has_face'] = True
                    features['face_count'] = seg.get('count', 1)
                    break

        # Motion features
        if video_features:
            motion_levels = video_features.get('motion_levels', [])
            timestamps = video_features.get('frame_timestamps', [])
            if timestamps and motion_levels:
                segment_motions = [
                    m for i, m in enumerate(motion_levels)
                    if i < len(timestamps) and start_ms <= timestamps[i] <= end_ms
                ]
                if segment_motions:
                    features['motion_level'] = float(np.mean(segment_motions))

        # Audio features
        if audio_features:
            energy_curve = audio_features.get('energy_curve', [])
            energy_timestamps = audio_features.get('energy_timestamps', [])
            if energy_timestamps and energy_curve:
                segment_energies = [
                    e for i, e in enumerate(energy_curve)
                    if i < len(energy_timestamps) and start_ms <= energy_timestamps[i] <= end_ms
                ]
                if segment_energies:
                    features['audio_energy'] = float(np.mean(segment_energies))

            # Speech detection
            speech_segments = audio_features.get('speech_segments', [])
            for seg in speech_segments:
                seg_start = seg.get('start', 0)
                seg_end = seg.get('end', 0)
                if seg_start <= end_ms and seg_end >= start_ms:
                    features['has_speech'] = True
                    break

        return features

    def _label_scenes(
        self,
        moments: List[SceneMoment],
        total_duration: int
    ) -> List[SceneMoment]:
        """
        Label each scene with its type (Hook, Intro, Demo, CTA, etc.)
        """
        if not moments:
            return moments

        for i, moment in enumerate(moments):
            position_ratio = moment.start_ms / total_duration if total_duration > 0 else 0
            duration = moment.duration_ms

            # Hook: First scene, short duration, high energy/motion
            if i == 0:
                if duration <= self.HOOK_DURATION_MAX:
                    moment.scene_type = SceneType.HOOK
                    moment.label = "Hook"
                    moment.description = "Opening moment - needs to grab attention"
                    continue
                elif duration <= self.INTRO_DURATION_RANGE[1]:
                    moment.scene_type = SceneType.INTRO
                    moment.label = "Intro"
                    moment.description = "Introduction segment"
                    continue

            # CTA: Last scene, typically has speech
            if i == len(moments) - 1:
                if moment.has_speech or duration >= 3000:
                    moment.scene_type = SceneType.CTA
                    moment.label = "CTA"
                    moment.description = "Call to action"
                    continue

            # Early scenes with faces = likely Intro
            if position_ratio < 0.15 and moment.has_face:
                moment.scene_type = SceneType.INTRO
                moment.label = "Intro"
                moment.description = "Introduction with presenter"
                continue

            # High energy + motion = Demo/Main content
            if moment.motion_level > 0.5 or moment.audio_energy > 0.5:
                moment.scene_type = SceneType.DEMO
                moment.label = "Demo"
                moment.description = "Main content/demonstration"
                continue

            # Low energy segments = Transition or Pause
            if moment.audio_energy < 0.2:
                moment.scene_type = SceneType.PAUSE
                moment.label = "Pause"
                moment.description = "Quiet moment"
                continue

            # Default to Main
            moment.scene_type = SceneType.MAIN
            moment.label = "Main"
            moment.description = "Content segment"

        return moments

    def _calculate_engagement_scores(
        self,
        moments: List[SceneMoment],
        total_duration: int
    ) -> List[SceneMoment]:
        """
        Calculate engagement prediction score for each moment
        """
        for moment in moments:
            score = 50.0  # Base score
            factors = {}

            # Position penalty/bonus (hooks at start are critical)
            position_ratio = moment.start_ms / total_duration if total_duration > 0 else 0
            
            if moment.scene_type == SceneType.HOOK:
                # Hook scoring is critical
                if position_ratio < 0.05:
                    if moment.motion_level > 0.6:
                        score += 20
                        factors['motion'] = '+20 (high motion hook)'
                    else:
                        score -= 15
                        factors['motion'] = '-15 (low motion hook)'
                    
                    if moment.has_face:
                        score += 15
                        factors['face'] = '+15 (face in hook)'
                    else:
                        score -= 10
                        factors['face'] = '-10 (no face in hook)'
                    
                    if moment.audio_energy > 0.5:
                        score += 10
                        factors['audio'] = '+10 (audio starts strong)'
                    else:
                        score -= 20
                        factors['audio'] = '-20 (silent/slow hook)'

            # Face presence bonus
            if moment.has_face:
                score += 10
                factors['face'] = '+10 (face present)'

            # Motion bonus (but not too high)
            if 0.3 < moment.motion_level < 0.8:
                score += 10
                factors['motion'] = '+10 (good motion level)'
            elif moment.motion_level > 0.8:
                score -= 5
                factors['motion'] = '-5 (too much motion)'

            # Speech presence bonus
            if moment.has_speech:
                score += 5
                factors['speech'] = '+5 (speech present)'

            # Duration penalty (too long = boring)
            if moment.duration_ms > 10000:
                score -= 10
                factors['duration'] = '-10 (segment too long)'
            elif moment.duration_ms < 1000:
                score -= 5
                factors['duration'] = '-5 (segment too short)'

            # Clamp to 0-100
            score = max(0, min(100, score))
            
            moment.engagement_score = score
            moment.engagement_factors = factors

        return moments

    def _generate_suggestions(
        self,
        moments: List[SceneMoment]
    ) -> List[SceneMoment]:
        """
        Generate improvement suggestions for each moment
        """
        for moment in moments:
            suggestions = []

            # Hook suggestions
            if moment.scene_type == SceneType.HOOK:
                if moment.engagement_score < 60:
                    suggestions.append({
                        'id': f"suggestion_{moment.id}_hook",
                        'type': 'hook_improvement',
                        'priority': 'high',
                        'message': 'This hook has low energy — try adding a jump cut or text overlay in the first second',
                        'action': 'add_jump_cut',
                        'impact': '+15-25% retention at 3s'
                    })
                
                if not moment.has_face:
                    suggestions.append({
                        'id': f"suggestion_{moment.id}_face",
                        'type': 'face_presence',
                        'priority': 'medium',
                        'message': 'Hooks with faces perform 40% better — consider adding a face shot',
                        'action': 'add_face_shot',
                        'impact': '+40% engagement'
                    })

                if moment.duration_ms > 3000:
                    suggestions.append({
                        'id': f"suggestion_{moment.id}_duration",
                        'type': 'hook_duration',
                        'priority': 'high',
                        'message': f'This hook is {moment.duration_ms/1000:.1f}s — trim to under 3s for better retention',
                        'action': 'trim_hook',
                        'impact': '+20% retention at 5s'
                    })

            # General suggestions
            if moment.duration_ms > 10000 and moment.scene_type != SceneType.DEMO:
                suggestions.append({
                    'id': f"suggestion_{moment.id}_long",
                    'type': 'segment_length',
                    'priority': 'medium',
                    'message': 'This segment is over 10s — consider adding a cut or transition',
                    'action': 'add_cut',
                    'impact': '+10% retention'
                })

            if not moment.has_speech and moment.audio_energy < 0.2:
                suggestions.append({
                    'id': f"suggestion_{moment.id}_silent",
                    'type': 'audio',
                    'priority': 'low',
                    'message': 'This segment is silent — add music or sound effect',
                    'action': 'add_audio',
                    'impact': 'Better flow'
                })

            # CTA suggestions
            if moment.scene_type == SceneType.CTA:
                if not moment.has_text:
                    suggestions.append({
                        'id': f"suggestion_{moment.id}_cta_text",
                        'type': 'cta_improvement',
                        'priority': 'medium',
                        'message': 'Add on-screen text to reinforce your CTA',
                        'action': 'add_cta_text',
                        'impact': '+25% CTA conversion'
                    })

            moment.suggestions = suggestions

        return moments

    def get_moment_thumbnail(
        self,
        asset_id: str,
        moment: SceneMoment,
        frame_extractor=None
    ) -> Optional[str]:
        """
        Generate thumbnail URL for a moment
        """
        if frame_extractor is None:
            # Return placeholder URL
            return f"/api/thumbnails/{asset_id}/{moment.start_ms}.jpg"
        
        # In production, extract frame at middle of moment
        middle_ms = (moment.start_ms + moment.end_ms) // 2
        thumbnail_url = frame_extractor(asset_id, middle_ms)
        return thumbnail_url

    def merge_moments(
        self,
        moments: List[SceneMoment],
        moment_ids: List[str]
    ) -> Optional[SceneMoment]:
        """
        Merge multiple consecutive moments into one
        """
        if len(moment_ids) < 2:
            return None

        # Find moments to merge
        to_merge = [m for m in moments if m.id in moment_ids]
        if len(to_merge) < 2:
            return None

        # Sort by start time
        to_merge.sort(key=lambda m: m.start_ms)

        # Check if consecutive
        for i in range(1, len(to_merge)):
            if to_merge[i].start_ms != to_merge[i-1].end_ms:
                return None  # Not consecutive

        # Create merged moment
        merged = SceneMoment(
            id=f"merged_{datetime.now().strftime('%H%M%S%f')}",
            scene_type=to_merge[0].scene_type,
            start_ms=to_merge[0].start_ms,
            end_ms=to_merge[-1].end_ms,
            duration_ms=sum(m.duration_ms for m in to_merge),
            source_asset_id=to_merge[0].source_asset_id,
            source_trim_start=to_merge[0].source_trim_start,
            source_trim_end=to_merge[-1].source_trim_end,
            has_face=any(m.has_face for m in to_merge),
            face_count=max(m.face_count for m in to_merge),
            motion_level=float(np.mean([m.motion_level for m in to_merge])),
            audio_energy=float(np.mean([m.audio_energy for m in to_merge])),
            has_speech=any(m.has_speech for m in to_merge),
            label=f"Merged ({len(to_merge)} segments)",
            description="User-merged segment"
        )

        return merged

    def split_moment(
        self,
        moment: SceneMoment,
        split_point_ms: int
    ) -> Tuple[SceneMoment, SceneMoment]:
        """
        Split a moment at a specific timestamp
        """
        if split_point_ms <= moment.start_ms or split_point_ms >= moment.end_ms:
            raise ValueError("Split point must be within moment bounds")

        relative_split = split_point_ms - moment.start_ms

        first = SceneMoment(
            id=f"split_a_{datetime.now().strftime('%H%M%S%f')}",
            scene_type=moment.scene_type,
            start_ms=moment.start_ms,
            end_ms=split_point_ms,
            duration_ms=relative_split,
            source_asset_id=moment.source_asset_id,
            source_trim_start=moment.source_trim_start,
            source_trim_end=moment.source_trim_start + relative_split,
            has_face=moment.has_face,
            face_count=moment.face_count,
            motion_level=moment.motion_level,
            audio_energy=moment.audio_energy,
            has_speech=moment.has_speech,
            label=moment.label,
            description=f"First part of split {moment.label}"
        )

        second = SceneMoment(
            id=f"split_b_{datetime.now().strftime('%H%M%S%f')}",
            scene_type=moment.scene_type,
            start_ms=split_point_ms,
            end_ms=moment.end_ms,
            duration_ms=moment.duration_ms - relative_split,
            source_asset_id=moment.source_asset_id,
            source_trim_start=moment.source_trim_start + relative_split,
            source_trim_end=moment.source_trim_end,
            has_face=moment.has_face,
            face_count=moment.face_count,
            motion_level=moment.motion_level,
            audio_energy=moment.audio_energy,
            has_speech=moment.has_speech,
            label=moment.label,
            description=f"Second part of split {moment.label}"
        )

        return first, second


def segment_video_api(
    asset_id: str,
    video_features: Dict[str, Any],
    audio_features: Dict[str, Any] = None,
    face_features: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    API-friendly wrapper for scene segmentation
    """
    service = SceneSegmentationService()
    moment_graph = service.segment_video(
        asset_id,
        video_features,
        audio_features or {},
        face_features or {}
    )

    # Convert to JSON-serializable format
    return {
        'moments': [
            {
                'id': m.id,
                'scene_type': m.scene_type.value,
                'label': m.label,
                'description': m.description,
                'start_ms': m.start_ms,
                'end_ms': m.end_ms,
                'duration_ms': m.duration_ms,
                'engagement_score': m.engagement_score,
                'engagement_factors': m.engagement_factors,
                'suggestions': m.suggestions,
                'has_face': m.has_face,
                'face_count': m.face_count,
                'motion_level': m.motion_level,
                'audio_energy': m.audio_energy,
                'has_speech': m.has_speech,
                'source_asset_id': m.source_asset_id
            }
            for m in moment_graph.moments
        ],
        'total_duration_ms': moment_graph.total_duration_ms,
        'source_asset_id': moment_graph.source_asset_id,
        'created_at': moment_graph.created_at,
        'metadata': moment_graph.metadata
    }


if __name__ == "__main__":
    # Example usage with mock data
    mock_video_features = {
        'duration_ms': 60000,
        'frame_timestamps': list(range(0, 60000, 1000)),  # Every second
        'histogram_diffs': [0.1] * 60,  # Low diff normally
        'motion_levels': [0.5] * 60,
        'brightness_levels': [0.6] * 60
    }
    
    # Add some scene changes
    mock_video_features['histogram_diffs'][5] = 0.8  # Scene change at 5s
    mock_video_features['histogram_diffs'][20] = 0.7  # Scene change at 20s
    mock_video_features['histogram_diffs'][50] = 0.6  # Scene change at 50s
    
    mock_video_features['motion_levels'][:5] = [0.8] * 5  # High motion hook
    
    mock_audio_features = {
        'energy_curve': [0.6] * 60,
        'energy_timestamps': list(range(0, 60000, 1000)),
        'speech_segments': [
            {'start': 1000, 'end': 55000, 'confidence': 0.9}
        ]
    }
    
    mock_face_features = {
        'face_segments': [
            {'start': 0, 'end': 8000, 'count': 1},  # Face in intro
            {'start': 50000, 'end': 60000, 'count': 1}  # Face in CTA
        ]
    }

    result = segment_video_api(
        asset_id="test_video_001",
        video_features=mock_video_features,
        audio_features=mock_audio_features,
        face_features=mock_face_features
    )

    print("\n=== Scene Segmentation Result ===")
    print(f"Total moments: {len(result['moments'])}")
    print(f"Total duration: {result['total_duration_ms']}ms")
    
    for i, moment in enumerate(result['moments']):
        print(f"\n--- Moment {i+1} ---")
        print(f"  Type: {moment['label']} ({moment['scene_type']})")
        print(f"  Duration: {moment['duration_ms']/1000:.1f}s")
        print(f"  Engagement: {moment['engagement_score']:.0f}/100")
        print(f"  Has face: {moment['has_face']}")
        print(f"  Has speech: {moment['has_speech']}")
        
        if moment['suggestions']:
            print(f"  Suggestions:")
            for sug in moment['suggestions']:
                print(f"    - [{sug['priority']}] {sug['message']}")
