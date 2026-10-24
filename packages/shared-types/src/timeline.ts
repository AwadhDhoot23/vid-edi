import type { EditOperation } from './edit-plan';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sources: MediaSource[];
  timeline: Timeline;
  versions: Version[];
  history: EditOperation[];
  exportPresets: ExportPreset[];
  analytics: ProjectAnalytics;
}

export interface Timeline {
  duration: number; // total duration in seconds
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  tracks: Track[];
}

export type TrackType = 'video' | 'audio' | 'caption' | 'overlay';

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  volume: number; // 0 to 1
}

export interface Clip {
  id: string;
  sourceId: string;
  sourceStart: number;
  sourceEnd: number;
  timelineStart: number;
  timelineDuration: number;
  effects: Effect[];
  playbackRate: number;
  volume: number;
  transition?: Transition;
}

export interface Effect {
  id: string;
  type: 'filter' | 'brightness' | 'contrast' | 'saturation' | 'grayscale' | 'blur' | 'fade';
  params: Record<string, unknown>;
}

export interface Transition {
  type: 'crossfade' | 'dipToBlack' | 'fade';
  duration: number;
}

export interface Version {
  id: string;
  name: string;
  createdAt: string;
  timelineSnapshot: Timeline;
  description?: string;
}

export interface ExportPreset {
  id: string;
  name: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: { width: number; height: number };
  fps: number;
  burnCaptions: boolean;
  bitrate?: string;
}

export interface ProjectAnalytics {
  originalDuration: number;
  currentDuration: number;
  totalCuts: number;
  aiAcceptanceRate: number;
  estimatedRenderTimeMs?: number;
}
