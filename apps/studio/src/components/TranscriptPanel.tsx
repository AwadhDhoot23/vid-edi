import { useState, useMemo } from 'react';
import { AlignLeft, Download, Search, Edit3, Check, Sparkles } from 'lucide-react';
import { useTimelineStore } from '@vid-edi/editor-engine';
import { Button, formatSecondsToTimecode } from '@vid-edi/ui';
import { wordsToSegments, generateSrt, generateVtt, downloadTextBlob } from '@vid-edi/media-processing';
import type { TranscriptWord } from '@vid-edi/shared-types';

const INITIAL_TRANSCRIPT: TranscriptWord[] = [
  { text: 'Welcome', start: 0.2, end: 0.6, confidence: 0.99 },
  { text: 'back', start: 0.7, end: 0.9, confidence: 0.98 },
  { text: 'to', start: 1.0, end: 1.1, confidence: 0.99 },
  { text: 'the', start: 1.2, end: 1.3, confidence: 0.99 },
  { text: 'channel.', start: 1.4, end: 1.9, confidence: 0.97 },
  { text: 'Today', start: 2.2, end: 2.6, confidence: 0.98 },
  { text: "we're", start: 2.7, end: 2.9, confidence: 0.96 },
  { text: 'diving', start: 3.0, end: 3.4, confidence: 0.98 },
  { text: 'deep', start: 3.5, end: 3.8, confidence: 0.97 },
  { text: 'into', start: 3.9, end: 4.1, confidence: 0.99 },
  { text: 'how', start: 4.2, end: 4.4, confidence: 0.99 },
  { text: 'open-source', start: 4.5, end: 5.1, confidence: 0.95 },
  { text: 'video', start: 5.2, end: 5.5, confidence: 0.98 },
  { text: 'editing', start: 5.6, end: 6.0, confidence: 0.97 },
  { text: 'can', start: 6.1, end: 6.3, confidence: 0.99 },
  { text: 'be', start: 6.4, end: 6.5, confidence: 0.99 },
  { text: 'revolutionized', start: 6.6, end: 7.4, confidence: 0.94 },
  { text: 'using', start: 7.5, end: 7.8, confidence: 0.98 },
  { text: 'transparent', start: 7.9, end: 8.5, confidence: 0.96 },
  { text: 'AI', start: 8.6, end: 8.8, confidence: 0.99 },
  { text: 'planners.', start: 8.9, end: 9.4, confidence: 0.98 },
  // Silence pause between 9.4s and 12.1s
  { text: 'So...', start: 12.1, end: 12.5, confidence: 0.92 },
  { text: 'first', start: 12.6, end: 13.0, confidence: 0.97 },
  { text: 'off,', start: 13.1, end: 13.5, confidence: 0.96 },
  // Pause between 13.5s and 16.9s
  { text: 'let', start: 16.9, end: 17.2, confidence: 0.99 },
  { text: 'us', start: 17.3, end: 17.5, confidence: 0.99 },
  { text: 'look', start: 17.6, end: 17.9, confidence: 0.98 },
  { text: 'at', start: 18.0, end: 18.2, confidence: 0.99 },
  { text: 'the', start: 18.3, end: 18.4, confidence: 0.99 },
  { text: 'timeline', start: 18.5, end: 19.1, confidence: 0.97 },
  { text: 'data', start: 19.2, end: 19.5, confidence: 0.98 },
  { text: 'model.', start: 19.6, end: 20.2, confidence: 0.97 },
];

export function TranscriptPanel() {
  const { currentTime, setCurrentTime, activeSource } = useTimelineStore();
  const [words, setWords] = useState<TranscriptWord[]>(INITIAL_TRANSCRIPT);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Segments for subtitle generation
  const segments = useMemo(() => wordsToSegments(words, 6), [words]);

  const handleStartEdit = (idx: number, currentText: string) => {
    setEditingIndex(idx);
    setEditingValue(currentText);
  };

  const handleSaveEdit = (idx: number) => {
    if (editingValue.trim() && idx < words.length) {
      setWords((prev) => {
        const next = [...prev];
        const existing = next[idx];
        if (existing) {
          next[idx] = { ...existing, text: editingValue.trim() };
        }
        return next;
      });
    }
    setEditingIndex(null);
  };

  const handleExportSrt = () => {
    const srtContent = generateSrt(segments);
    const filename = `${activeSource?.name.replace(/\.[^/.]+$/, '') || 'transcript'}.srt`;
    downloadTextBlob(srtContent, filename, 'text/plain;charset=utf-8');
  };

  const handleExportVtt = () => {
    const vttContent = generateVtt(segments);
    const filename = `${activeSource?.name.replace(/\.[^/.]+$/, '') || 'transcript'}.vtt`;
    downloadTextBlob(vttContent, filename, 'text/vtt;charset=utf-8');
  };

  return (
    <div className="w-80 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0 select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlignLeft className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-xs font-semibold text-[var(--text-primary)]">Sync Transcript</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-sm border border-[var(--border-subtle)]">
          <Sparkles className="w-3 h-3 text-[var(--accent-coral)]" />
          <span>Groq Whisper</span>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript words..."
            className="w-full text-xs pl-8 pr-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Transcript Words Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto leading-relaxed text-xs">
        {activeSource ? (
          <div className="flex flex-wrap gap-x-1.5 gap-y-2">
            {words.map((w, idx) => {
              const isActive = currentTime >= w.start && currentTime <= w.end;
              const isPast = currentTime > w.end;
              const matchesSearch =
                searchQuery && w.text.toLowerCase().includes(searchQuery.toLowerCase());

              if (editingIndex === idx) {
                return (
                  <span key={idx} className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(idx);
                        if (e.key === 'Escape') setEditingIndex(null);
                      }}
                      onBlur={() => handleSaveEdit(idx)}
                      autoFocus
                      className="w-20 text-xs px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--accent-primary)] rounded-xs text-[var(--text-primary)] focus:outline-hidden font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(idx)}
                      className="p-0.5 text-emerald-500 hover:text-emerald-600 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </span>
                );
              }

              return (
                <span
                  key={idx}
                  onClick={() => setCurrentTime(w.start)}
                  onDoubleClick={() => handleStartEdit(idx, w.text)}
                  className={`group relative cursor-pointer px-1.5 py-0.5 rounded-sm transition-all duration-100 ${
                    isActive
                      ? 'bg-[var(--accent-coral)] text-white font-semibold shadow-xs scale-105'
                      : matchesSearch
                      ? 'bg-amber-400/30 text-amber-950 dark:text-amber-200 ring-1 ring-amber-400 font-medium'
                      : isPast
                      ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                  title={`Seek to ${formatSecondsToTimecode(w.start)} (Double click to edit text)`}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-6 text-[var(--text-tertiary)] text-xs">
            Load media to display word-by-word synchronized speech transcript.
          </div>
        )}
      </div>

      {/* Subtitle Export Toolbar (Task 3.9) */}
      {activeSource && (
        <div className="p-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between text-xs">
          <div className="text-[11px] text-[var(--text-secondary)]">
            <span>{words.length} words</span>
            <span className="text-[var(--text-tertiary)] mx-1">•</span>
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">~145 wpm</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSrt}
              className="h-7 text-[11px] px-2 gap-1 text-[var(--text-primary)]"
              title="Download SubRip .SRT file"
            >
              <Download className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>.SRT</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportVtt}
              className="h-7 text-[11px] px-2 gap-1 text-[var(--text-primary)]"
              title="Download WebVTT .VTT file"
            >
              <Download className="w-3 h-3 text-[var(--accent-primary)]" />
              <span>.VTT</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
