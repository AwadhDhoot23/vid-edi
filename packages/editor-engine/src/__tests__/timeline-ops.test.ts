import { describe, it, expect } from 'vitest';
import {
  splitClipAtTimestamp,
  trimClipBoundary,
  recalculateTimelineDuration,
  createDefaultTimeline,
} from '../timeline-ops';
import type { Clip, Track } from '@vid-edi/shared-types';

describe('Timeline Operations', () => {
  const sampleClip: Clip = {
    id: 'test_clip_1',
    sourceId: 'src_1',
    sourceStart: 10,
    sourceEnd: 30,
    timelineStart: 5,
    timelineDuration: 20,
    effects: [],
    playbackRate: 1,
    volume: 1,
  };

  it('splitClipAtTimestamp correctly splits clip at timestamp', () => {
    const split = splitClipAtTimestamp(sampleClip, 15);
    expect(split).not.toBeNull();
    if (!split) return;

    const [first, second] = split;
    expect(first.timelineStart).toBe(5);
    expect(first.timelineDuration).toBe(10);
    expect(first.sourceStart).toBe(10);
    expect(first.sourceEnd).toBe(20);

    expect(second.timelineStart).toBe(15);
    expect(second.timelineDuration).toBe(10);
    expect(second.sourceStart).toBe(20);
    expect(second.sourceEnd).toBe(30);
  });

  it('splitClipAtTimestamp returns null for out of bounds timestamp', () => {
    expect(splitClipAtTimestamp(sampleClip, 4)).toBeNull();
    expect(splitClipAtTimestamp(sampleClip, 25)).toBeNull();
    expect(splitClipAtTimestamp(sampleClip, 5)).toBeNull();
  });

  it('trimClipBoundary updates clip source boundaries, timelineStart, and duration', () => {
    const trimmed = trimClipBoundary(sampleClip, 12, 28);
    expect(trimmed).not.toBeNull();
    expect(trimmed?.sourceStart).toBe(12);
    expect(trimmed?.sourceEnd).toBe(28);
    expect(trimmed?.timelineStart).toBe(7); // 5 + (12 - 10) = 7
    expect(trimmed?.timelineDuration).toBe(16);
  });

  it('recalculateTimelineDuration computes max duration across tracks', () => {
    const tracks: Track[] = [
      {
        id: 't1',
        name: 'Video',
        type: 'video',
        muted: false,
        locked: false,
        volume: 1,
        clips: [
          {
            ...sampleClip,
            timelineStart: 0,
            timelineDuration: 15,
          },
        ],
      },
      {
        id: 't2',
        name: 'Audio',
        type: 'audio',
        muted: false,
        locked: false,
        volume: 1,
        clips: [
          {
            ...sampleClip,
            id: 't2_clip',
            timelineStart: 10,
            timelineDuration: 25,
          },
        ],
      },
    ];

    expect(recalculateTimelineDuration(tracks)).toBe(35);
  });

  it('createDefaultTimeline creates standard 5-track layout', () => {
    const tl = createDefaultTimeline();
    expect(tl.tracks.length).toBe(5);
    expect(tl.tracks.map((t) => t.type)).toEqual([
      'video',
      'overlay',
      'audio',
      'audio',
      'caption',
    ]);
  });
});
