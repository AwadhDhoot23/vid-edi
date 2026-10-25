import { spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Timeline, ExportPreset } from '@vid-edi/shared-types';
import { compileTimelineToFFmpeg } from './ffmpeg-compiler';

export interface RenderProgress {
  percent: number;
  currentTime: number;
  totalDuration: number;
  fps?: number;
  speed?: string;
  stage: 'preparing' | 'rendering' | 'finalizing' | 'completed' | 'failed' | 'aborted';
  error?: string;
}

export interface RenderJobOptions {
  timeline: Timeline;
  sourcePath: string;
  outputPath: string;
  preset?: ExportPreset;
  ffmpegPath?: string;
  onProgress?: (progress: RenderProgress) => void;
  signal?: AbortSignal;
}

export interface RenderJobResult {
  success: boolean;
  outputPath: string;
  fileSize: number;
  duration: number;
  error?: string;
}

/**
 * Resolves the path to the native FFmpeg executable.
 * Prioritizes custom FFMPEG_PATH -> system PATH -> WinGet Gyan build -> @ffmpeg-installer/ffmpeg.
 */
export function getFFmpegBinaryPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // 1. Check if 'ffmpeg' is directly available in PATH
  try {
    const check = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore', windowsHide: true });
    if (check.status === 0) return 'ffmpeg';
  } catch {
    // not directly in path
  }

  // 2. Check WinGet Gyan FFmpeg directory on Windows
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const wingetDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(wingetDir)) {
      try {
        const entries = fs.readdirSync(wingetDir);
        const gyanPkg = entries.find((e) => e.startsWith('Gyan.FFmpeg.Essentials'));
        if (gyanPkg) {
          const binDir = path.join(wingetDir, gyanPkg);
          const findExe = (dir: string): string | null => {
            const items = fs.readdirSync(dir);
            for (const item of items) {
              const full = path.join(dir, item);
              if (item.toLowerCase() === 'ffmpeg.exe') return full;
              if (fs.statSync(full).isDirectory()) {
                const sub = findExe(full);
                if (sub) return sub;
              }
            }
            return null;
          };
          const found = findExe(binDir);
          if (found) return found;
        }
      } catch {
        // continue
      }
    }
  }

  // 3. Fall back to @ffmpeg-installer/ffmpeg if installed
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installer = require('@ffmpeg-installer/ffmpeg');
    if (installer?.path && fs.existsSync(installer.path)) {
      return installer.path;
    }
  } catch {
    // optional package
  }

  return 'ffmpeg';
}

/**
 * Parses out_time string (HH:MM:SS.fraction) into seconds.
 */
export function parseOutTimeToSeconds(outTimeStr: string): number {
  const parts = outTimeStr.trim().split(':');
  if (parts.length !== 3) return 0;
  const hours = parseFloat(parts[0] || '0') || 0;
  const minutes = parseFloat(parts[1] || '0') || 0;
  const seconds = parseFloat(parts[2] || '0') || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Executes full-quality native FFmpeg video render for a timeline with real-time progress callbacks.
 */
export async function renderTimelineWithFFmpeg(options: RenderJobOptions): Promise<RenderJobResult> {
  const {
    timeline,
    sourcePath,
    outputPath,
    preset,
    ffmpegPath = getFFmpegBinaryPath(),
    onProgress,
    signal,
  } = options;

  if (signal?.aborted) {
    throw new Error('Render aborted before start');
  }

  onProgress?.({
    percent: 0,
    currentTime: 0,
    totalDuration: timeline.duration,
    stage: 'preparing',
  });

  // Ensure output directory exists
  const outDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Compile timeline into FFmpeg filtergraph
  const compilation = compileTimelineToFFmpeg(timeline, sourcePath, preset);

  // Construct arguments array for spawn
  const args = [
    '-y',
    '-i',
    sourcePath,
    '-filter_complex',
    compilation.filterComplex,
    '-map',
    compilation.finalVideoTag || '[concatenated_v]',
    '-map',
    compilation.finalAudioTag || '[concatenated_a]',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '18',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-progress',
    'pipe:1',
    outputPath,
  ];

  return new Promise<RenderJobResult>((resolve, reject) => {
    let stderrOutput = '';
    let currentFps = 0;
    let currentSpeed = '1.0x';

    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const abortHandler = () => {
      try {
        child.kill('SIGTERM');
        // If still running after 500ms, kill forcefully
        setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
        }, 500);
      } catch {
        // ignore
      }

      // Cleanup partial file if it exists
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch {
          // ignore
        }
      }

      onProgress?.({
        percent: 0,
        currentTime: 0,
        totalDuration: timeline.duration,
        stage: 'aborted',
      });
      reject(new Error('Render cancelled by user'));
    };

    if (signal) {
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    // Process progress output from stdout (FFmpeg -progress pipe:1)
    let buffer = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [key, val] = trimmed.split('=');
        if (!key || val === undefined) continue;

        if (key === 'fps') {
          currentFps = parseFloat(val) || 0;
        } else if (key === 'speed') {
          currentSpeed = val;
        } else if (key === 'out_time') {
          const currentSec = parseOutTimeToSeconds(val);
          const percent = Math.min(
            99,
            Math.max(1, Math.round((currentSec / Math.max(timeline.duration, 1)) * 100))
          );
          onProgress?.({
            percent,
            currentTime: currentSec,
            totalDuration: timeline.duration,
            fps: currentFps,
            speed: currentSpeed,
            stage: 'rendering',
          });
        } else if (key === 'progress' && val === 'end') {
          onProgress?.({
            percent: 99,
            currentTime: timeline.duration,
            totalDuration: timeline.duration,
            stage: 'finalizing',
          });
        }
      }
    });

    // Capture stderr for error messages / diagnostics
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderrOutput += text;
      // Keep only last 4000 characters to prevent memory blowup
      if (stderrOutput.length > 4000) {
        stderrOutput = stderrOutput.slice(-4000);
      }
    });

    child.on('error', (err) => {
      if (signal) signal.removeEventListener('abort', abortHandler);
      onProgress?.({
        percent: 0,
        currentTime: 0,
        totalDuration: timeline.duration,
        stage: 'failed',
        error: err.message,
      });
      reject(new Error(`Failed to spawn FFmpeg at "${ffmpegPath}": ${err.message}`));
    });

    child.on('close', (code) => {
      if (signal) signal.removeEventListener('abort', abortHandler);

      if (code === 0) {
        if (!fs.existsSync(outputPath)) {
          const errMsg = 'FFmpeg exited with code 0 but output file was not found.';
          onProgress?.({
            percent: 0,
            currentTime: 0,
            totalDuration: timeline.duration,
            stage: 'failed',
            error: errMsg,
          });
          reject(new Error(errMsg));
          return;
        }

        const stat = fs.statSync(outputPath);
        onProgress?.({
          percent: 100,
          currentTime: timeline.duration,
          totalDuration: timeline.duration,
          stage: 'completed',
        });

        resolve({
          success: true,
          outputPath,
          fileSize: stat.size,
          duration: timeline.duration,
        });
      } else {
        const errorSummary = stderrOutput.slice(-500).trim() || `FFmpeg exited with code ${code}`;
        onProgress?.({
          percent: 0,
          currentTime: 0,
          totalDuration: timeline.duration,
          stage: 'failed',
          error: errorSummary,
        });
        reject(new Error(`FFmpeg rendering failed (code ${code}): ${errorSummary}`));
      }
    });
  });
}
