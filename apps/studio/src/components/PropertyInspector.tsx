import { useState } from 'react';
import {
  Sliders,
  PanelRightClose,
  PanelRight,
  RotateCcw,
} from 'lucide-react';
import { useTimelineStore } from '@vid-edi/editor-engine';
import { Button, formatSecondsToTimecode } from '@vid-edi/ui';
import { FILTER_PRESETS } from './ActivityDock';

export function PropertyInspector() {
  const [isOpen, setIsOpen] = useState(true);
  const {
    timeline,
    selectedClipId,
    updateClipProperties,
    moveClip,
    setAspectRatio,
    activeFilter,
    setActiveFilter,
  } = useTimelineStore();

  let selectedClip = null;
  let selectedTrack = null;

  if (selectedClipId) {
    for (const track of timeline.tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId);
      if (found) {
        selectedClip = found;
        selectedTrack = track;
        break;
      }
    }
  }

  const isVideoClip = selectedTrack?.type === 'video';
  const isAudioClip = selectedTrack?.type === 'audio';
  const isTextOrTitleClip =
    selectedClip?.textOverlay !== undefined ||
    selectedClip?.titleCard !== undefined ||
    selectedTrack?.type === 'overlay';

  return (
    <div className="flex h-full border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 select-none">
      {/* Drawer Toggle Handle when collapsed */}
      {!isOpen && (
        <div className="w-10 border-l border-[var(--border-subtle)] flex flex-col items-center py-3 bg-[var(--bg-surface)]">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            title="Open Inspector"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Expanded Inspector Panel (Width: 280px) */}
      {isOpen && (
        <div className="w-72 bg-[var(--bg-surface)] flex flex-col overflow-hidden animate-spring-in">
          {/* Header */}
          <div className="h-10 px-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/50">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                {selectedClip ? 'Clip Properties' : 'Canvas Settings'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-md"
              title="Collapse Inspector"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Inspector Body */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-4 text-xs">
            {/* SCENARIO 1: VIDEO CLIP SELECTED */}
            {selectedClip && isVideoClip && (
              <div className="flex flex-col gap-4">
                {/* Clip Meta */}
                <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[170px]">
                      {selectedClip.name || selectedClip.id}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-1.5 py-0.5 rounded-sm">
                      {selectedClip.timelineDuration.toFixed(1)}s
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                    Track: {selectedTrack?.name}
                  </span>
                </div>

                {/* Transform: Scale */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-secondary)]">Scale</span>
                    <span className="font-mono text-[11px] text-[var(--text-primary)]">
                      {Math.round((selectedClip.transform?.scale ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={selectedClip.transform?.scale ?? 1.0}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        transform: {
                          scale: parseFloat(e.target.value),
                          positionX: selectedClip!.transform?.positionX ?? 0,
                          positionY: selectedClip!.transform?.positionY ?? 0,
                          opacity: selectedClip!.transform?.opacity ?? 1.0,
                        },
                      })
                    }
                    className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                  />
                </div>

                {/* Transform: Opacity */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-secondary)]">Opacity</span>
                    <span className="font-mono text-[11px] text-[var(--text-primary)]">
                      {Math.round((selectedClip.transform?.opacity ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedClip.transform?.opacity ?? 1.0}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        transform: {
                          scale: selectedClip!.transform?.scale ?? 1.0,
                          positionX: selectedClip!.transform?.positionX ?? 0,
                          positionY: selectedClip!.transform?.positionY ?? 0,
                          opacity: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                  />
                </div>

                {/* Color Filter Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-[var(--text-secondary)]">Color Grade</span>
                  <select
                    value={selectedClip.colorFilter || activeFilter || 'none'}
                    onChange={(e) => {
                      updateClipProperties(selectedClip!.id, { colorFilter: e.target.value });
                      setActiveFilter(e.target.value);
                    }}
                    className="w-full p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] focus:outline-hidden cursor-pointer"
                  >
                    {FILTER_PRESETS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visual Adjustments: Brightness, Contrast, Saturation */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
                    Visual Adjustments
                  </span>

                  {/* Brightness */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">Brightness</span>
                      <span className="font-mono text-[10px] text-[var(--text-primary)]">
                        {Math.round((selectedClip.brightness ?? 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={selectedClip.brightness ?? 1.0}
                      onChange={(e) =>
                        updateClipProperties(selectedClip!.id, {
                          brightness: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">Contrast</span>
                      <span className="font-mono text-[10px] text-[var(--text-primary)]">
                        {Math.round((selectedClip.contrast ?? 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={selectedClip.contrast ?? 1.0}
                      onChange={(e) =>
                        updateClipProperties(selectedClip!.id, {
                          contrast: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">Saturation</span>
                      <span className="font-mono text-[10px] text-[var(--text-primary)]">
                        {Math.round((selectedClip.saturation ?? 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2.0"
                      step="0.05"
                      value={selectedClip.saturation ?? 1.0}
                      onChange={(e) =>
                        updateClipProperties(selectedClip!.id, {
                          saturation: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Video Clip Audio Volume */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-secondary)]">Clip Audio Volume</span>
                    <span className="font-mono text-[11px] text-[var(--text-primary)]">
                      {Math.round((selectedClip.volume ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={selectedClip.volume ?? 1.0}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        volume: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                  />
                </div>

                {/* Clip Playback Speed */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-secondary)]">Clip Speed</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">Alters timeline duration</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() =>
                          updateClipProperties(selectedClip!.id, { playbackRate: rate })
                        }
                        className={`py-1 rounded-md border text-center font-mono text-[11px] transition-colors cursor-pointer ${
                          (selectedClip?.playbackRate || 1.0) === rate
                            ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] font-bold shadow-xs'
                            : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Transitions (Incoming & Outgoing) */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
                    Transitions
                  </span>

                  {/* Incoming Transition */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">▶ Incoming (In)</span>
                      <span className="font-mono text-[10px] text-[var(--accent-primary)]">
                        {selectedClip.transitions?.in?.duration ?? 0.8}s
                      </span>
                    </div>
                    <select
                      value={selectedClip.transitions?.in?.type || selectedClip.transition?.type || 'none'}
                      onChange={(e) => {
                        const type = e.target.value;
                        const dur = selectedClip?.transitions?.in?.duration || 0.8;
                        const newIn =
                          type === 'none'
                            ? undefined
                            : { type: type as any, duration: dur };
                        updateClipProperties(selectedClip!.id, {
                          transitions: { ...selectedClip!.transitions, in: newIn },
                          transition: newIn,
                        });
                      }}
                      className="w-full p-1.5 rounded-md bg-[var(--bg-base)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] cursor-pointer"
                    >
                      <option value="none">None (Cut)</option>
                      <option value="crossfade">Crossfade (Blend)</option>
                      <option value="dipToBlack">Dip to Black</option>
                      <option value="dipToWhite">Dip to White (Flash)</option>
                      <option value="slideLeft">Slide Left (Push)</option>
                      <option value="zoomBlur">Zoom Blur (Punch)</option>
                    </select>
                  </div>

                  {/* Outgoing Transition */}
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">Outgoing (Out) ◀</span>
                      <span className="font-mono text-[10px] text-[var(--accent-primary)]">
                        {selectedClip.transitions?.out?.duration ?? 0.8}s
                      </span>
                    </div>
                    <select
                      value={selectedClip.transitions?.out?.type || 'none'}
                      onChange={(e) => {
                        const type = e.target.value;
                        const dur = selectedClip?.transitions?.out?.duration || 0.8;
                        const newOut =
                          type === 'none'
                            ? undefined
                            : { type: type as any, duration: dur };
                        updateClipProperties(selectedClip!.id, {
                          transitions: { ...selectedClip!.transitions, out: newOut },
                        });
                      }}
                      className="w-full p-1.5 rounded-md bg-[var(--bg-base)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] cursor-pointer"
                    >
                      <option value="none">None (Cut)</option>
                      <option value="crossfade">Crossfade (Blend)</option>
                      <option value="dipToBlack">Dip to Black</option>
                      <option value="dipToWhite">Dip to White (Flash)</option>
                      <option value="slideLeft">Slide Left (Push)</option>
                      <option value="zoomBlur">Zoom Blur (Punch)</option>
                    </select>
                  </div>
                </div>

                {/* Reset Transform */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateClipProperties(selectedClip!.id, {
                      transform: { scale: 1.0, positionX: 0, positionY: 0, opacity: 1.0 },
                      playbackRate: 1.0,
                    })
                  }
                  className="w-full text-xs text-[var(--text-secondary)] gap-1 justify-center mt-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Video Transform
                </Button>
              </div>
            )}

            {/* SCENARIO 2: TEXT / TITLE CARD SELECTED */}
            {selectedClip && isTextOrTitleClip && (
              <div className="flex flex-col gap-4">
                {/* Timeline Position & Duration Slider */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Timeline Position</span>
                    <span className="font-mono text-xs text-[var(--accent-primary)] font-bold">
                      {selectedClip.timelineStart.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(timeline.duration, 30)}
                    step="0.1"
                    value={selectedClip.timelineStart}
                    onChange={(e) => moveClip(selectedClip!.id, parseFloat(e.target.value))}
                    className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Duration</span>
                    <span className="font-mono text-xs text-[var(--text-primary)] font-bold">
                      {selectedClip.timelineDuration.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="15.0"
                    step="0.5"
                    value={selectedClip.timelineDuration}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        timelineDuration: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                  />
                </div>

                {/* Title Card Editor */}
                {selectedClip.titleCard && (
                  <div className="flex flex-col gap-3">
                    <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
                      Title Card Content
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium">
                        Title
                      </label>
                      <input
                        type="text"
                        value={selectedClip.titleCard.title}
                        onChange={(e) =>
                          updateClipProperties(selectedClip!.id, {
                            name: e.target.value.slice(0, 20),
                            titleCard: { ...selectedClip!.titleCard!, title: e.target.value },
                          })
                        }
                        className="w-full p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium">
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={selectedClip.titleCard.subtitle || ''}
                        onChange={(e) =>
                          updateClipProperties(selectedClip!.id, {
                            titleCard: { ...selectedClip!.titleCard!, subtitle: e.target.value },
                          })
                        }
                        className="w-full p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}

                {/* Lower Third / Text Overlay Editor */}
                {selectedClip.textOverlay && (
                  <div className="flex flex-col gap-3">
                    <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
                      Text Overlay Content
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium">
                        Heading / Text
                      </label>
                      <input
                        type="text"
                        value={selectedClip.textOverlay.text}
                        onChange={(e) =>
                          updateClipProperties(selectedClip!.id, {
                            name: e.target.value.slice(0, 20),
                            textOverlay: { ...selectedClip!.textOverlay!, text: e.target.value },
                          })
                        }
                        className="w-full p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium">
                        Subtitle (Optional)
                      </label>
                      <input
                        type="text"
                        value={selectedClip.textOverlay.subtitle || ''}
                        onChange={(e) =>
                          updateClipProperties(selectedClip!.id, {
                            textOverlay: { ...selectedClip!.textOverlay!, subtitle: e.target.value },
                          })
                        }
                        className="w-full p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    {/* Font Size Slider */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--text-secondary)]">Font Size</span>
                        <span className="font-mono text-[11px] text-[var(--text-primary)]">
                          {selectedClip.textOverlay.fontSize}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="48"
                        step="2"
                        value={selectedClip.textOverlay.fontSize}
                        onChange={(e) =>
                          updateClipProperties(selectedClip!.id, {
                            textOverlay: {
                              ...selectedClip!.textOverlay!,
                              fontSize: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                      />
                    </div>

                    {/* Color Swatches */}
                    <div className="flex flex-col gap-1.5">
                      <span className="font-medium text-[var(--text-secondary)]">Text Color</span>
                      <div className="flex items-center gap-2">
                        {['#FFFFFF', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444'].map(
                          (color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() =>
                                updateClipProperties(selectedClip!.id, {
                                  textOverlay: { ...selectedClip!.textOverlay!, color },
                                })
                              }
                              style={{ backgroundColor: color }}
                              className={`w-6 h-6 rounded-full border border-black/20 shadow-xs cursor-pointer transition-transform ${
                                selectedClip?.textOverlay?.color === color
                                  ? 'scale-125 ring-2 ring-[var(--accent-primary)]'
                                  : 'hover:scale-110'
                              }`}
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SCENARIO 3: AUDIO / MUSIC SELECTED */}
            {selectedClip && isAudioClip && (
              <div className="flex flex-col gap-4">
                <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[170px]">
                      {selectedClip.name || 'Audio Clip'}
                    </span>
                    <span className="text-[10px] font-mono text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-sm">
                      {selectedClip.timelineDuration.toFixed(1)}s
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                    Track: {selectedTrack?.name}
                  </span>
                </div>

                {/* Volume Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-secondary)]">Track Volume</span>
                    <span className="font-mono text-[11px] text-[var(--text-primary)]">
                      {Math.round((selectedClip.volume ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={selectedClip.volume ?? 1.0}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        volume: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                  />
                </div>

                {/* Audio Fade Envelope (Fade In & Fade Out) */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
                    Audio Fades
                  </span>

                  {/* Fade In */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">Fade In</span>
                      <span className="font-mono text-[10px] text-[var(--accent-primary)] font-bold">
                        {(selectedClip.audioFade?.in ?? 0).toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5.0"
                      step="0.2"
                      value={selectedClip.audioFade?.in ?? 0}
                      onChange={(e) =>
                        updateClipProperties(selectedClip!.id, {
                          audioFade: {
                            ...selectedClip!.audioFade,
                            in: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                    />
                  </div>

                  {/* Fade Out */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">Fade Out</span>
                      <span className="font-mono text-[10px] text-[var(--accent-primary)] font-bold">
                        {(selectedClip.audioFade?.out ?? 0).toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5.0"
                      step="0.2"
                      value={selectedClip.audioFade?.out ?? 0}
                      onChange={(e) =>
                        updateClipProperties(selectedClip!.id, {
                          audioFade: {
                            ...selectedClip!.audioFade,
                            out: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-[var(--accent-primary)] h-1.5 rounded-lg bg-[var(--border-strong)] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Speech Ducking Toggle */}
                <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">Auto Ducking</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">
                      Lower BGM by -14dB during voice
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedClip.audioDucking?.enabled ?? true}
                    onChange={(e) =>
                      updateClipProperties(selectedClip!.id, {
                        audioDucking: {
                          enabled: e.target.checked,
                          duckingDb: -14,
                        },
                      })
                    }
                    className="w-4 h-4 accent-[var(--accent-primary)] rounded-md cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* SCENARIO 4: NO SELECTION (CANVAS / PROJECT SETTINGS) */}
            {!selectedClip && (
              <div className="flex flex-col gap-4">
                {/* Aspect Ratio Switcher */}
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
                    Aspect Ratio & Format
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: '16:9' as const, label: '16:9', desc: 'YouTube' },
                      { id: '9:16' as const, label: '9:16', desc: 'Reels / Shorts' },
                      { id: '1:1' as const, label: '1:1', desc: 'Square' },
                    ].map((item) => {
                      const isCurrent =
                        (item.id === '16:9' && timeline.resolution.width === 1920) ||
                        (item.id === '9:16' && timeline.resolution.height === 1920) ||
                        (item.id === '1:1' &&
                          timeline.resolution.width === 1080 &&
                          timeline.resolution.height === 1080);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAspectRatio(item.id)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-center transition-all cursor-pointer ${
                            isCurrent
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold shadow-xs'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="font-mono text-xs">{item.label}</span>
                          <span className="text-[9px] opacity-75">{item.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sequence Overview Stats */}
                <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col gap-2">
                  <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
                    Sequence Summary
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-[var(--text-tertiary)]">Duration</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {formatSecondsToTimecode(timeline.duration)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[var(--text-tertiary)]">Resolution</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {timeline.resolution.width} x {timeline.resolution.height}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[var(--text-tertiary)]">Frame Rate</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {timeline.fps} FPS
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[var(--text-tertiary)]">Active Tracks</span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {timeline.tracks.length} Tracks
                      </span>
                    </div>
                  </div>
                </div>

                {/* Keyboard Shortcuts Hint */}
                <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 flex flex-col gap-1.5 text-[11px] text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">Tactile Shortcuts</span>
                  <div className="flex justify-between">
                    <span>Play / Pause</span>
                    <span className="font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded-sm border border-[var(--border-subtle)]">
                      Space
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Split at Playhead</span>
                    <span className="font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded-sm border border-[var(--border-subtle)]">
                      S
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delete Clip</span>
                    <span className="font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded-sm border border-[var(--border-subtle)]">
                      Delete
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Undo / Redo</span>
                    <span className="font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded-sm border border-[var(--border-subtle)]">
                      Ctrl+Z / Ctrl+Y
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
