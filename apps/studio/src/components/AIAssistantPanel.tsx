import { useState } from 'react';
import { Sparkles, Check, X, CornerDownLeft, Clock } from 'lucide-react';
import { Button, Card, Badge, formatSecondsToTimecode } from '@vid-edi/ui';
import { useTimelineStore } from '@vid-edi/editor-engine';
import type { EditOperation } from '@vid-edi/shared-types';

export function AIAssistantPanel() {
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [proposals, setProposals] = useState<EditOperation[]>([]);
  const { activeSource } = useTimelineStore();

  const samplePrompts = [
    'Remove long pauses (>1.5s)',
    'Tighten intro section',
    'Find 3 viral shorts',
    'Generate styled subtitles',
  ];

  const handlePropose = (_instruction: string) => {
    if (!activeSource) {
      alert('Please load a video first to analyze transcript and generate edit plans.');
      return;
    }

    setIsAnalyzing(true);
    // Simulate AI Edit Planner output following Section 7 of the Project Plan
    setTimeout(() => {
      const generatedProposals: EditOperation[] = [
        {
          id: `op_pause_${Date.now()}_1`,
          type: 'removeSegment',
          target: { clipId: 'clip_main', trackId: 'track_video_main' },
          sourceRange: { start: 14.2, end: 16.8 },
          params: { paddingMs: 150 },
          reason: '2.6s silence between sentences — trimmed with 150ms natural padding.',
          confidence: 0.94,
          status: 'proposed',
        },
        {
          id: `op_pause_${Date.now()}_2`,
          type: 'removeSegment',
          target: { clipId: 'clip_main', trackId: 'track_video_main' },
          sourceRange: { start: 32.5, end: 35.1 },
          params: { paddingMs: 150 },
          reason: '2.6s pause while glancing at notes — dead air removed.',
          confidence: 0.89,
          status: 'proposed',
        },
        {
          id: `op_caption_${Date.now()}_3`,
          type: 'addCaption',
          target: { clipId: 'clip_main', trackId: 'track_captions' },
          sourceRange: { start: 0, end: 12.5 },
          params: { preset: 'cinematic', highlightWord: true },
          reason: 'Generated high-engagement kinetic subtitles for hook segment.',
          confidence: 0.98,
          status: 'proposed',
        },
      ];

      setProposals(generatedProposals);
      setIsAnalyzing(false);
      setPrompt('');
    }, 900);
  };

  const handleAccept = (id: string) => {
    setProposals((prev) =>
      prev.map((op) => (op.id === id ? { ...op, status: 'accepted' } : op))
    );
  };

  const handleReject = (id: string) => {
    setProposals((prev) =>
      prev.map((op) => (op.id === id ? { ...op, status: 'rejected' } : op))
    );
  };

  const handleAcceptAll = () => {
    setProposals((prev) => prev.map((op) => ({ ...op, status: 'accepted' })));
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
            <h2 className="text-xs font-semibold text-[var(--text-primary)]">AI Edit Planner</h2>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Transparent, human-reviewed proposals
            </p>
          </div>
        </div>

        {pendingCount > 0 && (
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

      {/* Operation Cards / Proposals Feed */}
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
                  className="text-left text-[11px] px-2.5 py-1.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-coral)] transition-colors"
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
              className={`p-3 transition-all duration-150 border ${
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
                      className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      title="Accept cut"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(op.id)}
                      className="p-1 rounded-md bg-red-500/10 text-red-600 hover:bg-red-500/20"
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
            className="absolute right-1.5 top-1.5 p-1 rounded-md bg-[var(--accent-coral)] text-white hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition-opacity"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
