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
 * Translates studio color grade presets into native deterministic FFmpeg filter strings.
 */
export function getFFmpegFilterForPreset(filterName?: string): string {
  switch (filterName) {
    case 'warm-vintage':
      return 'colorchannelmixer=rr=1.1:rg=0.1:rb=0:br=0:bg=0.1:bb=0.9,eq=saturation=1.2:contrast=1.05';
    case 'teal-orange':
      return 'colorchannelmixer=rr=1.2:bb=0.8,eq=contrast=1.2:saturation=1.3';
    case 'noir-bw':
      return 'hue=s=0,eq=contrast=1.3';
    case 'cyberpunk':
      return 'hue=h=180:s=1.8,eq=contrast=1.15';
    case 'clean-pop':
      return 'eq=contrast=1.1:saturation=1.25';
    case 'kodak-35mm':
      return 'colorchannelmixer=rr=1.05:rg=0.05:rb=0:bb=0.95,eq=saturation=1.15:contrast=1.12';
    case 'bleach-bypass':
      return 'eq=contrast=1.4:saturation=0.6';
    case 'cool-slate':
      return 'hue=h=190:s=0.8,eq=contrast=1.1';
    default:
      return '';
  }
}

/**
 * Compiles a non-destructive multi-clip Timeline into a native deterministic FFmpeg filter_complex CLI command.
 * Supports clip slicing, speed alteration (setpts/atempo), volume, brightness/contrast/saturation (eq),
 * color grading filters, aspect ratio framing (16:9, 9:16, 1:1), and burned-in captions.
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
    const speed = clip.playbackRate && clip.playbackRate > 0 ? clip.playbackRate : 1;
    const vol = clip.volume !== undefined ? clip.volume : 1;

    // 1. Video Filters: trim -> setpts (with speed) -> visual adjustments (eq) -> color filter
    const vFilters: string[] = [`trim=start=${start}:end=${end}`];
    if (speed !== 1) {
      vFilters.push(`setpts=${Number((1 / speed).toFixed(4))}*(PTS-STARTPTS)`);
    } else {
      vFilters.push('setpts=PTS-STARTPTS');
    }

    // Visual adjustments: Brightness, Contrast, Saturation
    const hasBrightness = clip.brightness !== undefined && Math.abs(clip.brightness - 1.0) > 0.01;
    const hasContrast = clip.contrast !== undefined && Math.abs(clip.contrast - 1.0) > 0.01;
    const hasSaturation = clip.saturation !== undefined && Math.abs(clip.saturation - 1.0) > 0.01;
    if (hasBrightness || hasContrast || hasSaturation) {
      const b = clip.brightness !== undefined ? ((clip.brightness - 1.0) * 0.5).toFixed(2) : '0';
      const c = (clip.contrast ?? 1.0).toFixed(2);
      const s = (clip.saturation ?? 1.0).toFixed(2);
      vFilters.push(`eq=brightness=${b}:contrast=${c}:saturation=${s}`);
    }

    // Color grading preset filter
    const filterPreset =
      clip.colorFilter ||
      (clip.effects?.find((e) => e.type === 'filter')?.params as { filterName?: string })?.filterName;
    if (filterPreset && filterPreset !== 'none') {
      const ffFilter = getFFmpegFilterForPreset(filterPreset);
      if (ffFilter) vFilters.push(ffFilter);
    }

    filterParts.push(`[0:v]${vFilters.join(',')}[${vTag}]`);

    // 2. Audio Filters: atrim -> asetpts -> atempo (speed) -> volume
    const aFilters: string[] = [`atrim=start=${start}:end=${end}`, 'asetpts=PTS-STARTPTS'];
    if (speed !== 1) {
      aFilters.push(`atempo=${speed.toFixed(2)}`);
    }
    if (vol !== 1) {
      aFilters.push(`volume=${vol.toFixed(2)}`);
    }

    filterParts.push(`[0:a]${aFilters.join(',')}[${aTag}]`);
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

  // Burn captions if enabled in export preset
  if (preset.burnCaptions) {
    const srtFile = `${sourcePath.replace(/\.[^/.]+$/, '')}.srt`;
    filterParts.push(
      `${finalVideoTag}subtitles='${srtFile}':force_style='Fontname=Arial,Fontsize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3'[subbed_v]`
    );
    finalVideoTag = '[subbed_v]';
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
