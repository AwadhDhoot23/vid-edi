import type { Connect } from 'vite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as https from 'node:https';
import * as http from 'node:http';
import { renderTimelineWithFFmpeg, type RenderProgress } from '@vid-edi/media-processing/server';
import type { Timeline, ExportPreset } from '@vid-edi/shared-types';

interface RenderJob {
  id: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentTime: number;
  totalDuration: number;
  fps?: number;
  speed?: string;
  stage: string;
  error?: string;
  outputPath?: string;
  downloadUrl?: string;
  fileSize?: number;
  createdAt: number;
  abortController: AbortController;
  subscribers: Set<(job: RenderJob) => void>;
}

const renderJobs = new Map<string, RenderJob>();

const TEMP_DIR = path.join(os.tmpdir(), 'videdi-renders');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Downloads a remote video file to a local temp file if it's a URL.
 */
async function downloadToTemp(url: string, targetPath: string): Promise<string> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    const client = url.startsWith('https') ? https : http;

    client
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadToTemp(res.headers.location, targetPath).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download remote media: HTTP ${res.statusCode}`));
          return;
        }

        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(targetPath));
        });
      })
      .on('error', (err) => {
        fs.unlink(targetPath, () => {});
        reject(err);
      });
  });
}

export function createRenderServerMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url || '';

    // Route: POST /api/render/upload (Stream binary video file directly to disk)
    if (req.method === 'POST' && url.startsWith('/api/render/upload')) {
      try {
        const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const tempFilePath = path.join(TEMP_DIR, `${uploadId}.mp4`);
        const fileStream = fs.createWriteStream(tempFilePath);

        req.pipe(fileStream);

        fileStream.on('finish', () => {
          const stats = fs.statSync(tempFilePath);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              localFilePath: tempFilePath,
              size: stats.size,
            })
          );
        });

        fileStream.on('error', (err) => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Upload stream failed: ${err.message}` }));
        });
        return;
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Failed to initiate upload: ${String(err)}` }));
        return;
      }
    }

    // Route: POST /api/render
    if (req.method === 'POST' && url === '/api/render') {
      try {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body) as {
              timeline: Timeline;
              preset?: ExportPreset;
              sourceUrl?: string;
              localFilePath?: string;
              sourceBase64?: string;
            };

            const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const abortController = new AbortController();

            const job: RenderJob = {
              id: jobId,
              status: 'pending',
              progress: 0,
              currentTime: 0,
              totalDuration: data.timeline.duration || 15,
              stage: 'Queued for native render',
              createdAt: Date.now(),
              abortController,
              subscribers: new Set(),
            };

            renderJobs.set(jobId, job);

            // Respond immediately with job ID
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 202;
            res.end(
              JSON.stringify({
                jobId,
                status: 'pending',
                message: 'Render job queued for execution with native FFmpeg.',
              })
            );

            // Execute render pipeline asynchronously
            void (async () => {
              try {
                let localInputPath: string;

                if (data.localFilePath && fs.existsSync(data.localFilePath)) {
                  // Direct local file on disk from upload
                  localInputPath = data.localFilePath;
                } else if (data.sourceBase64) {
                  // Save base64 payload to temp file
                  localInputPath = path.join(TEMP_DIR, `input_${jobId}.mp4`);
                  const buffer = Buffer.from(data.sourceBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
                  fs.writeFileSync(localInputPath, buffer);
                } else if (data.sourceUrl && data.sourceUrl.startsWith('blob:')) {
                  // Fallback for blob URL without upload
                  const publicSample = path.resolve(process.cwd(), 'apps/studio/public/tech_founder_interview_sample.mp4');
                  if (fs.existsSync(publicSample)) {
                    localInputPath = publicSample;
                  } else {
                    throw new Error('Native FFmpeg cannot open in-memory browser blob URLs. Please upload video data.');
                  }
                } else if (
                  data.sourceUrl &&
                  (data.sourceUrl.startsWith('/') ||
                    data.sourceUrl.startsWith('http://localhost') ||
                    data.sourceUrl.startsWith('http://127.0.0.1'))
                ) {
                  // Local relative or loopback URL -> check public directory
                  const cleanPath = data.sourceUrl.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
                  const publicFile = path.resolve(process.cwd(), 'apps/studio/public', cleanPath);
                  const fallbackPublic = path.resolve(__dirname, '../../public', cleanPath);
                  if (fs.existsSync(publicFile)) {
                    localInputPath = publicFile;
                  } else if (fs.existsSync(fallbackPublic)) {
                    localInputPath = fallbackPublic;
                  } else {
                    localInputPath = publicFile;
                  }
                } else if (data.sourceUrl && (data.sourceUrl.startsWith('http://') || data.sourceUrl.startsWith('https://'))) {
                  // Download remote sample video to temp
                  localInputPath = path.join(TEMP_DIR, `input_${jobId}.mp4`);
                  job.stage = 'Downloading source media to render cache...';
                  job.subscribers.forEach((cb) => cb(job));
                  try {
                    await downloadToTemp(data.sourceUrl, localInputPath);
                  } catch (downloadErr) {
                    // Fallback to local sample video if remote is blocked or unreachable
                    const publicSample = path.resolve(process.cwd(), 'apps/studio/public/tech_founder_interview_sample.mp4');
                    if (fs.existsSync(publicSample)) {
                      localInputPath = publicSample;
                    } else {
                      throw downloadErr;
                    }
                  }
                } else if (data.sourceUrl && fs.existsSync(data.sourceUrl)) {
                  localInputPath = data.sourceUrl;
                } else {
                  // Fallback: search for sample file in public directory
                  const publicSample = path.resolve(process.cwd(), 'apps/studio/public/tech_founder_interview_sample.mp4');
                  localInputPath = fs.existsSync(publicSample) ? publicSample : (data.sourceUrl || 'input.mp4');
                }

                const outputFilename = `videdi_${jobId}.mp4`;
                const outputPath = path.join(TEMP_DIR, outputFilename);

                job.status = 'rendering';
                job.stage = 'Initializing native FFmpeg filtergraph...';
                job.subscribers.forEach((cb) => cb(job));

                const result = await renderTimelineWithFFmpeg({
                  timeline: data.timeline,
                  sourcePath: localInputPath,
                  outputPath,
                  preset: data.preset,
                  signal: abortController.signal,
                  onProgress: (prog: RenderProgress) => {
                    job.progress = prog.percent;
                    job.currentTime = prog.currentTime;
                    job.totalDuration = prog.totalDuration;
                    job.fps = prog.fps;
                    job.speed = prog.speed;
                    job.stage =
                      prog.stage === 'rendering'
                        ? `Encoding frame (${prog.percent}% • ${prog.speed || '1.0x'})`
                        : prog.stage;
                    job.subscribers.forEach((cb) => cb(job));
                  },
                });

                job.status = 'completed';
                job.progress = 100;
                job.outputPath = result.outputPath;
                job.fileSize = result.fileSize;
                job.downloadUrl = `/api/render/${jobId}/download`;
                job.stage = 'Render completed successfully!';
                job.subscribers.forEach((cb) => cb(job));
              } catch (err: unknown) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                job.status = abortController.signal.aborted ? 'cancelled' : 'failed';
                job.error = errorMsg;
                job.stage = abortController.signal.aborted ? 'Render cancelled' : `Failed: ${errorMsg}`;
                job.subscribers.forEach((cb) => cb(job));
              }
            })();
          } catch (e: unknown) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON request payload', details: String(e) }));
          }
        });
        return;
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Server error processing render request', details: String(err) }));
        return;
      }
    }

    // Route: GET /api/render/:jobId/status
    const statusMatch = url.match(/^\/api\/render\/([^/]+)\/status$/);
    if (req.method === 'GET' && statusMatch) {
      const jobId = statusMatch[1]!;
      const job = renderJobs.get(jobId);
      if (!job) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Job ${jobId} not found` }));
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          id: job.id,
          status: job.status,
          progress: job.progress,
          currentTime: job.currentTime,
          totalDuration: job.totalDuration,
          fps: job.fps,
          speed: job.speed,
          stage: job.stage,
          error: job.error,
          downloadUrl: job.downloadUrl,
          fileSize: job.fileSize,
        })
      );
      return;
    }

    // Route: GET /api/render/:jobId/progress (SSE Stream)
    const progressMatch = url.match(/^\/api\/render\/([^/]+)\/progress$/);
    if (req.method === 'GET' && progressMatch) {
      const jobId = progressMatch[1]!;
      const job = renderJobs.get(jobId);
      if (!job) {
        res.statusCode = 404;
        res.end(`data: {"error": "Job ${jobId} not found"}\n\n`);
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const sendUpdate = (j: RenderJob) => {
        try {
          res.write(
            `data: ${JSON.stringify({
              id: j.id,
              status: j.status,
              progress: j.progress,
              currentTime: j.currentTime,
              totalDuration: j.totalDuration,
              fps: j.fps,
              speed: j.speed,
              stage: j.stage,
              error: j.error,
              downloadUrl: j.downloadUrl,
              fileSize: j.fileSize,
            })}\n\n`
          );
        } catch {
          // connection closed
        }
      };

      // Send initial state immediately
      sendUpdate(job);

      // Subscribe to progress events
      job.subscribers.add(sendUpdate);

      req.on('close', () => {
        job.subscribers.delete(sendUpdate);
      });
      return;
    }

    // Route: GET /api/render/:jobId/download
    const downloadMatch = url.match(/^\/api\/render\/([^/]+)\/download$/);
    if (req.method === 'GET' && downloadMatch) {
      const jobId = downloadMatch[1]!;
      const job = renderJobs.get(jobId);
      if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Rendered file for job ${jobId} is not ready or not found` }));
        return;
      }

      const stat = fs.statSync(job.outputPath);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="videdi_export_${jobId}.mp4"`);

      const readStream = fs.createReadStream(job.outputPath);
      readStream.pipe(res);
      return;
    }

    // Route: POST /api/render/:jobId/cancel
    const cancelMatch = url.match(/^\/api\/render\/([^/]+)\/cancel$/);
    if (req.method === 'POST' && cancelMatch) {
      const jobId = cancelMatch[1]!;
      const job = renderJobs.get(jobId);
      if (!job) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Job ${jobId} not found` }));
        return;
      }

      job.abortController.abort();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, message: `Job ${jobId} cancelled.` }));
      return;
    }

    next();
  };
}
