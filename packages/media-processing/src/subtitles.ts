import type { TranscriptSegment, TranscriptWord } from '@vid-edi/shared-types';

/**
 * Formats seconds into SRT timestamp format: HH:MM:SS,mmm
 */
export function formatTimecodeSrt(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const totalMillis = Math.round(safeSec * 1000);
  const hrs = Math.floor(totalMillis / 3600000);
  const mins = Math.floor((totalMillis % 3600000) / 60000);
  const secs = Math.floor((totalMillis % 60000) / 1000);
  const millis = totalMillis % 1000;

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

/**
 * Formats seconds into WebVTT timestamp format: HH:MM:SS.mmm
 */
export function formatTimecodeVtt(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const totalMillis = Math.round(safeSec * 1000);
  const hrs = Math.floor(totalMillis / 3600000);
  const mins = Math.floor((totalMillis % 3600000) / 60000);
  const secs = Math.floor((totalMillis % 60000) / 1000);
  const millis = totalMillis % 1000;

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(millis, 3)}`;
}

/**
 * Groups raw word-level transcript items into readable multi-word caption segments.
 */
export function wordsToSegments(
  words: TranscriptWord[],
  maxWordsPerSegment = 5
): TranscriptSegment[] {
  if (!words || words.length === 0) return [];

  const segments: TranscriptSegment[] = [];
  let currentWords: TranscriptWord[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    currentWords.push(word);

    const isLastWord = i === words.length - 1;
    const isPunctuationEnd = /[.!?]$/.test(word.text);
    const reachedMax = currentWords.length >= maxWordsPerSegment;

    if (reachedMax || isPunctuationEnd || isLastWord) {
      const first = currentWords[0];
      const last = currentWords[currentWords.length - 1];

      if (first && last) {
        segments.push({
          id: `seg_${segments.length + 1}`,
          text: currentWords.map((w) => w.text).join(' '),
          start: first.start,
          end: last.end,
          words: [...currentWords],
        });
      }
      currentWords = [];
    }
  }

  return segments;
}

/**
 * Exports transcript segments into SubRip (.srt) subtitle string.
 */
export function generateSrt(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, idx) => {
      const index = idx + 1;
      const startTc = formatTimecodeSrt(seg.start);
      const endTc = formatTimecodeSrt(seg.end);
      return `${index}\n${startTc} --> ${endTc}\n${seg.text}\n`;
    })
    .join('\n');
}

/**
 * Exports transcript segments into WebVTT (.vtt) subtitle string.
 */
export function generateVtt(segments: TranscriptSegment[]): string {
  const header = 'WEBVTT\n\n';
  const body = segments
    .map((seg, idx) => {
      const index = idx + 1;
      const startTc = formatTimecodeVtt(seg.start);
      const endTc = formatTimecodeVtt(seg.end);
      return `${index}\n${startTc} --> ${endTc}\n${seg.text}\n`;
    })
    .join('\n');

  return header + body;
}

/**
 * Triggers a browser download of a generated text/subtitle blob.
 */
export function downloadTextBlob(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
