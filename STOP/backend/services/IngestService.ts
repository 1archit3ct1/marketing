/**
 * AURA Ingest Service
 * Handles file uploads, storage, and asset creation
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { AssetModel, ProjectModel } from '../db/models';
import { queueJob } from '../queue/JobQueue';

// Environment variables
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_ENDPOINT = process.env.S3_ENDPOINT; // For R2 or other S3-compatible storage
const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '1073741824'); // 1GB default

// S3 Client configuration
const s3Config: any = {
  region: S3_REGION,
  maxAttempts: 3,
  retryMode: 'standard'
};

// Use custom endpoint for R2 or other S3-compatible storage
if (S3_ENDPOINT) {
  s3Config.endpoint = S3_ENDPOINT;
  s3Config.forcePathStyle = true;
}

// Use credentials if provided
if (S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY
  };
}

const s3Client = new S3Client(s3Config);

// Supported file types
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm'
];

const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg'
];

const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

export interface UploadInitRequest {
  projectId: string;
  filename: string;
  mimeType: string;
  size: number;
  type?: 'video' | 'audio' | 'image' | 'gif';
}

export interface UploadInitResponse {
  assetId: string;
  uploadUrl: string;
  originalUrl: string;
}

/**
 * Initialize a multipart upload and return presigned URL
 */
export async function initializeUpload(
  request: UploadInitRequest,
  userId: string
): Promise<UploadInitResponse> {
  const { projectId, filename, mimeType, size, type } = request;

  // Validate file size
  if (size > MAX_UPLOAD_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`);
  }

  // Validate project exists and user has access
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }
  if (project.user_id !== userId) {
    throw new Error('Unauthorized access to project');
  }

  // Determine asset type from MIME type if not provided
  let assetType = type;
  if (!assetType) {
    if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) {
      assetType = 'video';
    } else if (SUPPORTED_AUDIO_TYPES.includes(mimeType)) {
      assetType = 'audio';
    } else if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      assetType = 'image';
    } else if (mimeType === 'image/gif') {
      assetType = 'gif';
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  // Generate unique asset ID and S3 key
  const assetId = uuidv4();
  const extension = getExtensionFromMime(mimeType);
  const s3Key = `uploads/${projectId}/${assetId}.${extension}`;

  // Create asset record in database
  const asset = await AssetModel.create({
    project_id: projectId,
    user_id: userId,
    type: assetType,
    filename,
    original_url: `s3://${S3_BUCKET}/${s3Key}`,
    size,
    mime_type: mimeType
  });

  // Generate presigned upload URL
  const uploadCommand = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    ContentType: mimeType,
    ContentLength: size
  });

  const uploadUrl = await getSignedUrl(s3Client, uploadCommand, { expiresIn: 3600 });

  // Queue transcoding job (will run after upload completes)
  await queueJob({
    type: 'transcode',
    data: {
      assetId: asset.id,
      projectId,
      s3Key,
      mimeType,
      assetType
    }
  });

  return {
    assetId: asset.id,
    uploadUrl,
    originalUrl: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`
  };
}

/**
 * Complete upload and start processing
 */
export async function completeUpload(
  assetId: string,
  userId: string
): Promise<void> {
  const asset = await AssetModel.findById(assetId);
  
  if (!asset) {
    throw new Error('Asset not found');
  }

  if (asset.user_id !== userId) {
    throw new Error('Unauthorized');
  }

  // Update asset status to processing
  await AssetModel.updateStatus(assetId, 'processing');

  // Transcoding job was already queued during initialization
  // It will pick up the asset and process it
}

/**
 * Get presigned URL for downloading an asset
 */
export async function getDownloadUrl(
  assetId: string,
  userId: string,
  expiresIn: number = 3600
): Promise<string> {
  const asset = await AssetModel.findById(assetId);
  
  if (!asset) {
    throw new Error('Asset not found');
  }

  // Check user has access to the asset
  if (asset.user_id !== userId) {
    // Check if user has access to the project
    const project = await ProjectModel.findById(asset.project_id);
    if (!project || project.user_id !== userId) {
      throw new Error('Unauthorized');
    }
  }

  // Extract S3 key from original_url
  const s3Key = asset.original_url.replace(`s3://${S3_BUCKET}/`, '');

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get presigned URL for viewing/streaming an asset
 */
export async function getStreamUrl(
  assetId: string,
  userId: string
): Promise<string> {
  return getDownloadUrl(assetId, userId, 7200); // 2 hour expiry for streaming
}

/**
 * Delete an asset
 */
export async function deleteAsset(
  assetId: string,
  userId: string
): Promise<boolean> {
  const asset = await AssetModel.findById(assetId);
  
  if (!asset) {
    throw new Error('Asset not found');
  }

  if (asset.user_id !== userId) {
    throw new Error('Unauthorized');
  }

  // Delete from S3
  const s3Key = asset.original_url.replace(`s3://${S3_BUCKET}/`, '');
  
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    }));
  } catch (error) {
    console.error('Error deleting from S3:', error);
  }

  // Delete from database (cascades to clips)
  return AssetModel.delete(assetId);
}

/**
 * Get all assets for a project
 */
export async function getProjectAssets(
  projectId: string,
  userId: string
): Promise<any[]> {
  const project = await ProjectModel.findById(projectId);
  
  if (!project || project.user_id !== userId) {
    throw new Error('Unauthorized');
  }

  return AssetModel.findByProject(projectId);
}

/**
 * Get asset processing status
 */
export async function getAssetStatus(
  assetId: string,
  userId: string
): Promise<{
  status: string;
  progress: number;
  proxyUrl?: string;
  thumbnailUrl?: string;
  waveformUrl?: string;
  error?: string;
}> {
  const asset = await AssetModel.findById(assetId);
  
  if (!asset) {
    throw new Error('Asset not found');
  }

  if (asset.user_id !== userId) {
    throw new Error('Unauthorized');
  }

  return {
    status: asset.status,
    progress: getProgressFromStatus(asset.status),
    proxyUrl: asset.proxy_url || undefined,
    thumbnailUrl: asset.thumbnail_url || undefined,
    waveformUrl: asset.waveform_url || undefined,
    error: asset.error_message || undefined
  };
}

/**
 * Helper: Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/aac': 'm4a',
    'audio/ogg': 'ogg',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  };

  return mimeToExt[mimeType] || 'bin';
}

/**
 * Helper: Get progress percentage from status
 */
function getProgressFromStatus(status: string): number {
  const progressMap: Record<string, number> = {
    'uploading': 10,
    'processing': 50,
    'ready': 100,
    'error': 0
  };
  return progressMap[status] || 0;
}

/**
 * Handle direct upload webhook (called by S3 when upload completes)
 */
export async function handleUploadComplete(
  assetId: string,
  s3Key: string
): Promise<void> {
  const asset = await AssetModel.findById(assetId);
  
  if (!asset) {
    throw new Error('Asset not found');
  }

  // Update status to processing
  await AssetModel.updateStatus(assetId, 'processing');

  // Queue transcoding job
  await queueJob({
    type: 'transcode',
    data: {
      assetId: asset.id,
      projectId: asset.project_id,
      s3Key,
      mimeType: asset.mime_type,
      assetType: asset.type
    }
  });
}

export default {
  initializeUpload,
  completeUpload,
  getDownloadUrl,
  getStreamUrl,
  deleteAsset,
  getProjectAssets,
  getAssetStatus,
  handleUploadComplete
};
