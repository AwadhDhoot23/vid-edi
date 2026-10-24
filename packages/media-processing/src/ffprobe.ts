import type { MediaSource } from '@vid-edi/shared-types';

export interface FFprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  duration?: string;
  bit_rate?: string;
  channels?: number;
  sample_rate?: string;
  channel_layout?: string;
}

export interface FFprobeFormat {
  filename?: string;
  nb_streams?: number;
  format_name?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
}

export interface FFprobeOutput {
  streams?: FFprobeStream[];
  format?: FFprobeFormat;
}

/**
 * Parses fractional frame rate strings like "30000/1001" or "24/1" into numeric FPS.
 */
export function parseFpsFraction(fractionStr?: string): number {
  if (!fractionStr) return 30;
  const parts = fractionStr.split('/');
  if (parts.length === 2 && parts[0] && parts[1]) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (den > 0 && !isNaN(num) && !isNaN(den)) {
      return Math.round((num / den) * 100) / 100;
    }
  }
  const direct = parseFloat(fractionStr);
  return !isNaN(direct) && direct > 0 ? direct : 30;
}

/**
 * Pure parser that transforms raw FFprobe JSON output into our standard MediaSource data model.
 */
export function parseFFprobeOutput(rawJson: string | FFprobeOutput, filenameFallback = 'media_file'): MediaSource {
  const data: FFprobeOutput = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;

  const videoStream = data.streams?.find((s) => s.codec_type === 'video');
  const audioStream = data.streams?.find((s) => s.codec_type === 'audio');

  const durationSec = parseFloat(data.format?.duration || videoStream?.duration || '0') || 0;
  const sizeBytes = parseInt(data.format?.size || '0', 10) || 0;
  const fps = parseFpsFraction(videoStream?.r_frame_rate || videoStream?.avg_frame_rate);

  return {
    id: `source_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: data.format?.filename ? data.format.filename.split(/[/|\\]/).pop() || filenameFallback : filenameFallback,
    path: data.format?.filename || filenameFallback,
    size: sizeBytes,
    duration: durationSec,
    width: videoStream?.width || 1920,
    height: videoStream?.height || 1080,
    fps: fps || 30,
    codec: videoStream?.codec_name || 'h264',
    audioChannels: audioStream?.channels || 2,
    audioSampleRate: parseInt(audioStream?.sample_rate || '48000', 10) || 48000,
    mimeType: `video/${videoStream?.codec_name || 'mp4'}`,
  };
}
