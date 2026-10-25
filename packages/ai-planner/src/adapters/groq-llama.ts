import type { EditOperation, EditPlanRequest, TranscriptSegment } from '@vid-edi/shared-types';
import type { AIProviderAdapter, TranscriptAnalysis, ScriptContext } from './types';
import { validateEditPlan } from '../validator';

export interface GroqLlamaOptions {
  apiKey?: string;
  model?: string;
}

export class GroqLlamaAdapter implements AIProviderAdapter {
  name = 'Groq Llama 3';
  private apiKey: string;
  private model: string;

  constructor(options?: GroqLlamaOptions) {
    const globalProcess = typeof globalThis !== 'undefined' ? (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process : undefined;
    this.apiKey = options?.apiKey || globalProcess?.env?.GROQ_API_KEY || '';
    this.model = options?.model || 'openai/gpt-oss-120b';
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateEditPlan(input: EditPlanRequest): Promise<EditOperation[]> {
    if (!this.apiKey) {
      throw new Error('Groq API key not provided.');
    }

    const transcriptExcerpt = input.transcript.words
      .map((w) => `[${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s] ${w.text}`)
      .join(' ');

    const systemPrompt = `You are an expert AI video editor and assistant.
You analyze natural-language instructions from the creator along with the word-level transcript of the media.
You must output a JSON object with a single key "operations" containing an array of EditOperation objects.
Allowed operation types:
- "removeSegment": to cut out dead air, filler words, or unwanted sections. Needs sourceRange: { start: number, end: number }.
- "trimClip": to trim the head or tail of a clip. Needs sourceRange: { start: number, end: number }.
- "splitClip": to split a clip at a timestamp.
- "setAspectRatio": params: { aspectRatio: "16:9" | "9:16" | "1:1" }
- "setPlaybackRate": params: { playbackRate: number }
- "addCaption": params: { preset: string, highlightWord: boolean }

Requirements:
- Target clipId should default to "clip_main", trackId to "track_video_main" (or "timeline" for setAspectRatio, "track_captions" for addCaption).
- Each operation must have a unique "id" (e.g. "op_cut_1"), confidence (0.0 to 1.0), status "proposed", and a clear human-readable "reason".
- Never propose cuts outside 0 to ${input.transcript.totalDuration}s.
- Never propose overlapping ranges on the same clip.
Return ONLY valid JSON matching:
{
  "operations": [
    {
      "id": "op_1",
      "type": "removeSegment",
      "target": { "clipId": "clip_main", "trackId": "track_video_main" },
      "sourceRange": { "start": 1.2, "end": 3.5 },
      "params": {},
      "reason": "Cut 2.3s awkward silence and false start",
      "confidence": 0.95,
      "status": "proposed"
    }
  ]
}`;

    const userPrompt = `Media Total Duration: ${input.transcript.totalDuration.toFixed(2)} seconds.
Instruction: "${input.instruction}"

Word-level transcript excerpt:
${transcriptExcerpt.slice(0, 8000)}`;

    const candidateModels = [this.model, 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
    let lastError: Error | null = null;
    let data: any = null;

    for (const m of candidateModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: m,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Groq API error with model ${m} (${response.status}): ${errText}`);
        }

        data = await response.json();
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!data) {
      throw lastError || new Error('No candidate models succeeded on Groq.');
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response content returned from Groq.');
    }

    const parsed = JSON.parse(content);
    const rawOpsList = Array.isArray(parsed)
      ? parsed
      : (parsed.operations || parsed.edits || parsed.plan || []);

    const sanitizedOps = rawOpsList.map((op: any, i: number) => {
      let target = op.target;
      if (!target || typeof target !== 'object') {
        target = { clipId: 'clip_main', trackId: 'track_video_main' };
      }
      return {
        id: op.id || `op_${Date.now()}_${i}`,
        type: op.type || 'removeSegment',
        target: {
          clipId: target.clipId || 'clip_main',
          trackId: target.trackId || (op.type === 'setAspectRatio' ? 'timeline' : 'track_video_main'),
        },
        sourceRange: op.sourceRange ? {
          start: Number(op.sourceRange.start),
          end: Number(op.sourceRange.end),
        } : undefined,
        params: typeof op.params === 'object' && op.params !== null ? op.params : {},
        reason: op.reason || 'AI optimized video edit proposal.',
        confidence: typeof op.confidence === 'number' ? op.confidence : 0.95,
        status: 'proposed' as const,
      };
    });

    const validation = validateEditPlan(sanitizedOps, input.transcript.totalDuration);
    if (!validation.success) {
      console.warn('Groq edit plan validation warnings:', validation.errors);
    }

    return (validation.success ? validation.data : sanitizedOps) as EditOperation[];
  }

  async analyzeTranscript(transcript: TranscriptSegment[]): Promise<TranscriptAnalysis> {
    const fullText = transcript.map((s) => s.text).join(' ');
    return {
      summary: fullText.slice(0, 100),
      keyMoments: [],
    };
  }

  async generateScript(context: ScriptContext): Promise<string> {
    if (!this.apiKey) throw new Error('Groq API key not provided.');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert video copywriter drafting compelling intros, hooks, and outros.',
          },
          {
            role: 'user',
            content: `Instruction: ${context.prompt}\nTone: ${context.tone || 'engaging'}\nContext:\n${context.transcript}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq script generation error (${response.status})`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
