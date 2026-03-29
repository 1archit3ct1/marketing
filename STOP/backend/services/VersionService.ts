/**
 * AURA Version Service
 * Git-style version history for projects
 * 
 * Features:
 * - Every save creates a named snapshot
 * - Branch edits like git
 * - Restore any version
 * - Compare versions
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/client';
import { ProjectModel, VersionHistoryModel } from '../db/models';

export interface Version {
  id: string;
  project_id: string;
  version_id: string;
  label: string;
  timeline_state: any;
  created_by: string;
  created_at: string;
  parent_version_id?: string;
}

export interface VersionGraph {
  versions: Version[];
  branches: Map<string, string[]>; // branch name -> version IDs
  currentBranch: string;
  head: string; // current version ID
}

export interface CreateVersionOptions {
  projectId: string;
  label?: string;
  userId: string;
  timelineState: any;
  branch?: string;
}

export interface BranchOptions {
  projectId: string;
  branchName: string;
  fromVersionId?: string;
  userId: string;
}

/**
 * Save a new version of the project
 */
export async function saveVersion(options: CreateVersionOptions): Promise<Version> {
  const { projectId, label, userId, timelineState, branch = 'main' } = options;

  return transaction(async (client) => {
    // Get current version
    const projectResult = await client.query(
      'SELECT version_id FROM projects WHERE id = $1',
      [projectId]
    );
    
    const currentVersionId = projectResult.rows[0]?.version_id;

    // Generate version ID
    const versionId = uuidv4();

    // Create version record
    const versionResult = await client.query<Version>(
      `INSERT INTO version_history (project_id, version_id, label, timeline_state, created_by, parent_version_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [projectId, versionId, label || `Version ${await getVersionCount(projectId, client)}`, timelineState, userId, currentVersionId]
    );

    const version = versionResult.rows[0];

    // Update project's current version
    await client.query(
      'UPDATE projects SET version_id = $1, updated_at = NOW() WHERE id = $2',
      [versionId, projectId]
    );

    return version;
  });
}

/**
 * Get version history for a project
 */
export async function getVersionHistory(projectId: string, limit = 50): Promise<Version[]> {
  return VersionHistoryModel.findByProject(projectId, limit);
}

/**
 * Get version graph (for visual branch view)
 */
export async function getVersionGraph(projectId: string): Promise<VersionGraph> {
  const versions = await getVersionHistory(projectId, 500);
  
  const graph: VersionGraph = {
    versions,
    branches: new Map(),
    currentBranch: 'main',
    head: versions[0]?.id || ''
  };

  // Build branch structure
  const branches: Map<string, string[]> = new Map();
  branches.set('main', []);

  versions.forEach((version) => {
    // For now, all versions are on main branch
    // In future, track branch metadata
    branches.get('main')!.push(version.id);
  });

  graph.branches = branches;

  return graph;
}

/**
 * Restore a previous version
 */
export async function restoreVersion(
  projectId: string,
  versionId: string,
  userId: string
): Promise<Version> {
  return transaction(async (client) => {
    // Get version to restore
    const versionResult = await client.query<Version>(
      'SELECT * FROM version_history WHERE id = $1 AND project_id = $2',
      [versionId, projectId]
    );

    const version = versionResult.rows[0];

    if (!version) {
      throw new Error('Version not found');
    }

    // Create a new version that is a copy of the restored version
    // This preserves history (like git revert, not checkout)
    const newVersionId = uuidv4();
    
    const newVersionResult = await client.query<Version>(
      `INSERT INTO version_history (project_id, version_id, label, timeline_state, created_by, parent_version_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        projectId,
        newVersionId,
        `Restored from "${version.label}"`,
        version.timeline_state,
        userId,
        versionId
      ]
    );

    const newVersion = newVersionResult.rows[0];

    // Update project
    await client.query(
      `UPDATE projects SET timeline_state = $1, version_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [version.timeline_state, newVersionId, projectId]
    );

    return newVersion;
  });
}

/**
 * Create a new branch from a version
 */
export async function createBranch(options: BranchOptions): Promise<string> {
  const { projectId, branchName, fromVersionId, userId } = options;

  return transaction(async (client) => {
    // Get the version to branch from
    const versionResult = await client.query<Version>(
      'SELECT * FROM version_history WHERE id = $1 AND project_id = $2',
      [fromVersionId || (await getCurrentVersionId(projectId, client)), projectId]
    );

    const fromVersion = versionResult.rows[0];

    if (!fromVersion) {
      throw new Error('Version not found');
    }

    // Create a new version with branch metadata
    const versionId = uuidv4();

    const versionResult = await client.query<Version>(
      `INSERT INTO version_history (project_id, version_id, label, timeline_state, created_by, parent_version_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        projectId,
        versionId,
        `Branch: ${branchName}`,
        fromVersion.timeline_state,
        userId,
        fromVersion.id
      ]
    );

    // Update project to point to new branch head
    await client.query(
      'UPDATE projects SET version_id = $1, updated_at = NOW() WHERE id = $2',
      [versionId, projectId]
    );

    return versionId;
  });
}

/**
 * Merge a branch into main
 */
export async function mergeBranch(
  projectId: string,
  sourceBranch: string,
  targetBranch: string,
  userId: string
): Promise<Version> {
  return transaction(async (client) => {
    // Get current versions of both branches
    const projectResult = await client.query(
      'SELECT timeline_state, version_id FROM projects WHERE id = $1',
      [projectId]
    );

    const currentTimeline = projectResult.rows[0].timeline_state;
    const currentVersionId = projectResult.rows[0].version_id;

    // For now, we'll do a simple "ours" merge (target wins)
    // In future, implement proper 3-way merge
    
    const newVersionId = uuidv4();

    const versionResult = await client.query<Version>(
      `INSERT INTO version_history (project_id, version_id, label, timeline_state, created_by, parent_version_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        projectId,
        newVersionId,
        `Merge ${sourceBranch} into ${targetBranch}`,
        currentTimeline,
        userId,
        currentVersionId
      ]
    );

    return versionResult.rows[0];
  });
}

/**
 * Delete a version
 */
export async function deleteVersion(
  projectId: string,
  versionId: string
): Promise<boolean> {
  const result = await query(
    'DELETE FROM version_history WHERE id = $1 AND project_id = $2',
    [versionId, projectId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Compare two versions
 */
export async function compareVersions(
  projectId: string,
  versionId1: string,
  versionId2: string
): Promise<{
  version1: Version;
  version2: Version;
  diff: VersionDiff;
}> {
  const [version1, version2] = await Promise.all([
    VersionHistoryModel.findById(versionId1),
    VersionHistoryModel.findById(versionId2)
  ]);

  if (!version1 || !version2) {
    throw new Error('Version not found');
  }

  const diff = computeTimelineDiff(version1.timeline_state, version2.timeline_state);

  return { version1, version2, diff };
}

/**
 * Get version by label
 */
export async function getVersionByLabel(
  projectId: string,
  label: string
): Promise<Version | null> {
  const result = await query<Version>(
    'SELECT * FROM version_history WHERE project_id = $1 AND label = $2 ORDER BY created_at DESC LIMIT 1',
    [projectId, label]
  );

  return result.rows[0] || null;
}

/**
 * Auto-save version (debounced)
 */
export async function autoSaveVersion(
  projectId: string,
  userId: string,
  timelineState: any
): Promise<Version | null> {
  // Check if there's a recent auto-save (within last 5 minutes)
  const recentVersions = await getVersionHistory(projectId, 1);
  
  if (recentVersions.length > 0) {
    const lastVersion = recentVersions[0];
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    if (new Date(lastVersion.created_at) > fiveMinutesAgo) {
      // Update existing auto-save instead of creating new one
      return null;
    }
  }

  return saveVersion({
    projectId,
    label: `Auto-save ${new Date().toLocaleTimeString()}`,
    userId,
    timelineState
  });
}

/**
 * Helper: Get current version ID for a project
 */
async function getCurrentVersionId(projectId: string, client: any): Promise<string | undefined> {
  const result = await client.query(
    'SELECT version_id FROM projects WHERE id = $1',
    [projectId]
  );
  return result.rows[0]?.version_id;
}

/**
 * Helper: Get version count for a project
 */
async function getVersionCount(projectId: string, client: any): Promise<number> {
  const result = await client.query(
    'SELECT COUNT(*) FROM version_history WHERE project_id = $1',
    [projectId]
  );
  return parseInt(result.rows[0].count) + 1;
}

/**
 * Compute diff between two timeline states
 */
function computeTimelineDiff(state1: any, state2: any): VersionDiff {
  const diff: VersionDiff = {
    clips: { added: [], removed: [], modified: [] },
    tracks: { added: [], removed: [], modified: [] },
    duration: { before: state1.duration, after: state2.duration },
    hasChanges: false
  };

  // Compare clips
  const clips1 = new Map((state1.clips || []).map((c: any) => [c.id, c]));
  const clips2 = new Map((state2.clips || []).map((c: any) => [c.id, c]));

  clips1.forEach((clip, id) => {
    if (!clips2.has(id)) {
      diff.clips.removed.push(clip);
      diff.hasChanges = true;
    } else {
      const clip2 = clips2.get(id);
      if (JSON.stringify(clip) !== JSON.stringify(clip2)) {
        diff.clips.modified.push({ before: clip, after: clip2 });
        diff.hasChanges = true;
      }
    }
  });

  clips2.forEach((clip, id) => {
    if (!clips1.has(id)) {
      diff.clips.added.push(clip);
      diff.hasChanges = true;
    }
  });

  // Compare tracks
  const tracks1 = new Map((state1.tracks || []).map((t: any) => [t.id, t]));
  const tracks2 = new Map((state2.tracks || []).map((t: any) => [t.id, t]));

  tracks1.forEach((track, id) => {
    if (!tracks2.has(id)) {
      diff.tracks.removed.push(track);
      diff.hasChanges = true;
    } else {
      const track2 = tracks2.get(id);
      if (JSON.stringify(track) !== JSON.stringify(track2)) {
        diff.tracks.modified.push({ before: track, after: track2 });
        diff.hasChanges = true;
      }
    }
  });

  tracks2.forEach((track, id) => {
    if (!tracks1.has(id)) {
      diff.tracks.added.push(track);
      diff.hasChanges = true;
    }
  });

  // Compare duration
  if (state1.duration !== state2.duration) {
    diff.hasChanges = true;
  }

  return diff;
}

export interface VersionDiff {
  clips: {
    added: any[];
    removed: any[];
    modified: Array<{ before: any; after: any }>;
  };
  tracks: {
    added: any[];
    removed: any[];
    modified: Array<{ before: any; after: any }>;
  };
  duration: { before: number; after: number };
  hasChanges: boolean;
}

export default {
  saveVersion,
  getVersionHistory,
  getVersionGraph,
  restoreVersion,
  createBranch,
  mergeBranch,
  deleteVersion,
  compareVersions,
  getVersionByLabel,
  autoSaveVersion
};
