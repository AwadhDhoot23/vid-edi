import { describe, it, expect } from 'vitest';
import { validateEditPlan } from '../validator';

describe('Edit Plan Validator', () => {
  it('accepts valid edit operations', () => {
    const validPlan = [
      {
        id: 'op_1',
        type: 'removeSegment',
        target: { clipId: 'clip_01', trackId: 'track_video_main' },
        sourceRange: { start: 10, end: 15 },
        params: { paddingMs: 150 },
        reason: 'Pause removed',
        confidence: 0.95,
        status: 'proposed',
      },
      {
        id: 'op_2',
        type: 'addCaption',
        target: { clipId: 'clip_01', trackId: 'track_captions' },
        params: { text: 'Hello world' },
        reason: 'Auto caption',
        confidence: 0.99,
        status: 'proposed',
      },
    ];

    const result = validateEditPlan(validPlan, 60);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(2);
    }
  });

  it('rejects disallowed operation types', () => {
    const invalidPlan = [
      {
        id: 'op_bad',
        type: 'executeArbitraryShellCommand',
        target: { clipId: 'clip_01', trackId: 'track_video_main' },
        params: {},
        status: 'proposed',
      },
    ];

    const result = validateEditPlan(invalidPlan, 60);
    expect(result.success).toBe(false);
  });

  it('rejects source range where start >= end', () => {
    const invertedPlan = [
      {
        id: 'op_inverted',
        type: 'removeSegment',
        target: { clipId: 'clip_01', trackId: 'track_video_main' },
        sourceRange: { start: 20, end: 10 },
        params: {},
        status: 'proposed',
      },
    ];

    const result = validateEditPlan(invertedPlan, 60);
    expect(result.success).toBe(false);
  });

  it('rejects operation exceeding media duration', () => {
    const overflowPlan = [
      {
        id: 'op_overflow',
        type: 'removeSegment',
        target: { clipId: 'clip_01', trackId: 'track_video_main' },
        sourceRange: { start: 50, end: 75 },
        params: {},
        status: 'proposed',
      },
    ];

    const result = validateEditPlan(overflowPlan, 60);
    expect(result.success).toBe(false);
  });

  it('detects overlapping edit operations on the same clip', () => {
    const overlappingPlan = [
      {
        id: 'op_a',
        type: 'removeSegment',
        target: { clipId: 'clip_01', trackId: 'track_video_main' },
        sourceRange: { start: 10, end: 20 },
        params: {},
        status: 'proposed',
      },
      {
        id: 'op_b',
        type: 'removeSegment',
        target: { clipId: 'clip_01', trackId: 'track_video_main' },
        sourceRange: { start: 15, end: 25 },
        params: {},
        status: 'proposed',
      },
    ];

    const result = validateEditPlan(overlappingPlan, 60);
    expect(result.success).toBe(false);
  });
});
