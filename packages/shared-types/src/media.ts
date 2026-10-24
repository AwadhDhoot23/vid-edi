export interface MediaSource {
  id: string;
  name: string;
  path: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  audioChannels: number;
  audioSampleRate: number;
  mimeType: string;
}

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  words: TranscriptWord[];
}

export interface SilenceGap {
  start: number;
  end: number;
  duration: number;
}

export interface SceneMarker {
  id: string;
  timestamp: number;
  score: number;
  thumbnailUrl?: string;
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  alignment: 'center' | 'left' | 'right';
  position: 'bottom' | 'top' | 'middle';
  presetName?: 'default' | 'cinematic' | 'bold-yellow' | 'minimal-pill' | 'highlight-box';
}
