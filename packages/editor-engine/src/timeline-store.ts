import { create } from 'zustand';
import type { Timeline, Track, Clip, EditOperation, MediaSource, TranscriptWord } from '@vid-edi/shared-types';
import {
  createDefaultTimeline,
  recalculateTimelineDuration,
  splitClipAtTimestamp,
  trimClipBoundary,
  removeSegmentFromTracks,
} from './timeline-ops';

export interface TimelineStoreState {
  timeline: Timeline;
  activeSource: MediaSource | null;
  currentTime: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  transcriptWords: TranscriptWord[];
  history: EditOperation[];
  past: Timeline[];
  future: Timeline[];

  // Actions
  setMediaSource: (source: MediaSource) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setSelectedClipId: (id: string | null) => void;
  setTranscriptWords: (words: TranscriptWord[]) => void;
  splitSelectedClip: () => void;
  removeClip: (clipId: string) => void;
  trimClip: (clipId: string, newStart: number, newEnd: number, recordHistory?: boolean) => void;
  removeSegment: (startSec: number, endSec: number, ripple?: boolean) => void;
  applyEditOperation: (op: EditOperation) => void;
  setAspectRatio: (ratio: '16:9' | '9:16' | '1:1') => void;
  commitHistorySnapshot: (snapshot: Timeline) => void;
  undo: () => void;
  redo: () => void;
  resetTimeline: () => void;
}

export const useTimelineStore = create<TimelineStoreState>((set, get) => ({
  timeline: createDefaultTimeline(),
  activeSource: null,
  currentTime: 0,
  isPlaying: false,
  selectedClipId: null,
  transcriptWords: [],
  history: [],
  past: [],
  future: [],

  setMediaSource: (source: MediaSource) => {
    const defaultTimeline = createDefaultTimeline();
    const mainClip: Clip = {
      id: `clip_${Date.now()}`,
      sourceId: source.id,
      sourceStart: 0,
      sourceEnd: source.duration,
      timelineStart: 0,
      timelineDuration: source.duration,
      effects: [],
      playbackRate: 1,
      volume: 1,
    };

    const tracks: Track[] = defaultTimeline.tracks.map((track) => {
      if (track.id === 'track_video_main') {
        return { ...track, clips: [mainClip] };
      }
      return track;
    });

    const newTimeline: Timeline = {
      ...defaultTimeline,
      duration: source.duration,
      tracks,
    };

    set({
      activeSource: source,
      timeline: newTimeline,
      currentTime: 0,
      selectedClipId: mainClip.id,
      past: [],
      future: [],
    });
  },

  setCurrentTime: (time: number) => {
    const duration = get().timeline.duration;
    const clamped = Math.max(0, Math.min(time, duration));
    set({ currentTime: clamped });
  },

  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),

  setSelectedClipId: (id: string | null) => set({ selectedClipId: id }),

  setTranscriptWords: (words: TranscriptWord[]) => set({ transcriptWords: words }),

  splitSelectedClip: () => {
    const { timeline, currentTime, selectedClipId, past } = get();
    if (!selectedClipId) return;

    let targetClip: Clip | null = null;
    let targetTrackIndex = -1;
    let targetClipIndex = -1;

    for (let t = 0; t < timeline.tracks.length; t++) {
      const track = timeline.tracks[t];
      if (!track) continue;
      const cIndex = track.clips.findIndex((c) => c.id === selectedClipId);
      if (cIndex !== -1) {
        targetClip = track.clips[cIndex] ?? null;
        targetTrackIndex = t;
        targetClipIndex = cIndex;
        break;
      }
    }

    if (!targetClip || targetTrackIndex === -1) return;

    const splitResult = splitClipAtTimestamp(targetClip, currentTime);
    if (!splitResult) return;

    const [first, second] = splitResult;
    const updatedTracks = timeline.tracks.map((track, tIdx) => {
      if (tIdx !== targetTrackIndex) return track;
      const updatedClips = [...track.clips];
      updatedClips.splice(targetClipIndex, 1, first, second);
      return { ...track, clips: updatedClips };
    });

    const updatedTimeline: Timeline = {
      ...timeline,
      tracks: updatedTracks,
      duration: recalculateTimelineDuration(updatedTracks),
    };

    set({
      past: [...past, timeline],
      timeline: updatedTimeline,
      future: [],
      selectedClipId: second.id,
    });
  },

  removeClip: (clipId: string) => {
    const { timeline, past } = get();
    const updatedTracks = timeline.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((c) => c.id !== clipId),
    }));

    const updatedTimeline: Timeline = {
      ...timeline,
      tracks: updatedTracks,
      duration: recalculateTimelineDuration(updatedTracks),
    };

    set({
      past: [...past, timeline],
      timeline: updatedTimeline,
      future: [],
      selectedClipId: null,
    });
  },

  commitHistorySnapshot: (snapshot: Timeline) => {
    const { past } = get();
    set({
      past: [...past, snapshot],
      future: [],
    });
  },

  trimClip: (clipId: string, newStart: number, newEnd: number, recordHistory = true) => {
    const { timeline, past } = get();
    if (newStart >= newEnd || newStart < 0) return;

    let modified = false;
    const updatedTracks = timeline.tracks.map((track) => {
      const clipIndex = track.clips.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return track;

      const clip = track.clips[clipIndex];
      if (!clip) return track;

      const trimmed = trimClipBoundary(clip, newStart, newEnd);
      if (!trimmed) return track;

      modified = true;
      const updatedClips = [...track.clips];
      updatedClips[clipIndex] = trimmed;
      return { ...track, clips: updatedClips };
    });

    if (!modified) return;

    const updatedTimeline: Timeline = {
      ...timeline,
      tracks: updatedTracks,
      duration: recalculateTimelineDuration(updatedTracks),
    };

    set({
      past: recordHistory ? [...past, timeline] : past,
      timeline: updatedTimeline,
      future: recordHistory ? [] : get().future,
    });
  },

  removeSegment: (startSec: number, endSec: number, ripple = true) => {
    const { timeline, past } = get();
    const updatedTracks = removeSegmentFromTracks(timeline.tracks, startSec, endSec, ripple);
    const updatedTimeline: Timeline = {
      ...timeline,
      tracks: updatedTracks,
      duration: recalculateTimelineDuration(updatedTracks),
    };
    set({
      past: [...past, timeline],
      timeline: updatedTimeline,
      future: [],
    });
  },

  setAspectRatio: (ratio: '16:9' | '9:16' | '1:1') => {
    const { timeline, past } = get();
    let resolution = { width: 1920, height: 1080 };
    if (ratio === '9:16') {
      resolution = { width: 1080, height: 1920 };
    } else if (ratio === '1:1') {
      resolution = { width: 1080, height: 1080 };
    }
    set({
      past: [...past, timeline],
      timeline: {
        ...timeline,
        resolution,
      },
      future: [],
    });
  },

  applyEditOperation: (op: EditOperation) => {
    const { removeSegment, trimClip, setAspectRatio } = get();
    if (op.type === 'removeSegment' && op.sourceRange) {
      removeSegment(op.sourceRange.start, op.sourceRange.end, true);
    } else if (op.type === 'trimClip' && op.sourceRange) {
      trimClip(op.target.clipId, op.sourceRange.start, op.sourceRange.end, true);
    } else if (op.type === 'setAspectRatio') {
      const ratio = (op.params.aspectRatio as '16:9' | '9:16' | '1:1') || '9:16';
      setAspectRatio(ratio);
    }
  },

  undo: () => {
    const { past, timeline, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    if (!previous) return;

    const newPast = past.slice(0, past.length - 1);
    set({
      timeline: previous,
      past: newPast,
      future: [timeline, ...future],
    });
  },

  redo: () => {
    const { future, timeline, past } = get();
    if (future.length === 0) return;

    const next = future[0];
    if (!next) return;

    const newFuture = future.slice(1);
    set({
      timeline: next,
      past: [...past, timeline],
      future: newFuture,
    });
  },

  resetTimeline: () => {
    set({
      timeline: createDefaultTimeline(),
      activeSource: null,
      currentTime: 0,
      isPlaying: false,
      selectedClipId: null,
      past: [],
      future: [],
    });
  },
}));
