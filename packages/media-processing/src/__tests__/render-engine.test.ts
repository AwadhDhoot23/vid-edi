import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import {
  getFFmpegBinaryPath,
  parseOutTimeToSeconds,
  renderTimelineWithFFmpeg,
} from '../render-engine';
import type { Timeline } from '@vid-edi/shared-types';

describe('render-engine', () => {
  it('resolves a valid native FFmpeg binary path', () => {
    const binPath = getFFmpegBinaryPath();
    expect(binPath).toBeDefined();
    expect(typeof binPath).toBe('string');
    if (binPath !== 'ffmpeg') {
      expect(fs.existsSync(binPath)).toBe(true);
    }
  });

  it('correctly parses FFmpeg out_time timestamps into seconds', () => {
    expect(parseOutTimeToSeconds('00:00:00.000')).toBe(0);
    expect(parseOutTimeToSeconds('00:00:15.500')).toBe(15.5);
    expect(parseOutTimeToSeconds('00:01:30.250')).toBe(90.25);
    expect(parseOutTimeToSeconds('01:00:00.000')).toBe(3600);
    expect(parseOutTimeToSeconds('invalid')).toBe(0);
  });

  it('handles immediate abort signal without running process', async () => {
    const controller = new AbortController();
    controller.abort();

    const mockTimeline: Timeline = {
      id: 'timeline_test',
      tracks: [
        {
          id: 'v1',
          name: 'Video 1',
          type: 'video',
          clips: [
            {
              id: 'c1',
              sourceId: 's1',
              sourceStart: 0,
              sourceEnd: 5,
              timelineStart: 0,
              timelineDuration: 5,
              playbackRate: 1,
            },
          ],
        },
      ],
      duration: 5,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
    };

    await expect(
      renderTimelineWithFFmpeg({
        timeline: mockTimeline,
        sourcePath: 'dummy.mp4',
        outputPath: 'out.mp4',
        signal: controller.signal,
      })
    ).rejects.toThrow('Render aborted before start');
  });
});
