import { useRef, useState } from 'react';
import { Volume2, VolumeX, Lock, Unlock, Scissors, Trash2 } from 'lucide-react';
import { useTimelineStore } from '@vid-edi/editor-engine';
import { Button, formatSecondsToTimecode } from '@vid-edi/ui';
import type { Track } from '@vid-edi/shared-types';

export function TimelineView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1x to 4x zoom
  const {
    timeline,
    currentTime,
    setCurrentTime,
    selectedClipId,
    setSelectedClipId,
    splitSelectedClip,
    removeClip,
  } = useTimelineStore();

  const totalDuration = Math.max(timeline.duration, 10);
  const basePixelsPerSecond = 20 * zoomLevel;
  const timelinePixelWidth = totalDuration * basePixelsPerSecond;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedSeconds = clickX / basePixelsPerSecond;
    setCurrentTime(Math.max(0, Math.min(clickedSeconds, totalDuration)));
  };

  const getTrackColorClasses = (type: Track['type']) => {
    switch (type) {
      case 'video':
        return 'bg-[var(--clip-video)] border-[var(--clip-video-border)] text-sky-950 dark:text-sky-100';
      case 'audio':
        return 'bg-[var(--clip-audio)] border-[var(--clip-audio-border)] text-blue-950 dark:text-blue-100';
      case 'caption':
        return 'bg-[var(--clip-caption)] border-[var(--clip-caption-border)] text-amber-950 dark:text-amber-100';
      case 'overlay':
        return 'bg-[var(--clip-broll)] border-[var(--clip-broll-border)] text-purple-950 dark:text-purple-100';
      default:
        return 'bg-neutral-200 border-neutral-300';
    }
  };

  // Generate ticks for time ruler
  const rulerTicks = [];
  const tickStep = zoomLevel > 2 ? 1 : zoomLevel > 1 ? 2 : 5; // seconds per major tick
  for (let s = 0; s <= totalDuration; s += tickStep) {
    rulerTicks.push(s);
  }

  return (
    <div className="h-68 bg-[var(--bg-timeline)] border-t border-[var(--border-subtle)] flex flex-col select-none overflow-hidden shrink-0">
      {/* Timeline Toolbar */}
      <div className="h-9 px-4 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
            Timeline Tracks
          </span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span className="text-[var(--text-secondary)] font-mono">
            {formatSecondsToTimecode(currentTime)} / {formatSecondsToTimecode(totalDuration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedClipId && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={splitSelectedClip}
                className="h-7 text-xs px-2 gap-1 text-[var(--text-primary)]"
                title="Split clip at playhead"
              >
                <Scissors className="w-3 h-3 text-[var(--accent-primary)]" />
                <span>Split</span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeClip(selectedClipId)}
                className="h-7 text-xs px-2 gap-1"
                title="Delete selected clip"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px]">
            <span>Zoom</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.25"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-18 accent-[var(--accent-primary)] cursor-pointer h-1.5 rounded-lg bg-[var(--border-strong)]"
            />
            <span className="w-6 text-right font-mono">{zoomLevel}x</span>
          </div>
        </div>
      </div>

      {/* Main Track Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers (Left sidebar) */}
        <div className="w-48 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col shrink-0 z-10 shadow-xs">
          {/* Header spacer aligned with ruler */}
          <div className="h-6 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]" />

          {/* Track Labels */}
          {timeline.tracks.map((track) => (
            <div
              key={track.id}
              className="h-10 px-3 border-b border-[var(--border-subtle)] flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]"
            >
              <span className="truncate pr-1">{track.name}</span>
              <div className="flex items-center gap-1 opacity-70 hover:opacity-100">
                <button
                  type="button"
                  className="p-1 hover:text-[var(--text-primary)]"
                  title="Mute track"
                >
                  {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  className="p-1 hover:text-[var(--text-primary)]"
                  title="Lock track"
                >
                  {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Track Canvas with Playhead */}
        <div
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[var(--bg-timeline)]"
          onClick={handleTimelineClick}
        >
          <div
            className="relative h-full"
            style={{ width: `${Math.max(timelinePixelWidth, 800)}px` }}
          >
            {/* Time Ruler (Ticks & Labels) */}
            <div className="h-6 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] relative">
              {rulerTicks.map((second) => (
                <div
                  key={second}
                  className="absolute top-0 bottom-0 border-l border-[var(--border-subtle)] flex items-end pb-0.5 pl-1"
                  style={{ left: `${second * basePixelsPerSecond}px` }}
                >
                  <span className="font-mono text-[9px] text-[var(--text-tertiary)] pointer-events-none select-none">
                    {formatSecondsToTimecode(second)}
                  </span>
                </div>
              ))}
            </div>

            {/* Playhead Marker & Needle */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none transition-transform duration-75"
              style={{
                left: `${currentTime * basePixelsPerSecond}px`,
                transform: 'translateX(-50%)',
              }}
            >
              {/* Playhead Handle */}
              <div className="w-3.5 h-3.5 bg-[var(--accent-primary)] rounded-xs rotate-45 mx-auto shadow-md" />
              {/* Playhead Vertical Line */}
              <div className="w-[1.5px] h-full bg-[var(--accent-primary)] mx-auto shadow-xs" />
            </div>

            {/* Tracks Content */}
            {timeline.tracks.map((track) => (
              <div
                key={track.id}
                className="h-10 border-b border-[var(--border-subtle)]/60 relative bg-black/[0.02] dark:bg-white/[0.02]"
              >
                {track.clips.map((clip) => {
                  const isSelected = selectedClipId === clip.id;
                  const clipLeft = clip.timelineStart * basePixelsPerSecond;
                  const clipWidth = clip.timelineDuration * basePixelsPerSecond;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                      }}
                      className={`absolute top-1 bottom-1 rounded-md border text-xs px-2 flex items-center justify-between cursor-pointer shadow-xs transition-all duration-100 ${getTrackColorClasses(
                        track.type
                      )} ${
                        isSelected
                          ? 'ring-2 ring-[var(--accent-primary)] shadow-md brightness-105 z-20'
                          : 'hover:brightness-95'
                      }`}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${Math.max(clipWidth, 12)}px`,
                      }}
                    >
                      <span className="font-medium truncate text-[11px] pointer-events-none">
                        {clip.id}
                      </span>
                      <span className="font-mono text-[9px] opacity-75 truncate pointer-events-none">
                        {clip.timelineDuration.toFixed(1)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
