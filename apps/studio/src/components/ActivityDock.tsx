import { useState, useRef } from 'react';
import {
  Film,
  FileText,
  Type,
  Palette,
  Layers,
  Music,
  Bot,
  PanelLeftClose,
  PanelLeft,
  UploadCloud,
  Plus,
  Trash2,
  Sparkles,
  Play,
  Volume2,
  Check,
  Square,
} from 'lucide-react';
import { Button } from '@vid-edi/ui';
import { useTimelineStore } from '@vid-edi/editor-engine';
import { inspectBrowserVideoFile } from '@vid-edi/media-processing';
import type { ProjectAsset, Transition } from '@vid-edi/shared-types';
import { TranscriptPanel } from './TranscriptPanel';
import { AIAssistantPanel } from './AIAssistantPanel';
import { bgmSynth } from '../utils/bgm-synth';

export type ActivityTab = 'media' | 'transcript' | 'text' | 'filters' | 'transitions' | 'audio' | 'ai';

export const FILTER_PRESETS = [
  {
    id: 'none',
    name: 'Natural',
    desc: 'Unprocessed camera colors',
    css: 'none',
    previewBg: 'from-zinc-500 to-zinc-700',
  },
  {
    id: 'warm-vintage',
    name: 'Warm Vintage',
    desc: 'Kodak warm nostalgic glow',
    css: 'sepia(0.3) saturate(1.2) contrast(1.05) brightness(1.02)',
    previewBg: 'from-amber-600 to-orange-800',
  },
  {
    id: 'teal-orange',
    name: 'Teal & Orange',
    desc: 'Hollywood blockbuster contrast',
    css: 'contrast(1.2) saturate(1.3) hue-rotate(-10deg)',
    previewBg: 'from-teal-600 to-orange-600',
  },
  {
    id: 'noir-bw',
    name: 'Noir B&W',
    desc: 'High-contrast dramatic monochrome',
    css: 'grayscale(1) contrast(1.3) brightness(0.95)',
    previewBg: 'from-zinc-900 to-zinc-400',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    desc: 'Neon magenta and cyan futurism',
    css: 'saturate(1.8) hue-rotate(180deg) contrast(1.15)',
    previewBg: 'from-fuchsia-600 to-cyan-600',
  },
  {
    id: 'clean-pop',
    name: 'Clean Pop',
    desc: 'Crisp YouTube & TikTok punch',
    css: 'contrast(1.1) saturate(1.25) brightness(1.05)',
    previewBg: 'from-emerald-500 to-blue-600',
  },
  {
    id: 'kodak-35mm',
    name: 'Kodak 35mm',
    desc: 'Golden-hour analog film grain',
    css: 'sepia(0.18) saturate(1.15) contrast(1.12)',
    previewBg: 'from-yellow-700 to-amber-900',
  },
  {
    id: 'bleach-bypass',
    name: 'Bleach Bypass',
    desc: 'Desaturated gritty documentary',
    css: 'contrast(1.4) saturate(0.6) brightness(1.05)',
    previewBg: 'from-stone-600 to-stone-800',
  },
  {
    id: 'cool-slate',
    name: 'Cool Slate',
    desc: 'Nordic thriller cool tones',
    css: 'hue-rotate(190deg) saturate(0.8) contrast(1.1)',
    previewBg: 'from-slate-600 to-indigo-900',
  },
];

export const TRANSITION_PRESETS: { type: Transition['type']; name: string; desc: string; duration: number }[] = [
  { type: 'crossfade', name: 'Crossfade', desc: 'Smooth opacity blend', duration: 1.0 },
  { type: 'dipToBlack', name: 'Dip to Black', desc: 'Fade to black then reveal', duration: 1.0 },
  { type: 'dipToWhite', name: 'Dip to White', desc: 'Camera flash punch cut', duration: 0.6 },
  { type: 'slideLeft', name: 'Slide Left', desc: 'Linear push to the left', duration: 0.8 },
  { type: 'zoomBlur', name: 'Zoom Blur', desc: 'Dynamic focal zoom push', duration: 0.6 },
];

export const BGM_SAMPLES = [
  {
    id: 'bgm_lofi_chill',
    name: '☕ Lofi Coffee Beat',
    author: 'Warm Rhodes jazz chords & vinyl texture',
    duration: 30,
    bpm: 80,
    audioUrl: '',
  },
  {
    id: 'bgm_synthwave_energy',
    name: '⚡ 80s Synthwave Drive',
    author: 'Driving saw bassline & resonant arps',
    duration: 24,
    bpm: 120,
    audioUrl: '',
  },
  {
    id: 'bgm_ambient_tech',
    name: '✨ Silicon Horizon Ambient',
    author: 'Crystalline bell plucks & lush pads',
    duration: 28,
    bpm: 72,
    audioUrl: '',
  },
];

export function ActivityDock() {
  const [activeTab, setActiveTab] = useState<ActivityTab>('media');
  const [isOpen, setIsOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [transitionTarget, setTransitionTarget] = useState<'in' | 'out' | 'both'>('in');
  const [transitionDuration, setTransitionDuration] = useState<number>(0.8);
  const [customTitle, setCustomTitle] = useState('MAIN TITLE');
  const [customSubtitle, setCustomSubtitle] = useState('Episode Subtitle or Topic');

  const {
    timeline,
    projectAssets,
    addProjectAsset,
    removeProjectAsset,
    addAssetToTimeline,
    addTextOverlayClip,
    addTitleCardClip,
    insertTitleCardAtStart,
    appendTitleCardAtEnd,
    activeFilter,
    setActiveFilter,
    selectedClipId,
    setSelectedClipId,
    updateClipProperties,
    setMediaSource,
    activeSource,
  } = useTimelineStore();

  const handleTabClick = (tab: ActivityTab) => {
    if (activeTab === tab && isOpen) {
      setIsOpen(false);
    } else {
      setActiveTab(tab);
      setIsOpen(true);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');

      if (isVideo) {
        try {
          const inspected = await inspectBrowserVideoFile(file);
          addProjectAsset({
            id: inspected.id,
            name: file.name,
            type: 'video',
            path: inspected.path,
            duration: inspected.duration,
            width: inspected.width,
            height: inspected.height,
            size: file.size,
          });
          if (!activeSource) {
            setMediaSource(inspected);
          }
        } catch {
          const path = URL.createObjectURL(file);
          addProjectAsset({
            id: `video_${Date.now()}_${i}`,
            name: file.name,
            type: 'video',
            path,
            duration: 15,
            width: 1920,
            height: 1080,
            size: file.size,
          });
        }
      } else if (isAudio) {
        const path = URL.createObjectURL(file);
        let audioDuration = 5;
        try {
          audioDuration = await new Promise<number>((resolve) => {
            const probeAudio = new Audio();
            probeAudio.preload = 'metadata';
            const timer = setTimeout(() => resolve(5), 2500);
            probeAudio.onloadedmetadata = () => {
              clearTimeout(timer);
              if (probeAudio.duration && isFinite(probeAudio.duration) && probeAudio.duration > 0) {
                resolve(Number(probeAudio.duration.toFixed(2)));
              } else {
                resolve(5);
              }
            };
            probeAudio.onerror = () => {
              clearTimeout(timer);
              resolve(5);
            };
            probeAudio.src = path;
          });
        } catch {
          audioDuration = 5;
        }

        addProjectAsset({
          id: `audio_${Date.now()}_${i}`,
          name: file.name,
          type: 'audio',
          path,
          duration: audioDuration,
          size: file.size,
        });
      } else if (isImage) {
        const path = URL.createObjectURL(file);
        addProjectAsset({
          id: `image_${Date.now()}_${i}`,
          name: file.name,
          type: 'image',
          path,
          duration: 5,
          size: file.size,
        });
      }
    }
  };

  const loadDemoInterview = () => {
    const demoAsset: ProjectAsset = {
      id: 'demo_tech_interview_sample',
      name: 'tech_founder_interview_sample.mp4',
      type: 'video',
      path: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 15,
      width: 1920,
      height: 1080,
      size: 15 * 1024 * 1024,
    };
    addProjectAsset(demoAsset);
    setMediaSource({
      id: demoAsset.id,
      name: demoAsset.name,
      path: demoAsset.path,
      size: demoAsset.size || 0,
      duration: demoAsset.duration,
      width: 1920,
      height: 1080,
      fps: 30,
      codec: 'h264 / aac',
      audioChannels: 2,
      audioSampleRate: 48000,
      mimeType: 'video/mp4',
    });
  };

  const playBgmPreview = (id: string) => {
    if (playingAudioId === id) {
      bgmSynth.stop();
      setPlayingAudioId(null);
      return;
    }

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    bgmSynth.start(id, 0.85, false);
    setPlayingAudioId(id);
  };

  const navItems = [
    { id: 'media' as ActivityTab, label: 'Media Bin', icon: Film },
    { id: 'transcript' as ActivityTab, label: 'Transcript', icon: FileText },
    { id: 'text' as ActivityTab, label: 'Text & Titles', icon: Type },
    { id: 'filters' as ActivityTab, label: 'Filters', icon: Palette },
    { id: 'transitions' as ActivityTab, label: 'Transitions', icon: Layers },
    { id: 'audio' as ActivityTab, label: 'Audio & Music', icon: Music },
    { id: 'ai' as ActivityTab, label: 'AI Copilot', icon: Bot },
  ];

  return (
    <div className="flex h-full border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 select-none">
      {/* Sleek Vertical Icon Rail (Width: 54px) */}
      <div className="w-[54px] border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col items-center py-2.5 gap-1.5 shrink-0 z-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && isOpen;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              title={item.label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative cursor-pointer group ${
                isActive
                  ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {/* Active pill dot on left border */}
              {isActive && (
                <span className="absolute -left-1 top-2 bottom-2 w-1 bg-white rounded-r-full shadow-xs" />
              )}
            </button>
          );
        })}

        <div className="mt-auto pt-2 border-t border-[var(--border-subtle)] w-full flex justify-center">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? 'Collapse panel' : 'Expand panel'}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Drawer (Width: 420px for AI/Transcript, 320px for tools) */}
      {isOpen && (
        <div
          className={`${
            activeTab === 'ai' || activeTab === 'transcript'
              ? 'w-96 md:w-[420px]'
              : 'w-80'
          } bg-[var(--bg-surface)] flex flex-col overflow-hidden transition-all duration-200 border-r border-[var(--border-subtle)] shadow-xs animate-spring-in`}
        >
          {/* Header Title */}
          <div className="h-10 px-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/50 shrink-0">
            <span className="text-xs font-semibold text-[var(--text-primary)] tracking-wide uppercase">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono">Vid-Edi Studio</span>
          </div>

          {/* Drawer Body: 0 padding for seamless AI and Transcript panels, padded for other tools */}
          <div
            className={`flex-1 flex flex-col overflow-hidden ${
              activeTab === 'ai' || activeTab === 'transcript' ? 'p-0' : 'p-3 overflow-y-auto gap-3'
            }`}
          >
            {/* 1. MEDIA BIN */}
            {activeTab === 'media' && (
              <div className="flex flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="video/*,audio/*,image/*"
                  className="hidden"
                  onChange={(e) => void handleFileUpload(e.target.files)}
                />

                {/* Upload Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--accent-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-base)] rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-6 h-6 text-[var(--accent-primary)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Import Media Files
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Drop MP4, WebM, MP3, PNG
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadDemoInterview}
                  className="w-full text-xs gap-1.5 justify-center border-[var(--border-strong)] bg-[var(--bg-elevated)]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Load Sample Interview Video
                </Button>

                {/* Project Media Bin Assets List */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)] px-1">
                    <span>Project Assets ({projectAssets.length})</span>
                    <span className="text-[10px] font-normal text-[var(--text-tertiary)]">Multi-clip bin</span>
                  </div>

                  {projectAssets.length === 0 ? (
                    <div className="text-center p-4 border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-tertiary)]">
                      No assets imported yet. Upload files above to build your sequence.
                    </div>
                  ) : (
                    projectAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col gap-1.5 hover:border-[var(--border-strong)] transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[170px]" title={asset.name}>
                            {asset.name}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full font-mono bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            {asset.type}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
                          <span>{asset.duration > 0 ? `${asset.duration.toFixed(1)}s` : 'Image'}</span>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => addAssetToTimeline(asset)}
                              className="px-2 py-0.5 rounded-md bg-[var(--accent-primary)]/15 hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white transition-colors font-medium flex items-center gap-0.5"
                              title="Append to timeline track"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProjectAsset(asset.id)}
                              className="p-1 rounded-md hover:bg-rose-500/20 text-neutral-400 hover:text-rose-500 transition-colors"
                              title="Remove from bin"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 2. TRANSCRIPT */}
            {activeTab === 'transcript' && (
              <div className="h-full flex flex-col">
                <TranscriptPanel />
              </div>
            )}

            {/* 3. TEXT & TITLES */}
            {activeTab === 'text' && (
              <div className="flex flex-col gap-4">
                {/* Title Card Position Controls */}
                <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col gap-2.5 shadow-xs">
                  <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    Full-Frame Title Card Builder
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Title Heading (e.g. EPISODE 1)"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-hidden"
                    />
                    <input
                      type="text"
                      value={customSubtitle}
                      onChange={(e) => setCustomSubtitle(e.target.value)}
                      placeholder="Subtitle (e.g. The Beginning)"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] focus:outline-hidden"
                    />
                  </div>

                  {/* 3 Smart Placement Buttons: Intro 0:00, Playhead, Outro End */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        insertTitleCardAtStart(
                          {
                            title: customTitle || 'EPISODE 1',
                            subtitle: customSubtitle || 'The Journey Begins Here',
                            theme: 'onyx',
                            backgroundColor: '#0A0A0A',
                            textColor: '#FFFFFF',
                          },
                          3.5
                        )
                      }
                      className="p-1.5 rounded-lg bg-[var(--accent-primary)] hover:brightness-110 text-white flex flex-col items-center text-center cursor-pointer shadow-xs transition-all"
                      title="Shifts video right and inserts intro at 0:00 without hiding video"
                    >
                      <span className="text-[11px] font-bold">🎬 Intro</span>
                      <span className="text-[9px] opacity-85">At 0:00s</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        addTitleCardClip({
                          title: customTitle || 'KEY TAKEAWAY',
                          subtitle: customSubtitle || 'Core Concept',
                          theme: 'minimal',
                          backgroundColor: '#1E1B4B',
                          textColor: '#E0E7FF',
                        })
                      }
                      className="p-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] flex flex-col items-center text-center cursor-pointer transition-all"
                      title="Add title card at current playhead position"
                    >
                      <span className="text-[11px] font-bold">⏱ Playhead</span>
                      <span className="text-[9px] text-[var(--text-tertiary)]">Current time</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        appendTitleCardAtEnd(
                          {
                            title: customTitle || 'THANKS FOR WATCHING',
                            subtitle: customSubtitle || 'Subscribe & Follow',
                            theme: 'gradient',
                            backgroundColor: '#312E81',
                            textColor: '#FFFFFF',
                          },
                          3.5
                        )
                      }
                      className="p-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] hover:border-amber-400 text-[var(--text-primary)] flex flex-col items-center text-center cursor-pointer transition-all"
                      title="Appends outro title card at the end of sequence"
                    >
                      <span className="text-[11px] font-bold">🏁 Outro</span>
                      <span className="text-[9px] text-amber-500">At End</span>
                    </button>
                  </div>
                </div>

                {/* Pre-styled Title Card Presets */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Quick Title Presets
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        insertTitleCardAtStart(
                          {
                            title: 'CHAPTER 1',
                            subtitle: 'The Journey Begins Here',
                            theme: 'onyx',
                            backgroundColor: '#0A0A0A',
                            textColor: '#FFFFFF',
                          },
                          3.5
                        )
                      }
                      className="p-2.5 rounded-xl border border-[var(--border-strong)] bg-zinc-950 text-left hover:border-amber-400/50 transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-white tracking-widest uppercase">
                        CHAPTER 1 • ONYX DARK
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">The Journey Begins Here</div>
                      <span className="text-[9px] text-amber-400 font-mono mt-1 block">
                        + Insert as Intro at 0:00 (3.5s)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        appendTitleCardAtEnd(
                          {
                            title: 'KEY INSIGHT',
                            subtitle: 'Why Video Editors Win in 2026',
                            theme: 'minimal',
                            backgroundColor: '#1E1B4B',
                            textColor: '#E0E7FF',
                          },
                          3.5
                        )
                      }
                      className="p-2.5 rounded-xl border border-[var(--border-strong)] bg-indigo-950/80 text-left hover:border-indigo-400/50 transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-indigo-200 tracking-wider uppercase">
                        KEY INSIGHT • VELVET
                      </div>
                      <div className="text-[11px] text-indigo-300/80 mt-0.5">Why Video Editors Win in 2026</div>
                      <span className="text-[9px] text-indigo-400 font-mono mt-1 block">
                        + Append as Outro at End (3.5s)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Lower Thirds & Text Overlays */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    On-Screen Text & Lower Thirds
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        addTextOverlayClip({
                          text: 'Sarah Jenkins',
                          subtitle: 'Co-Founder & Lead Engineer',
                          style: 'lower-third',
                          fontFamily: 'Outfit',
                          fontSize: 22,
                          color: '#FFFFFF',
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                          position: 'bottom-left',
                        })
                      }
                      className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)] text-left transition-all cursor-pointer"
                    >
                      <div className="text-xs font-bold text-[var(--text-primary)]">Sarah Jenkins</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        Co-Founder & Lead Engineer (Lower Third)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        addTextOverlayClip({
                          text: '🔥 10x Editing Speed Unlocked',
                          style: 'badge',
                          fontFamily: 'Outfit',
                          fontSize: 18,
                          color: '#F59E0B',
                          backgroundColor: 'rgba(0, 0, 0, 0.85)',
                          position: 'top-left',
                        })
                      }
                      className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-amber-400 text-left transition-all cursor-pointer"
                    >
                      <div className="text-xs font-bold text-amber-500">🔥 10x Editing Speed Unlocked</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">Topic Pill Badge (Top Left)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        addTextOverlayClip({
                          text: '@videdi_studio',
                          style: 'minimal',
                          fontFamily: 'JetBrains Mono',
                          fontSize: 14,
                          color: '#10B981',
                          position: 'bottom-right',
                        })
                      }
                      className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-emerald-400 text-left transition-all cursor-pointer"
                    >
                      <div className="text-xs font-mono font-medium text-emerald-500">@videdi_studio</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">Social Watermark (Bottom Right)</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. VISUAL FILTERS & COLOR GRADING */}
            {activeTab === 'filters' && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                  Select a grade to apply to the sequence in real-time:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {FILTER_PRESETS.map((filter) => {
                    const currentClipFilter = selectedClipId
                      ? timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId)?.colorFilter
                      : undefined;
                    const isSelected = (currentClipFilter !== undefined ? currentClipFilter : (activeFilter || 'none')) === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => {
                          setActiveFilter(filter.id);
                          const targetClipId =
                            selectedClipId ||
                            timeline.tracks.find((t) => t.type === 'video')?.clips[0]?.id;
                          if (targetClipId) {
                            updateClipProperties(targetClipId, { colorFilter: filter.id });
                          }
                        }}
                        className={`p-2 rounded-xl border flex flex-col gap-1.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20 bg-[var(--bg-elevated)]'
                            : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-elevated)]/60'
                        }`}
                      >
                        {/* Swatch gradient preview */}
                        <div
                          className={`h-12 w-full rounded-lg bg-gradient-to-tr ${filter.previewBg} shadow-xs relative flex items-end p-1`}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white text-[var(--accent-primary)] flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                          {filter.name}
                        </span>
                        <span className="text-[9px] text-[var(--text-tertiary)] leading-tight line-clamp-1">
                          {filter.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. TRANSITIONS (Incoming & Outgoing Visual Effects) */}
            {activeTab === 'transitions' && (
              <div className="flex flex-col gap-3">
                {/* Direction Selector (In vs Out vs Both) */}
                <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Transition Position
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'in' as const, label: '▶ Incoming (In)' },
                      { id: 'out' as const, label: 'Outgoing (Out) ◀' },
                      { id: 'both' as const, label: 'Both (In & Out)' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setTransitionTarget(btn.id)}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer text-center ${
                          transitionTarget === btn.id
                            ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                            : 'bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Duration Selector */}
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">Duration:</span>
                    <div className="flex items-center gap-1">
                      {[0.5, 0.8, 1.0, 1.5].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setTransitionDuration(d)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                            transitionDuration === d
                              ? 'bg-[var(--accent-primary)] text-white font-bold'
                              : 'bg-[var(--bg-base)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                  Click a transition to apply to selected clip:
                </span>

                <div className="flex flex-col gap-2">
                  {/* Clear Transitions Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const targetClipId =
                        selectedClipId ||
                        timeline.tracks.find((t) => t.type === 'video')?.clips[0]?.id;
                      if (!targetClipId) return;
                      updateClipProperties(targetClipId, {
                        transitions: undefined,
                        transition: undefined,
                      });
                    }}
                    className="p-2 rounded-xl border border-dashed border-[var(--border-strong)] hover:border-rose-400 bg-[var(--bg-elevated)]/60 text-left transition-all cursor-pointer flex items-center justify-between group"
                    title="Remove all transitions from clip"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-rose-400">
                        🚫 Clear All Transitions
                      </div>
                      <div className="text-[10px] text-[var(--text-tertiary)]">
                        Standard cut with no animated transition
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-base)] text-[var(--text-tertiary)] group-hover:text-rose-400">
                      Clear
                    </span>
                  </button>

                  {TRANSITION_PRESETS.map((trans) => (
                    <button
                      key={trans.type}
                      type="button"
                      onClick={() => {
                        const targetClipId =
                          selectedClipId ||
                          timeline.tracks.find((t) => t.type === 'video')?.clips[0]?.id;
                        if (!targetClipId) {
                          alert('Please load a video clip first to apply transitions.');
                          return;
                        }
                        setSelectedClipId(targetClipId);
                        const targetClip = timeline.tracks
                          .flatMap((t) => t.clips)
                          .find((c) => c.id === targetClipId);
                        const existingTransitions = targetClip?.transitions || {};
                        const newTransitions = {
                          ...existingTransitions,
                          ...(transitionTarget === 'in' || transitionTarget === 'both'
                            ? { in: { type: trans.type, duration: transitionDuration } }
                            : {}),
                          ...(transitionTarget === 'out' || transitionTarget === 'both'
                            ? { out: { type: trans.type, duration: transitionDuration } }
                            : {}),
                        };
                        updateClipProperties(targetClipId, {
                          transitions: newTransitions,
                          transition: newTransitions.in || undefined,
                        });
                      }}
                      className="p-2.5 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] bg-[var(--bg-elevated)] flex items-center justify-between text-left transition-all cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {trans.name}
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">{trans.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-base)] text-[var(--accent-primary)] font-medium">
                        Apply {transitionTarget.toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 6. AUDIO & BGM */}
            {activeTab === 'audio' && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                  Add background music with automatic speech ducking (-14dB):
                </span>
                <div className="flex flex-col gap-2">
                  {BGM_SAMPLES.map((bgm) => (
                    <div
                      key={bgm.id}
                      className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-primary)]">
                            {bgm.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">
                            {bgm.bpm} BPM • {bgm.duration}s loop
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => playBgmPreview(bgm.id)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                            playingAudioId === bgm.id
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'bg-[var(--bg-base)] hover:bg-[var(--accent-primary)] hover:text-white text-[var(--text-secondary)]'
                          }`}
                          title={playingAudioId === bgm.id ? 'Stop Preview' : 'Preview Track'}
                        >
                          {playingAudioId === bgm.id ? (
                            <Square className="w-3 h-3 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (playingAudioId) {
                            bgmSynth.stop();
                            setPlayingAudioId(null);
                          }
                          addAssetToTimeline({
                            id: bgm.id,
                            name: bgm.name,
                            type: 'audio',
                            path: bgm.id,
                            duration: bgm.duration,
                          });
                        }}
                        className="w-full py-1 text-[11px] rounded-lg bg-[var(--accent-primary)]/15 hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Add BGM to Music Track</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. AI COPILOT */}
            {activeTab === 'ai' && (
              <div className="h-full flex flex-col">
                <AIAssistantPanel />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
