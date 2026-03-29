'use client';

/**
 * AURA Version History Drawer Component
 * Git-style version history with branch visualization
 */

import React, { useState, useEffect } from 'react';
import { Panel, PanelHeader, PanelBody, PanelFooter } from '@aura/ui/components/Panel';
import { Button } from '@aura/ui/components/Button';
import { Badge } from '@aura/ui/components/Badge';
import { HStack, VStack } from '@aura/ui/components/Stack';
import { Typography } from '@aura/ui/components/Typography';

export interface Version {
  id: string;
  version_id: string;
  label: string;
  created_by: string;
  created_at: string;
  parent_version_id?: string;
  isCurrent?: boolean;
  branch?: string;
}

export interface VersionHistoryDrawerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (versionId: string) => void;
  onCreateBranch?: (versionId: string, branchName: string) => void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  projectId,
  isOpen,
  onClose,
  onRestore,
  onCreateBranch
}) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Load versions
  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, projectId]);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch(`/api/project/version/list?projectId=${projectId}`);
      // const data = await response.json();
      
      // Mock data for now
      const mockVersions: Version[] = [
        {
          id: '1',
          version_id: 'v1',
          label: 'Auto-save 3:45 PM',
          created_by: 'You',
          created_at: new Date().toISOString(),
          isCurrent: true,
          branch: 'main'
        },
        {
          id: '2',
          version_id: 'v2',
          label: 'Added intro sequence',
          created_by: 'You',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          branch: 'main'
        },
        {
          id: '3',
          version_id: 'v3',
          label: 'Initial draft',
          created_by: 'You',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          branch: 'main'
        },
        {
          id: '4',
          version_id: 'v4',
          label: 'Branch: experimental-cuts',
          created_by: 'You',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          branch: 'experimental-cuts'
        }
      ];
      
      setVersions(mockVersions);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = () => {
    if (selectedVersion) {
      onRestore(selectedVersion);
      onClose();
    }
  };

  const handleCreateBranch = () => {
    if (selectedVersion && newBranchName && onCreateBranch) {
      onCreateBranch(selectedVersion, newBranchName);
      setNewBranchName('');
      setShowBranchModal(false);
    }
  };

  const filteredVersions = branchFilter === 'all'
    ? versions
    : versions.filter(v => v.branch === branchFilter);

  const branches = Array.from(new Set(versions.map(v => v.branch).filter(Boolean)));

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-panel border-l border-border z-50 shadow-2xl">
      <Panel variant="default" padding="none" className="h-full flex flex-col rounded-none">
        {/* Header */}
        <PanelHeader>
          <HStack justify="between" className="w-full">
            <VStack gap="xs">
              <Typography variant="h4">Version History</Typography>
              <Typography variant="caption">{versions.length} versions</Typography>
            </VStack>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </HStack>
        </PanelHeader>

        {/* Branch Filter */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Branch:</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-white"
            >
              <option value="all">All Branches</option>
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Version List */}
        <PanelBody scrollable className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No versions found</p>
            </div>
          ) : (
            <VStack gap="sm">
              {filteredVersions.map((version) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isSelected={selectedVersion === version.id}
                  onSelect={() => setSelectedVersion(version.id)}
                  onRestore={() => {
                    setSelectedVersion(version.id);
                    handleRestore();
                  }}
                  onCreateBranch={() => {
                    setSelectedVersion(version.id);
                    setShowBranchModal(true);
                  }}
                />
              ))}
            </VStack>
          )}
        </PanelBody>

        {/* Footer Actions */}
        <PanelFooter>
          <HStack gap="sm" className="w-full">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowBranchModal(true)}
              disabled={!selectedVersion}
            >
              Branch From
            </Button>
            <Button
              variant="accent"
              className="flex-1"
              onClick={handleRestore}
              disabled={!selectedVersion}
            >
              Restore
            </Button>
          </HStack>
        </PanelFooter>
      </Panel>

      {/* Branch Modal */}
      {showBranchModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel rounded-xl border border-border p-6 w-full max-w-sm">
            <Typography variant="h4" className="mb-4">Create Branch</Typography>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Branch Name</label>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="my-branch"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white"
                autoFocus
              />
            </div>
            
            <HStack gap="sm" className="w-full">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setShowBranchModal(false);
                  setNewBranchName('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                className="flex-1"
                onClick={handleCreateBranch}
                disabled={!newBranchName}
              >
                Create Branch
              </Button>
            </HStack>
          </div>
        </div>
      )}
    </div>
  );
};

interface VersionItemProps {
  version: Version;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onCreateBranch: () => void;
}

const VersionItem: React.FC<VersionItemProps> = ({
  version,
  isSelected,
  onSelect,
  onRestore,
  onCreateBranch
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-accent-purple/20 border-accent-purple'
          : 'bg-panel border-border hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <HStack justify="between" className="mb-2">
        <VStack gap="xs" className="flex-1">
          <HStack gap="sm">
            <Typography variant="small" className="font-medium">
              {version.label}
            </Typography>
            {version.isCurrent && (
              <Badge variant="success" size="sm">Current</Badge>
            )}
            {version.branch && version.branch !== 'main' && (
              <Badge variant="accent" size="sm">{version.branch}</Badge>
            )}
          </HStack>
          <Typography variant="caption">
            {version.created_by} • {formatDate(version.created_at)}
          </Typography>
        </VStack>
      </HStack>
      
      <HStack gap="xs">
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          disabled={version.isCurrent}
        >
          Restore
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCreateBranch();
          }}
        >
          Branch
        </Button>
      </HStack>
    </div>
  );
};

export default VersionHistoryDrawer;
