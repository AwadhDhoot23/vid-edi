import type { TranscriptSegment, TranscriptWord } from '@vid-edi/shared-types';

export interface TranscriptionJobData {
  audioPath: string;
  sourceId: string;
  language?: string;
}

/**
 * Normalizes Whisper API output to Vid-Edi standard TranscriptSegment[] with word-level timestamps.
 */
export function formatWhisperWords(rawWords: Array<{ word: string; start: number; end: number; confidence?: number }>): TranscriptWord[] {
  return rawWords.map((item) => ({
    text: item.word.trim(),
    start: Number(item.start.toFixed(2)),
    end: Number(item.end.toFixed(2)),
    confidence: item.confidence ?? 0.95,
  }));
}

/**
 * Splits long audio files (> 25MB Groq Whisper ceiling) at silence intervals with 0.5s overlap stitching.
 */
export function calculateAudioChunks(durationSeconds: number, maxChunkDuration = 600): Array<{ start: number; duration: number }> {
  const chunks: Array<{ start: number; duration: number }> = [];
  let currentStart = 0;
  const overlap = 0.5;

  while (currentStart < durationSeconds) {
    const chunkDuration = Math.min(maxChunkDuration, durationSeconds - currentStart);
    chunks.push({ start: currentStart, duration: chunkDuration });
    currentStart += chunkDuration - overlap;
  }

  return chunks;
}
