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
 * Maps a source media timestamp to the corresponding timeline timestamp.
 * Returns null if the source time is not present on any active video track (e.g. deleted).
 */
export function getTimelineTimeFromSourceTime(
  tracks: Track[],
  sourceTime: number
): number | null {
  const videoTracks = tracks.filter((t) => t.type === 'video');
  for (const track of videoTracks) {
    for (const clip of track.clips) {
      if (sourceTime >= clip.sourceStart && sourceTime <= clip.sourceEnd) {
        const offset = (sourceTime - clip.sourceStart) / clip.playbackRate;
        return clip.timelineStart + offset;
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

/**
 * Cuts out a time interval [startSec, endSec] across all clips on the tracks.
 * If ripple is true, shifts all subsequent media leftward to close the gap.
 */
export function removeSegmentFromTracks(
  tracks: Track[],
  startSec: number,
  endSec: number,
  ripple = true
): Track[] {
  if (startSec >= endSec || startSec < 0) return tracks;
  const cutDuration = endSec - startSec;

  return tracks.map((track) => {
    const nextClips: Clip[] = [];

    for (const clip of track.clips) {
      const clipStart = clip.timelineStart;
      const clipEnd = clip.timelineStart + clip.timelineDuration;

      // Case 1: Clip ends before the cut range starts
      if (clipEnd <= startSec) {
        nextClips.push(clip);
        continue;
      }

      // Case 2: Clip starts after the cut range ends
      if (clipStart >= endSec) {
        nextClips.push({
          ...clip,
          timelineStart: ripple ? Math.max(0, clip.timelineStart - cutDuration) : clip.timelineStart,
        });
        continue;
      }

      // Case 3: Cut is strictly inside the clip (clip is split in two, middle cut out)
      if (clipStart < startSec && clipEnd > endSec) {
        const leftDuration = startSec - clipStart;
        const leftClip: Clip = {
          ...clip,
          id: `${clip.id}_a_${Math.round(startSec)}`,
          sourceEnd: clip.sourceStart + leftDuration * clip.playbackRate,
          timelineDuration: leftDuration,
        };

        const rightOffset = (endSec - clipStart) * clip.playbackRate;
        const rightDuration = clipEnd - endSec;
        const rightClip: Clip = {
          ...clip,
          id: `${clip.id}_b_${Math.round(endSec)}`,
          sourceStart: clip.sourceStart + rightOffset,
          timelineStart: ripple ? startSec : endSec,
          timelineDuration: rightDuration,
        };

        nextClips.push(leftClip, rightClip);
        continue;
      }

      // Case 4: Cut overlaps the end of the clip
      if (clipStart < startSec && clipEnd <= endSec) {
        const remainingDuration = startSec - clipStart;
        nextClips.push({
          ...clip,
          sourceEnd: clip.sourceStart + remainingDuration * clip.playbackRate,
          timelineDuration: remainingDuration,
        });
        continue;
      }

      // Case 5: Cut overlaps the beginning of the clip
      if (clipStart >= startSec && clipEnd > endSec) {
        const cutInClip = endSec - clipStart;
        const remainingDuration = clipEnd - endSec;
        nextClips.push({
          ...clip,
          sourceStart: clip.sourceStart + cutInClip * clip.playbackRate,
          timelineStart: ripple ? startSec : endSec,
          timelineDuration: remainingDuration,
        });
        continue;
      }

      // Case 6: Clip is completely enclosed within the cut -> dropped/deleted
    }

    return {
      ...track,
      clips: nextClips,
    };
  });
}

/**
 * Slices out a segment specified by source media timestamps [sourceStart, sourceEnd],
 * translating it into the current timeline positions of clips and rippling subsequent footage.
 */
export function removeSourceSegmentFromTracks(
  tracks: Track[],
  sourceStart: number,
  sourceEnd: number,
  ripple = true
): Track[] {
  if (sourceStart >= sourceEnd || sourceStart < 0) return tracks;

  let currentTracks = tracks;
  const videoTracks = tracks.filter((t) => t.type === 'video');

  for (const track of videoTracks) {
    for (const clip of track.clips) {
      const overlapStart = Math.max(clip.sourceStart, sourceStart);
      const overlapEnd = Math.min(clip.sourceEnd, sourceEnd);

      if (overlapStart < overlapEnd) {
        const tlStart = clip.timelineStart + (overlapStart - clip.sourceStart) / clip.playbackRate;
        const tlEnd = clip.timelineStart + (overlapEnd - clip.sourceStart) / clip.playbackRate;

        currentTracks = removeSegmentFromTracks(currentTracks, tlStart, tlEnd, ripple);
        return currentTracks;
      }
    }
  }

  return currentTracks;
}

/**
 * Reorders clips in a track by moving a clip from fromIndex to toIndex.
 * Sequentially recalculates timelineStart with magnet ripple snapping.
 */
export function reorderTrackClips(
  clips: Clip[],
  fromIndex: number,
  toIndex: number
): Clip[] {
  if (
    fromIndex < 0 ||
    fromIndex >= clips.length ||
    toIndex < 0 ||
    toIndex >= clips.length ||
    fromIndex === toIndex
  ) {
    return clips;
  }

  const updated = [...clips];
  const [movedClip] = updated.splice(fromIndex, 1);
  if (!movedClip) return clips;
  updated.splice(toIndex, 0, movedClip);

  // Magnet ripple re-calculation: stack sequentially from 0 or preserve starting offset
  let currentStart = 0;
  return updated.map((clip) => {
    const recalculated = {
      ...clip,
      timelineStart: currentStart,
    };
    currentStart += clip.timelineDuration;
    return recalculated;
  });
}

/**
 * Appends or places a clip onto a specific track.
 */
export function addClipToTrackOps(
  tracks: Track[],
  trackId: string,
  newClip: Clip
): Track[] {
  return tracks.map((track) => {
    if (track.id !== trackId) return track;
    const updatedClips = [...track.clips, newClip];
    return { ...track, clips: updatedClips };
  });
}
