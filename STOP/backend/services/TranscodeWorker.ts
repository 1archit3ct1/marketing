/**
 * AURA Transcode Worker
 * FFmpeg-based video/audio transcoding pipeline
 * 
 * Creates:
 * 1. 720p HLS proxy for preview
 * 2. Audio-only WAV extraction for ASR + beat detection
 * 3. Thumbnail sprite sheet at 1fps
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AssetModel } from '../db/models';
import { updateJobProgress } from '../queue/JobQueue';

const exec = promisify(execCallback);

// Environment variables
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const TEMP_DIR = process.env.TEMP_DIR || os.tmpdir();
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

// S3 Client
const s3Config: any = { region: S3_REGION };
if (S3_ENDPOINT) {
  s3Config.endpoint = S3_ENDPOINT;
  s3Config.forcePathStyle = true;
}
const s3Client = new S3Client(s3Config);

export interface TranscodeOptions {
  assetId: string;
  projectId: string;
  s3Key: string;
  mimeType: string;
  assetType: string;
}

export interface MediaInfo {
  duration: number; // milliseconds
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
}

/**
 * Main transcode pipeline
 */
export async function processAsset(options: TranscodeOptions): Promise<void> {
  const { assetId, projectId, s3Key, mimeType, assetType } = options;

  try {
    // Update job progress
    await updateJobProgress(assetId, 'transcode', 5, 'Downloading source file...');

    // Download source file from S3
    const localPath = await downloadFromS3(s3Key);

    // Get media info
    await updateJobProgress(assetId, 'transcode', 15, 'Analyzing media...');
    const mediaInfo = await getMediaInfo(localPath);

    // Update asset with metadata
    await AssetModel.updateStatus(assetId, 'processing', {
      duration: mediaInfo.duration,
      width: mediaInfo.width,
      height: mediaInfo.height,
      fps: mediaInfo.fps,
      codec: mediaInfo.codec,
      bitrate: mediaInfo.bitrate,
      audio_codec: mediaInfo.audioCodec,
      audio_channels: mediaInfo.audioChannels,
      audio_sample_rate: mediaInfo.audioSampleRate
    });

    // Process based on asset type
    if (assetType === 'video') {
      await processVideoAsset(assetId, projectId, localPath, mediaInfo);
    } else if (assetType === 'audio') {
      await processAudioAsset(assetId, projectId, localPath, mediaInfo);
    } else if (assetType === 'image' || assetType === 'gif') {
      await processImageAsset(assetId, projectId, localPath);
    }

    // Clean up temp files
    await cleanupFile(localPath);

    // Mark as ready
    await AssetModel.updateStatus(assetId, 'ready');
    await updateJobProgress(assetId, 'transcode', 100, 'Complete');

  } catch (error) {
    console.error('Transcode error:', error);
    await AssetModel.updateStatus(assetId, 'error', { error: (error as Error).message });
    throw error;
  }
}

/**
 * Process video asset
 */
async function processVideoAsset(
  assetId: string,
  projectId: string,
  localPath: string,
  mediaInfo: MediaInfo
): Promise<void> {
  const baseKey = `processed/${projectId}/${assetId}`;

  // 1. Create 720p HLS proxy for preview
  await updateJobProgress(assetId, 'transcode', 25, 'Creating preview proxy...');
  const proxyPath = path.join(TEMP_DIR, `${assetId}_proxy.m3u8`);
  const proxyKey = `${baseKey}/proxy/index.m3u8`;
  
  await createHLSProxy(localPath, proxyPath, mediaInfo);
  await uploadDirectoryToS3(path.dirname(proxyPath), path.dirname(proxyKey));
  
  const proxyUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${proxyKey}`;
  await AssetModel.updateUrls(assetId, { proxy_url: proxyUrl });

  // 2. Extract audio WAV for ASR and beat detection
  await updateJobProgress(assetId, 'transcode', 50, 'Extracting audio...');
  const audioPath = path.join(TEMP_DIR, `${assetId}_audio.wav`);
  const audioKey = `${baseKey}/audio.wav`;
  
  await extractAudio(localPath, audioPath);
  await uploadToS3(audioPath, audioKey);
  
  const audioUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${audioKey}`;
  await AssetModel.updateUrls(assetId, { waveform_url: audioUrl });

  // 3. Generate thumbnail sprite sheet
  await updateJobProgress(assetId, 'transcode', 75, 'Generating thumbnails...');
  const thumbnailPath = path.join(TEMP_DIR, `${assetId}_thumbnails`);
  const thumbnailKey = `${baseKey}/thumbnails`;
  
  await generateThumbnails(localPath, thumbnailPath, mediaInfo);
  await uploadDirectoryToS3(thumbnailPath, thumbnailKey);
  
  // Generate sprite sheet URL (first thumbnail as cover)
  const coverUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${thumbnailKey}/thumb_000.jpg`;
  await AssetModel.updateUrls(assetId, { thumbnail_url: coverUrl });

  await updateJobProgress(assetId, 'transcode', 90, 'Finalizing...');
}

/**
 * Process audio asset
 */
async function processAudioAsset(
  assetId: string,
  projectId: string,
  localPath: string,
  mediaInfo: MediaInfo
): Promise<void> {
  const baseKey = `processed/${projectId}/${assetId}`;

  // Create WAV version for processing
  await updateJobProgress(assetId, 'transcode', 30, 'Creating WAV version...');
  const wavPath = path.join(TEMP_DIR, `${assetId}.wav`);
  const wavKey = `${baseKey}/processed.wav`;
  
  await convertToWav(localPath, wavPath);
  await uploadToS3(wavPath, wavKey);
  
  const wavUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${wavKey}`;
  await AssetModel.updateUrls(assetId, { proxy_url: wavUrl });

  // Generate waveform data
  await updateJobProgress(assetId, 'transcode', 60, 'Generating waveform...');
  const waveformPath = path.join(TEMP_DIR, `${assetId}_waveform.json`);
  const waveformKey = `${baseKey}/waveform.json`;
  
  await generateWaveformData(wavPath, waveformPath);
  await uploadToS3(waveformPath, waveformKey);
}

/**
 * Process image asset
 */
async function processImageAsset(
  assetId: string,
  projectId: string,
  localPath: string
): Promise<void> {
  const baseKey = `processed/${projectId}/${assetId}`;

  // Create optimized web version
  await updateJobProgress(assetId, 'transcode', 30, 'Optimizing image...');
  const optimizedPath = path.join(TEMP_DIR, `${assetId}_optimized.jpg`);
  const optimizedKey = `${baseKey}/optimized.jpg`;
  
  await optimizeImage(localPath, optimizedPath);
  await uploadToS3(optimizedPath, optimizedKey);
  
  const optimizedUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${optimizedKey}`;
  await AssetModel.updateUrls(assetId, { proxy_url: optimizedUrl });
}

/**
 * Download file from S3
 */
async function downloadFromS3(s3Key: string): Promise<string> {
  const tempPath = path.join(TEMP_DIR, path.basename(s3Key));
  
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { streamToBuffer } = await import('@aws-sdk/util-stream-node');
  
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key
  });
  
  const response = await s3Client.send(command);
  const buffer = await streamToBuffer(response.Body as any);
  
  await fs.promises.writeFile(tempPath, buffer);
  
  return tempPath;
}

/**
 * Get media information using ffprobe
 */
async function getMediaInfo(filePath: string): Promise<MediaInfo> {
  const command = `${FFPROBE_PATH} -v quiet -print_format json -show_format -show_streams "${filePath}"`;
  const { stdout } = await exec(command);
  const data = JSON.parse(stdout);
  
  const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
  const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');
  
  const info: MediaInfo = {
    duration: Math.round(parseFloat(data.format.duration) * 1000),
    width: videoStream?.width || 0,
    height: videoStream?.height || 0,
    fps: videoStream?.r_frame_rate 
      ? parseFloat(videoStream.r_frame_rate.split('/')[0]) / parseFloat(videoStream.r_frame_rate.split('/')[1])
      : 30,
    codec: videoStream?.codec_name || 'unknown',
    bitrate: parseInt(data.format.bit_rate) || 0,
    audioCodec: audioStream?.codec_name,
    audioChannels: audioStream?.channels,
    audioSampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined
  };
  
  return info;
}

/**
 * Create HLS proxy (720p)
 */
async function createHLSProxy(inputPath: string, outputPath: string, mediaInfo: MediaInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    const outputDir = path.dirname(outputPath);
    
    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });
    
    const ffmpegArgs = [
      '-i', `"${inputPath}"`,
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', `"${outputDir}/segment_%03d.ts"`,
      `"${outputPath}"`
    ];
    
    const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs, { shell: true });
    
    ffmpeg.stderr.on('data', (data) => {
      console.log('FFmpeg:', data.toString());
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

/**
 * Extract audio from video
 */
async function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-i', `"${inputPath}"`,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      '-y',
      `"${outputPath}"`
    ];
    
    const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs, { shell: true });
    
    ffmpeg.stderr.on('data', (data) => {
      console.log('FFmpeg:', data.toString());
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

/**
 * Convert audio to WAV
 */
async function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-i', `"${inputPath}"`,
      '-acodec', 'pcm_s16le',
      '-ar', '48000',
      '-ac', '2',
      '-y',
      `"${outputPath}"`
    ];
    
    const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs, { shell: true });
    
    ffmpeg.stderr.on('data', (data) => {
      console.log('FFmpeg:', data.toString());
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

/**
 * Generate thumbnail sprite sheet
 */
async function generateThumbnails(
  inputPath: string,
  outputDir: string,
  mediaInfo: MediaInfo
): Promise<void> {
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Generate thumbnail at 1fps
  const pattern = path.join(outputDir, 'thumb_%03d.jpg');
  
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-i', `"${inputPath}"`,
      '-vf', 'fps=1,scale=320:180:force_original_aspect_ratio=decrease',
      '-q:v', '2',
      `"${pattern}"`
    ];
    
    const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs, { shell: true });
    
    ffmpeg.stderr.on('data', (data) => {
      console.log('FFmpeg:', data.toString());
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

/**
 * Generate waveform data for visualization
 */
async function generateWaveformData(inputPath: string, outputPath: string): Promise<void> {
  // Simple waveform data generation
  // In production, use a proper library like node-wav or pydub
  
  const waveformData = {
    samples: [] as number[],
    duration: 0
  };
  
  // This is a placeholder - in production, analyze actual audio
  waveformData.samples = Array.from({ length: 100 }, () => Math.random() * 100);
  
  await fs.promises.writeFile(outputPath, JSON.stringify(waveformData));
}

/**
 * Optimize image
 */
async function optimizeImage(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-i', `"${inputPath}"`,
      '-quality', '85',
      '-strip', 'all',
      '-colorspace', 'sRGB',
      '-y',
      `"${outputPath}"`
    ];
    
    const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs, { shell: true });
    
    ffmpeg.stderr.on('data', (data) => {
      console.log('FFmpeg:', data.toString());
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}

/**
 * Upload file to S3
 */
async function uploadToS3(localPath: string, s3Key: string): Promise<void> {
  const fileContent = await fs.promises.readFile(localPath);
  const contentType = getContentType(localPath);
  
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: fileContent,
    ContentType: contentType
  });
  
  await s3Client.send(command);
}

/**
 * Upload directory to S3
 */
async function uploadDirectoryToS3(localDir: string, s3Prefix: string): Promise<void> {
  const files = await fs.promises.readdir(localDir);
  
  for (const file of files) {
    const localPath = path.join(localDir, file);
    const s3Key = `${s3Prefix}/${file}`;
    await uploadToS3(localPath, s3Key);
  }
}

/**
 * Clean up temporary file
 */
async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

/**
 * Get content type from file extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/MP2T',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.json': 'application/json'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

export default {
  processAsset,
  getMediaInfo
};
