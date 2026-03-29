/**
 * AURA Ingest API Routes
 * POST /api/ingest/upload - Initialize upload
 * POST /api/ingest/complete - Complete upload
 * GET /api/ingest/assets/:projectId - List assets
 * GET /api/ingest/assets/:assetId - Get asset status
 * GET /api/ingest/assets/:assetId/download - Get download URL
 * DELETE /api/ingest/assets/:assetId - Delete asset
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../auth/middleware';
import * as IngestService from '../../services/IngestService';
import { AssetModel } from '../../db/models';

/**
 * POST /api/ingest/upload
 * Initialize a file upload and get presigned URL
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const { projectId, filename, mimeType, size, type } = body;

    // Validate required fields
    if (!projectId || !filename || !mimeType || !size) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required fields: projectId, filename, mimeType, size' },
        { status: 400 }
      );
    }

    // Validate file size (max 1GB)
    if (size > 1024 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File size exceeds maximum of 1GB' },
        { status: 400 }
      );
    }

    // Initialize upload
    const result = await IngestService.initializeUpload(
      { projectId, filename, mimeType, size, type },
      user.id
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Upload init error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Project not found') {
        return NextResponse.json(
          { error: 'Not Found', message: error.message },
          { status: 404 }
        );
      }
      if (error.message === 'Unauthorized access to project' || error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Forbidden', message: error.message },
          { status: 403 }
        );
      }
      if (error.message.includes('Unsupported file type')) {
        return NextResponse.json(
          { error: 'Bad Request', message: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to initialize upload' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/ingest/complete
 * Complete an upload and start processing
 */
export const completeUploadHandler = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing assetId' },
        { status: 400 }
      );
    }

    await IngestService.completeUpload(assetId, user.id);

    return NextResponse.json({
      success: true,
      message: 'Upload complete. Processing started.'
    });
  } catch (error) {
    console.error('Upload complete error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Asset not found') {
        return NextResponse.json(
          { error: 'Not Found', message: error.message },
          { status: 404 }
        );
      }
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Forbidden', message: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to complete upload' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/ingest/assets/:projectId
 * List all assets for a project
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId?: string; assetId?: string; action?: string } }
) {
  return withAuth(async (request: NextRequest, { user }) => {
    try {
      const { projectId, assetId, action } = params;

      // Handle single asset status
      if (assetId && !action) {
        const status = await IngestService.getAssetStatus(assetId, user.id);
        return NextResponse.json({
          success: true,
          data: status
        });
      }

      // Handle download URL
      if (assetId && action === 'download') {
        const downloadUrl = await IngestService.getDownloadUrl(assetId, user.id);
        return NextResponse.json({
          success: true,
          data: { downloadUrl }
        });
      }

      // Handle project assets list
      if (projectId) {
        const assets = await IngestService.getProjectAssets(projectId, user.id);
        return NextResponse.json({
          success: true,
          data: { assets }
        });
      }

      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid request' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Get assets error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Asset not found' || error.message === 'Project not found') {
          return NextResponse.json(
            { error: 'Not Found', message: error.message },
            { status: 404 }
          );
        }
        if (error.message === 'Unauthorized') {
          return NextResponse.json(
            { error: 'Forbidden', message: error.message },
            { status: 403 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to get assets' },
        { status: 500 }
      );
    }
  })(req);
}

/**
 * DELETE /api/ingest/assets/:assetId
 * Delete an asset
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  return withAuth(async (request: NextRequest, { user }) => {
    try {
      const { assetId } = params;

      if (!assetId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Missing assetId' },
          { status: 400 }
        );
      }

      const deleted = await IngestService.deleteAsset(assetId, user.id);

      if (!deleted) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Asset not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Asset deleted successfully'
      });
    } catch (error) {
      console.error('Delete asset error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Asset not found') {
          return NextResponse.json(
            { error: 'Not Found', message: error.message },
            { status: 404 }
          );
        }
        if (error.message === 'Unauthorized') {
          return NextResponse.json(
            { error: 'Forbidden', message: error.message },
            { status: 403 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to delete asset' },
        { status: 500 }
      );
    }
  })(req);
}

/**
 * PATCH /api/ingest/assets/:assetId
 * Update asset metadata
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  return withAuth(async (request: NextRequest, { user }) => {
    try {
      const { assetId } = params;
      const body = await req.json();
      const { metadata } = body;

      if (!assetId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Missing assetId' },
          { status: 400 }
        );
      }

      const asset = await AssetModel.findById(assetId);
      
      if (!asset) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Asset not found' },
          { status: 404 }
        );
      }

      if (asset.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Update metadata
      const updatedAsset = await AssetModel.updateStatus(assetId, asset.status, {
        ...asset.metadata,
        ...metadata
      });

      return NextResponse.json({
        success: true,
        data: updatedAsset
      });
    } catch (error) {
      console.error('Update asset error:', error);
      
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to update asset' },
        { status: 500 }
      );
    }
  })(req);
}
