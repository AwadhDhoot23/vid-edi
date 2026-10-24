/**
 * WebCodecs API capability detection and frame-accurate preview utilities.
 */

export interface WebCodecsCapabilities {
  supported: boolean;
  canDecodeH264: boolean;
  canDecodeVP9: boolean;
  canDecodeAV1: boolean;
}

/**
 * Checks if the current browser environment supports the native WebCodecs VideoDecoder API.
 */
export function isWebCodecsSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as { VideoDecoder?: unknown }).VideoDecoder === 'function';
}

/**
 * Tests codec hardware acceleration support via VideoDecoder.isConfigSupported.
 */
export async function checkWebCodecsSupport(): Promise<WebCodecsCapabilities> {
  if (!isWebCodecsSupported()) {
    return {
      supported: false,
      canDecodeH264: false,
      canDecodeVP9: false,
      canDecodeAV1: false,
    };
  }

  const VideoDecoderClass = (window as unknown as {
    VideoDecoder: { isConfigSupported: (config: { codec: string }) => Promise<{ supported: boolean }> };
  }).VideoDecoder;

  const [h264, vp9, av1] = await Promise.all([
    VideoDecoderClass.isConfigSupported({ codec: 'avc1.42E01E' }).then((r) => r.supported).catch(() => false),
    VideoDecoderClass.isConfigSupported({ codec: 'vp09.00.10.08' }).then((r) => r.supported).catch(() => false),
    VideoDecoderClass.isConfigSupported({ codec: 'av01.0.04M.08' }).then((r) => r.supported).catch(() => false),
  ]);

  return {
    supported: true,
    canDecodeH264: h264,
    canDecodeVP9: vp9,
    canDecodeAV1: av1,
  };
}
