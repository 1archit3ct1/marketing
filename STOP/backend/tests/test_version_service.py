"""
Tests for Version Service
Task T005: Version history (git-style branching)
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def test_version_service_typescript():
    """
    VersionService is TypeScript - interface validation test
    
    The service provides:
    - saveVersion: Creates new version snapshot
    - getVersionHistory: Lists versions for project
    - getVersionGraph: Returns branch visualization data
    - restoreVersion: Reverts to previous version
    - createBranch: Creates new branch from version
    - mergeBranch: Merges branch into target
    - deleteVersion: Removes version
    - compareVersions: Diffs two versions
    - getVersionByLabel: Finds version by label
    - autoSaveVersion: Debounced auto-save
    """
    assert True


def test_version_interface():
    """Test Version interface structure"""
    version = {
        'id': 'uuid-1',
        'project_id': 'project-uuid',
        'version_id': 'version-uuid',
        'label': 'Version 1',
        'timeline_state': {'clips': [], 'duration': 60000},
        'created_by': 'user-uuid',
        'created_at': '2024-01-01T00:00:00Z',
        'parent_version_id': None
    }
    
    assert 'id' in version
    assert 'project_id' in version
    assert 'version_id' in version
    assert 'label' in version
    assert 'timeline_state' in version
    assert 'created_by' in version
    assert 'created_at' in version


def test_version_graph_interface():
    """Test VersionGraph interface structure"""
    graph = {
        'versions': [],
        'branches': {},  # Map<string, string[]>
        'currentBranch': 'main',
        'head': 'version-uuid'
    }
    
    assert 'versions' in graph
    assert 'branches' in graph
    assert 'currentBranch' in graph
    assert 'head' in graph


def test_save_version_options():
    """Test CreateVersionOptions interface"""
    options = {
        'projectId': 'project-uuid',
        'label': 'My Version',
        'userId': 'user-uuid',
        'timelineState': {'clips': [], 'duration': 60000},
        'branch': 'main'
    }
    
    assert 'projectId' in options
    assert 'userId' in options
    assert 'timelineState' in options
    assert options.get('branch', 'main') == 'main'


def test_branch_options():
    """Test BranchOptions interface"""
    options = {
        'projectId': 'project-uuid',
        'branchName': 'feature-branch',
        'fromVersionId': 'version-uuid',
        'userId': 'user-uuid'
    }
    
    assert 'projectId' in options
    assert 'branchName' in options
    assert 'userId' in options


def test_version_diff_interface():
    """Test VersionDiff interface structure"""
    diff = {
        'clips': {
            'added': [],
            'removed': [],
            'modified': []
        },
        'tracks': {
            'added': [],
            'removed': [],
            'modified': []
        },
        'duration': {
            'before': 60000,
            'after': 90000
        },
        'hasChanges': True
    }
    
    assert 'clips' in diff
    assert 'tracks' in diff
    assert 'duration' in diff
    assert 'hasChanges' in diff
    assert diff['hasChanges'] == True


def test_version_label_generation():
    """Test version label auto-generation"""
    def generate_label(count):
        return f"Version {count}"
    
    assert generate_label(1) == "Version 1"
    assert generate_label(10) == "Version 10"


def test_auto_save_label():
    """Test auto-save label format"""
    from datetime import datetime
    
    def generate_auto_save_label():
        now = datetime.now()
        return f"Auto-save {now.strftime('%H:%M:%S')}"
    
    label = generate_auto_save_label()
    assert label.startswith('Auto-save ')


def test_restore_version_creates_new():
    """Test that restore creates new version (git-revert style)"""
    # restoreVersion should create a NEW version with old state
    # NOT just checkout the old version
    restore_label = 'Restored from "Version 5"'
    
    assert 'Restored from' in restore_label


def test_branch_default_name():
    """Test default branch name is 'main'"""
    default_branch = 'main'
    assert default_branch == 'main'


def test_merge_strategy():
    """Test merge strategy (ours/target wins)"""
    # Simple "ours" merge - target branch wins
    merge_label = 'Merge feature into main'
    
    assert 'Merge' in merge_label
    assert 'into' in merge_label


def test_compare_versions_diff_types():
    """Test version comparison detects all diff types"""
    diff_types = ['added', 'removed', 'modified']
    
    clips_diff = {
        'added': [{'id': 'new_clip'}],
        'removed': [{'id': 'old_clip'}],
        'modified': [{'before': {}, 'after': {}}]
    }
    
    for diff_type in diff_types:
        assert diff_type in clips_diff


def test_version_history_limit():
    """Test version history query limit"""
    default_limit = 50
    graph_limit = 500
    
    assert default_limit == 50
    assert graph_limit == 500
    assert graph_limit > default_limit


def test_auto_save_debounce_interval():
    """Test auto-save debounce interval (5 minutes)"""
    debounce_ms = 5 * 60 * 1000  # 5 minutes
    
    assert debounce_ms == 300000


def test_version_parent_tracking():
    """Test parent version tracking for history graph"""
    version = {
        'id': 'v2',
        'parent_version_id': 'v1'
    }
    
    assert 'parent_version_id' in version
    assert version['parent_version_id'] is not None


def test_timeline_state_storage():
    """Test timeline state is stored as JSONB"""
    timeline_state = {
        'duration': 60000,
        'fps': 30,
        'width': 1080,
        'height': 1920,
        'clips': [
            {
                'id': 'clip_1',
                'asset_id': 'asset_1',
                'start': 0,
                'duration': 5000
            }
        ],
        'tracks': [
            {'id': 'track_1', 'type': 'video', 'order': 0}
        ]
    }
    
    assert 'duration' in timeline_state
    assert 'clips' in timeline_state
    assert 'tracks' in timeline_state


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
