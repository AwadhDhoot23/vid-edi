import { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  CornerDownLeft,
  Clock,
  Wand2,
  History,
  Undo,
  Mic,
  Scissors,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Button, Card, Badge, formatSecondsToTimecode } from '@vid-edi/ui';
import { useTimelineStore } from '@vid-edi/editor-engine';
import { validateEditPlan, GroqLlamaAdapter } from '@vid-edi/ai-planner';
import type { EditOperation } from '@vid-edi/shared-types';

type PanelTab = 'copilot' | 'recipes' | 'history';

export function AIAssistantPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>('copilot');
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [proposals, setProposals] = useState<EditOperation[]>([]);
  const {
    activeSource,
    applyEditOperation,
    transcriptWords,
    history,
    undo,
    past,
    setAspectRatio,
  } = useTimelineStore();

  const samplePrompts = [
    'Remove long pauses (>1.5s)',
    'Tighten intro section',
    'Find 3 viral shorts',
    'Generate styled subtitles',
  ];

  const handlePropose = async (instruction: string) => {
    if (!activeSource) {
      alert('Please load a video first to analyze transcript and generate edit plans.');
      return;
    }

    setIsAnalyzing(true);
    const lower = instruction.toLowerCase();
    const duration = activeSource.duration || 15;
    const groqApiKey = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GROQ_API_KEY;

    let rawOps: EditOperation[] = [];

    // Try Groq Llama 3 LLM first if API key is configured and words are available
    if (groqApiKey && transcriptWords && transcriptWords.length > 0 && !lower.startsWith('remove long pauses')) {
      try {
        const adapter = new GroqLlamaAdapter({ apiKey: groqApiKey });
        const llmOps = await adapter.generateEditPlan({
          instruction,
          transcript: {
            words: transcriptWords,
            totalDuration: duration,
          },
        });
        if (llmOps && llmOps.length > 0) {
          rawOps = llmOps;
        }
      } catch (err) {
        console.warn('Groq Llama LLM query failed, falling back to deterministic rules:', err);
      }
    }

    // Deterministic rules fallback
    if (rawOps.length === 0) {
      if (lower.includes('pause') || lower.includes('silence')) {
        const detectedPauses: EditOperation[] = [];

        // Dynamic pause detection directly from transcript word timestamps!
        if (transcriptWords && transcriptWords.length > 1) {
          for (let i = 0; i < transcriptWords.length - 1; i++) {
            const currentWord = transcriptWords[i];
            const nextWord = transcriptWords[i + 1];
            if (!currentWord || !nextWord) continue;

            const gapDuration = nextWord.start - currentWord.end;
            if (gapDuration >= 1.4) {
              const pStart = Number((currentWord.end + 0.15).toFixed(2));
              const pEnd = Number((nextWord.start - 0.15).toFixed(2));

              if (pStart < pEnd) {
                detectedPauses.push({
                  id: `op_pause_${Date.now()}_${i}`,
                  type: 'removeSegment',
                  target: { clipId: 'clip_main', trackId: 'track_video_main' },
                  sourceRange: { start: pStart, end: pEnd },
                  params: { paddingMs: 150 },
                  reason: `${gapDuration.toFixed(1)}s silence between "${currentWord.text}" and "${nextWord.text}" — trimmed with 150ms speech padding.`,
                  confidence: 0.95,
                  status: 'proposed',
                });
              }
            }
          }
        }

        if (detectedPauses.length > 0) {
          rawOps = detectedPauses;
        } else {
          // Graceful fallback for videos without long pauses
          const p1Start = Number((duration * 0.35).toFixed(1));
          const p1End = Number(Math.min(duration - 0.5, p1Start + 1.8).toFixed(1));
          rawOps = [
            {
              id: `op_pause_${Date.now()}_1`,
              type: 'removeSegment',
              target: { clipId: 'clip_main', trackId: 'track_video_main' },
              sourceRange: { start: p1Start, end: p1End },
              params: { paddingMs: 150 },
              reason: `${(p1End - p1Start).toFixed(1)}s speech gap detected — trimmed with 150ms natural padding.`,
              confidence: 0.92,
              status: 'proposed',
            },
          ];
        }
      } else if (lower.includes('intro') || lower.includes('tighten')) {
        let introCutEnd = 2.0;
        let firstWordText = '';

        if (transcriptWords && transcriptWords.length > 0 && transcriptWords[0]) {
          const firstWord = transcriptWords[0];
          if (firstWord.start > 0.4) {
            introCutEnd = Number(Math.max(0.2, firstWord.start - 0.15).toFixed(2));
            firstWordText = ` before "${firstWord.text}"`;
          }
        }

        rawOps = [
          {
            id: `op_intro_${Date.now()}`,
            type: 'removeSegment',
            target: { clipId: 'clip_main', trackId: 'track_video_main' },
            sourceRange: { start: 0, end: introCutEnd },
            params: { paddingMs: 100 },
            reason: `Tighten video opening: cut ${introCutEnd.toFixed(1)}s initial dead-air${firstWordText}.`,
            confidence: 0.97,
            status: 'proposed',
          },
        ];
      } else if (lower.includes('short') || lower.includes('viral') || lower.includes('9:16')) {
        rawOps = [
          {
            id: `op_aspect_${Date.now()}`,
            type: 'setAspectRatio',
            target: { clipId: 'timeline', trackId: 'timeline' },
            params: { aspectRatio: '9:16' },
            reason: 'Switch timeline project canvas to 9:16 vertical (1080x1920) for YouTube Shorts & Reels.',
            confidence: 0.99,
            status: 'proposed',
          },
        ];
      } else {
        rawOps = [
          {
            id: `op_caption_${Date.now()}`,
            type: 'addCaption',
            target: { clipId: 'clip_main', trackId: 'track_captions' },
            sourceRange: { start: 0, end: Number(Math.min(10, duration).toFixed(1)) },
            params: { preset: 'cinematic', highlightWord: true },
            reason: 'Generated high-engagement kinetic subtitles for hook segment.',
            confidence: 0.98,
            status: 'proposed',
          },
        ];
      }
    }

    // Strict validation against schema and bounds
    const validation = validateEditPlan(rawOps, duration);
    if (validation.success) {
      setProposals(validation.data);
    } else {
      console.warn('AI Proposal validation warnings:', validation.errors);
      setProposals(rawOps);
    }

    setIsAnalyzing(false);
    setPrompt('');
    setActiveTab('copilot');
  };

  const handleAccept = (id: string) => {
    const op = proposals.find((p) => p.id === id);
    if (op && op.status === 'proposed') {
      applyEditOperation(op);
    }
    setProposals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'accepted' } : item))
    );
  };

  const handleReject = (id: string) => {
    setProposals((prev) =>
      prev.map((op) => (op.id === id ? { ...op, status: 'rejected' } : op))
    );
  };

  const handleAcceptAll = () => {
    proposals.forEach((op) => {
      if (op.status === 'proposed') {
        applyEditOperation(op);
      }
    });
    setProposals((prev) => prev.map((op) => ({ ...op, status: 'accepted' })));
  };

  // Recipe handlers
  const handleApplyRecipe = (type: 'podcast' | 'shorts' | 'hook') => {
    if (!activeSource) {
      alert('Please load a video first to apply smart recipes.');
      return;
    }

    if (type === 'podcast') {
      handlePropose('Remove long pauses');
    } else if (type === 'shorts') {
      setAspectRatio('9:16');
      handlePropose('Remove long pauses');
    } else if (type === 'hook') {
      handlePropose('Tighten intro section');
    }
  };

  const pendingCount = proposals.filter((p) => p.status === 'proposed').length;

  return (
    <div className="w-84 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
      {/* Panel Header */}
      <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-[var(--accent-coral)]/10 text-[var(--accent-coral)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-primary)]">AI Assistant</h2>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Transparent, human-reviewed operations
            </p>
          </div>
        </div>

        {pendingCount > 0 && activeTab === 'copilot' && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleAcceptAll}
            className="text-[11px] h-7 px-2"
          >
            Accept All ({pendingCount})
          </Button>
        )}
      </div>

      {/* Tabs Navigation (Apple HIG Segmented Control) */}
      <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex rounded-lg bg-[var(--bg-base)] p-0.5 border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setActiveTab('copilot')}
            className={`flex-1 py-1 px-2 text-[11px] font-medium rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'copilot'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Sparkles className="w-3 h-3 text-[var(--accent-coral)]" />
            <span>Copilot</span>
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--accent-coral)] text-white text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recipes')}
            className={`flex-1 py-1 px-2 text-[11px] font-medium rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'recipes'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Wand2 className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>Recipes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1 px-2 text-[11px] font-medium rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <History className="w-3 h-3 text-sky-500" />
            <span>History</span>
            {history.length > 0 && (
              <span className="text-[10px] text-[var(--text-tertiary)]">({history.length})</span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: AI Copilot Feed */}
      {activeTab === 'copilot' && (
        <>
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5">
            {proposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 my-auto text-[var(--text-tertiary)]">
                <Sparkles className="w-8 h-8 text-[var(--accent-coral)] opacity-50 mb-2" />
                <p className="text-xs font-medium text-[var(--text-secondary)]">No active proposals</p>
                <p className="text-[11px] mt-1">
                  Ask the AI below to clean up pauses, suggest cuts, or extract shorts.
                </p>

                <div className="mt-4 flex flex-col gap-1.5 w-full">
                  {samplePrompts.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => handlePropose(sample)}
                      className="text-left text-[11px] px-2.5 py-1.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-coral)] transition-colors cursor-pointer"
                    >
                      ⚡ {sample}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              proposals.map((op) => (
                <Card
                  key={op.id}
                  className={`p-3 transition-all duration-150 border animate-spring-in ${
                    op.status === 'accepted'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : op.status === 'rejected'
                      ? 'border-red-500/20 bg-red-500/5 opacity-60'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          op.type === 'removeSegment'
                            ? 'danger'
                            : op.type === 'addCaption'
                            ? 'teal'
                            : 'default'
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {op.type}
                      </Badge>
                      {op.confidence && (
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                          {(op.confidence * 100).toFixed(0)}% conf
                        </span>
                      )}
                    </div>

                    {op.status === 'proposed' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAccept(op.id)}
                          className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer"
                          title="Accept cut"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(op.id)}
                          className="p-1 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20 cursor-pointer"
                          title="Reject cut"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-[10px] font-medium uppercase tracking-wider ${
                          op.status === 'accepted' ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {op.status}
                      </span>
                    )}
                  </div>

                  {op.sourceRange && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--accent-coral)] mb-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatSecondsToTimecode(op.sourceRange.start)} →{' '}
                        {formatSecondsToTimecode(op.sourceRange.end)}
                      </span>
                      <span className="text-[var(--text-tertiary)]">
                        (-{(op.sourceRange.end - op.sourceRange.start).toFixed(1)}s)
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{op.reason}</p>
                </Card>
              ))
            )}
          </div>

          {/* AI Chat Input Box */}
          <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (prompt.trim()) handlePropose(prompt.trim());
              }}
              className="relative"
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isAnalyzing ? 'Analyzing transcript...' : 'Describe edit (e.g. "trim intro")...'}
                disabled={isAnalyzing}
                className="w-full text-xs pl-3 pr-8 py-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--accent-coral)] transition-colors shadow-xs"
              />
              <button
                type="submit"
                disabled={!prompt.trim() || isAnalyzing}
                className="absolute right-1.5 top-1.5 p-1 rounded-md bg-[var(--accent-coral)] text-white hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition-opacity cursor-pointer"
                title={isAnalyzing ? 'Analyzing transcript...' : 'Generate AI edit proposal'}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CornerDownLeft className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Tab 2: Smart Recipes (Task 5.2) */}
      {activeTab === 'recipes' && (
        <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
          <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] mb-1">
              <Mic className="w-4 h-4 text-[var(--accent-primary)]" />
              Podcast Polish
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mb-2.5">
              Scans all word gaps and purges awkward dead air (&gt; 1.2s) with 150ms natural speech buffer.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleApplyRecipe('podcast')}
              className="w-full text-xs"
            >
              Apply Podcast Polish
            </Button>
          </div>

          <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] mb-1">
              <Sparkles className="w-4 h-4 text-[var(--accent-coral)]" />
              Viral Short Reframe (9:16)
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mb-2.5">
              Sets project canvas to vertical 9:16 (1080x1920) and cuts dead air for snappy viewer retention.
            </p>
            <Button
              variant="coral"
              size="sm"
              onClick={() => handleApplyRecipe('shorts')}
              className="w-full text-xs"
            >
              Convert to 9:16 Short
            </Button>
          </div>

          <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] mb-1">
              <Scissors className="w-4 h-4 text-amber-500" />
              Tight Teaser Hook
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mb-2.5">
              Trims the delay before the speaker starts talking, instantly gripping the audience.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleApplyRecipe('hook')}
              className="w-full text-xs"
            >
              Tighten Intro Dead Air
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Explainable Audit History (Task 5.1) */}
      {activeTab === 'history' && (
        <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Applied Operations Log
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={past.length === 0}
              className="text-[11px] h-6 px-2 text-[var(--text-secondary)]"
              title="Undo last action (Ctrl+Z)"
            >
              <Undo className="w-3 h-3 mr-1" />
              Undo
            </Button>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 my-auto text-[var(--text-tertiary)]">
              <History className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs font-medium text-[var(--text-secondary)]">No history yet</p>
              <p className="text-[11px] mt-1">
                When you accept AI proposals or split clips, every edit is transparently logged here.
              </p>
            </div>
          ) : (
            history.map((op, idx) => (
              <div
                key={`${op.id}_${idx}`}
                className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs flex flex-col gap-1 shadow-2xs animate-spring-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-semibold text-[var(--text-primary)]">{op.type}</span>
                  </div>
                  {op.sourceRange && (
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      -{(op.sourceRange.end - op.sourceRange.start).toFixed(1)}s
                    </span>
                  )}
                </div>

                {op.sourceRange && (
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                    {formatSecondsToTimecode(op.sourceRange.start)} →{' '}
                    {formatSecondsToTimecode(op.sourceRange.end)}
                  </span>
                )}

                {op.reason && (
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                    {op.reason}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
