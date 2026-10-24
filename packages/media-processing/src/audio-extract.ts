import type { TranscriptWord } from '@vid-edi/shared-types';

/**
 * Encodes an AudioBuffer into a 16-bit PCM WAV Blob (16kHz mono recommended for Whisper).
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1; // force mono for speech
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const numSamples = channelData.length;

  const dataLength = numSamples * 2; // 16-bit = 2 bytes per sample
  const bufferLength = 44 + dataLength; // 44-byte standard RIFF WAV header
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Extracts and downmixes the audio from any browser-supported video File into a 16kHz WAV Blob.
 */
export async function extractAudioWavBlob(file: File | Blob): Promise<Blob> {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  const audioCtx = new AudioContextClass({ sampleRate: 16000 });
  const arrayBuffer = await file.arrayBuffer();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  const wavBlob = audioBufferToWav(decoded);
  await audioCtx.close();
  return wavBlob;
}

/**
 * Calls the Groq Whisper API endpoint to transcribe audio with word-level timestamps.
 */
export async function transcribeWithGroqWhisper(
  audioBlob: Blob,
  apiKey: string
): Promise<TranscriptWord[]> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq Whisper API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    words?: Array<{ word: string; start: number; end: number }>;
    text?: string;
  };

  if (data.words && Array.isArray(data.words)) {
    return data.words.map((w) => ({
      text: w.word.trim(),
      start: Number(w.start.toFixed(2)),
      end: Number(w.end.toFixed(2)),
      confidence: 0.98,
    }));
  }

  // Fallback if words array not returned
  if (data.text) {
    const words = data.text.split(/\s+/).filter(Boolean);
    const avgDuration = 0.4;
    return words.map((w, idx) => ({
      text: w,
      start: Number((idx * avgDuration).toFixed(2)),
      end: Number(((idx + 1) * avgDuration).toFixed(2)),
      confidence: 0.95,
    }));
  }

  return [];
}
