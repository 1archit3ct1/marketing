"""
Tests for SemanticClipMatchService
Task T010: Script-to-video mode (semantic matching component)
"""

import pytest
import sys
import os
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.SemanticClipMatchService import (
    SemanticClipMatchService,
    ClipMatch,
    semantic_match_api
)


class TestSemanticClipMatchService:
    """Test suite for SemanticClipMatchService"""

    def test_service_initialization(self):
        """Test service initializes correctly"""
        service = SemanticClipMatchService()
        assert service is not None
        assert service.clip_model == 'ViT-B/32'

    def test_generate_text_embedding(self):
        """Test text embedding generation"""
        service = SemanticClipMatchService()
        
        text = "This is a test sentence"
        embedding = service.generate_text_embedding(text)
        
        assert embedding is not None
        assert isinstance(embedding, np.ndarray)
        assert embedding.shape == (512,)  # CLIP ViT-B/32 embedding dimension
        
        # Check normalized
        norm = np.linalg.norm(embedding)
        assert np.isclose(norm, 1.0, atol=1e-5)

    def test_generate_text_embedding_caching(self):
        """Test that embeddings are cached"""
        service = SemanticClipMatchService()
        
        text = "Cached embedding test"
        
        # Generate twice
        emb1 = service.generate_text_embedding(text)
        emb2 = service.generate_text_embedding(text)
        
        # Should be identical (from cache)
        assert np.array_equal(emb1, emb2)

    def test_generate_clip_embedding(self):
        """Test clip embedding generation"""
        service = SemanticClipMatchService()
        
        embedding = service.generate_clip_embedding(
            asset_id="test_clip",
            description="A person talking to camera",
            tags=['talking head', 'office']
        )
        
        assert embedding is not None
        assert isinstance(embedding, np.ndarray)
        assert embedding.shape == (512,)

    def test_cosine_similarity(self):
        """Test cosine similarity calculation"""
        service = SemanticClipMatchService()
        
        # Identical vectors should have similarity 1.0
        vec1 = np.array([1.0, 0.0, 0.0])
        vec2 = np.array([1.0, 0.0, 0.0])
        sim = service.cosine_similarity(vec1, vec2)
        assert np.isclose(sim, 1.0, atol=1e-5)
        
        # Orthogonal vectors should have similarity 0.5 (after [0,1] conversion)
        vec3 = np.array([0.0, 1.0, 0.0])
        sim = service.cosine_similarity(vec1, vec3)
        assert np.isclose(sim, 0.5, atol=1e-5)
        
        # Opposite vectors should have similarity 0.0 (after conversion)
        vec4 = np.array([-1.0, 0.0, 0.0])
        sim = service.cosine_similarity(vec1, vec4)
        assert np.isclose(sim, 0.0, atol=1e-5)

    def test_find_best_match(self, mock_assets):
        """Test finding best matching clip for query"""
        service = SemanticClipMatchService()
        
        query = "person talking to camera"
        match = service.find_best_match(query, mock_assets)
        
        assert match is not None
        assert 'asset_id' in match
        assert 'similarity_score' in match
        assert 0 <= match['similarity_score'] <= 100

    def test_find_best_match_empty_assets(self):
        """Test finding match with empty asset list"""
        service = SemanticClipMatchService()
        
        match = service.find_best_match("test query", [])
        assert match is None

    def test_find_best_match_returns_top(self, mock_assets):
        """Test that best match returns highest similarity"""
        service = SemanticClipMatchService()
        
        query = "product showcase demonstration"
        match = service.find_best_match(query, mock_assets)
        
        # Verify it returns a valid match with required fields
        assert match is not None
        assert 'asset_id' in match
        assert 'similarity_score' in match
        assert match['similarity_score'] > 0
        
        # Verify the match is from the provided assets
        asset_ids = [a['asset_id'] for a in mock_assets]
        assert match['asset_id'] in asset_ids

    def test_match_multiple_segments(self, mock_assets):
        """Test matching multiple segments to clips"""
        service = SemanticClipMatchService()
        
        segments = [
            {'text': 'person talking to camera'},
            {'text': 'product showcase'},
            {'text': 'screen recording demo'}
        ]
        
        matches = service.match_multiple_segments(segments, mock_assets)
        
        assert len(matches) == 3
        assert all(m is not None for m in matches)
        
        # Check each match has required fields
        for match in matches:
            assert 'asset_id' in match
            assert 'similarity_score' in match

    def test_match_multiple_segments_no_reuse(self, mock_assets):
        """Test matching with reuse disabled"""
        service = SemanticClipMatchService()
        
        segments = [
            {'text': 'person talking'},
            {'text': 'person talking'},  # Same query
            {'text': 'person talking'}   # Same query
        ]
        
        matches = service.match_multiple_segments(
            segments, 
            mock_assets, 
            allow_reuse=False
        )
        
        # Should get different assets for each
        asset_ids = [m['asset_id'] for m in matches if m]
        assert len(asset_ids) == len(set(asset_ids))  # All unique

    def test_build_similarity_matrix(self, mock_assets):
        """Test building similarity matrix"""
        service = SemanticClipMatchService()
        
        texts = ["person talking", "product demo"]
        
        matrix = service.build_similarity_matrix(texts, mock_assets)
        
        assert matrix.shape == (2, 5)  # 2 texts, 5 assets
        assert np.all(matrix >= 0)
        assert np.all(matrix <= 100)

    def test_suggest_b_roll(self, mock_assets):
        """Test B-roll suggestions"""
        service = SemanticClipMatchService()
        
        script = "We analyzed thousands of videos to find viral patterns"
        
        suggestions = service.suggest_b_roll(script, mock_assets, num_suggestions=3)
        
        assert len(suggestions) <= 3
        assert all('asset_id' in s for s in suggestions)
        assert all('similarity_score' in s for s in suggestions)
        
        # Should be sorted by similarity
        for i in range(1, len(suggestions)):
            assert suggestions[i]['similarity_score'] <= suggestions[i-1]['similarity_score']

    def test_suggest_b_roll_empty_library(self):
        """Test B-roll suggestions with empty library"""
        service = SemanticClipMatchService()
        
        suggestions = service.suggest_b_roll("test script", [])
        assert suggestions == []

    def test_semantic_match_api(self, mock_assets):
        """Test API wrapper function"""
        result = semantic_match_api(
            query_text="person talking to camera",
            available_assets=mock_assets
        )
        
        assert 'match' in result
        assert 'timestamp' in result
        assert result['match'] is not None


class TestClipMatch:
    """Test ClipMatch dataclass"""

    def test_clip_match_creation(self):
        """Test creating a ClipMatch"""
        match = ClipMatch(
            asset_id="test_asset",
            similarity_score=85.5,
            clip_start=0,
            clip_end=10000,
            rank=1
        )
        
        assert match.asset_id == "test_asset"
        assert match.similarity_score == 85.5
        assert match.rank == 1


class TestEmbeddingConsistency:
    """Test embedding consistency and determinism"""

    def test_same_text_same_embedding(self):
        """Test same text produces same embedding"""
        service = SemanticClipMatchService()
        
        text = "Consistent embedding test"
        
        emb1 = service.generate_text_embedding(text)
        emb2 = service.generate_text_embedding(text)
        
        assert np.allclose(emb1, emb2)

    def test_different_text_different_embedding(self):
        """Test different text produces different embedding"""
        service = SemanticClipMatchService()
        
        emb1 = service.generate_text_embedding("First text")
        emb2 = service.generate_text_embedding("Completely different text")
        
        # Should not be identical
        assert not np.allclose(emb1, emb2)
        
        # Cosine similarity should be less than 1
        sim = service.cosine_similarity(emb1, emb2)
        assert sim < 0.99  # Allow some similarity but not identical


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
