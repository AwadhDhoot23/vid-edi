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

export interface ClipTransform {
  scale: number; // 0.5 to 2.0 (default 1.0)
  positionX: number; // offset in px or %
  positionY: number; // offset in px or %
  opacity: number; // 0 to 1 (default 1.0)
  rotation?: number; // degrees
}

export interface TextOverlayConfig {
  text: string;
  subtitle?: string;
  style: 'lower-third' | 'badge' | 'headline' | 'minimal';
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-center';
}

export interface TitleCardConfig {
  title: string;
  subtitle?: string;
  theme: 'onyx' | 'minimal' | 'gradient' | 'warm';
  backgroundColor: string;
  textColor: string;
}

export interface AudioDuckingConfig {
  enabled: boolean;
  duckingDb: number; // e.g. -14
  targetTrackId?: string; // e.g. 'track_audio_dialogue'
}

export interface ProjectAsset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  path: string;
  duration: number;
  width?: number;
  height?: number;
  size?: number;
  thumbnailUrl?: string;
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
  name?: string;
  colorFilter?: string; // 'none' | 'warm-vintage' | 'teal-orange' | 'noir-bw' | 'cyberpunk' | 'clean-pop' | 'kodak-35mm' | 'bleach-bypass' | 'cool-slate'
  transform?: ClipTransform;
  textOverlay?: TextOverlayConfig;
  titleCard?: TitleCardConfig;
  audioDucking?: AudioDuckingConfig;
  sourcePath?: string;
  transition?: Transition;
  transitions?: {
    in?: Transition;
    out?: Transition;
  };
}

export interface Effect {
  id: string;
  type: 'filter' | 'brightness' | 'contrast' | 'saturation' | 'grayscale' | 'blur' | 'fade';
  params: Record<string, unknown>;
}

export interface Transition {
  type: 'crossfade' | 'dipToBlack' | 'dipToWhite' | 'slideLeft' | 'zoomBlur' | 'fade';
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
