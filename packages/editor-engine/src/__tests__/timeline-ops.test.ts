import { describe, it, expect } from 'vitest';
import {
  splitClipAtTimestamp,
  trimClipBoundary,
  removeSegmentFromTracks,
  recalculateTimelineDuration,
  createDefaultTimeline,
  reorderTrackClips,
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

  it('removeSegmentFromTracks slices middle segment and ripples subsequent footage', () => {
    const tracks: Track[] = [
      {
        id: 't_main',
        name: 'Video',
        type: 'video',
        muted: false,
        locked: false,
        volume: 1,
        clips: [
          {
            id: 'clip_full',
            sourceId: 'src_1',
            sourceStart: 0,
            sourceEnd: 15,
            timelineStart: 0,
            timelineDuration: 15,
            effects: [],
            playbackRate: 1,
            volume: 1,
          },
        ],
      },
    ];

    // Remove 5s to 8s (3s pause) with ripple
    const updated = removeSegmentFromTracks(tracks, 5, 8, true);
    const clips = updated[0]?.clips ?? [];
    expect(clips.length).toBe(2);

    // Left clip: 0 to 5s
    expect(clips[0]?.timelineStart).toBe(0);
    expect(clips[0]?.timelineDuration).toBe(5);
    expect(clips[0]?.sourceStart).toBe(0);
    expect(clips[0]?.sourceEnd).toBe(5);

    // Right clip (rippled): starts at 5s, duration 7s (15 - 8), source 8 to 15s
    expect(clips[1]?.timelineStart).toBe(5);
    expect(clips[1]?.timelineDuration).toBe(7);
    expect(clips[1]?.sourceStart).toBe(8);
    expect(clips[1]?.sourceEnd).toBe(15);
  });

  it('reorderTrackClips swaps clip positions and ripples timelineStart sequentially', () => {
    const clips: Clip[] = [
      { ...sampleClip, id: 'clip_A', timelineStart: 0, timelineDuration: 10 },
      { ...sampleClip, id: 'clip_B', timelineStart: 10, timelineDuration: 5 },
      { ...sampleClip, id: 'clip_C', timelineStart: 15, timelineDuration: 8 },
    ];

    // Move clip_A (index 0) to after clip_B (index 1)
    const reordered = reorderTrackClips(clips, 0, 1);
    expect(reordered.map((c) => c.id)).toEqual(['clip_B', 'clip_A', 'clip_C']);
    // Clip B: 0 to 5s
    expect(reordered[0]?.timelineStart).toBe(0);
    expect(reordered[0]?.timelineDuration).toBe(5);
    // Clip A: 5 to 15s
    expect(reordered[1]?.timelineStart).toBe(5);
    expect(reordered[1]?.timelineDuration).toBe(10);
    // Clip C: 15 to 23s
    expect(reordered[2]?.timelineStart).toBe(15);
    expect(reordered[2]?.timelineDuration).toBe(8);
  });
});

