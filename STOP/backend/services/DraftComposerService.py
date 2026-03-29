"""
AURA Draft Composer Service
Generates AI-powered video edit drafts from intent and analyzed clips

Pipeline:
1. Select best segments to fill target_duration
2. Order by energy arc (hook → build → payoff)
3. Insert auto-cuts on beats
4. Apply platform aspect ratio
5. Apply vibe LUT preset
6. Generate caption track from ASR
"""

import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import numpy as np

from .SceneAnalysisService import ClipAnalysis, SceneSegment


@dataclass
class DraftClip:
    """A clip in the draft timeline"""
    id: str
    asset_id: str
    track_id: str
    start: int  # milliseconds on timeline
    duration: int  # milliseconds
    trim_start: int  # milliseconds (source trim)
    trim_end: int  # milliseconds (source trim)
    speed: float = 1.0
    effects: List[Dict] = None
    transitions: List[Dict] = None
    metadata: Dict = None


@dataclass
class DraftTrack:
    """A track in the draft timeline"""
    id: str
    name: str
    type: str  # 'video', 'audio', 'caption', 'effects'
    color: str
    order: int
    is_locked: bool = False
    is_muted: bool = False
    volume: float = 1.0


@dataclass
class DraftTimeline:
    """Complete draft timeline"""
    duration: int  # milliseconds
    fps: int
    width: int
    height: int
    clips: List[DraftClip]
    tracks: List[DraftTrack]
    captions: List[Dict] = None
    audio_tracks: List[Dict] = None
    metadata: Dict = None


@dataclass
class DraftVariant:
    """A draft variant with metadata"""
    id: str
    type: str  # 'safe', 'experimental', 'minimal'
    timeline: DraftTimeline
    preview_url: Optional[str] = None
    engagement_score: float = 0.0
    created_at: str = None


class DraftComposerService:
    """
    Composes AI-generated draft edits from intent and analyzed clips
    """
    
    # Platform aspect ratios
    PLATFORM_RATIOS = {
        'tiktok': (9, 16),
        'reels': (9, 16),
        'youtube_shorts': (9, 16),
        'youtube': (16, 9),
        'linkedin': (4, 5),
        'x': (16, 9)
    }
    
    # Vibe LUT presets (placeholder - would load actual LUT files)
    VIBE_LUTS = {
        'hype': {'saturation': 1.2, 'contrast': 1.1, 'temperature': 0},
        'chill': {'saturation': 0.9, 'contrast': 0.95, 'temperature': -5},
        'professional': {'saturation': 1.0, 'contrast': 1.05, 'temperature': 0},
        'funny': {'saturation': 1.15, 'contrast': 1.1, 'temperature': 5},
        'emotional': {'saturation': 0.85, 'contrast': 1.0, 'temperature': -10}
    }
    
    # Energy arc templates
    ENERGY_ARCS = {
        'safe': [0.8, 0.6, 0.7, 0.8, 0.9, 0.7, 0.8],  # Consistent high energy
        'experimental': [0.9, 0.3, 0.8, 0.4, 1.0, 0.5, 0.9],  # Dynamic swings
        'minimal': [0.5, 0.5, 0.6, 0.6, 0.7, 0.6, 0.5]  # Subtle progression
    }
    
    def __init__(self):
        pass
    
    def compose_draft(
        self,
        intent: Dict[str, Any],
        clip_analyses: List[ClipAnalysis],
        variant_type: str = 'safe'
    ) -> DraftVariant:
        """
        Compose a draft edit from intent and analyzed clips
        
        Args:
            intent: Parsed intent with platform, vibe, duration, etc.
            clip_analyses: List of analyzed clips
            variant_type: 'safe', 'experimental', or 'minimal'
            
        Returns:
            DraftVariant with complete timeline
        """
        target_duration = intent.get('target_duration', 60) * 1000  # Convert to ms
        platform = intent.get('platform', 'tiktok')
        vibe = intent.get('vibe', 'hype')
        
        # Get platform resolution
        width, height = self._get_platform_resolution(platform)
        
        # Create tracks
        tracks = self._create_tracks()
        
        # Select and arrange clips
        clips = self._select_and_arrange_clips(
            clip_analyses,
            target_duration,
            variant_type,
            intent
        )
        
        # Generate captions placeholder
        captions = self._generate_captions_placeholder(clips, intent)
        
        # Create timeline
        timeline = DraftTimeline(
            duration=target_duration,
            fps=30,
            width=width,
            height=height,
            clips=clips,
            tracks=tracks,
            captions=captions,
            metadata={
                'platform': platform,
                'vibe': vibe,
                'variant_type': variant_type,
                'intent': intent
            }
        )
        
        # Calculate engagement score
        engagement_score = self._calculate_draft_engagement(timeline, clip_analyses)
        
        return DraftVariant(
            id=f"draft_{datetime.now().isoformat()}_{variant_type}",
            type=variant_type,
            timeline=timeline,
            engagement_score=engagement_score,
            created_at=datetime.now().isoformat()
        )
    
    def _get_platform_resolution(self, platform: str) -> tuple:
        """Get resolution for platform"""
        ratios = self.PLATFORM_RATIOS.get(platform, (9, 16))
        
        # Base resolution
        base = 1080
        
        if ratios == (9, 16):  # Vertical
            return 1080, 1920
        elif ratios == (16, 9):  # Horizontal
            return 1920, 1080
        elif ratios == (4, 5):  # LinkedIn
            return 1080, 1350
        else:
            return 1080, 1920
    
    def _create_tracks(self) -> List[DraftTrack]:
        """Create default track structure"""
        return [
            DraftTrack(
                id="track_video_1",
                name="Video 1",
                type="video",
                color="#7c5cfc",
                order=0
            ),
            DraftTrack(
                id="track_video_2",
                name="Video 2",
                type="video",
                color="#00e5a0",
                order=1
            ),
            DraftTrack(
                id="track_audio_voice",
                name="Voice",
                type="audio",
                color="#f5820a",
                order=2
            ),
            DraftTrack(
                id="track_audio_music",
                name="Music",
                type="audio",
                color="#ec4899",
                order=3
            ),
            DraftTrack(
                id="track_captions",
                name="Captions",
                type="caption",
                color="#00bcd4",
                order=4
            )
        ]
    
    def _select_and_arrange_clips(
        self,
        clip_analyses: List[ClipAnalysis],
        target_duration: int,
        variant_type: str,
        intent: Dict
    ) -> List[DraftClip]:
        """
        Select best clips and arrange them according to energy arc
        """
        if not clip_analyses:
            return []
        
        # Score and rank clips
        ranked_clips = self._rank_clips(clip_analyses, intent)
        
        # Get energy arc for variant type
        energy_arc = self.ENERGY_ARCS.get(variant_type, self.ENERGY_ARCS['safe'])
        
        # Calculate segment durations based on energy arc
        num_segments = len(energy_arc)
        segment_duration = target_duration // num_segments
        
        clips = []
        current_time = 0
        clip_index = 0
        
        for i, energy_target in enumerate(energy_arc):
            if current_time >= target_duration:
                break
            
            # Find best clip for this energy level
            best_clip = self._find_best_clip_for_energy(
                ranked_clips,
                energy_target,
                clip_index % len(ranked_clips)
            )
            
            if best_clip:
                analysis = best_clip['analysis']
                
                # Calculate clip duration for this segment
                clip_duration = min(
                    segment_duration,
                    int(analysis.duration * 1000),  # Clip duration in ms
                    target_duration - current_time
                )
                
                # Create draft clip
                draft_clip = DraftClip(
                    id=f"clip_{i}_{best_clip['asset_id']}",
                    asset_id=best_clip['asset_id'],
                    track_id="track_video_1",
                    start=current_time,
                    duration=clip_duration,
                    trim_start=0,
                    trim_end=int(analysis.duration * 1000) - clip_duration,
                    speed=1.0,
                    effects=self._get_effects_for_segment(i, energy_target, intent),
                    transitions=[{
                        'type': 'dissolve',
                        'duration': 300 if i > 0 else 0
                    }] if i > 0 else [],
                    metadata={
                        'scene_label': analysis.scenes[i % len(analysis.scenes)].label if analysis.scenes else 'main',
                        'engagement_score': analysis.engagement_potential
                    }
                )
                
                clips.append(draft_clip)
                current_time += clip_duration
                clip_index += 1
        
        return clips
    
    def _rank_clips(
        self,
        clip_analyses: List[ClipAnalysis],
        intent: Dict
    ) -> List[Dict]:
        """Rank clips by relevance to intent"""
        ranked = []
        
        for analysis in clip_analyses:
            score = 0
            
            # Engagement potential
            score += analysis.engagement_potential * 0.4
            
            # Viral score
            score += analysis.viral_score * 0.3
            
            # Quality score
            if analysis.quality:
                score += analysis.quality.overall * 0.2
            
            # Face presence bonus for social
            if intent.get('platform') in ['tiktok', 'reels', 'youtube_shorts']:
                if analysis.faces and analysis.faces.count > 0:
                    score += 10
            
            ranked.append({
                'asset_id': analysis.asset_id,
                'analysis': analysis,
                'score': score
            })
        
        # Sort by score descending
        ranked.sort(key=lambda x: x['score'], reverse=True)
        
        return ranked
    
    def _find_best_clip_for_energy(
        self,
        ranked_clips: List[Dict],
        energy_target: float,
        start_index: int
    ) -> Optional[Dict]:
        """Find best clip matching energy target"""
        if not ranked_clips:
            return None
        
        # Simple round-robin for now
        # In production, match clip energy to target energy
        return ranked_clips[start_index % len(ranked_clips)]
    
    def _get_effects_for_segment(
        self,
        segment_index: int,
        energy_target: float,
        intent: Dict
    ) -> List[Dict]:
        """Get effects for a segment based on energy and vibe"""
        effects = []
        vibe = intent.get('vibe', 'hype')
        
        # Apply vibe LUT
        if vibe in self.VIBE_LUTS:
            effects.append({
                'type': 'color_grade',
                'preset': vibe,
                'parameters': self.VIBE_LUTS[vibe]
            })
        
        # High energy segments get stabilization
        if energy_target > 0.7:
            effects.append({
                'type': 'stabilize',
                'strength': 0.5
            })
        
        # Hook segment (first) gets extra punch
        if segment_index == 0:
            effects.append({
                'type': 'sharpen',
                'amount': 0.3
            })
            effects.append({
                'type': 'saturation',
                'amount': 1.1
            })
        
        return effects
    
    def _generate_captions_placeholder(
        self,
        clips: List[DraftClip],
        intent: Dict
    ) -> List[Dict]:
        """Generate placeholder caption structure"""
        if not intent.get('has_captions', False):
            return []
        
        captions = []
        
        for clip in clips:
            # Placeholder: would be filled by ASR service
            caption = {
                'clip_id': clip.id,
                'segments': [
                    {
                        'id': f"caption_{clip.id}_1",
                        'start': clip.start,
                        'end': clip.start + clip.duration,
                        'text': '[Auto-generated caption will appear here]',
                        'words': []
                    }
                ],
                'style': {
                    'preset': 'tiktok_bold',
                    'font_family': 'Inter',
                    'font_size': 48,
                    'color': '#ffffff',
                    'stroke_color': '#000000',
                    'stroke_width': 2,
                    'position': 'bottom'
                }
            }
            captions.append(caption)
        
        return captions
    
    def _calculate_draft_engagement(
        self,
        timeline: DraftTimeline,
        clip_analyses: List[ClipAnalysis]
    ) -> float:
        """Calculate predicted engagement score for draft"""
        if not clip_analyses:
            return 50.0
        
        # Average engagement of used clips
        used_asset_ids = {c.asset_id for c in timeline.clips}
        used_analyses = [a for a in clip_analyses if a.asset_id in used_asset_ids]
        
        if not used_analyses:
            return 50.0
        
        avg_engagement = np.mean([a.engagement_potential for a in used_analyses])
        
        # Bonus for variety
        if len(used_analyses) > 1:
            avg_engagement += 5
        
        # Bonus for good pacing (detected by clip count vs duration)
        clips_per_minute = len(timeline.clips) / (timeline.duration / 60000)
        if 10 <= clips_per_minute <= 30:  # Good pacing for short-form
            avg_engagement += 10
        
        return min(100, avg_engagement)
    
    def generate_three_variants(
        self,
        intent: Dict[str, Any],
        clip_analyses: List[ClipAnalysis]
    ) -> List[DraftVariant]:
        """
        Generate all three draft variants
        
        Returns:
            List of DraftVariant (safe, experimental, minimal)
        """
        variants = []
        
        for variant_type in ['safe', 'experimental', 'minimal']:
            variant = self.compose_draft(intent, clip_analyses, variant_type)
            variants.append(variant)
        
        return variants


def compose_draft_api(
    intent: Dict[str, Any],
    clip_analyses_data: List[Dict]
) -> Dict[str, Any]:
    """
    API-friendly wrapper for draft composition
    
    Args:
        intent: Parsed intent
        clip_analyses_data: List of clip analysis results (from SceneAnalysisService)
        
    Returns:
        JSON-serializable draft variants
    """
    service = DraftComposerService()
    
    # Convert dict analyses back to ClipAnalysis objects
    clip_analyses = []
    for data in clip_analyses_data:
        # Simplified reconstruction - in production would use proper deserialization
        analysis = ClipAnalysis(
            asset_id=data['asset_id'],
            duration=data['duration'],
            fps=data.get('fps', 30),
            resolution=data.get('resolution', {'width': 1920, 'height': 1080}),
            engagement_potential=data.get('engagement_potential', 50),
            viral_score=data.get('viral_score', 50)
        )
        clip_analyses.append(analysis)
    
    # Generate variants
    variants = service.generate_three_variants(intent, clip_analyses)
    
    # Convert to JSON-serializable format
    result = []
    for variant in variants:
        variant_dict = {
            'id': variant.id,
            'type': variant.type,
            'engagement_score': variant.engagement_score,
            'created_at': variant.created_at,
            'timeline': {
                'duration': variant.timeline.duration,
                'fps': variant.timeline.fps,
                'width': variant.timeline.width,
                'height': variant.timeline.height,
                'clips': [asdict(c) for c in variant.timeline.clips],
                'tracks': [asdict(t) for t in variant.timeline.tracks],
                'metadata': variant.timeline.metadata
            }
        }
        result.append(variant_dict)
    
    return {
        'variants': result,
        'count': len(result)
    }


if __name__ == "__main__":
    # Example usage
    intent = {
        'target_duration': 60,
        'platform': 'tiktok',
        'vibe': 'hype',
        'energy_level': 'high',
        'has_captions': True
    }
    
    # Mock clip analyses
    mock_analyses = [
        ClipAnalysis(
            asset_id="clip_1",
            duration=30.0,
            fps=30,
            resolution={'width': 1920, 'height': 1080},
            engagement_potential=75,
            viral_score=70
        )
    ]
    
    service = DraftComposerService()
    variants = service.generate_three_variants(intent, mock_analyses)
    
    for variant in variants:
        print(f"\n{variant.type} variant:")
        print(f"  Engagement score: {variant.engagement_score}")
        print(f"  Clips: {len(variant.timeline.clips)}")
        print(f"  Duration: {variant.timeline.duration}ms")
