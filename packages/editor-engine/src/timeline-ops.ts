import type { Clip, Track, Timeline } from '@vid-edi/shared-types';

/**
 * Splits a clip at a given timeline timestamp.
 * Returns the two resulting clips, or the original clip if the timestamp is out of bounds.
 */
export function splitClipAtTimestamp(
  clip: Clip,
  timelineTimestamp: number
): [Clip, Clip] | null {
  if (
    timelineTimestamp <= clip.timelineStart ||
    timelineTimestamp >= clip.timelineStart + clip.timelineDuration
  ) {
    return null;
  }

  const offset = timelineTimestamp - clip.timelineStart;
  const sourceOffset = offset * clip.playbackRate;

  const firstClip: Clip = {
    ...clip,
    id: `${clip.id}_a_${Date.now().toString(36)}`,
    sourceEnd: clip.sourceStart + sourceOffset,
    timelineDuration: offset,
  };

  const secondClip: Clip = {
    ...clip,
    id: `${clip.id}_b_${Date.now().toString(36)}`,
    sourceStart: clip.sourceStart + sourceOffset,
    timelineStart: timelineTimestamp,
    timelineDuration: clip.timelineDuration - offset,
  };

  return [firstClip, secondClip];
}

/**
 * Trims a clip's start or end boundary.
 * When the start boundary moves, the clip's timelineStart advances accordingly.
 */
export function trimClipBoundary(
  clip: Clip,
  newSourceStart: number,
  newSourceEnd: number
): Clip | null {
  if (newSourceStart >= newSourceEnd || newSourceStart < 0) {
    return null;
  }

  const deltaStart = (newSourceStart - clip.sourceStart) / clip.playbackRate;
  const newTimelineStart = Math.max(0, clip.timelineStart + deltaStart);
  const newDuration = (newSourceEnd - newSourceStart) / clip.playbackRate;

  return {
    ...clip,
    sourceStart: newSourceStart,
    sourceEnd: newSourceEnd,
    timelineStart: newTimelineStart,
    timelineDuration: newDuration,
  };
}

/**
 * Resolves the active clip and mapped source media time for a given timeline timestamp.
 * Checks video tracks (primary first).
 */
export function getActiveClipAtTime(
  tracks: Track[],
  timelineTime: number
): { clip: Clip; sourceTime: number } | null {
  const videoTracks = tracks.filter((t) => t.type === 'video');
  for (const track of videoTracks) {
    if (track.muted) continue;
    for (const clip of track.clips) {
      const clipStart = clip.timelineStart;
      const clipEnd = clip.timelineStart + clip.timelineDuration;
      if (timelineTime >= clipStart && timelineTime < clipEnd) {
        const offset = (timelineTime - clipStart) * clip.playbackRate;
        const sourceTime = clip.sourceStart + offset;
        return { clip, sourceTime };
      }
    }
  }
  return null;
}

/**
 * Finds the start timestamp of the next clip after a gap on video tracks.
 */
export function getNextClipStartTime(
  tracks: Track[],
  timelineTime: number
): number | null {
  let nextStart: number | null = null;
  const videoTracks = tracks.filter((t) => t.type === 'video');
  for (const track of videoTracks) {
    for (const clip of track.clips) {
      if (clip.timelineStart > timelineTime) {
        if (nextStart === null || clip.timelineStart < nextStart) {
          nextStart = clip.timelineStart;
        }
      }
    }
  }
  return nextStart;
}

/**
 * Recalculates total duration of the timeline based on latest clip end time.
 */
export function recalculateTimelineDuration(tracks: Track[]): number {
  let maxDuration = 0;
  for (const track of tracks) {
    for (const clip of track.clips) {
      const clipEnd = clip.timelineStart + clip.timelineDuration;
      if (clipEnd > maxDuration) {
        maxDuration = clipEnd;
      }
    }
  }
  return maxDuration;
}

/**
 * Creates an empty timeline layout with default tracks.
 */
export function createDefaultTimeline(): Timeline {
  return {
    duration: 0,
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    tracks: [
      {
        id: 'track_video_main',
        name: 'Video 1 (Main)',
        type: 'video',
        clips: [],
        muted: false,
        locked: false,
        volume: 1,
      },
      {
        id: 'track_overlay',
        name: 'Overlay / B-Roll',
        type: 'overlay',
        clips: [],
        muted: false,
        locked: false,
        volume: 1,
      },
      {
        id: 'track_audio_dialogue',
        name: 'Dialogue Audio',
        type: 'audio',
        clips: [],
        muted: false,
        locked: false,
        volume: 1,
      },
      {
        id: 'track_audio_music',
        name: 'Music & Ambience',
        type: 'audio',
        clips: [],
        muted: false,
        locked: false,
        volume: 0.5,
      },
      {
        id: 'track_captions',
        name: 'Subtitles & Captions',
        type: 'caption',
        clips: [],
        muted: false,
        locked: false,
        volume: 1,
      },
    ],
  };
}
