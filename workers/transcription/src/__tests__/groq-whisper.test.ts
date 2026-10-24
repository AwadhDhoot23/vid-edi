import { describe, it, expect } from 'vitest';
import { formatWhisperWords, calculateAudioChunks } from '../groq-whisper';

describe('Groq Whisper Worker Utilities', () => {
  it('normalizes raw Whisper word objects to Vid-Edi standard TranscriptWord format', () => {
    const raw = [
      { word: '  hello  ', start: 0.1234, end: 0.5678, confidence: 0.99 },
      { word: 'world', start: 0.601, end: 1.109 },
    ];

    const formatted = formatWhisperWords(raw);
    expect(formatted).toEqual([
      { text: 'hello', start: 0.12, end: 0.57, confidence: 0.99 },
      { text: 'world', start: 0.6, end: 1.11, confidence: 0.95 },
    ]);
  });

  it('calculates audio chunks with 0.5s overlap when duration exceeds single chunk window', () => {
    const duration = 1500; // 25 mins
    const maxChunk = 600; // 10 mins

    const chunks = calculateAudioChunks(duration, maxChunk);
    expect(chunks.length).toBe(3);

    // First chunk
    expect(chunks[0]?.start).toBe(0);
    expect(chunks[0]?.duration).toBe(600);

    // Second chunk overlaps by 0.5s
    expect(chunks[1]?.start).toBe(599.5);
    expect(chunks[1]?.duration).toBe(600);

    // Third chunk covers remainder
    expect(chunks[2]?.start).toBe(1199);
    expect(chunks[2]?.duration).toBe(301);
  });
});
