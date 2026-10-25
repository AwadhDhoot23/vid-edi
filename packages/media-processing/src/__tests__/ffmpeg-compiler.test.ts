import { describe, it, expect } from 'vitest';
import {
  compileTimelineToFFmpeg,
  generateEditPlanJson,
  STANDARD_EXPORT_PRESETS,
} from '../ffmpeg-compiler';
import type { Timeline } from '@vid-edi/shared-types';

describe('FFmpeg Command Compiler', () => {
  const sampleTimeline: Timeline = {
    duration: 12,
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    tracks: [
      {
        id: 't_video',
        type: 'video',
        name: 'Video 1',
        muted: false,
        locked: false,
        volume: 1,
        clips: [
          {
            id: 'c1',
            sourceId: 'src1',
            sourceStart: 0,
            sourceEnd: 5,
            timelineStart: 0,
            timelineDuration: 5,
            effects: [],
            playbackRate: 1,
            volume: 1,
          },
          {
            id: 'c2',
            sourceId: 'src1',
            sourceStart: 7.7,
            sourceEnd: 14.7,
            timelineStart: 5,
            timelineDuration: 7,
            effects: [],
            playbackRate: 1,
            volume: 1,
          },
        ],
      },
    ],
  };

  it('generates multi-clip trim and concat filter complex for 16:9 YouTube preset', () => {
    const res = compileTimelineToFFmpeg(
      sampleTimeline,
      'interview.mp4',
      STANDARD_EXPORT_PRESETS[0]
    );

    expect(res.command).toContain('ffmpeg -i "interview.mp4"');
    expect(res.filterComplex).toContain('[0:v]trim=start=0:end=5,setpts=PTS-STARTPTS[v0]');
    expect(res.filterComplex).toContain('[0:v]trim=start=7.7:end=14.7,setpts=PTS-STARTPTS[v1]');
    expect(res.filterComplex).toContain('concat=n=2:v=1:a=1');
    expect(res.command).toContain('-c:v libx264');
  });

  it('generates 9:16 crop filter for Shorts preset', () => {
    const res = compileTimelineToFFmpeg(
      sampleTimeline,
      'interview.mp4',
      STANDARD_EXPORT_PRESETS[1]
    );

    expect(res.filterComplex).toContain('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920');
    expect(res.outputFilename).toContain('9x16');
  });

  it('generates valid reproducible JSON edit plan', () => {
    const jsonStr = generateEditPlanJson({
      timeline: sampleTimeline,
      source: {
        id: 'src1',
        name: 'interview.mp4',
        path: 'blob:...',
        size: 1024,
        duration: 15,
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264',
        audioChannels: 2,
        audioSampleRate: 48000,
        mimeType: 'video/mp4',
      },
    });

    const parsed = JSON.parse(jsonStr);
    expect(parsed.app).toBe('Vid-Edi Studio');
    expect(parsed.timeline.tracks[0].clips.length).toBe(2);
  });

  it('compiles clip speed, visual eq, color filters, and volume into FFmpeg filters', () => {
    const styledTimeline: Timeline = {
      ...sampleTimeline,
      tracks: [
        {
          ...sampleTimeline.tracks[0]!,
          clips: [
            {
              ...sampleTimeline.tracks[0]!.clips[0]!,
              playbackRate: 1.5,
              volume: 0.8,
              brightness: 1.2,
              contrast: 1.1,
              saturation: 1.3,
              colorFilter: 'teal-orange',
            },
          ],
        },
      ],
    };

    const res = compileTimelineToFFmpeg(styledTimeline, 'test.mp4', STANDARD_EXPORT_PRESETS[1]);

    // Video speed: 1 / 1.5 = 0.6667
    expect(res.filterComplex).toContain('setpts=0.6667*(PTS-STARTPTS)');
    // Audio speed: atempo=1.50
    expect(res.filterComplex).toContain('atempo=1.50');
    // Volume: volume=0.80
    expect(res.filterComplex).toContain('volume=0.80');
    // Visual adjustments eq: brightness, contrast, saturation
    expect(res.filterComplex).toContain('eq=brightness=0.10:contrast=1.10:saturation=1.30');
    // Teal-Orange color grading filter
    expect(res.filterComplex).toContain('colorchannelmixer=rr=1.2:bb=0.8,eq=contrast=1.2:saturation=1.3');
    // Subtitles burn-in on Shorts preset
    expect(res.filterComplex).toContain("subtitles='test.srt'");
  });
});
