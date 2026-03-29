/**
 * AURA AI Draft API Routes
 * POST /api/ai/generate-draft - Generate AI edit draft from intent
 * GET /api/ai/draft/:draftId - Get draft by ID
 * POST /api/ai/draft/:draftId/apply - Apply draft to project
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../auth/middleware';
import { ProjectModel, AssetModel } from '../../db/models';
import { queueJob } from '../../queue/JobQueue';

// Python service bridge (would use child_process or separate service)
import { spawn } from 'child_process';
import * as path from 'path';

const PYTHON_SERVICE_PATH = path.join(process.cwd(), 'backend', 'services');

/**
 * POST /api/ai/generate-draft
 * Generate AI edit draft from intent
 * 
 * Request body:
 * {
 *   projectId: string,
 *   intent: {
 *     text: string,
 *     platform: PlatformType,
 *     vibe: VibeType,
 *     targetDuration: number,
 *     energyLevel: 'low' | 'medium' | 'high',
 *     hasCaptions: boolean,
 *     hasMusic: boolean
 *   },
 *   assetIds: string[]
 * }
 * 
 * Response:
 * {
 *   jobId: string,
 *   status: 'queued' | 'processing' | 'completed' | 'error',
 *   variants?: DraftVariant[]
 * }
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const { projectId, intent, assetIds } = body;

    // Validate required fields
    if (!projectId || !intent || !assetIds || assetIds.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required fields: projectId, intent, assetIds' },
        { status: 400 }
      );
    }

    // Verify project access
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Unauthorized access to project' },
        { status: 403 }
      );
    }

    // Get asset details
    const assets = await Promise.all(
      assetIds.map(id => AssetModel.findById(id))
    );

    const validAssets = assets.filter(a => a !== null);
    if (validAssets.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No valid assets found' },
        { status: 400 }
      );
    }

    // Queue AI draft generation job
    const jobId = await queueJob({
      type: 'ai_draft',
      priority: 1,
      data: {
        projectId,
        userId: user.id,
        intent,
        assetIds,
        assets: validAssets.map(a => ({
          id: a!.id,
          path: a!.proxy_url || a!.original_url,
          duration: a!.metadata?.duration,
          type: a!.type
        }))
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'queued',
        message: 'Draft generation started. This may take 30-60 seconds.',
        estimatedTime: 45
      }
    });
  } catch (error) {
    console.error('Draft generation error:', error);
    
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to start draft generation' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/ai/draft/:jobId
 * Get draft generation status and results
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  return withAuth(async (request: NextRequest, { user }) => {
    try {
      const { jobId } = params;

      // Get job status from queue
      const jobStatus = await getJobStatus(jobId);

      if (!jobStatus) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          jobId,
          status: jobStatus.status,
          progress: jobStatus.progress,
          result: jobStatus.result,
          error: jobStatus.failedReason
        }
      });
    } catch (error) {
      console.error('Get draft status error:', error);
      
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to get draft status' },
        { status: 500 }
      );
    }
  })(req);
}

/**
 * POST /api/ai/draft/:draftId/apply
 * Apply a draft variant to the project
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { draftId: string } }
) {
  return withAuth(async (request: NextRequest, { user }) => {
    try {
      const { draftId } = params;
      const body = await req.json();
      const { projectId, variantType } = body;

      if (!projectId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Missing projectId' },
          { status: 400 }
        );
      }

      // Verify project access
      const project = await ProjectModel.findById(projectId);
      if (!project || project.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Get draft from job result (in production, fetch from storage)
      const draft = await getDraftFromStorage(draftId);
      
      if (!draft) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Draft not found' },
          { status: 404 }
        );
      }

      // Apply draft to project
      await ProjectModel.update(projectId, {
        timeline_state: draft.timeline,
        updated_at: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Draft applied to project successfully'
      });
    } catch (error) {
      console.error('Apply draft error:', error);
      
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to apply draft' },
        { status: 500 }
      );
    }
  })(req);
}

/**
 * POST /api/ai/draft/regenerate
 * Regenerate draft with new parameters
 */
export async function regenerateDraftHandler(
  req: NextRequest,
  { user }: { user: any }
) {
  try {
    const body = await req.json();
    const { projectId, intent, previousVariantType } = body;

    // Queue regeneration job
    const jobId = await queueJob({
      type: 'ai_draft',
      priority: 1,
      data: {
        projectId,
        userId: user.id,
        intent,
        regenerate: true,
        previousVariantType
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'queued',
        message: 'Regenerating draft...'
      }
    });
  } catch (error) {
    console.error('Regenerate draft error:', error);
    
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to regenerate draft' },
      { status: 500 }
    );
  }
}

// Helper functions

/**
 * Get job status from queue
 */
async function getJobStatus(jobId: string) {
  // In production, use the queue service
  // For now, mock implementation
  return {
    status: 'completed',
    progress: 100,
    result: {
      variants: []
    }
  };
}

/**
 * Get draft from storage
 */
async function getDraftFromStorage(draftId: string) {
  // In production, fetch from database or object storage
  return null;
}

/**
 * Call Python scene analysis service
 */
async function analyzeClipWithPython(videoPath: string, assetId: string) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      path.join(PYTHON_SERVICE_PATH, 'SceneAnalysisService.py'),
      videoPath,
      assetId
    ]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          reject(new Error('Failed to parse Python output'));
        }
      } else {
        reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
      }
    });
  });
}

/**
 * Call Python draft composer service
 */
async function composeDraftWithPython(intent: any, clipAnalyses: any[]) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      path.join(PYTHON_SERVICE_PATH, 'DraftComposerService.py')
    ]);

    const inputData = JSON.stringify({ intent, clip_analyses: clipAnalyses });

    pythonProcess.stdin.write(inputData);
    pythonProcess.stdin.end();

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          reject(new Error('Failed to parse Python output'));
        }
      } else {
        reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
      }
    });
  });
}
