/**
 * AURA Database Models
 * Type-safe database operations
 */

import { query, transaction, PoolClient } from './client';
import { User, Project, Asset, Clip, VersionHistory, BrandProfile } from '@aura/types';

// ============================================
// User Model
// ============================================

export const UserModel = {
  async findById(id: string): Promise<User | null> {
    const result = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async create(data: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    plan?: string;
    credits?: number;
  }): Promise<User> {
    const result = await query<User>(
      `INSERT INTO users (id, email, name, avatar_url, plan, credits)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = NOW()
       RETURNING *`,
      [data.id, data.email, data.name, data.avatar_url, data.plan || 'free', data.credits || 100]
    );
    return result.rows[0];
  },

  async updateCredits(id: string, delta: number): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users SET credits = credits + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [delta, id]
    );
    return result.rows[0] || null;
  },

  async updatePlan(id: string, plan: string): Promise<User | null> {
    const result = await query<User>(
      `UPDATE users SET plan = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [plan, id]
    );
    return result.rows[0] || null;
  }
};

// ============================================
// Project Model
// ============================================

export const ProjectModel = {
  async findById(id: string): Promise<Project | null> {
    const result = await query<Project>('SELECT * FROM projects WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByUser(userId: string, limit = 50, offset = 0): Promise<Project[]> {
    const result = await query<Project>(
      `SELECT * FROM projects 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  async create(data: {
    user_id: string;
    workspace_id?: string;
    brand_profile_id?: string;
    name: string;
    description?: string;
  }): Promise<Project> {
    const result = await query<Project>(
      `INSERT INTO projects (user_id, workspace_id, brand_profile_id, name, description, timeline_state)
       VALUES ($1, $2, $3, $4, $5, '{}')
       RETURNING *`,
      [data.user_id, data.workspace_id, data.brand_profile_id, data.name, data.description]
    );
    return result.rows[0];
  },

  async update(id: string, updates: {
    name?: string;
    description?: string;
    timeline_state?: any;
    duration?: number;
    fps?: number;
    resolution?: any;
  }): Promise<Project | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query<Project>(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async updateTimelineState(id: string, timelineState: any): Promise<Project | null> {
    return this.update(id, { timeline_state: timelineState });
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM projects WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  },

  async duplicate(sourceId: string, userId: string, newName: string): Promise<Project> {
    return transaction(async (client) => {
      // Get source project
      const sourceResult = await client.query<Project>(
        'SELECT * FROM projects WHERE id = $1',
        [sourceId]
      );
      const source = sourceResult.rows[0];

      if (!source) {
        throw new Error('Source project not found');
      }

      // Create new project
      const newProjectResult = await client.query<Project>(
        `INSERT INTO projects (user_id, workspace_id, brand_profile_id, name, description, timeline_state, duration, fps, resolution)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [userId, source.workspace_id, source.brand_profile_id, newName, source.description, source.timeline_state, source.duration, source.fps, source.resolution]
      );
      const newProject = newProjectResult.rows[0];

      // Duplicate assets
      await client.query(
        `INSERT INTO assets (project_id, user_id, type, filename, original_url, proxy_url, thumbnail_url, waveform_url, duration, size, mime_type, metadata, status)
         SELECT $1, user_id, type, filename, original_url, proxy_url, thumbnail_url, waveform_url, duration, size, mime_type, metadata, status
         FROM assets WHERE project_id = $2`,
        [newProject.id, sourceId]
      );

      // Duplicate clips
      await client.query(
        `INSERT INTO clips (project_id, asset_id, track_type, track_order, start_time, duration, trim_start, trim_end, speed, effects, transitions, metadata)
         SELECT $1, asset_id, track_type, track_order, start_time, duration, trim_start, trim_end, speed, effects, transitions, metadata
         FROM clips WHERE project_id = $2`,
        [newProject.id, sourceId]
      );

      return newProject;
    });
  }
};

// ============================================
// Asset Model
// ============================================

export const AssetModel = {
  async findById(id: string): Promise<Asset | null> {
    const result = await query<Asset>('SELECT * FROM assets WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByProject(projectId: string): Promise<Asset[]> {
    const result = await query<Asset>(
      'SELECT * FROM assets WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    return result.rows;
  },

  async create(data: {
    project_id: string;
    user_id: string;
    type: string;
    filename: string;
    original_url: string;
    size: number;
    mime_type: string;
  }): Promise<Asset> {
    const result = await query<Asset>(
      `INSERT INTO assets (project_id, user_id, type, filename, original_url, size, mime_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploading')
       RETURNING *`,
      [data.project_id, data.user_id, data.type, data.filename, data.original_url, data.size, data.mime_type]
    );
    return result.rows[0];
  },

  async updateStatus(id: string, status: string, metadata?: any): Promise<Asset | null> {
    const result = await query<Asset>(
      `UPDATE assets SET status = $1, metadata = COALESCE($2, metadata), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, metadata, id]
    );
    return result.rows[0] || null;
  },

  async updateUrls(id: string, urls: {
    proxy_url?: string;
    thumbnail_url?: string;
    waveform_url?: string;
  }): Promise<Asset | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(urls)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await query<Asset>(
      `UPDATE assets SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM assets WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }
};

// ============================================
// Version History Model
// ============================================

export const VersionHistoryModel = {
  async findById(id: string): Promise<VersionHistory | null> {
    const result = await query<VersionHistory>('SELECT * FROM version_history WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByProject(projectId: string, limit = 50): Promise<VersionHistory[]> {
    const result = await query<VersionHistory>(
      `SELECT * FROM version_history 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [projectId, limit]
    );
    return result.rows;
  },

  async create(data: {
    project_id: string;
    version_id: string;
    label: string;
    timeline_state: any;
    created_by: string;
    parent_version_id?: string;
  }): Promise<VersionHistory> {
    const result = await query<VersionHistory>(
      `INSERT INTO version_history (project_id, version_id, label, timeline_state, created_by, parent_version_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.project_id, data.version_id, data.label, data.timeline_state, data.created_by, data.parent_version_id]
    );
    return result.rows[0];
  },

  async restore(projectId: string, versionId: string): Promise<Project | null> {
    return transaction(async (client) => {
      // Get version
      const versionResult = await client.query<VersionHistory>(
        'SELECT * FROM version_history WHERE id = $1 AND project_id = $2',
        [versionId, projectId]
      );
      const version = versionResult.rows[0];

      if (!version) {
        throw new Error('Version not found');
      }

      // Update project timeline state
      const projectResult = await client.query<Project>(
        `UPDATE projects SET timeline_state = $1, version_id = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [version.timeline_state, versionId, projectId]
      );

      return projectResult.rows[0] || null;
    });
  }
};

// ============================================
// Brand Profile Model
// ============================================

export const BrandProfileModel = {
  async findById(id: string): Promise<BrandProfile | null> {
    const result = await query<BrandProfile>('SELECT * FROM brand_profiles WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByUser(userId: string): Promise<BrandProfile[]> {
    const result = await query<BrandProfile>(
      'SELECT * FROM brand_profiles WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async create(data: {
    user_id: string;
    name: string;
    brand_colors?: string[];
    brand_fonts?: any;
    preferred_music_genres?: string[];
    preferred_caption_style?: string;
    preferred_vibe?: string;
  }): Promise<BrandProfile> {
    const result = await query<BrandProfile>(
      `INSERT INTO brand_profiles (user_id, name, brand_colors, brand_fonts, preferred_music_genres, preferred_caption_style, preferred_vibe)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.user_id,
        data.name,
        data.brand_colors || ['#7c5cfc', '#00e5a0', '#f5820a'],
        data.brand_fonts || { display: 'Clash Display', body: 'DM Sans' },
        data.preferred_music_genres || [],
        data.preferred_caption_style || 'tiktok_bold',
        data.preferred_vibe || 'hype'
      ]
    );
    return result.rows[0];
  },

  async update(id: string, updates: Partial<BrandProfile>): Promise<BrandProfile | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query<BrandProfile>(
      `UPDATE brand_profiles SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM brand_profiles WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }
};

// ============================================
// Clip Model
// ============================================

export const ClipModel = {
  async findById(id: string): Promise<Clip | null> {
    const result = await query<Clip>('SELECT * FROM clips WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByProject(projectId: string): Promise<Clip[]> {
    const result = await query<Clip>(
      'SELECT * FROM clips WHERE project_id = $1 ORDER BY track_order, start_time',
      [projectId]
    );
    return result.rows;
  },

  async create(data: {
    project_id: string;
    asset_id: string;
    track_type: string;
    track_order: number;
    start_time: number;
    duration: number;
  }): Promise<Clip> {
    const result = await query<Clip>(
      `INSERT INTO clips (project_id, asset_id, track_type, track_order, start_time, duration, trim_start, trim_end, speed, effects, transitions)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 1.00, '[]', '[]')
       RETURNING *`,
      [data.project_id, data.asset_id, data.track_type, data.track_order, data.start_time, data.duration]
    );
    return result.rows[0];
  },

  async update(id: string, updates: Partial<Clip>): Promise<Clip | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query<Clip>(
      `UPDATE clips SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM clips WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  },

  async reorder(projectId: string, trackId: string, newOrder: { clip_id: string; order: number }[]): Promise<void> {
    await transaction(async (client) => {
      for (const item of newOrder) {
        await client.query(
          'UPDATE clips SET track_order = $1 WHERE id = $2 AND project_id = $3',
          [item.order, item.clip_id, projectId]
        );
      }
    });
  }
};
