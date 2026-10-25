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
  GripVertical,
  Magnet,
  MoveHorizontal,
  Zap,
} from 'lucide-react';
import { useTimelineStore } from '@vid-edi/editor-engine';
import { Button, formatSecondsToTimecode } from '@vid-edi/ui';
import type { Track, Clip } from '@vid-edi/shared-types';

export function TimelineView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1x to 4x zoom
  const [interactionMode, setInteractionMode] = useState<'reorder' | 'free'>('reorder');
  const [draggedClipInfo, setDraggedClipInfo] = useState<{
    clipId: string;
    trackId: string;
    fromIndex: number;
    initialX: number;
    currentX: number;
  } | null>(null);

  const [snapGuide, setSnapGuide] = useState<{
    timeSec: number;
    pixelX: number;
    label: string;
  } | null>(null);

  const [reorderGhost, setReorderGhost] = useState<{
    x: number;
    y: number;
    name: string;
    duration: number;
  } | null>(null);

  const [insertionIndicator, setInsertionIndicator] = useState<{
    trackId: string;
    targetIndex: number;
    indicatorPx: number;
    label?: string;
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
    moveClip,
    updateClipProperties,
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

  const REORDER_BLOCK_WIDTH = 130;
  const REORDER_BLOCK_GAP = 8;
  const REORDER_BLOCK_PITCH = REORDER_BLOCK_WIDTH + REORDER_BLOCK_GAP;
  const maxClipsInAnyTrack = Math.max(
    ...timeline.tracks.map((t) => t.clips.length),
    1
  );
  const reorderPixelWidth = maxClipsInAnyTrack * REORDER_BLOCK_PITCH + 100;
  const contentPixelWidth =
    interactionMode === 'reorder'
      ? Math.max(reorderPixelWidth, 800)
      : Math.max(timelinePixelWidth, 800);

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
          removeClip(selectedClipId, false);
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
    if (draggedClipInfo || interactionMode === 'reorder') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = e.currentTarget.scrollLeft || containerRef.current?.scrollLeft || 0;
    const clickX = e.clientX - rect.left + scrollLeft;
    const clickedSeconds = clickX / basePixelsPerSecond;
    setCurrentTime(Math.max(0, Math.min(clickedSeconds, totalDuration)));
  };

  const findSnapTarget = (
    targetSec: number,
    excludeClipId?: string,
    thresholdPx = 14
  ): { snappedSec: number; guideLabel: string } | null => {
    const thresholdSec = thresholdPx / basePixelsPerSecond;
    let closestDiff = Infinity;
    let bestSnap: { snappedSec: number; guideLabel: string } | null = null;

    // Check 0:00s
    if (Math.abs(targetSec) <= thresholdSec) {
      return { snappedSec: 0, guideLabel: 'Timeline Start (0:00.0s)' };
    }

    // Check playhead
    if (Math.abs(targetSec - currentTime) <= thresholdSec) {
      closestDiff = Math.abs(targetSec - currentTime);
      bestSnap = {
        snappedSec: currentTime,
        guideLabel: `Playhead (${formatSecondsToTimecode(currentTime)})`,
      };
    }

    // Check all clip boundaries across all tracks
    for (const tr of timeline.tracks) {
      for (const c of tr.clips) {
        if (c.id === excludeClipId) continue;
        const clipStart = c.timelineStart;
        const clipEnd = c.timelineStart + c.timelineDuration;
        const clipTitle = c.name ? (c.name.length > 12 ? c.name.slice(0, 10) + '…' : c.name) : 'Clip';

        // Check snap to clipStart
        const startDiff = Math.abs(targetSec - clipStart);
        if (startDiff <= thresholdSec && startDiff < closestDiff) {
          closestDiff = startDiff;
          bestSnap = {
            snappedSec: clipStart,
            guideLabel: `Snapped to ${clipTitle} Start (${clipStart.toFixed(1)}s)`,
          };
        }

        // Check snap to clipEnd
        const endDiff = Math.abs(targetSec - clipEnd);
        if (endDiff <= thresholdSec && endDiff < closestDiff) {
          closestDiff = endDiff;
          bestSnap = {
            snappedSec: clipEnd,
            guideLabel: `Snapped to ${clipTitle} End (${clipEnd.toFixed(1)}s)`,
          };
        }
      }
    }

    return bestSnap;
  };

  const handleTrimStart = (
    e: React.PointerEvent,
    clip: Clip,
    type: 'start' | 'end'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const initialClientX = e.clientX;
    const initialSourceStart = clip.sourceStart;
    const initialSourceEnd = clip.sourceEnd;
    const initialTimelineStart = clip.timelineStart;
    const initialTimelineDuration = clip.timelineDuration;
    const preDragSnapshot = timeline;
    let hasMoved = false;

    const isSyntheticClip =
      clip.titleCard !== undefined ||
      clip.textOverlay !== undefined ||
      clip.sourceId === 'overlay_title' ||
      clip.sourceId === 'text_overlay';

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientX - initialClientX;
      if (Math.abs(deltaPx) < 1) return;
      hasMoved = true;
      const deltaSec = deltaPx / basePixelsPerSecond;

      if (type === 'start') {
        const tentativeTlStart = Math.max(0, initialTimelineStart + deltaSec);
        const snap = findSnapTarget(tentativeTlStart, clip.id);

        if (isSyntheticClip) {
          // Synthetic clips (Title Cards, Text Overlays): expand or shrink freely from the left!
          const targetTlStart = snap ? snap.snappedSec : tentativeTlStart;
          const maxAllowedStart = initialTimelineStart + initialTimelineDuration - 0.3;
          const newTlStart = Math.max(0, Math.min(targetTlStart, maxAllowedStart));
          const newDuration = Number(
            (initialTimelineStart + initialTimelineDuration - newTlStart).toFixed(2)
          );

          if (snap) {
            setSnapGuide({
              timeSec: snap.snappedSec,
              pixelX: snap.snappedSec * basePixelsPerSecond,
              label: snap.guideLabel,
            });
          } else {
            setSnapGuide(null);
          }

          updateClipProperties(clip.id, {
            timelineStart: Number(newTlStart.toFixed(2)),
            timelineDuration: newDuration,
            sourceStart: 0,
            sourceEnd: newDuration,
          });
          return;
        }

        let newStart: number;
        const maxStart = initialSourceEnd - 0.3;

        if (snap) {
          const snappedDelta = snap.snappedSec - initialTimelineStart;
          newStart = Math.max(
            0,
            Math.min(initialSourceStart + snappedDelta * clip.playbackRate, maxStart)
          );
          setSnapGuide({
            timeSec: snap.snappedSec,
            pixelX: snap.snappedSec * basePixelsPerSecond,
            label: snap.guideLabel,
          });
        } else {
          newStart = Math.max(
            0,
            Math.min(initialSourceStart + deltaSec * clip.playbackRate, maxStart)
          );
          setSnapGuide(null);
        }
        trimClip(clip.id, newStart, initialSourceEnd, false, false);
      } else {
        // Dragging right handle: timelineStart stays STRICTLY fixed at initialTimelineStart!
        const tentativeTlEnd = initialTimelineStart + initialTimelineDuration + deltaSec;
        const snap = findSnapTarget(tentativeTlEnd, clip.id);

        if (isSyntheticClip) {
          const targetTlEnd = snap ? snap.snappedSec : tentativeTlEnd;
          const newDur = Math.max(0.3, Number((targetTlEnd - initialTimelineStart).toFixed(2)));

          if (snap) {
            setSnapGuide({
              timeSec: snap.snappedSec,
              pixelX: snap.snappedSec * basePixelsPerSecond,
              label: snap.guideLabel,
            });
          } else {
            setSnapGuide(null);
          }

          updateClipProperties(clip.id, {
            timelineDuration: newDur,
            sourceStart: 0,
            sourceEnd: newDur,
          });
          return;
        }

        let newEnd: number;
        const maxSourceDuration = isSyntheticClip
          ? Infinity
          : (activeSource?.duration ?? Infinity);

        if (snap) {
          const snappedDur = Math.max(0.3, snap.snappedSec - initialTimelineStart);
          newEnd = Math.max(
            initialSourceStart + 0.3,
            Math.min(maxSourceDuration, initialSourceStart + snappedDur * clip.playbackRate)
          );
          setSnapGuide({
            timeSec: snap.snappedSec,
            pixelX: snap.snappedSec * basePixelsPerSecond,
            label: snap.guideLabel,
          });
        } else {
          const newDur = Math.max(0.3, initialTimelineDuration + deltaSec);
          newEnd = Math.max(
            initialSourceStart + 0.3,
            Math.min(maxSourceDuration, initialSourceStart + newDur * clip.playbackRate)
          );
          setSnapGuide(null);
        }
        trimClip(clip.id, initialSourceStart, newEnd, false, false);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setSnapGuide(null);
      if (hasMoved) {
        commitHistorySnapshot(preDragSnapshot);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Direct Pointer Clip Drag: supports Magnetic Reordering with Small Blocks & Free Move with Snap Guidelines
  const handleClipDragStart = (
    e: React.PointerEvent,
    track: Track,
    clip: Clip,
    fromIndex: number
  ) => {
    e.stopPropagation();

    const initialX = e.clientX;
    const initialTimelineStart = clip.timelineStart;
    let isDragging = false;
    let finalFreeStart = initialTimelineStart;
    let targetCandidateIndex: number | null = null;

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - initialX;
      if (!isDragging && Math.abs(deltaX) > 3) {
        isDragging = true;
        setDraggedClipInfo({
          clipId: clip.id,
          trackId: track.id,
          fromIndex,
          initialX,
          currentX: moveEv.clientX,
        });
      }

      if (!isDragging) return;

      setDraggedClipInfo((prev) => (prev ? { ...prev, currentX: moveEv.clientX } : null));

      // CASE 1: REORDER MODE (Clips become compact Small Blocks, dropped between clips without collision)
      if (interactionMode === 'reorder' && track.clips.length > 1) {
        setReorderGhost({
          x: moveEv.clientX,
          y: moveEv.clientY,
          name: clip.name || clip.id,
          duration: clip.timelineDuration,
        });

        const containerLeft = containerRef.current?.getBoundingClientRect().left ?? 0;
        const scrollLeft = containerRef.current?.scrollLeft ?? 0;
        const targetTimelineX = moveEv.clientX - containerLeft + scrollLeft;

        const candidateIndex = Math.max(
          0,
          Math.min(
            track.clips.length - 1,
            Math.round((targetTimelineX - 10) / REORDER_BLOCK_PITCH)
          )
        );
        const indicatorPx = candidateIndex * REORDER_BLOCK_PITCH + 10;
        const slotLabel =
          candidateIndex === 0
            ? 'Move to Start (Slot #1)'
            : candidateIndex === track.clips.length - 1
            ? `Move to End (Slot #${track.clips.length})`
            : `Slot #${candidateIndex + 1}`;

        targetCandidateIndex = candidateIndex;

        setInsertionIndicator({
          trackId: track.id,
          targetIndex: candidateIndex,
          indicatorPx,
          label: slotLabel,
        });
        return;
      }

      // CASE 2: FREE PLACEMENT MODE (Magnetic Snap Guidelines on start, end, playhead, 0s)
      setReorderGhost(null);
      setInsertionIndicator(null);

      const deltaSec = deltaX / basePixelsPerSecond;
      let tentativeStart = Math.max(0, initialTimelineStart + deltaSec);

      // Check snap on start edge
      const snapStart = findSnapTarget(tentativeStart, clip.id);
      // Check snap on right edge
      const snapEnd = findSnapTarget(tentativeStart + clip.timelineDuration, clip.id);

      if (snapStart) {
        tentativeStart = snapStart.snappedSec;
        setSnapGuide({
          timeSec: snapStart.snappedSec,
          pixelX: snapStart.snappedSec * basePixelsPerSecond,
          label: snapStart.guideLabel,
        });
      } else if (snapEnd) {
        tentativeStart = Math.max(0, snapEnd.snappedSec - clip.timelineDuration);
        setSnapGuide({
          timeSec: snapEnd.snappedSec,
          pixelX: snapEnd.snappedSec * basePixelsPerSecond,
          label: snapEnd.guideLabel,
        });
      } else {
        setSnapGuide(null);
      }

      finalFreeStart = tentativeStart;
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (isDragging) {
        if (interactionMode === 'reorder') {
          if (targetCandidateIndex !== null && fromIndex !== targetCandidateIndex) {
            reorderClips(track.id, fromIndex, targetCandidateIndex);
          }
        } else {
          moveClip(clip.id, Number(finalFreeStart.toFixed(2)));
        }
      }

      setDraggedClipInfo(null);
      setInsertionIndicator(null);
      setReorderGhost(null);
      setSnapGuide(null);
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

          {/* Mode Toggle: Reorder Blocks vs Free Placement */}
          <div className="ml-2 flex items-center gap-0.5 bg-[var(--bg-elevated)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setInteractionMode('reorder')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                interactionMode === 'reorder'
                  ? 'bg-[var(--accent-primary)] text-white shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Magnetic Reorder Mode: Drag clips as compact blocks to reorder sequence without collision"
            >
              <Magnet className="w-3 h-3" />
              <span>Reorder Blocks</span>
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode('free')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                interactionMode === 'free'
                  ? 'bg-[var(--accent-primary)] text-white shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Free Placement Mode: Move clips freely with magnetic snapping alignment line"
            >
              <MoveHorizontal className="w-3 h-3" />
              <span>Free Placement</span>
            </button>
          </div>
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
            style={{ width: `${contentPixelWidth}px` }}
          >
            {/* Time Ruler (Ticks & Labels) OR Storyboard Mode Banner */}
            {interactionMode === 'reorder' ? (
              <div className="h-6 border-b border-emerald-500/30 bg-emerald-950/40 flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-[10px] text-emerald-300 uppercase tracking-wider">
                    Storyboard Sequence Reorder
                  </span>
                  <span className="text-[10px] text-neutral-400 hidden sm:inline">
                    • Compact blocks • Drag blocks left or right to reorder sequence
                  </span>
                </div>
                <span className="text-[9px] font-mono text-emerald-300/90 bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-500/30">
                  Switch to "Free Placement" for continuous timeline
                </span>
              </div>
            ) : (
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
            )}

            {/* Playhead Marker & Needle (Hidden during Reorder Mode for clarity) */}
            {interactionMode !== 'reorder' && (
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
            )}

            {/* Magnetic Snapping Guideline (Full-height cyan line across all tracks with badge) */}
            {snapGuide && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 dark:bg-cyan-300 z-45 pointer-events-none shadow-[0_0_10px_rgba(6,182,212,0.95)]"
                style={{ left: `${snapGuide.pixelX}px`, transform: 'translateX(-50%)' }}
              >
                <div
                  className="absolute top-1 px-2.5 py-0.5 rounded-full bg-cyan-500 text-black font-semibold text-[10px] whitespace-nowrap shadow-xl flex items-center gap-1.5 z-50 border border-cyan-200/60"
                  style={{
                    transform: snapGuide.pixelX < 70 ? 'translateX(0)' : 'translateX(-50%)',
                  }}
                >
                  <Magnet className="w-2.5 h-2.5 shrink-0" />
                  <span>{snapGuide.label}</span>
                </div>
                <div className="w-2 h-2 bg-cyan-400 rotate-45 mx-auto -mt-1 shadow-xs" />
              </div>
            )}

            {/* Visual Reorder Drop Insertion Guide Line */}
            {insertionIndicator && (
              <div
                className="absolute top-6 bottom-0 w-1.5 bg-emerald-400 z-40 pointer-events-none shadow-[0_0_10px_rgba(52,211,153,0.9)] flex flex-col justify-between items-center transition-all duration-75"
                style={{ left: `${insertionIndicator.indicatorPx}px`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-emerald-500 text-white font-bold text-[9px] whitespace-nowrap shadow-md">
                  {insertionIndicator.label || `Drop Slot #${insertionIndicator.targetIndex + 1}`}
                </div>
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
                  const isReorder = interactionMode === 'reorder';
                  const clipLeft = isReorder
                    ? clipIdx * REORDER_BLOCK_PITCH + 10
                    : clip.timelineStart * basePixelsPerSecond;
                  const clipWidth = isReorder
                    ? REORDER_BLOCK_WIDTH
                    : clip.timelineDuration * basePixelsPerSecond;

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
                        width: `${Math.max(clipWidth, isReorder ? REORDER_BLOCK_WIDTH : 16)}px`,
                      }}
                    >
                      {/* Left Trim Handle (Free Placement mode only) */}
                      {!isReorder && isSelected && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-3 bg-black/40 hover:bg-[var(--accent-primary)] cursor-col-resize rounded-l-md flex items-center justify-center z-30 transition-colors"
                          title="Drag to trim start"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handleTrimStart(e, clip, 'start');
                          }}
                        >
                          <div className="w-0.5 h-3 bg-white/80 rounded-full pointer-events-none" />
                        </div>
                      )}

                      {/* Content inside Clip */}
                      {isReorder ? (
                        /* REORDER STORYBOARD BLOCK VIEW: Compact, clean, numbered tile */
                        <div className="flex items-center gap-1.5 w-full min-w-0">
                          <span className="px-1.5 py-0.5 rounded-xs bg-black/50 text-white font-mono text-[9px] font-bold shrink-0">
                            #{clipIdx + 1}
                          </span>
                          <GripVertical className="w-3.5 h-3.5 text-white/70 shrink-0" />
                          <span className="font-semibold truncate text-[11px] pointer-events-none flex-1 min-w-0">
                            {clipLabel}
                          </span>
                          {clip.playbackRate && clip.playbackRate !== 1 && (
                            <span className="text-[8px] font-mono bg-amber-500/30 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded-xs font-bold shrink-0">
                              {clip.playbackRate}x
                            </span>
                          )}
                          <span className="font-mono text-[9px] opacity-75 shrink-0">
                            {clip.timelineDuration.toFixed(1)}s
                          </span>
                        </div>
                      ) : (
                        /* TIME-PROPORTIONAL VIEW: Standard timeline with trim handles & badges */
                        <div className="flex items-center justify-between w-full min-w-0 overflow-hidden">
                          {/* Incoming Transition Badge */}
                          {clip.transitions?.in && (
                            <span
                              className="px-1 py-0.2 rounded-xs bg-amber-400/30 text-amber-900 dark:text-amber-200 text-[8px] font-mono mr-1 shrink-0 flex items-center gap-0.5 max-w-[85px] truncate"
                              title={`Incoming: ${clip.transitions.in.type} (${clip.transitions.in.duration}s)`}
                            >
                              <Layers className="w-2 h-2 shrink-0" />
                              <span className="truncate">▶ In: {clip.transitions.in.type}</span>
                            </span>
                          )}

                          <span className="font-medium truncate text-[11px] pointer-events-none px-1 flex-1 min-w-0">
                            {clipLabel}
                          </span>

                          <div className="flex items-center shrink-0">
                            {/* Audio Ducking Badge */}
                            {clip.audioDucking?.enabled && (
                              <span className="text-[8px] font-mono bg-blue-500/20 text-blue-900 dark:text-blue-200 px-1 py-0.2 rounded-xs mr-1 shrink-0">
                                -14dB Duck
                              </span>
                            )}

                            {/* Color Grade Badge */}
                            {clip.colorFilter && clip.colorFilter !== 'none' && (
                              <span className="text-[8px] font-mono bg-purple-500/20 text-purple-900 dark:text-purple-200 px-1 py-0.2 rounded-xs mr-1 shrink-0 max-w-[70px] truncate">
                                🎨 {clip.colorFilter}
                              </span>
                            )}

                            {/* Clip Custom Playback Speed Badge */}
                            {clip.playbackRate && clip.playbackRate !== 1 && (
                              <span className="text-[8px] font-mono bg-amber-500/25 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded-xs font-bold mr-1 shrink-0 flex items-center gap-0.5">
                                <Zap className="w-2 h-2 text-amber-500" />
                                <span>{clip.playbackRate}x</span>
                              </span>
                            )}

                            {/* Outgoing Transition Badge */}
                            {clip.transitions?.out && (
                              <span
                                className="px-1 py-0.2 rounded-xs bg-amber-500/30 text-amber-950 dark:text-amber-200 text-[8px] font-mono ml-1 shrink-0 flex items-center gap-0.5 max-w-[85px] truncate"
                                title={`Outgoing: ${clip.transitions.out.type} (${clip.transitions.out.duration}s)`}
                              >
                                <Layers className="w-2 h-2 shrink-0" />
                                <span className="truncate">Out: {clip.transitions.out.type} ◀</span>
                              </span>
                            )}

                            <span className="font-mono text-[9px] opacity-75 truncate pointer-events-none px-1">
                              {clip.timelineDuration.toFixed(1)}s
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Right Trim Handle (Free Placement mode only) */}
                      {!isReorder && isSelected && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 bg-black/40 hover:bg-[var(--accent-primary)] cursor-col-resize rounded-r-md flex items-center justify-center z-30 transition-colors"
                          title="Drag to trim end"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handleTrimStart(e, clip, 'end');
                          }}
                        >
                          <div className="w-0.5 h-3 bg-white/80 rounded-full pointer-events-none" />
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

      {/* Floating Small Block Ghost Card while dragging in Reorder mode */}
      {reorderGhost && (
        <div
          className="fixed pointer-events-none z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow-2xl ring-2 ring-emerald-300 backdrop-blur-md -translate-x-1/2 -translate-y-1/2 scale-90"
          style={{ left: `${reorderGhost.x}px`, top: `${reorderGhost.y}px` }}
        >
          <GripVertical className="w-3.5 h-3.5" />
          <span className="truncate max-w-[130px]">{reorderGhost.name}</span>
          <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.5 rounded font-mono">
            {reorderGhost.duration.toFixed(1)}s
          </span>
        </div>
      )}
    </div>
  );
}
