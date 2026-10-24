import type { Timeline, ExportPreset } from '@vid-edi/shared-types';
import { getActiveClipAtTime, getNextClipStartTime } from '@vid-edi/editor-engine';

export interface RenderProgress {
  percent: number;
  currentSec: number;
  totalSec: number;
  status: 'initializing' | 'rendering' | 'encoding' | 'completed' | 'error';
  errorMessage?: string;
}

/**
 * In-browser canvas + MediaRecorder pipeline that renders the trimmed timeline
 * directly into a downloadable video file (WebM / MP4) without any external servers.
 */
export async function renderTimelineInBrowser(
  sourceUrl: string,
  timeline: Timeline,
  preset: ExportPreset,
  onProgress: (p: RenderProgress) => void
): Promise<Blob> {
  const totalDuration = timeline.duration;
  if (totalDuration <= 0) {
    throw new Error('Timeline duration is 0, cannot render.');
  }

  onProgress({
    percent: 0,
    currentSec: 0,
    totalSec: totalDuration,
    status: 'initializing',
  });

  // 1. Prepare Offscreen Video Element
  const video = document.createElement('video');
  video.src = sourceUrl;
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.muted = true; // muted to prevent speaker playback during render

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video source for rendering'));
  });

  // 2. Prepare Canvas
  const canvas = document.createElement('canvas');
  canvas.width = preset.resolution.width;
  canvas.height = preset.resolution.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  // 3. Audio Context & Stream Setup
  const stream = canvas.captureStream(30);

  // Setup MediaRecorder
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6_000_000, // 6 Mbps high quality
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  recorder.start(100);

  // 4. Render Frame-by-Frame Timeline Loop
  const frameRate = 30;
  const frameInterval = 1 / frameRate;
  let currentTlTime = 0;

  try {
    while (currentTlTime < totalDuration) {
      // Find active clip at current virtual timeline time
      const activeInfo = getActiveClipAtTime(timeline.tracks, currentTlTime);

      if (activeInfo) {
        // Seek video to corresponding source time
        video.currentTime = activeInfo.sourceTime;
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        // Draw frame onto canvas with aspect ratio adaptation
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Aspect Ratio Crop & Fit
        const videoRatio = video.videoWidth / (video.videoHeight || 1);
        const targetRatio = canvas.width / canvas.height;

        let drawW = canvas.width;
        let drawH = canvas.height;
        let drawX = 0;
        let drawY = 0;

        if (preset.aspectRatio === '9:16') {
          // Vertical shorts: fill height, center-crop horizontally
          drawH = canvas.height;
          drawW = drawH * videoRatio;
          drawX = (canvas.width - drawW) / 2;
        } else if (preset.aspectRatio === '1:1') {
          // Square: fill height, center-crop horizontally
          drawH = canvas.height;
          drawW = drawH * videoRatio;
          drawX = (canvas.width - drawW) / 2;
        } else {
          // Standard 16:9 landscape: fill width, center vertically if needed
          if (videoRatio > targetRatio) {
            drawW = canvas.width;
            drawH = drawW / videoRatio;
            drawY = (canvas.height - drawH) / 2;
          } else {
            drawH = canvas.height;
            drawW = drawH * videoRatio;
            drawX = (canvas.width - drawW) / 2;
          }
        }

        ctx.drawImage(video, drawX, drawY, drawW, drawH);

        // Advance by frame interval
        currentTlTime += frameInterval;
      } else {
        // Empty gap (cut pause) - skip directly to next clip!
        const nextStart = getNextClipStartTime(timeline.tracks, currentTlTime);
        if (nextStart !== null && nextStart < totalDuration) {
          currentTlTime = nextStart;
        } else {
          break;
        }
      }

      const percent = Math.min(99, Math.round((currentTlTime / totalDuration) * 100));
      onProgress({
        percent,
        currentSec: currentTlTime,
        totalSec: totalDuration,
        status: 'rendering',
      });

      // Yield event loop briefly so browser doesn't freeze
      await new Promise((r) => setTimeout(r, 2));
    }

    onProgress({
      percent: 99,
      currentSec: totalDuration,
      totalSec: totalDuration,
      status: 'encoding',
    });

    // 5. Finalize recording
    const finalBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mimeType });
        resolve(blob);
      };
      recorder.stop();
    });

    onProgress({
      percent: 100,
      currentSec: totalDuration,
      totalSec: totalDuration,
      status: 'completed',
    });

    return finalBlob;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    onProgress({
      percent: 0,
      currentSec: 0,
      totalSec: totalDuration,
      status: 'error',
      errorMessage: errorMsg,
    });
    throw err;
  } finally {
    // Cleanup video element
    video.src = '';
    video.load();
  }
}
