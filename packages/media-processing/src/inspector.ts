import type { MediaSource } from '@vid-edi/shared-types';

export interface InspectorResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  audioChannels: number;
  audioSampleRate: number;
}

/**
 * Parses video metadata from browser HTML5 Video element / Blob.
 */
export async function inspectBrowserVideoFile(file: File): Promise<MediaSource> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      resolve({
        id: `source_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        path: objectUrl, // Retain objectUrl so <video src={path} /> can immediately stream and play the uploaded file
        size: file.size,
        duration: video.duration || 0,
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        fps: 30, // Default estimated standard
        codec: file.type || 'video/mp4',
        audioChannels: 2,
        audioSampleRate: 44100,
        mimeType: file.type || 'video/mp4',
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load video metadata for ${file.name}`));
    };

    video.src = objectUrl;
  });
}
