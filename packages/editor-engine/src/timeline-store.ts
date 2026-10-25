import { create } from 'zustand';
import type {
  Timeline,
  Track,
  Clip,
  EditOperation,
  MediaSource,
  TranscriptWord,
  ProjectAsset,
  TextOverlayConfig,
  TitleCardConfig,
} from '@vid-edi/shared-types';
import {
  createDefaultTimeline,
  recalculateTimelineDuration,
  splitClipAtTimestamp,
  removeSegmentFromTracks,
  removeSourceSegmentFromTracks,
  reorderTrackClips,
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
  projectAssets: ProjectAsset[];
  activeFilter: string;
  activeAspectRatio: '16:9' | '9:16' | '1:1';

  // Actions
  setMediaSource: (source: MediaSource) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setSelectedClipId: (id: string | null) => void;
  setTranscriptWords: (words: TranscriptWord[]) => void;
  splitSelectedClip: () => void;
  removeClip: (clipId: string, ripple?: boolean) => void;
  trimClip: (clipId: string, newStart: number, newEnd: number, recordHistory?: boolean, ripple?: boolean) => void;
  removeSegment: (startSec: number, endSec: number, ripple?: boolean) => void;
  removeSourceSegment: (sourceStart: number, sourceEnd: number, ripple?: boolean) => void;
  applyEditOperation: (op: EditOperation) => void;
  recordHistoryOperation: (op: EditOperation) => void;
  setAspectRatio: (ratio: '16:9' | '9:16' | '1:1') => void;
  addProjectAsset: (asset: ProjectAsset) => void;
  removeProjectAsset: (assetId: string) => void;
  addAssetToTimeline: (asset: ProjectAsset, trackId?: string) => void;
  addTextOverlayClip: (config: TextOverlayConfig, duration?: number) => void;
  addTitleCardClip: (config: TitleCardConfig, duration?: number) => void;
  insertTitleCardAtStart: (config: TitleCardConfig, duration?: number) => void;
  appendTitleCardAtEnd: (config: TitleCardConfig, duration?: number) => void;
  moveClip: (clipId: string, newTimelineStart: number) => void;
  reorderClips: (trackId: string, fromIndex: number, toIndex: number) => void;
  updateClipProperties: (clipId: string, updates: Partial<Clip>) => void;
  setActiveFilter: (filterName: string) => void;
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
  projectAssets: [],
  activeFilter: 'none',
  activeAspectRatio: '16:9',

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

    const initialAsset: ProjectAsset = {
      id: source.id,
      name: source.name,
      type: 'video',
      path: source.path,
      duration: source.duration,
      width: source.width,
      height: source.height,
      size: source.size,
    };
    const currentAssets = get().projectAssets;
    const hasAsset = currentAssets.some((a) => a.id === source.id);
    const updatedAssets = hasAsset ? currentAssets : [initialAsset, ...currentAssets];

    set({
      activeSource: source,
      timeline: newTimeline,
      currentTime: 0,
      selectedClipId: mainClip.id,
      projectAssets: updatedAssets,
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

  removeClip: (clipId: string, ripple = true) => {
    const { timeline, past } = get();

    let targetClip: Clip | null = null;
    let targetTrackIndex = -1;
    for (let t = 0; t < timeline.tracks.length; t++) {
      const track = timeline.tracks[t];
      if (!track) continue;
      const found = track.clips.find((c) => c.id === clipId);
      if (found) {
        targetClip = found;
        targetTrackIndex = t;
        break;
      }
    }

    if (!targetClip) return;

    const gapStart = targetClip.timelineStart;
    const gapDuration = targetClip.timelineDuration;

    const updatedTracks = timeline.tracks.map((track, tIdx) => {
      if (tIdx !== targetTrackIndex) return track;
      return {
        ...track,
        clips: track.clips
          .filter((c) => c.id !== clipId)
          .map((c) => {
            if (ripple && c.timelineStart >= gapStart + gapDuration - 0.001) {
              return {
                ...c,
                timelineStart: Math.max(0, c.timelineStart - gapDuration),
              };
            }
            return c;
          }),
      };
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

  trimClip: (
    clipId: string,
    newStart: number,
    newEnd: number,
    recordHistory = true,
    ripple = true
  ) => {
    const { timeline, past } = get();
    if (newStart >= newEnd || newStart < 0) return;

    let targetClip: Clip | null = null;
    let targetTrackIndex = -1;
    let targetClipIndex = -1;

    for (let t = 0; t < timeline.tracks.length; t++) {
      const track = timeline.tracks[t];
      if (!track) continue;
      const cIndex = track.clips.findIndex((c) => c.id === clipId);
      if (cIndex !== -1) {
        targetClip = track.clips[cIndex] ?? null;
        targetTrackIndex = t;
        targetClipIndex = cIndex;
        break;
      }
    }

    if (!targetClip || targetTrackIndex === -1) return;

    const isLeftTrim = Math.abs(newStart - targetClip.sourceStart) > 0.0001;
    const newDuration = (newEnd - newStart) / targetClip.playbackRate;

    // Left trim: moves timelineStart forward by the trimmed duration, keeping the right edge fixed
    const deltaStart = (newStart - targetClip.sourceStart) / targetClip.playbackRate;
    const newTimelineStart = isLeftTrim
      ? targetClip.timelineStart + deltaStart
      : targetClip.timelineStart;

    const trimmedClip: Clip = {
      ...targetClip,
      sourceStart: newStart,
      sourceEnd: newEnd,
      timelineStart: Math.max(0, newTimelineStart),
      timelineDuration: newDuration,
    };

    const oldEnd = targetClip.timelineStart + targetClip.timelineDuration;
    const durationDelta = targetClip.timelineDuration - newDuration;

    // Check if this is an Intro Title Card at 0:00 (which shifts main video clips downstream)
    const isIntroTitleCard =
      (targetClip.titleCard !== undefined || targetClip.sourceId === 'overlay_title') &&
      targetClip.timelineStart <= 0.05;
    const introExpansionDelta = newDuration - targetClip.timelineDuration;

    const updatedTracks = timeline.tracks.map((track, tIdx) => {
      if (tIdx === targetTrackIndex) {
        const updatedClips = track.clips.map((c, cIdx) => {
          if (cIdx === targetClipIndex) return trimmedClip;
          if (ripple && c.timelineStart >= oldEnd - 0.001) {
            return {
              ...c,
              timelineStart: Math.max(0, c.timelineStart - durationDelta),
            };
          }
          return c;
        });
        return { ...track, clips: updatedClips };
      }

      // If an Intro title card at 0:00 was trimmed/expanded, shift downstream video clips
      if (isIntroTitleCard && track.type === 'video') {
        const shiftedClips = track.clips.map((c) => {
          if (c.timelineStart >= oldEnd - 0.2) {
            return {
              ...c,
              timelineStart: Math.max(0, Number((c.timelineStart + introExpansionDelta).toFixed(3))),
            };
          }
          return c;
        });
        return { ...track, clips: shiftedClips };
      }

      return track;
    });

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

  removeSourceSegment: (sourceStart: number, sourceEnd: number, ripple = true) => {
    const { timeline, past } = get();
    const updatedTracks = removeSourceSegmentFromTracks(timeline.tracks, sourceStart, sourceEnd, ripple);
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
      activeAspectRatio: ratio,
      future: [],
    });
  },

  addProjectAsset: (asset: ProjectAsset) => {
    const { projectAssets } = get();
    if (projectAssets.some((a) => a.id === asset.id)) return;
    set({ projectAssets: [asset, ...projectAssets] });
  },

  removeProjectAsset: (assetId: string) => {
    const { projectAssets } = get();
    set({ projectAssets: projectAssets.filter((a) => a.id !== assetId) });
  },

  addAssetToTimeline: (asset: ProjectAsset, trackId?: string) => {
    const { timeline, past, activeSource } = get();
    let targetTrackId = trackId;
    if (!targetTrackId) {
      if (asset.type === 'video') targetTrackId = 'track_video_main';
      else if (asset.type === 'audio') targetTrackId = 'track_audio_music';
      else targetTrackId = 'track_overlay';
    }

    const duration = asset.duration > 0 ? asset.duration : 5;
    const targetTrack = timeline.tracks.find((t) => t.id === targetTrackId);
    let startSec = 0;
    if (targetTrack && targetTrack.clips.length > 0) {
      const lastClip = targetTrack.clips[targetTrack.clips.length - 1];
      if (lastClip) {
        startSec = lastClip.timelineStart + lastClip.timelineDuration;
      }
    }

    const newClip: Clip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: asset.name,
      sourceId: asset.id,
      sourcePath: asset.path,
      sourceStart: 0,
      sourceEnd: duration,
      timelineStart: startSec,
      timelineDuration: duration,
      effects: [],
      playbackRate: 1,
      volume: 1,
    };

    const updatedTracks = timeline.tracks.map((track) => {
      if (track.id !== targetTrackId) return track;
      return { ...track, clips: [...track.clips, newClip] };
    });

    const newDuration = recalculateTimelineDuration(updatedTracks);
    const updatedTimeline: Timeline = {
      ...timeline,
      duration: newDuration,
      tracks: updatedTracks,
    };

    let nextActiveSource = activeSource;
    if (!nextActiveSource && asset.type === 'video') {
      nextActiveSource = {
        id: asset.id,
        name: asset.name,
        path: asset.path,
        size: asset.size || 0,
        duration: asset.duration,
        width: asset.width || 1920,
        height: asset.height || 1080,
        fps: 30,
        codec: 'h264',
        audioChannels: 2,
        audioSampleRate: 48000,
        mimeType: 'video/mp4',
      };
    }

    set({
      past: [...past, timeline],
      timeline: updatedTimeline,
      selectedClipId: newClip.id,
      activeSource: nextActiveSource,
      future: [],
    });
  },

  addTextOverlayClip: (config: TextOverlayConfig, duration = 4) => {
    const { timeline, currentTime, past } = get();
    const newClip: Clip = {
      id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: config.text.slice(0, 24) || 'Text Overlay',
      sourceId: 'overlay_text',
      sourceStart: 0,
      sourceEnd: duration,
      timelineStart: currentTime,
      timelineDuration: duration,
      effects: [],
      playbackRate: 1,
      volume: 1,
      textOverlay: config,
    };

    const updatedTracks = timeline.tracks.map((track) => {
      if (track.id !== 'track_overlay') return track;
      return { ...track, clips: [...track.clips, newClip] };
    });

    const updatedTimeline: Timeline = {
      ...timeline,
      duration: recalculateTimelineDuration(updatedTracks),
      tracks: updatedTracks,
    };

    set({
      past: [...past, timeline],
      timeline: updatedTimeline,
      selectedClipId: newClip.id,
      future: [],
    });
  },

  addTitleCardClip: (config: TitleCardConfig, duration = 3.5) => {
    const { timeline, currentTime, past } = get();
    const newClip: Clip = {
      id: `title_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: config.title.slice(0, 24) || 'Title Card',
      sourceId: 'overlay_title',
      sourceStart: 0,
      sourceEnd: duration,
      timelineStart: currentTime,
      timelineDuration: duration,
      effects: [],
      playbackRate: 1,
      volume: 1,
      titleCard: config,
    };

    const updatedTracks = timeline.tracks.map((track) => {
      if (track.id !== 'track_overlay') return track;
      return { ...track, clips: [...track.clips, newClip] };
    });

    const updatedTimeline: Timeline = {
      ...timeline,
      duration: recalculateTimelineDuration(updatedTracks),
      tracks: updatedTracks,
    };

    set({
      past: [...past, timeline],
      timeline: updatedTimeline,
      selectedClipId: newClip.id,
      future: [],
    });
  },

  insertTitleCardAtStart: (config: TitleCardConfig, duration = 3.5) => {
    const { timeline, past } = get();
    // Shift ALL existing clips on all tracks right by duration seconds
    const shiftedTracks = timeline.tracks.map((track) => {
      const shiftedClips = track.clips.map((c) => ({
        ...c,
        timelineStart: c.timelineStart + duration,
      }));
      return { ...track, clips: shiftedClips };
    });

    const titleClip: Clip = {
      id: `title_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: config.title.slice(0, 24) || 'Title Card',
      sourceId: 'overlay_title',
      sourceStart: 0,
      sourceEnd: duration,
      timelineStart: 0,
      timelineDuration: duration,
      effects: [],
      playbackRate: 1,
      volume: 1,
      titleCard: config,
    };

    const finalTracks = shiftedTracks.map((track) => {
      if (track.id !== 'track_overlay') return track;
      return { ...track, clips: [titleClip, ...track.clips] };
    });

    const newDuration = recalculateTimelineDuration(finalTracks);
    set({
      past: [...past, timeline],
      timeline: {
        ...timeline,
        duration: newDuration,
        tracks: finalTracks,
      },
      selectedClipId: titleClip.id,
      currentTime: 0,
      future: [],
    });
  },

  appendTitleCardAtEnd: (config: TitleCardConfig, duration = 3.5) => {
    const { timeline, past } = get();
    const currentEnd = recalculateTimelineDuration(timeline.tracks);

    const titleClip: Clip = {
      id: `title_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: config.title.slice(0, 24) || 'Outro Title Card',
      sourceId: 'overlay_title',
      sourceStart: 0,
      sourceEnd: duration,
      timelineStart: currentEnd,
      timelineDuration: duration,
      effects: [],
      playbackRate: 1,
      volume: 1,
      titleCard: config,
    };

    const updatedTracks = timeline.tracks.map((track) => {
      if (track.id !== 'track_overlay') return track;
      return { ...track, clips: [...track.clips, titleClip] };
    });

    const newDuration = recalculateTimelineDuration(updatedTracks);
    set({
      past: [...past, timeline],
      timeline: {
        ...timeline,
        duration: newDuration,
        tracks: updatedTracks,
      },
      selectedClipId: titleClip.id,
      currentTime: currentEnd,
      future: [],
    });
  },

  moveClip: (clipId: string, newTimelineStart: number) => {
    const { timeline, past } = get();
    const clampedStart = Math.max(0, newTimelineStart);

    let updated = false;
    const updatedTracks = timeline.tracks.map((track) => {
      const updatedClips = track.clips.map((clip) => {
        if (clip.id !== clipId) return clip;
        updated = true;
        return {
          ...clip,
          timelineStart: clampedStart,
        };
      });
      return { ...track, clips: updatedClips };
    });

    if (!updated) return;

    const newDuration = recalculateTimelineDuration(updatedTracks);
    set({
      past: [...past, timeline],
      timeline: {
        ...timeline,
        duration: Math.max(newDuration, timeline.duration),
        tracks: updatedTracks,
      },
      future: [],
    });
  },

  reorderClips: (trackId: string, fromIndex: number, toIndex: number) => {
    const { timeline, past } = get();
    const targetTrack = timeline.tracks.find((t) => t.id === trackId);
    if (!targetTrack || fromIndex === toIndex) return;

    const reordered = reorderTrackClips(targetTrack.clips, fromIndex, toIndex);
    const updatedTracks = timeline.tracks.map((t) => {
      if (t.id !== trackId) return t;
      return { ...t, clips: reordered };
    });

    const updatedTimeline: Timeline = {
      ...timeline,
      duration: recalculateTimelineDuration(updatedTracks),
      tracks: updatedTracks,
    };

    set({
      past: [...past, timeline],
      timeline: updatedTimeline,
      future: [],
    });
  },

  updateClipProperties: (clipId: string, updates: Partial<Clip>) => {
    const { timeline, past } = get();
    let found = false;
    let isIntroTitleCard = false;
    let durationDelta = 0;
    let oldTitleEnd = 0;
    let speedChangedClipId: string | null = null;
    let speedDelta = 0;
    let oldClipEnd = 0;
    let targetTrackId: string | null = null;

    for (const track of timeline.tracks) {
      const foundClip = track.clips.find((c) => c.id === clipId);
      if (foundClip) {
        if (
          (foundClip.titleCard !== undefined || foundClip.sourceId === 'overlay_title') &&
          foundClip.timelineStart <= 0.05 &&
          updates.timelineDuration !== undefined &&
          updates.timelineDuration !== foundClip.timelineDuration
        ) {
          isIntroTitleCard = true;
          oldTitleEnd = foundClip.timelineStart + foundClip.timelineDuration;
          durationDelta = updates.timelineDuration - foundClip.timelineDuration;
        }

        if (
          updates.playbackRate !== undefined &&
          updates.playbackRate > 0 &&
          updates.playbackRate !== foundClip.playbackRate
        ) {
          const newDur = (foundClip.sourceEnd - foundClip.sourceStart) / updates.playbackRate;
          speedChangedClipId = clipId;
          speedDelta = newDur - foundClip.timelineDuration;
          oldClipEnd = foundClip.timelineStart + foundClip.timelineDuration;
          targetTrackId = track.id;
        }
        break;
      }
    }

    const updatedTracks = timeline.tracks.map((track) => {
      const updatedClips = track.clips.map((clip) => {
        if (clip.id === clipId) {
          found = true;
          let calculatedDuration = updates.timelineDuration ?? clip.timelineDuration;
          if (updates.playbackRate !== undefined && updates.playbackRate > 0) {
            calculatedDuration = (clip.sourceEnd - clip.sourceStart) / updates.playbackRate;
          }

          return {
            ...clip,
            ...updates,
            timelineDuration: calculatedDuration,
            transform: updates.transform
              ? { ...(clip.transform || { scale: 1, positionX: 0, positionY: 0, opacity: 1 }), ...updates.transform }
              : clip.transform,
            textOverlay: updates.textOverlay
              ? ({ ...(clip.textOverlay || {}), ...updates.textOverlay } as TextOverlayConfig)
              : clip.textOverlay,
            titleCard: updates.titleCard
              ? ({ ...(clip.titleCard || {}), ...updates.titleCard } as TitleCardConfig)
              : clip.titleCard,
            audioDucking: updates.audioDucking
              ? { ...(clip.audioDucking || { enabled: true, duckingDb: -14 }), ...updates.audioDucking }
              : clip.audioDucking,
            transitions: updates.transitions
              ? { ...(clip.transitions || {}), ...updates.transitions }
              : clip.transitions,
            audioFade: updates.audioFade
              ? { ...(clip.audioFade || {}), ...updates.audioFade }
              : clip.audioFade,
          };
        }

        // If an Intro title card at 0:00 changed duration, shift downstream video clips
        if (isIntroTitleCard && track.type === 'video' && clip.timelineStart >= oldTitleEnd - 0.2) {
          return {
            ...clip,
            timelineStart: Math.max(0, Number((clip.timelineStart + durationDelta).toFixed(3))),
          };
        }

        // If a clip's playback speed changed, shift downstream clips on the same track so they don't overlap or leave artificial gaps!
        if (speedChangedClipId && track.id === targetTrackId && clip.timelineStart >= oldClipEnd - 0.1) {
          return {
            ...clip,
            timelineStart: Math.max(0, Number((clip.timelineStart + speedDelta).toFixed(3))),
          };
        }

        return clip;
      });
      return { ...track, clips: updatedClips };
    });

    if (!found) return;

    const newDuration = recalculateTimelineDuration(updatedTracks);
    set({
      past: [...past, timeline],
      timeline: {
        ...timeline,
        duration: Math.max(newDuration, timeline.duration),
        tracks: updatedTracks,
      },
      future: [],
    });
  },

  setActiveFilter: (filterName: string) => {
    const { selectedClipId, updateClipProperties } = get();
    set({ activeFilter: filterName });
    if (selectedClipId) {
      updateClipProperties(selectedClipId, { colorFilter: filterName });
    }
  },

  applyEditOperation: (op: EditOperation) => {
    const { removeSourceSegment, trimClip, setAspectRatio, timeline } = get();
    if (op.type === 'removeSegment' && op.sourceRange) {
      removeSourceSegment(op.sourceRange.start, op.sourceRange.end, true);
    } else if (op.type === 'trimClip' && op.sourceRange) {
      let targetId = op.target.clipId;
      const exists = timeline.tracks.some((t) => t.clips.some((c) => c.id === targetId));
      if (!exists) {
        for (const track of timeline.tracks) {
          const found = track.clips.find(
            (c) =>
              (op.sourceRange!.start >= c.sourceStart && op.sourceRange!.start < c.sourceEnd) ||
              (op.sourceRange!.end > c.sourceStart && op.sourceRange!.end <= c.sourceEnd)
          );
          if (found) {
            targetId = found.id;
            break;
          }
        }
      }
      trimClip(targetId, op.sourceRange.start, op.sourceRange.end, true);
    } else if (op.type === 'setAspectRatio') {
      const ratio = (op.params.aspectRatio as '16:9' | '9:16' | '1:1') || '9:16';
      setAspectRatio(ratio);
    }

    set({
      history: [...get().history, { ...op, status: 'accepted' }],
    });
  },

  recordHistoryOperation: (op: EditOperation) => {
    set({
      history: [...get().history, op],
    });
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
