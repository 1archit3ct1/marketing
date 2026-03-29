/**
 * AURA Job Queue Service
 * BullMQ-based job queue for background processing
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { processAsset } from '../services/TranscodeWorker';

// Environment variables
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '4');

// Redis connection
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 2000);
  }
});

// Job types
export type JobType = 
  | 'transcode'
  | 'ai_draft'
  | 'ai_enhance'
  | 'asr'
  | 'scene_analysis'
  | 'engagement_prediction'
  | 'render'
  | 'export'
  | 'thumbnail_generate'
  | 'avatar_generate'
  | 'background_generate';

export interface JobData {
  type: JobType;
  data: Record<string, any>;
  priority?: number;
}

// Create queues for different job types
const transcodeQueue = new Queue('transcode', { connection });
const aiQueue = new Queue('ai', { connection });
const renderQueue = new Queue('render', { connection });

// Queue event listeners
const transcodeEvents = new QueueEvents('transcode', { connection });
const aiEvents = new QueueEvents('ai', { connection });
const renderEvents = new QueueEvents('render', { connection });

/**
 * Queue a new job
 */
export async function queueJob(jobData: JobData): Promise<string> {
  const { type, data, priority = 0 } = jobData;

  let queue: Queue;
  let jobId: string;

  switch (type) {
    case 'transcode':
      queue = transcodeQueue;
      jobId = `transcode:${data.assetId}`;
      break;
    case 'ai_draft':
    case 'ai_enhance':
    case 'asr':
    case 'scene_analysis':
    case 'engagement_prediction':
    case 'thumbnail_generate':
    case 'avatar_generate':
    case 'background_generate':
      queue = aiQueue;
      jobId = `ai:${type}:${data.assetId || data.projectId || Date.now()}`;
      break;
    case 'render':
    case 'export':
      queue = renderQueue;
      jobId = `render:${data.exportJobId || Date.now()}`;
      break;
    default:
      throw new Error(`Unknown job type: ${type}`);
  }

  await queue.add(
    type,
    { type, data },
    {
      jobId,
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000 // Keep up to 1000 completed jobs
      },
      removeOnFail: {
        age: 86400 // Keep failed jobs for 24 hours
      }
    }
  );

  return jobId;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<{
  status: string;
  progress: number;
  result?: any;
  failedReason?: string;
} | null> {
  // Try all queues
  for (const queue of [transcodeQueue, aiQueue, renderQueue]) {
    const job = await Job.fromId(queue, jobId);
    if (job) {
      return {
        status: await job.getState(),
        progress: job.progress || 0,
        result: job.returnvalue,
        failedReason: job.failedReason
      };
    }
  }
  return null;
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  type: JobType,
  progress: number,
  message?: string
): Promise<void> {
  let queue: Queue;

  switch (type) {
    case 'transcode':
      queue = transcodeQueue;
      break;
    case 'ai_draft':
    case 'ai_enhance':
    case 'asr':
    case 'scene_analysis':
    case 'engagement_prediction':
    case 'thumbnail_generate':
    case 'avatar_generate':
    case 'background_generate':
      queue = aiQueue;
      break;
    case 'render':
    case 'export':
      queue = renderQueue;
      break;
    default:
      return;
  }

  const job = await Job.fromId(queue, jobId);
  if (job) {
    await job.updateProgress(progress);
    if (message) {
      await job.log(message);
    }
  }
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  for (const queue of [transcodeQueue, aiQueue, renderQueue]) {
    const job = await Job.fromId(queue, jobId);
    if (job) {
      await job.remove();
      return true;
    }
  }
  return false;
}

/**
 * Get queue stats
 */
export async function getQueueStats(): Promise<{
  transcode: { waiting: number; active: number; completed: number; failed: number };
  ai: { waiting: number; active: number; completed: number; failed: number };
  render: { waiting: number; active: number; completed: number; failed: number };
}> {
  const getStats = async (queue: Queue) => {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount()
    ]);
    return { waiting, active, completed, failed };
  };

  const [transcode, ai, render] = await Promise.all([
    getStats(transcodeQueue),
    getStats(aiQueue),
    getStats(renderQueue)
  ]);

  return { transcode, ai, render };
}

/**
 * Create workers for processing jobs
 */
export function createWorkers(): void {
  // Transcode worker
  new Worker(
    'transcode',
    async (job: Job) => {
      const { type, data } = job.data as JobData;
      
      if (type === 'transcode') {
        await processAsset(data);
      }
    },
    {
      connection,
      concurrency: CONCURRENCY,
      limiter: {
        max: 4,
        duration: 1000 // 4 jobs per second
      }
    }
  );

  // AI jobs worker
  new Worker(
    'ai',
    async (job: Job) => {
      const { type, data } = job.data as JobData;
      
      // Placeholder for AI job processing
      // In production, route to appropriate AI service
      console.log(`Processing AI job: ${type}`, data);
      
      // Update progress
      await job.updateProgress(100);
      
      return { success: true, type, data };
    },
    {
      connection,
      concurrency: CONCURRENCY,
      limiter: {
        max: 2,
        duration: 1000 // 2 jobs per second (AI jobs are expensive)
      }
    }
  );

  // Render worker
  new Worker(
    'render',
    async (job: Job) => {
      const { type, data } = job.data as JobData;
      
      // Placeholder for render job processing
      console.log(`Processing render job: ${type}`, data);
      
      // Update progress
      await job.updateProgress(100);
      
      return { success: true, type, data };
    },
    {
      connection,
      concurrency: CONCURRENCY
    }
  );
}

/**
 * Close queue connections
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    transcodeQueue.close(),
    aiQueue.close(),
    renderQueue.close(),
    connection.quit()
  ]);
}

// Event listeners for monitoring
transcodeEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Transcode job completed: ${jobId}`, returnvalue);
});

transcodeEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Transcode job failed: ${jobId}`, failedReason);
});

aiEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`AI job completed: ${jobId}`, returnvalue);
});

aiEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`AI job failed: ${jobId}`, failedReason);
});

renderEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Render job completed: ${jobId}`, returnvalue);
});

renderEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Render job failed: ${jobId}`, failedReason);
});

export default {
  queueJob,
  getJobStatus,
  updateJobProgress,
  cancelJob,
  getQueueStats,
  createWorkers,
  closeQueues
};
