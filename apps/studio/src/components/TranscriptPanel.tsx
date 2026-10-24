import { AlignLeft } from 'lucide-react';
import { useTimelineStore } from '@vid-edi/editor-engine';
import { formatSecondsToTimecode } from '@vid-edi/ui';

interface MockWord {
  text: string;
  start: number;
  end: number;
}

export function TranscriptPanel() {
  const { currentTime, setCurrentTime, activeSource } = useTimelineStore();

  // Representative transcript words for spoken video editing
  const sampleWords: MockWord[] = [
    { text: 'Welcome', start: 0.2, end: 0.6 },
    { text: 'back', start: 0.7, end: 0.9 },
    { text: 'to', start: 1.0, end: 1.1 },
    { text: 'the', start: 1.2, end: 1.3 },
    { text: 'channel.', start: 1.4, end: 1.9 },
    { text: 'Today', start: 2.2, end: 2.6 },
    { text: "we're", start: 2.7, end: 2.9 },
    { text: 'diving', start: 3.0, end: 3.4 },
    { text: 'deep', start: 3.5, end: 3.8 },
    { text: 'into', start: 3.9, end: 4.1 },
    { text: 'how', start: 4.2, end: 4.4 },
    { text: 'open-source', start: 4.5, end: 5.1 },
    { text: 'video', start: 5.2, end: 5.5 },
    { text: 'editing', start: 5.6, end: 6.0 },
    { text: 'can', start: 6.1, end: 6.3 },
    { text: 'be', start: 6.4, end: 6.5 },
    { text: 'revolutionized', start: 6.6, end: 7.4 },
    { text: 'using', start: 7.5, end: 7.8 },
    { text: 'transparent', start: 7.9, end: 8.5 },
    { text: 'AI', start: 8.6, end: 8.8 },
    { text: 'planners.', start: 8.9, end: 9.4 },
    // A pause segment
    { text: 'So...', start: 12.1, end: 12.5 },
    { text: 'first', start: 12.6, end: 13.0 },
    { text: 'off,', start: 13.1, end: 13.5 },
    { text: 'let', start: 16.9, end: 17.2 },
    { text: 'us', start: 17.3, end: 17.5 },
    { text: 'look', start: 17.6, end: 17.9 },
    { text: 'at', start: 18.0, end: 18.2 },
    { text: 'the', start: 18.3, end: 18.4 },
    { text: 'timeline', start: 18.5, end: 19.1 },
    { text: 'data', start: 19.2, end: 19.5 },
    { text: 'model.', start: 19.6, end: 20.2 },
  ];

  return (
    <div className="w-80 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
      {/* Panel Header */}
      <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlignLeft className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-xs font-semibold text-[var(--text-primary)]">Sync Transcript</h2>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">Groq Whisper</span>
      </div>

      {/* Transcript Text Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto leading-relaxed text-xs">
        {activeSource ? (
          <div className="flex flex-wrap gap-x-1.5 gap-y-2">
            {sampleWords.map((w, idx) => {
              const isActive = currentTime >= w.start && currentTime <= w.end;
              const isPast = currentTime > w.end;

              return (
                <span
                  key={idx}
                  onClick={() => setCurrentTime(w.start)}
                  className={`cursor-pointer px-1.5 py-0.5 rounded-sm transition-all duration-100 ${
                    isActive
                      ? 'bg-[var(--accent-coral)] text-white font-semibold shadow-xs scale-105'
                      : isPast
                      ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                  title={`Seek to ${formatSecondsToTimecode(w.start)}`}
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
    </div>
  );
}
