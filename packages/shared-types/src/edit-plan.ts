/**
 * A single atomic edit operation.
 * Guaranteed to be part of the allowlist.
 */
export interface EditOperation {
  id: string;
  type: EditOperationType;
  /** Source clip and track reference */
  target: {
    clipId: string;
    trackId: string;
  };
  /** Time range in source media (seconds) */
  sourceRange?: {
    start: number;
    end: number;
  };
  /** Operation-specific parameters */
  params: Record<string, unknown>;
  /** Why the AI suggested this (empty for manual edits) */
  reason?: string;
  /** Confidence score between 0.0 and 1.0 */
  confidence?: number;
  /** User decision */
  status: 'proposed' | 'accepted' | 'rejected' | 'modified';
}

export type EditOperationType =
  | 'splitClip'
  | 'trimClip'
  | 'removeSegment'
  | 'reorderClip'
  | 'addCaption'
  | 'removeCaption'
  | 'setAspectRatio'
  | 'setCropRegion'
  | 'adjustVolume'
  | 'muteSegment'
  | 'addFade'
  | 'addTransition'
  | 'setPlaybackRate'
  | 'addOverlay'
  | 'applyFilter'
  | 'mixAudio'
  | 'insertClip';

export const ALLOWED_OPERATION_TYPES: readonly EditOperationType[] = [
  'splitClip',
  'trimClip',
  'removeSegment',
  'reorderClip',
  'addCaption',
  'removeCaption',
  'setAspectRatio',
  'setCropRegion',
  'adjustVolume',
  'muteSegment',
  'addFade',
  'addTransition',
  'setPlaybackRate',
  'addOverlay',
  'applyFilter',
  'mixAudio',
  'insertClip',
] as const;

/**
 * Payload sent to AI Edit Planner (no video frames, text and timestamps only).
 */
export interface EditPlanRequest {
  /** The user's natural-language instruction */
  instruction: string;
  /** Word-level transcript with timestamps */
  transcript: {
    words: Array<{
      text: string;
      start: number;
      end: number;
      confidence: number;
    }>;
    totalDuration: number;
  };
  /** Detected silence gaps computed locally */
  silenceMap?: Array<{
    start: number;
    end: number;
    duration: number;
  }>;
  /** Current timeline clip metadata */
  timeline?: {
    tracks: Array<{
      id: string;
      type: string;
      clips: Array<{
        id: string;
        sourceStart: number;
        sourceEnd: number;
        timelineStart: number;
      }>;
    }>;
  };
  /** Allowlisted operation types */
  allowedOperations?: EditOperationType[];
}
