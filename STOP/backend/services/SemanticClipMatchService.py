"""
AURA Semantic Clip Match Service
Uses CLIP embeddings to match script segments to footage semantically

This service:
1. Generates CLIP embeddings for script text segments
2. Generates CLIP embeddings for video clip descriptions/captions
3. Computes cosine similarity to find best matches
4. Returns ranked matches with similarity scores
"""

import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import numpy as np


@dataclass
class ClipMatch:
    """A match result between text query and video clip"""
    asset_id: str
    similarity_score: float  # 0-100
    clip_start: int  # recommended start trim in ms
    clip_end: int  # recommended end trim in ms
    rank: int
    metadata: Dict = None


class SemanticClipMatchService:
    """
    Semantic matching between text queries and video clips using CLIP embeddings
    
    In production, this would use:
    - OpenAI CLIP (ViT-B/32 or ViT-L/14)
    - Or alternative: SentenceTransformers for text, video CLIP for frames
    
    For now, uses mock embeddings for demonstration.
    """

    def __init__(self, clip_model: str = 'ViT-B/32', device: str = 'cuda'):
        """
        Initialize semantic matching service
        
        Args:
            clip_model: CLIP model variant
            device: 'cuda' or 'cpu'
        """
        self.clip_model = clip_model
        self.device = device
        self._embedding_cache = {}
        
        # In production, load actual CLIP model:
        # import clip
        # self.model, self.preprocess = clip.load(clip_model, device=device)

    def generate_text_embedding(self, text: str) -> np.ndarray:
        """
        Generate CLIP embedding for text
        
        Args:
            text: Text to embed
            
        Returns:
            512-dim embedding vector (for ViT-B/32)
        """
        # Check cache
        cache_key = f"text_{hash(text)}"
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        # In production:
        # text_tokens = clip.tokenize([text]).to(self.device)
        # with torch.no_grad():
        #     embedding = self.model.encode_text(text_tokens)
        # embedding = embedding.cpu().numpy()[0]
        
        # Mock embedding for demonstration
        # Uses deterministic pseudo-random based on text hash
        np.random.seed(hash(text) % (2**32))
        embedding = np.random.randn(512).astype(np.float32)
        
        # Normalize
        embedding = embedding / np.linalg.norm(embedding)
        
        # Cache it
        self._embedding_cache[cache_key] = embedding
        
        return embedding

    def generate_clip_embedding(
        self,
        asset_id: str,
        description: str = '',
        tags: List[str] = None,
        keyframes: List[np.ndarray] = None
    ) -> np.ndarray:
        """
        Generate embedding for a video clip
        
        Combines:
        - Text embedding from description/tags
        - Visual embedding from keyframes (if available)
        
        Args:
            asset_id: Clip identifier
            description: Clip description/caption
            tags: Optional tags list
            keyframes: Optional array of frame images
            
        Returns:
            512-dim embedding vector
        """
        # Check cache
        cache_key = f"clip_{asset_id}"
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        # Build text representation
        text_parts = []
        if description:
            text_parts.append(description)
        if tags:
            text_parts.extend(tags)
        
        combined_text = ' '.join(text_parts)
        
        # Generate text embedding
        text_embedding = self.generate_text_embedding(combined_text)
        
        # In production with actual frames:
        # if keyframes is not None and len(keyframes) > 0:
        #     # Process frames through CLIP visual encoder
        #     frame_embeddings = []
        #     for frame in keyframes:
        #         frame_tensor = self.preprocess(frame).unsqueeze(0).to(self.device)
        #         with torch.no_grad():
        #             frame_emb = self.model.encode_image(frame_tensor)
        #         frame_embeddings.append(frame_emb.cpu().numpy()[0])
        #     
        #     # Average frame embeddings
        #     visual_embedding = np.mean(frame_embeddings, axis=0)
        #     
        #     # Combine text + visual (weighted average)
        #     embedding = 0.6 * text_embedding + 0.4 * visual_embedding
        # else:
        #     embedding = text_embedding
        
        embedding = text_embedding
        
        # Normalize
        embedding = embedding / np.linalg.norm(embedding)
        
        # Cache it
        self._embedding_cache[cache_key] = embedding
        
        return embedding

    def cosine_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Compute cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score 0-1 (higher = more similar)
        """
        # Dot product of normalized vectors = cosine similarity
        similarity = np.dot(embedding1, embedding2)
        
        # Clip to valid range (numerical stability)
        similarity = np.clip(similarity, -1.0, 1.0)
        
        # Convert from [-1, 1] to [0, 1]
        similarity = (similarity + 1) / 2
        
        return float(similarity)

    def find_best_match(
        self,
        query_text: str,
        available_assets: List[Dict[str, Any]],
        top_k: int = 1
    ) -> Optional[Dict[str, Any]]:
        """
        Find best matching clip for a text query
        
        Args:
            query_text: Text to match (script segment)
            available_assets: List of assets with metadata
            top_k: Number of top results to consider
            
        Returns:
            Best match info or None
        """
        if not available_assets:
            return None

        # Generate query embedding
        query_embedding = self.generate_text_embedding(query_text)

        # Score all assets
        scored_assets = []
        
        for asset in available_assets:
            # Build clip text from available metadata
            description = asset.get('description', '') or asset.get('caption', '')
            tags = asset.get('tags', [])
            asset_id = asset.get('asset_id')
            
            if not asset_id:
                continue
            
            # Generate clip embedding
            clip_embedding = self.generate_clip_embedding(
                asset_id=asset_id,
                description=description,
                tags=tags
            )
            
            # Compute similarity
            similarity = self.cosine_similarity(query_embedding, clip_embedding)
            similarity_score = similarity * 100  # Convert to 0-100 scale
            
            scored_assets.append({
                'asset_id': asset_id,
                'similarity_score': similarity_score,
                'duration': asset.get('duration', 10),
                'description': description,
                'metadata': asset
            })

        if not scored_assets:
            return None

        # Sort by similarity descending
        scored_assets.sort(key=lambda x: x['similarity_score'], reverse=True)

        # Get top match
        top_match = scored_assets[0]
        
        # Determine optimal clip segment
        # For now, use full clip; in production would analyze scene boundaries
        duration_ms = int(top_match['duration'] * 1000)
        
        return {
            'asset_id': top_match['asset_id'],
            'similarity_score': top_match['similarity_score'],
            'clip_start': 0,
            'clip_end': duration_ms,
            'rank': 1,
            'all_matches': scored_assets[:top_k]
        }

    def match_multiple_segments(
        self,
        segments: List[Dict[str, Any]],
        available_assets: List[Dict[str, Any]],
        allow_reuse: bool = False,
        max_reuse_count: int = 2
    ) -> List[Dict[str, Any]]:
        """
        Match multiple script segments to clips
        
        Args:
            segments: List of script segments with 'text' field
            available_assets: Available footage
            allow_reuse: Whether same clip can match multiple segments
            max_reuse_count: Max times a clip can be reused
            
        Returns:
            List of match results
        """
        if not segments or not available_assets:
            return []

        results = []
        asset_usage_count = {}  # Track how many times each asset is used

        for i, segment in enumerate(segments):
            query_text = segment.get('text', '')
            
            if not query_text:
                results.append(None)
                continue

            # Filter out overused assets if reuse is limited
            if not allow_reuse:
                filtered_assets = [
                    a for a in available_assets 
                    if a.get('asset_id') not in asset_usage_count
                ]
            else:
                filtered_assets = [
                    a for a in available_assets
                    if asset_usage_count.get(a.get('asset_id'), 0) < max_reuse_count
                ]

            if not filtered_assets:
                results.append(None)
                continue

            # Find best match
            match = self.find_best_match(query_text, filtered_assets)
            
            if match:
                # Track usage
                asset_id = match['asset_id']
                asset_usage_count[asset_id] = asset_usage_count.get(asset_id, 0) + 1
                match['segment_index'] = i
            
            results.append(match)

        return results

    def build_similarity_matrix(
        self,
        texts: List[str],
        assets: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Build full similarity matrix between texts and assets
        
        Args:
            texts: List of text queries
            assets: List of assets
            
        Returns:
            Matrix of shape (len(texts), len(assets)) with similarity scores
        """
        if not texts or not assets:
            return np.array([])

        # Generate all embeddings
        text_embeddings = [self.generate_text_embedding(t) for t in texts]
        
        asset_embeddings = []
        for asset in assets:
            emb = self.generate_clip_embedding(
                asset_id=asset.get('asset_id', ''),
                description=asset.get('description', ''),
                tags=asset.get('tags', [])
            )
            asset_embeddings.append(emb)

        # Compute matrix
        matrix = np.zeros((len(texts), len(assets)))
        
        for i, text_emb in enumerate(text_embeddings):
            for j, asset_emb in enumerate(asset_embeddings):
                similarity = self.cosine_similarity(text_emb, asset_emb)
                matrix[i, j] = similarity * 100

        return matrix

    def suggest_b_roll(
        self,
        script_text: str,
        b_roll_library: List[Dict[str, Any]],
        num_suggestions: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Suggest B-roll footage for a script
        
        Args:
            script_text: Full script or segment
            b_roll_library: List of B-roll clips
            num_suggestions: Number of suggestions to return
            
        Returns:
            List of suggested B-roll clips
        """
        if not b_roll_library:
            return []

        # Generate embedding for script
        script_embedding = self.generate_text_embedding(script_text)

        # Score all B-roll
        scored_b_roll = []
        
        for clip in b_roll_library:
            clip_embedding = self.generate_clip_embedding(
                asset_id=clip.get('asset_id', ''),
                description=clip.get('description', ''),
                tags=clip.get('tags', [])
            )
            
            similarity = self.cosine_similarity(script_embedding, clip_embedding)
            similarity_score = similarity * 100
            
            scored_b_roll.append({
                'asset_id': clip.get('asset_id'),
                'similarity_score': similarity_score,
                'duration': clip.get('duration'),
                'description': clip.get('description', ''),
                'thumbnail_url': clip.get('thumbnail_url'),
                'category': clip.get('category')
            })

        # Sort and return top suggestions
        scored_b_roll.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return scored_b_roll[:num_suggestions]


def semantic_match_api(
    query_text: str,
    available_assets: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    API-friendly wrapper for semantic matching
    
    Args:
        query_text: Text to match
        available_assets: Available footage
        
    Returns:
        Match result
    """
    service = SemanticClipMatchService()
    match = service.find_best_match(query_text, available_assets)
    
    return {
        'match': match,
        'timestamp': datetime.now().isoformat()
    }


if __name__ == "__main__":
    # Example usage
    service = SemanticClipMatchService()

    # Mock available assets
    mock_assets = [
        {
            'asset_id': 'clip_001',
            'duration': 15.0,
            'description': 'person talking to camera in office setting',
            'tags': ['talking head', 'office', 'professional', 'presenter']
        },
        {
            'asset_id': 'clip_002',
            'duration': 10.0,
            'description': 'closeup of hands typing on laptop keyboard',
            'tags': ['typing', 'hands', 'laptop', 'work', 'productivity']
        },
        {
            'asset_id': 'clip_003',
            'duration': 20.0,
            'description': 'screen recording of software interface demo',
            'tags': ['screen recording', 'software', 'demo', 'tutorial']
        },
        {
            'asset_id': 'clip_004',
            'duration': 12.0,
            'description': 'happy customer smiling and giving thumbs up',
            'tags': ['customer', 'happy', 'testimonial', 'positive']
        },
        {
            'asset_id': 'clip_005',
            'duration': 8.0,
            'description': 'animated call to action graphic with subscribe button',
            'tags': ['cta', 'animation', 'subscribe', 'graphics']
        }
    ]

    # Test single match
    query = "Show someone working on their computer productively"
    match = service.find_best_match(query, mock_assets)
    
    print("\n=== Semantic Clip Match Test ===")
    print(f"Query: {query}")
    print(f"Best match: {match['asset_id']}")
    print(f"Similarity: {match['similarity_score']:.1f}%")
    print(f"Description: {mock_assets[1]['description']}")

    # Test multiple segments
    segments = [
        {'text': 'Welcome to our product demo'},
        {'text': 'See how easy it is to use'},
        {'text': 'Our customers love the results'},
        {'text': 'Subscribe for more tips'}
    ]

    print("\n=== Multi-Segment Matching ===")
    matches = service.match_multiple_segments(segments, mock_assets)
    
    for i, (segment, match) in enumerate(zip(segments, matches)):
        if match:
            print(f"\nSegment {i+1}: \"{segment['text']}\"")
            print(f"  → Matched: {match['asset_id']} ({match['similarity_score']:.1f}%)")
        else:
            print(f"\nSegment {i+1}: No match found")

    # Test B-roll suggestions
    print("\n=== B-Roll Suggestions ===")
    script = "We analyzed thousands of videos to find what makes content go viral"
    suggestions = service.suggest_b_roll(script, mock_assets, num_suggestions=3)
    
    for i, suggestion in enumerate(suggestions, 1):
        print(f"{i}. {suggestion['asset_id']} - {suggestion['description']}")
        print(f"   Match: {suggestion['similarity_score']:.1f}%")
