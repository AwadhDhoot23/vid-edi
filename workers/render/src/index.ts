import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { renderTimelineWithFFmpeg, type RenderProgress } from '@vid-edi/media-processing/server';
import type { Timeline, ExportPreset } from '@vid-edi/shared-types';

export interface RenderJobData {
  jobId: string;
  timeline: Timeline;
  sourcePath: string;
  outputPath: string;
  preset?: ExportPreset;
}

export function createRenderWorker(redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker<RenderJobData>(
    'video-render',
    async (job: Job<RenderJobData>) => {
      const { timeline, sourcePath, outputPath, preset } = job.data;

      const result = await renderTimelineWithFFmpeg({
        timeline,
        sourcePath,
        outputPath,
        preset,
        onProgress: (prog: RenderProgress) => {
          void job.updateProgress(prog.percent);
        },
      });

      return result;
    },
    { connection, concurrency: 2 }
  );

  worker.on('completed', (job) => {
    console.log(`[RenderWorker] Job ${job.id} rendered successfully!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[RenderWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  console.log('[RenderWorker] Starting native FFmpeg BullMQ render worker...');
  createRenderWorker();
}
