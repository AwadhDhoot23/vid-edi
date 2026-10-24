import { describe, it, expect } from 'vitest';
import {
  formatTimecodeSrt,
  formatTimecodeVtt,
  wordsToSegments,
  generateSrt,
  generateVtt,
} from '../subtitles';
import type { TranscriptWord } from '@vid-edi/shared-types';

describe('Subtitle Generators and Word Segmentation', () => {
  it('formats seconds into correct SRT and WebVTT timecode specifications', () => {
    expect(formatTimecodeSrt(0)).toBe('00:00:00,000');
    expect(formatTimecodeSrt(65.432)).toBe('00:01:05,432');
    expect(formatTimecodeVtt(65.432)).toBe('00:01:05.432');
    expect(formatTimecodeSrt(3661.05)).toBe('01:01:01,050');
  });

  it('groups word-level transcript items into multi-word segments based on sentence boundaries', () => {
    const mockWords: TranscriptWord[] = [
      { text: 'Hello', start: 0.1, end: 0.4, confidence: 0.99 },
      { text: 'world.', start: 0.5, end: 0.8, confidence: 0.98 },
      { text: 'This', start: 1.0, end: 1.2, confidence: 0.95 },
      { text: 'is', start: 1.3, end: 1.4, confidence: 0.96 },
      { text: 'Vid-Edi.', start: 1.5, end: 1.9, confidence: 0.97 },
    ];

    const segments = wordsToSegments(mockWords, 5);
    expect(segments.length).toBe(2);
    expect(segments[0]?.text).toBe('Hello world.');
    expect(segments[0]?.start).toBe(0.1);
    expect(segments[0]?.end).toBe(0.8);
    expect(segments[1]?.text).toBe('This is Vid-Edi.');
    expect(segments[1]?.start).toBe(1.0);
    expect(segments[1]?.end).toBe(1.9);
  });

  it('generates standard SRT formatted output with indices and timestamps', () => {
    const segments = [
      {
        id: 'seg_1',
        text: 'Welcome back to the channel.',
        start: 0.5,
        end: 2.1,
        words: [],
      },
      {
        id: 'seg_2',
        text: 'AI video editing made simple.',
        start: 2.5,
        end: 4.8,
        words: [],
      },
    ];

    const srt = generateSrt(segments);
    expect(srt).toContain('1\n00:00:00,500 --> 00:00:02,100\nWelcome back to the channel.\n');
    expect(srt).toContain('2\n00:00:02,500 --> 00:00:04,800\nAI video editing made simple.\n');
  });

  it('generates WebVTT formatted output with header', () => {
    const segments = [
      {
        id: 'seg_1',
        text: 'First segment',
        start: 1.0,
        end: 2.0,
        words: [],
      },
    ];

    const vtt = generateVtt(segments);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('1\n00:00:01.000 --> 00:00:02.000\nFirst segment\n');
  });
});
