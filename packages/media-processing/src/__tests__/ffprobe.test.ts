import { describe, it, expect } from 'vitest';
import { parseFpsFraction, parseFFprobeOutput } from '../ffprobe';

describe('FFprobe Inspector Parser', () => {
  it('correctly parses standard and fractional FPS rates', () => {
    expect(parseFpsFraction('30000/1001')).toBe(29.97);
    expect(parseFpsFraction('24000/1001')).toBe(23.98);
    expect(parseFpsFraction('60/1')).toBe(60);
    expect(parseFpsFraction('30')).toBe(30);
    expect(parseFpsFraction(undefined)).toBe(30);
  });

  it('transforms complex FFprobe JSON into structured MediaSource', () => {
    const mockFFprobeJson = {
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 3840,
          height: 2160,
          r_frame_rate: '60000/1000',
          duration: '124.500000',
        },
        {
          codec_type: 'audio',
          codec_name: 'aac',
          channels: 2,
          sample_rate: '48000',
        },
      ],
      format: {
        filename: '/var/media/podcast_4k.mp4',
        duration: '124.500000',
        size: '524288000', // 500 MB
      },
    };

    const result = parseFFprobeOutput(mockFFprobeJson);

    expect(result.name).toBe('podcast_4k.mp4');
    expect(result.width).toBe(3840);
    expect(result.height).toBe(2160);
    expect(result.fps).toBe(60);
    expect(result.duration).toBe(124.5);
    expect(result.size).toBe(524288000);
    expect(result.codec).toBe('h264');
    expect(result.audioChannels).toBe(2);
    expect(result.audioSampleRate).toBe(48000);
  });
});
