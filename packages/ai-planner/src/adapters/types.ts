import type { EditOperation, EditPlanRequest, TranscriptSegment } from '@vid-edi/shared-types';

export interface TranscriptAnalysis {
  summary: string;
  keyMoments: Array<{
    start: number;
    end: number;
    title: string;
    score: number;
  }>;
}

export interface ScriptContext {
  prompt: string;
  transcript: string;
  tone?: string;
}

export interface AIProviderAdapter {
  name: string;
  /** Propose edit operations from transcript & instruction */
  generateEditPlan(input: EditPlanRequest): Promise<EditOperation[]>;
  /** Analyze transcript for highlights and viral scoring */
  analyzeTranscript(transcript: TranscriptSegment[]): Promise<TranscriptAnalysis>;
  /** Draft intro / outro script context */
  generateScript(context: ScriptContext): Promise<string>;
  /** Check if provider credentials and network are healthy */
  healthCheck(): Promise<boolean>;
}
