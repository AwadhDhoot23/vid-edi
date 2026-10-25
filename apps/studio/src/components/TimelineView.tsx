import { useRef, useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Scissors,
  Trash2,
  Undo2,
  Redo2,
  Layers,
} from 'lucide-react';
import { useTimelineStore } from '@vid-edi/editor-engine';
import { Button, formatSecondsToTimecode } from '@vid-edi/ui';
import type { Track, Clip } from '@vid-edi/shared-types';

export function TimelineView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1x to 4x zoom
  const [draggedClipInfo, setDraggedClipInfo] = useState<{
    clipId: string;
    trackId: string;
    fromIndex: number;
    initialX: number;
    currentX: number;
  } | null>(null);

  const [insertionIndicator, setInsertionIndicator] = useState<{
    trackId: string;
    targetIndex: number;
    indicatorPx: number;
  } | null>(null);

  const {
    timeline,
    currentTime,
    setCurrentTime,
    selectedClipId,
    setSelectedClipId,
    splitSelectedClip,
    removeClip,
    trimClip,
    reorderClips,
    commitHistorySnapshot,
    activeSource,
    undo,
    redo,
    isPlaying,
    setIsPlaying,
    past,
    future,
  } = useTimelineStore();

  const totalDuration = Math.max(timeline.duration, 10);
  const basePixelsPerSecond = 20 * zoomLevel;
  const timelinePixelWidth = totalDuration * basePixelsPerSecond;

  // Keyboard shortcuts (Space = play/pause, Delete = delete clip, S = split, Ctrl/Cmd+Z = undo/redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const duration = timeline.duration || totalDuration;
        const newTime = Math.min(duration, currentTime + 5);
        setCurrentTime(newTime);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newTime = Math.max(0, currentTime - 5);
        setCurrentTime(newTime);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          removeClip(selectedClipId);
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (selectedClipId) {
          e.preventDefault();
          splitSelectedClip();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    selectedClipId,
    currentTime,
    timeline.duration,
    totalDuration,
    setIsPlaying,
    setCurrentTime,
    removeClip,
    splitSelectedClip,
    undo,
    redo,
  ]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedClipInfo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedSeconds = clickX / basePixelsPerSecond;
    setCurrentTime(Math.max(0, Math.min(clickedSeconds, totalDuration)));
  };

  const handleTrimStart = (
    e: React.MouseEvent,
    clip: Clip,
    type: 'start' | 'end'
  ) => {
    e.stopPropagation();
    const initialClientX = e.clientX;
    const initialSourceStart = clip.sourceStart;
    const initialSourceEnd = clip.sourceEnd;
    const preDragSnapshot = timeline;
    let hasMoved = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - initialClientX;
      if (Math.abs(deltaPx) < 2) return;
      hasMoved = true;
      const deltaSec = deltaPx / basePixelsPerSecond;

      if (type === 'start') {
        const newStart = Math.max(
          0,
          Math.min(initialSourceStart + deltaSec, initialSourceEnd - 0.5)
        );
        trimClip(clip.id, newStart, initialSourceEnd, false);
      } else {
        const maxSourceDuration = activeSource?.duration ?? Infinity;
        const newEnd = Math.max(
          initialSourceStart + 0.5,
          Math.min(maxSourceDuration, initialSourceEnd + deltaSec)
        );
        trimClip(clip.id, initialSourceStart, newEnd, false);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (hasMoved) {
        commitHistorySnapshot(preDragSnapshot);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Direct Pointer Clip Drag-to-Reorder on Video 1 (Task R13)
  const handleClipDragStart = (
    e: React.PointerEvent,
    track: Track,
    clip: Clip,
    fromIndex: number
  ) => {
    if (track.clips.length <= 1) return;
    e.stopPropagation();

    const initialX = e.clientX;
    let isReordering = false;

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - initialX;
      if (!isReordering && Math.abs(deltaX) > 6) {
        isReordering = true;
        setDraggedClipInfo({
          clipId: clip.id,
          trackId: track.id,
          fromIndex,
          initialX,
          currentX: moveEv.clientX,
        });
      }

      if (!isReordering) return;

      setDraggedClipInfo((prev) => (prev ? { ...prev, currentX: moveEv.clientX } : null));

      // Calculate candidate insertion target
      const trackClips = track.clips;
      const targetTimelineX =
        (moveEv.clientX - (containerRef.current?.getBoundingClientRect().left ?? 0) + (containerRef.current?.scrollLeft ?? 0));
      const targetSec = targetTimelineX / basePixelsPerSecond;

      let targetIndex = 0;
      let indicatorPx = 0;

      for (let i = 0; i < trackClips.length; i++) {
        const c = trackClips[i];
        if (!c) continue;
        const midpoint = c.timelineStart + c.timelineDuration / 2;
        if (targetSec > midpoint) {
          targetIndex = i + 1;
          indicatorPx = (c.timelineStart + c.timelineDuration) * basePixelsPerSecond;
        } else {
          indicatorPx = c.timelineStart * basePixelsPerSecond;
          break;
        }
      }

      setInsertionIndicator({
        trackId: track.id,
        targetIndex: Math.min(targetIndex, trackClips.length - 1),
        indicatorPx,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (isReordering && insertionIndicator) {
        if (fromIndex !== insertionIndicator.targetIndex) {
          reorderClips(track.id, fromIndex, insertionIndicator.targetIndex);
        }
      }

      setDraggedClipInfo(null);
      setInsertionIndicator(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
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
          {/* History Undo / Redo controls */}
          <div className="flex items-center gap-1 mr-2 border-r border-[var(--border-subtle)] pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={past.length === 0}
              className="h-7 w-7 p-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={future.length === 0}
              className="h-7 w-7 p-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {selectedClipId && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={splitSelectedClip}
                className="h-7 text-xs px-2.5 gap-1.5 text-[var(--text-primary)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] font-medium cursor-pointer"
                title="Split clip at playhead (S)"
              >
                <Scissors className="w-3 h-3 text-[var(--accent-primary)]" />
                <span>Split (S)</span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeClip(selectedClipId)}
                className="h-7 text-xs px-2.5 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-xs border border-rose-600 cursor-pointer"
                title="Delete selected clip (Delete)"
              >
                <Trash2 className="w-3 h-3 text-white" />
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
                  className="p-1 hover:text-[var(--text-primary)] cursor-pointer"
                  title="Mute track"
                >
                  {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  className="p-1 hover:text-[var(--text-primary)] cursor-pointer"
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

            {/* Visual Reorder Drop Insertion Guide Line (Task R13) */}
            {insertionIndicator && (
              <div
                className="absolute top-6 bottom-0 w-1 bg-emerald-400 z-40 pointer-events-none shadow-[0_0_8px_rgba(52,211,153,0.8)] flex flex-col justify-between items-center transition-all duration-75"
                style={{ left: `${insertionIndicator.indicatorPx}px`, transform: 'translateX(-50%)' }}
              >
                <div className="w-2.5 h-2.5 bg-emerald-400 rotate-45 -mt-1 shadow-xs" />
                <div className="w-2.5 h-2.5 bg-emerald-400 rotate-45 -mb-1 shadow-xs" />
              </div>
            )}

            {/* Tracks Content */}
            {timeline.tracks.map((track) => (
              <div
                key={track.id}
                className="h-10 border-b border-[var(--border-subtle)]/60 relative bg-black/[0.02] dark:bg-white/[0.02]"
              >
                {track.clips.map((clip, clipIdx) => {
                  const isSelected = selectedClipId === clip.id;
                  const isDragged = draggedClipInfo?.clipId === clip.id;
                  const clipLeft = clip.timelineStart * basePixelsPerSecond;
                  const clipWidth = clip.timelineDuration * basePixelsPerSecond;

                  // Label determination
                  let clipLabel = clip.name || clip.id;
                  if (clip.textOverlay) {
                    clipLabel = `📝 ${clip.textOverlay.text}`;
                  } else if (clip.titleCard) {
                    clipLabel = `🎬 ${clip.titleCard.title}`;
                  }

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                      }}
                      onPointerDown={(e) => handleClipDragStart(e, track, clip, clipIdx)}
                      className={`group absolute top-1 bottom-1 rounded-md border text-xs px-2 flex items-center justify-between cursor-grab active:cursor-grabbing shadow-xs transition-all duration-75 select-none ${getTrackColorClasses(
                        track.type
                      )} ${
                        isSelected
                          ? 'ring-2 ring-[var(--accent-primary)] shadow-md brightness-105 z-20'
                          : 'hover:brightness-95'
                      } ${isDragged ? 'opacity-40 scale-98 shadow-xl' : ''}`}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${Math.max(clipWidth, 16)}px`,
                      }}
                    >
                      {/* Left Trim Handle */}
                      {isSelected && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/40 hover:bg-[var(--accent-primary)] cursor-col-resize rounded-l-md flex items-center justify-center z-30 transition-colors"
                          title="Drag to trim start"
                          onMouseDown={(e) => handleTrimStart(e, clip, 'start')}
                        >
                          <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                        </div>
                      )}

                      {/* Transition Indicator Badge on left */}
                      {clip.transition && (
                        <span
                          className="px-1 py-0.2 rounded-xs bg-amber-400/30 text-amber-900 dark:text-amber-200 text-[8px] font-mono mr-1 shrink-0 flex items-center gap-0.5"
                          title={`Transition: ${clip.transition.type} (${clip.transition.duration}s)`}
                        >
                          <Layers className="w-2 h-2" />
                          <span>{clip.transition.type}</span>
                        </span>
                      )}

                      <span className="font-medium truncate text-[11px] pointer-events-none px-1">
                        {clipLabel}
                      </span>

                      {/* Audio Ducking Badge */}
                      {clip.audioDucking?.enabled && (
                        <span className="text-[8px] font-mono bg-blue-500/20 text-blue-900 dark:text-blue-200 px-1 py-0.2 rounded-xs mr-1 shrink-0">
                          -14dB Duck
                        </span>
                      )}

                      {/* Color Grade Badge */}
                      {clip.colorFilter && clip.colorFilter !== 'none' && (
                        <span className="text-[8px] font-mono bg-purple-500/20 text-purple-900 dark:text-purple-200 px-1 py-0.2 rounded-xs mr-1 shrink-0">
                          🎨 {clip.colorFilter}
                        </span>
                      )}

                      <span className="font-mono text-[9px] opacity-75 truncate pointer-events-none px-1">
                        {clip.timelineDuration.toFixed(1)}s
                      </span>

                      {/* Right Trim Handle */}
                      {isSelected && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2.5 bg-black/40 hover:bg-[var(--accent-primary)] cursor-col-resize rounded-r-md flex items-center justify-center z-30 transition-colors"
                          title="Drag to trim end"
                          onMouseDown={(e) => handleTrimStart(e, clip, 'end')}
                        >
                          <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                        </div>
                      )}
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
