import type { Timeline, ExportPreset, MediaSource, EditOperation } from '@vid-edi/shared-types';

export interface FFmpegCompilationResult {
  command: string;
  filterComplex: string;
  outputFilename: string;
  estimatedDuration: number;
}

/**
 * Standard export presets for video publishing.
 */
export const STANDARD_EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube_1080p',
    name: 'YouTube Landscape (1080p 16:9)',
    aspectRatio: '16:9',
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    burnCaptions: false,
    bitrate: '8M',
  },
  {
    id: 'shorts_1080p',
    name: 'Shorts / Reels / TikTok (1080x1920 9:16)',
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    burnCaptions: true,
    bitrate: '8M',
  },
  {
    id: 'square_1080p',
    name: 'Square Post (1080x1080 1:1)',
    aspectRatio: '1:1',
    resolution: { width: 1080, height: 1080 },
    fps: 30,
    burnCaptions: false,
    bitrate: '6M',
  },
];

/**
 * Compiles a non-destructive multi-clip Timeline into a native deterministic FFmpeg filter_complex CLI command.
 */
export function compileTimelineToFFmpeg(
  timeline: Timeline,
  sourcePath: string,
  preset: ExportPreset = STANDARD_EXPORT_PRESETS[0]!
): FFmpegCompilationResult {
  const mainVideoTrack = timeline.tracks.find((t) => t.type === 'video');
  const clips = mainVideoTrack?.clips || [];

  if (clips.length === 0) {
    const outputFilename = `output_${preset.aspectRatio.replace(':', 'x')}.mp4`;
    return {
      command: `ffmpeg -i "${sourcePath}" -c:v libx264 -c:a aac "${outputFilename}"`,
      filterComplex: '',
      outputFilename,
      estimatedDuration: timeline.duration,
    };
  }

  // Build filter_complex chains for each clip slice
  const filterParts: string[] = [];
  const concatInputs: string[] = [];

  clips.forEach((clip, index) => {
    const vTag = `v${index}`;
    const aTag = `a${index}`;
    const start = Number(clip.sourceStart.toFixed(2));
    const end = Number(clip.sourceEnd.toFixed(2));

    filterParts.push(`[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[${vTag}]`);
    filterParts.push(`[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[${aTag}]`);
    concatInputs.push(`[${vTag}][${aTag}]`);
  });

  const concatTag = `[concatenated_v][concatenated_a]`;
  filterParts.push(
    `${concatInputs.join('')}concat=n=${clips.length}:v=1:a=1${concatTag}`
  );

  let finalVideoTag = '[concatenated_v]';

  // Apply Aspect Ratio Framing / Crop
  if (preset.aspectRatio === '9:16') {
    filterParts.push(
      `[concatenated_v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[cropped_v]`
    );
    finalVideoTag = '[cropped_v]';
  } else if (preset.aspectRatio === '1:1') {
    filterParts.push(
      `[concatenated_v]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080[cropped_v]`
    );
    finalVideoTag = '[cropped_v]';
  }

  const filterComplex = filterParts.join('; ');
  const outputFilename = `rendered_${preset.aspectRatio.replace(':', 'x')}_${Math.round(timeline.duration)}s.mp4`;

  const command = `ffmpeg -i "${sourcePath}" -filter_complex "${filterComplex}" -map "${finalVideoTag}" -map "[concatenated_a]" -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k "${outputFilename}"`;

  return {
    command,
    filterComplex,
    outputFilename,
    estimatedDuration: timeline.duration,
  };
}

/**
 * Exports reproducible edit plan as a JSON file.
 */
export function generateEditPlanJson(project: {
  timeline: Timeline;
  source: MediaSource | null;
  history?: EditOperation[];
}): string {
  const payload = {
    version: '1.0.0',
    app: 'Vid-Edi Studio',
    exportedAt: new Date().toISOString(),
    sourceMedia: project.source
      ? {
          name: project.source.name,
          duration: project.source.duration,
          width: project.source.width,
          height: project.source.height,
        }
      : null,
    timeline: {
      duration: project.timeline.duration,
      resolution: project.timeline.resolution,
      fps: project.timeline.fps,
      tracks: project.timeline.tracks.map((track) => ({
        id: track.id,
        name: track.name,
        type: track.type,
        clipsCount: track.clips.length,
        clips: track.clips.map((c) => ({
          id: c.id,
          sourceStart: c.sourceStart,
          sourceEnd: c.sourceEnd,
          timelineStart: c.timelineStart,
          timelineDuration: c.timelineDuration,
        })),
      })),
    },
    operationsHistory: project.history || [],
  };

  return JSON.stringify(payload, null, 2);
}
