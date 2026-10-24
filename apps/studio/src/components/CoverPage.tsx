import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Film,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Play,
  Pause,
  Scissors,
  Check,
  FileCode,
  ExternalLink,
  Laptop,
  Heart,
  MessageCircle,
  Share2,
  Disc3,
  Type,
  Music,
  CheckCheck,
  Bookmark,
  Copy,
  Code2,
  Volume2
} from 'lucide-react';
import { ThemeToggle } from '@vid-edi/ui';

interface CoverPageProps {
  onLaunchStudio: () => void;
}

export function CoverPage({ onLaunchStudio }: CoverPageProps) {
  // Demo Stage State
  const [activeTab, setActiveTab] = useState<'shorts' | 'pauses' | 'captions'>('shorts');
  const [isPlayingDemo, setIsPlayingDemo] = useState(true);
  const [playheadPos, setPlayheadPos] = useState(38);
  const [captionPreset, setCaptionPreset] = useState<'viral' | 'minimal' | 'neon'>('viral');
  const [inspectorView, setInspectorView] = useState<'cards' | 'json'>('cards');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(48219);
  const [isCopiedJson, setIsCopiedJson] = useState(false);

  // Bento Interactive States
  const [activeBentoWord, setActiveBentoWord] = useState(7);
  const [bentoRatio, setBentoRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');

  const timelineRef = useRef<HTMLDivElement>(null);

  // Playhead smooth animation in hero preview
  useEffect(() => {
    if (!isPlayingDemo) return;
    const interval = setInterval(() => {
      setPlayheadPos((prev) => (prev >= 88 ? 12 : prev + 0.35));
    }, 50);
    return () => clearInterval(interval);
  }, [isPlayingDemo]);

  // Handle timeline scrubbing
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPos = Math.max(12, Math.min(88, (clickX / rect.width) * 100));
    setPlayheadPos(newPos);
  };

  // Kinetic Subtitle Word Computation for Shorts
  const wordsGroup1 = ['STOP', 'WASTING', 'HOURS', 'ON', 'MANUAL', 'CUTS'];
  const wordsGroup2 = ['VID-EDI', 'EXTRACTS', 'VIRAL', 'SHORTS', 'IN', 'SECONDS'];
  const isFirstHalf = playheadPos < 50;
  const currentWords = isFirstHalf ? wordsGroup1 : wordsGroup2;
  const progressWithinHalf = isFirstHalf
    ? (playheadPos - 12) / 38
    : (playheadPos - 50) / 38;
  const activeWordIndex = Math.min(
    currentWords.length - 1,
    Math.max(0, Math.floor(progressWithinHalf * currentWords.length))
  );

  // Formatted Timecode based on playheadPos
  const currentTimeSeconds = (playheadPos / 100) * 74.5;
  const formattedMinutes = Math.floor(currentTimeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const formattedSeconds = Math.floor(currentTimeSeconds % 60)
    .toString()
    .padStart(2, '0');
  const formattedDeciseconds = Math.floor((currentTimeSeconds % 1) * 10);
  const formattedTimecode = `${formattedMinutes}:${formattedSeconds}.${formattedDeciseconds}`;

  // Interactive Like Button Handler
  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  // Copy JSON handler
  const handleCopyJson = () => {
    navigator.clipboard?.writeText(JSON.stringify(getMockJsonSpec(activeTab), null, 2));
    setIsCopiedJson(true);
    setTimeout(() => setIsCopiedJson(false), 2000);
  };

  function getMockJsonSpec(tab: 'shorts' | 'pauses' | 'captions') {
    if (tab === 'shorts') {
      return {
        version: '1.0',
        operation: 'setAspectRatio',
        parameters: {
          aspectRatio: '9:16',
          cropStrategy: 'autoFaceCenter',
          sourceClipId: 'clip-02-dialogue',
          window: { startMs: 18400, endMs: 60400 },
          subtitles: { preset: captionPreset, highlightColor: '#FDE047' }
        },
        aiConfidence: 0.96,
        reasoning: 'Detected high-cadence spoken hook from 00:18.4 to 01:00.4 (96% viral retention score).'
      };
    }
    if (tab === 'pauses') {
      return {
        version: '1.0',
        operation: 'removeSegment',
        parameters: {
          clipId: 'clip-01-intro',
          silenceWindow: { startMs: 14200, endMs: 16800 },
          preserveBufferMs: 150,
          rippleDelete: true
        },
        aiConfidence: 0.94,
        reasoning: 'Identified 2.6s silence gap with 150ms speech buffer preserved for human breathing cadence.'
      };
    }
    return {
      version: '1.0',
      operation: 'generateCaptions',
      parameters: {
        preset: captionPreset,
        fontSizePx: 28,
        uppercase: true,
        wordLevelSync: true,
        whisperModel: 'groq-whisper-large-v3'
      },
      aiConfidence: 0.98,
      reasoning: 'Generated synchronized word-level timestamps with 0.05s precision.'
    };
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[var(--accent-coral)]/20 selection:text-[var(--accent-coral)] overflow-y-auto">
      {/* Background Ambient Glow — Apple HIG Liquid Glass */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-[var(--accent-coral)]/10 via-[var(--accent-primary)]/5 to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-[var(--accent-primary)]/5 rounded-full blur-3xl" />
        <div className="absolute top-2/3 -right-40 w-[600px] h-[600px] bg-[var(--accent-coral)]/5 rounded-full blur-3xl" />
      </div>

      {/* Apple-grade Liquid Glass Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[var(--bg-surface)]/80 border-b border-[var(--border-subtle)] shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Version Status */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--accent-coral)] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[var(--accent-coral)]/20">
              <Film className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                Vid-Edi
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                v0.1 Public Alpha
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--text-secondary)]">
            <a href="#hero-stage" className="hover:text-[var(--text-primary)] transition-colors">
              Product Studio
            </a>
            <a href="#bento-features" className="hover:text-[var(--text-primary)] transition-colors">
              Features
            </a>
            <a href="#differentiators" className="hover:text-[var(--text-primary)] transition-colors">
              Architecture
            </a>
            <a href="#workflow" className="hover:text-[var(--text-primary)] transition-colors">
              5-Step Flow
            </a>
            <a href="#comparison" className="hover:text-[var(--text-primary)] transition-colors">
              Comparison
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <a
              href="https://github.com/AwadhDhoot23/vid-edi"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-xs font-semibold hover:border-[var(--text-secondary)] transition-all shadow-2xs"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-[var(--text-tertiary)]" />
            </a>

            <button
              type="button"
              onClick={onLaunchStudio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-95 active:scale-[0.98] transition-all shadow-sm shadow-[var(--accent-primary)]/25 cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Launch Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 pb-16">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/25 text-[var(--accent-coral)] text-xs font-semibold mb-6 shadow-2xs backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="tracking-wide">Open-Source AI Video Studio • Zero Black Boxes</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.12] max-w-4xl">
            Edit spoken videos in <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[var(--accent-coral)] via-rose-500 to-amber-500 bg-clip-text text-transparent">
              plain language.
            </span>{' '}
            Review every cut.
          </h1>

          <p className="mt-6 text-base sm:text-xl text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Stop scrubbing 45-minute timelines. Describe your edits naturally. Vid-Edi proposes
            transparent changes to a real multi-track timeline and renders deterministically with FFmpeg.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onLaunchStudio}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--accent-coral)] to-rose-600 text-white font-semibold text-sm sm:text-base hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-[var(--accent-coral)]/25 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Open Studio Workspace</span>
            </button>

            <a
              href="https://github.com/AwadhDhoot23/vid-edi"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] font-semibold text-sm sm:text-base hover:bg-[var(--bg-surface)] active:scale-[0.98] transition-all shadow-xs"
            >
              <span>Explore GitHub Repo</span>
              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)]" />
            </a>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--text-tertiary)]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>100% Free & Open Source</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Local Privacy (No Raw Video to LLMs)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Deterministic FFmpeg Rendering</span>
            </div>
          </div>
        </section>

        {/* HERO STAGE — Interactive Studio Preview Canvas */}
        <section id="hero-stage" className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          {/* Direct Manipulation Prompt Selector (Apple-Motion / Direct Ergonomics) */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mr-2 hidden sm:inline">
              Interactive Demos:
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('shorts');
                setPlayheadPos(36);
              }}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'shorts'
                  ? 'bg-[var(--accent-primary)] text-white shadow-xs scale-105'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--text-secondary)]'
              }`}
            >
              <span>📱</span>
              <span>"Extract 9:16 Shorts with Viral Captions"</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('pauses');
                setPlayheadPos(28);
              }}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pauses'
                  ? 'bg-[var(--accent-coral)] text-white shadow-xs scale-105'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--text-secondary)]'
              }`}
            >
              <span>⚡</span>
              <span>"Remove Dead-Air Silences & Hesitations"</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('captions');
                setPlayheadPos(45);
              }}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'captions'
                  ? 'bg-amber-500 text-white shadow-xs scale-105'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--text-secondary)]'
              }`}
            >
              <span>💬</span>
              <span>"Style Dynamic Word-Synced Subtitles"</span>
            </button>
          </div>

          <div className="relative rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Window Chrome Header Bar */}
            <div className="h-12 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs font-mono text-[var(--text-tertiary)] hidden sm:inline">
                  videdi-studio://project_podcast_ep42
                </span>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center gap-1 bg-[var(--bg-base)] p-1 rounded-xl border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('shorts')}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'shorts'
                      ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  📱 Find Shorts (9:16)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pauses')}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'pauses'
                      ? 'bg-[var(--accent-coral)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  ⚡ Remove Pauses
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('captions')}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'captions'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  💬 Dynamic Captions
                </button>
              </div>

              {/* Play/Pause Demo Toggle */}
              <button
                type="button"
                onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                {isPlayingDemo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isPlayingDemo ? 'Pause' : 'Play'}</span>
              </button>
            </div>

            {/* Showcase Stage Interior */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
              {/* Left Column: Video Preview & Subtitles */}
              <div className="lg:col-span-8 bg-neutral-950 p-6 flex flex-col justify-between relative overflow-hidden">
                {/* Floating Inspection Pill */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 flex-wrap">
                  <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs px-2.5 py-1 rounded-full font-mono">
                    {formattedTimecode} / 01:14.5 • 1080p
                  </span>
                  {activeTab === 'shorts' && (
                    <span className="bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Vertical 9:16 Crop • 96% Viral Hook Score
                    </span>
                  )}
                  {activeTab === 'pauses' && (
                    <span className="bg-rose-500/20 backdrop-blur-md text-rose-300 border border-rose-500/40 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Scissors className="w-3 h-3" />
                      Detected 3 dead-air pauses (total -6.8s)
                    </span>
                  )}
                  {activeTab === 'captions' && (
                    <span className="bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      Preset: {captionPreset.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Video Preview Center Stage */}
                <div className="my-auto py-4 flex flex-col items-center justify-center text-center">
                  {activeTab === 'shorts' ? (
                    /* World-Class iPhone 16 Pro Smartphone 9:16 Mockup */
                    <div className="relative w-[280px] h-[415px] rounded-[38px] bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-800 border-[3.5px] border-neutral-600/90 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden ring-1 ring-white/10">
                      {/* Top iOS Status Bar */}
                      <div className="relative z-30 px-3 pt-0.5 flex items-center justify-between text-[10px] font-mono text-white/90">
                        <span className="font-semibold">9:41</span>
                        {/* Dynamic Island Pill */}
                        <div className="w-16 h-3.5 bg-black rounded-full flex items-center justify-center gap-1 shadow-inner">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                          <div className="w-1 h-1 rounded-full bg-blue-900/60" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px]">5G</span>
                          <div className="w-3.5 h-2 rounded-[2px] border border-white/80 p-0.5 flex items-center">
                            <div className="w-2 h-1 bg-white rounded-2xs" />
                          </div>
                        </div>
                      </div>

                      {/* Video Content Canvas inside phone */}
                      <div className="absolute inset-2 top-2 rounded-[30px] bg-gradient-to-tr from-slate-950 via-neutral-900 to-indigo-950 overflow-hidden flex flex-col justify-between p-3">
                        {/* Studio Acoustic Panels Pattern (Subtle Background) */}
                        <div className="absolute inset-0 opacity-15 pointer-events-none">
                          <div className="w-full h-full bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                        </div>

                        {/* Top Camera HUD Overlay */}
                        <div className="relative z-20 flex items-center justify-between text-[10px] font-mono text-white/80 pt-5">
                          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span>REC {formattedTimecode}</span>
                          </div>
                          <span className="bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10 text-[9px]">
                            4K 60FPS
                          </span>
                        </div>

                        {/* Speaker & Mic Visual Centerpiece */}
                        <div className="my-auto relative flex flex-col items-center justify-center">
                          {/* Face-Tracking AI Reticle (Apple HIG Focus Box) */}
                          <div className="relative w-28 h-28 rounded-2xl border-2 border-emerald-400/80 bg-emerald-500/5 p-2 flex flex-col items-center justify-center shadow-lg transition-all duration-300">
                            {/* Reticle Corner Marks */}
                            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400" />
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400" />
                            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400" />
                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />

                            {/* Speaker Avatar Illustration */}
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-[var(--accent-coral)] to-purple-600 p-0.5 shadow-xl">
                              <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center relative overflow-hidden">
                                <span className="text-2xl select-none">🎙️</span>
                              </div>
                            </div>

                            {/* Live Tracking Label */}
                            <span className="absolute -bottom-2 bg-emerald-500 text-neutral-950 font-mono font-bold text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-sm">
                              Host 1 • 99%
                            </span>
                          </div>

                          {/* Sound Spectrum Reactive Waveform */}
                          <div className="flex items-center gap-1 mt-3">
                            {[12, 24, 16, 28, 20, 32, 18, 26, 14].map((h, i) => (
                              <span
                                key={i}
                                className="w-0.5 bg-gradient-to-t from-[var(--accent-coral)] to-amber-400 rounded-full transition-all duration-75"
                                style={{
                                  height: isPlayingDemo ? `${h}px` : '4px',
                                  opacity: isPlayingDemo ? 0.9 : 0.3
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Kinetic Viral Subtitles (Corrected, High-Impact & Ultra-Legible with Right Social Clearance) */}
                        <div className="z-20 text-center mb-7 pl-1 pr-9">
                          {captionPreset === 'viral' ? (
                            /* Hormozi-Style Kinetic Pop Subtitle */
                            <div className="inline-block bg-neutral-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-2xl max-w-[175px]">
                              <p className="text-[9px] font-black tracking-wider uppercase text-amber-400 mb-0.5">
                                {isFirstHalf ? '⚡ 1-CLICK HOOK' : '🔥 VIRAL RETENTION'}
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {currentWords.map((word, idx) => {
                                  const isCurrent = idx === activeWordIndex;
                                  return (
                                    <span
                                      key={idx}
                                      className={`text-[11px] font-black uppercase transition-all duration-100 ${
                                        isCurrent
                                          ? 'bg-amber-400 text-neutral-950 px-1 rounded shadow-sm scale-110 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]'
                                          : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                                      }`}
                                    >
                                      {word}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : captionPreset === 'minimal' ? (
                            /* Apple Minimal Translucent Pill (Multi-line wrapped cleanly) */
                            <div className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 bg-neutral-950/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20 text-white font-medium text-[10px] shadow-xl max-w-[170px] text-center leading-snug">
                              <span className="opacity-70 text-amber-400">“</span>
                              {currentWords.map((w, idx) => (
                                <span
                                  key={idx}
                                  className={
                                    idx === activeWordIndex
                                      ? 'text-amber-300 font-bold underline decoration-amber-400 decoration-1'
                                      : 'text-neutral-200'
                                  }
                                >
                                  {w.toLowerCase()}
                                </span>
                              ))}
                              <span className="opacity-70 text-amber-400">”</span>
                            </div>
                          ) : (
                            /* Cyber Neon Cyan */
                            <div className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 bg-neutral-950/85 backdrop-blur-md px-3 py-1 rounded-lg border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)] max-w-[170px] text-center">
                              {currentWords.map((word, idx) => (
                                <span
                                  key={idx}
                                  className={`text-[10px] font-mono font-bold ${
                                    idx === activeWordIndex
                                      ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)] scale-105'
                                      : 'text-neutral-400'
                                  }`}
                                >
                                  {word}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Social Sidebar Actions */}
                        <div className="absolute right-2 bottom-12 z-20 flex flex-col items-center gap-2.5 text-white/95">
                          {/* Channel Avatar with Follow Plus */}
                          <div className="relative mb-1">
                            <div className="w-8 h-8 rounded-full border border-white/60 bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5">
                              <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-[10px]">
                                🎬
                              </div>
                            </div>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-bold">
                              +
                            </div>
                          </div>

                          {/* Heart / Like Button (Clickable!) */}
                          <button
                            type="button"
                            onClick={handleLike}
                            className="flex flex-col items-center cursor-pointer group"
                            title="Click to like"
                          >
                            <div
                              className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
                                isLiked
                                  ? 'bg-rose-500/30 text-rose-500 scale-110'
                                  : 'bg-black/40 text-white group-hover:text-rose-400'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-500' : ''}`} />
                            </div>
                            <span className="text-[9px] font-mono mt-0.5">
                              {(likeCount / 1000).toFixed(1)}K
                            </span>
                          </button>

                          {/* Comments */}
                          <div className="flex flex-col items-center">
                            <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-md">
                              <MessageCircle className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] font-mono mt-0.5">1.4K</span>
                          </div>

                          {/* Bookmark */}
                          <div className="flex flex-col items-center">
                            <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-md">
                              <Bookmark className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] font-mono mt-0.5">8.9K</span>
                          </div>

                          {/* Share */}
                          <div className="flex flex-col items-center">
                            <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-md">
                              <Share2 className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] font-mono mt-0.5">12K</span>
                          </div>
                        </div>

                        {/* Audio track tag & Creator Handle */}
                        <div className="absolute left-3 bottom-2 z-20 flex flex-col gap-0.5 text-left text-neutral-300 max-w-[155px]">
                          <span className="text-[10px] font-bold text-white tracking-tight flex items-center gap-1">
                            @videdi.studio
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 text-white inline-flex items-center justify-center text-[7px]">
                              ✓
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5 text-[9px] text-neutral-400">
                            <Disc3 className="w-3 h-3 text-amber-400 animate-spin" />
                            <span className="truncate">Original Audio • 48kHz</span>
                          </div>
                        </div>

                        {/* Video Scrub Progress Line */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                          <div
                            className="h-full bg-rose-500 transition-all duration-75"
                            style={{ width: `${playheadPos}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 16:9 Widescreen Studio Mode for Pauses & Captions */
                    <div className="w-full max-w-lg aspect-video rounded-2xl border border-white/15 shadow-2xl relative flex flex-col justify-between bg-gradient-to-tr from-neutral-900 via-neutral-850 to-neutral-900 overflow-hidden p-4">
                      {/* Studio Scene Overlay */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>16:9 MASTER TIMELINE</span>
                        </span>
                        <span>00:14.2 / 01:14.5</span>
                      </div>

                      {/* Studio Presenter Illustration */}
                      <div className="my-auto flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/90 shadow-md border border-white/20">
                            <Film className="w-8 h-8 text-[var(--accent-coral)]" />
                          </div>

                          {/* Silence Cut Banner if in pauses tab */}
                          {activeTab === 'pauses' && playheadPos >= 22 && playheadPos <= 45 && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg animate-bounce">
                              <Scissors className="w-3 h-3" />
                              <span>2.6s DEAD AIR TRIMMED</span>
                            </div>
                          )}
                        </div>

                        {/* Subtitle Display */}
                        <div className="mt-4 text-center max-w-md">
                          {activeTab === 'captions' ? (
                            captionPreset === 'viral' ? (
                              <span className="bg-black/90 backdrop-blur-md text-white font-extrabold text-sm px-4 py-1.5 rounded-xl border border-amber-400/40 shadow-xl inline-block">
                                <span className="text-amber-400">"REVOLUTIONIZE</span> VIDEO EDITING"
                              </span>
                            ) : captionPreset === 'minimal' ? (
                              <span className="bg-white/20 backdrop-blur-md text-white font-medium text-xs px-4 py-1.5 rounded-full border border-white/30 shadow-md inline-block">
                                "Natural language video editing, fully deterministic."
                              </span>
                            ) : (
                              <span className="bg-neutral-950/80 backdrop-blur-md text-cyan-300 font-mono text-xs px-4 py-1.5 rounded-lg border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.4)] inline-block">
                                vid-edi: edit transparently
                              </span>
                            )
                          ) : (
                            <span className="bg-black/80 backdrop-blur-md text-neutral-200 text-xs px-3.5 py-1.5 rounded-lg border border-white/10 shadow-md inline-block">
                              "Cut long pauses without losing breathing room"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Audio Level Strip */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-2 border-t border-white/10">
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-emerald-400" />
                          <span>-14 LUFS (Balanced)</span>
                        </span>
                        <span>Track: Voice_Master_48k</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Multi-Track Timeline Strip (Directly Scrubbable) */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5 px-1">
                    <span>TIMELINE (CLICK TO SCRUB)</span>
                    <span className="text-amber-400 font-semibold">{formattedTimecode}</span>
                  </div>

                  <div
                    ref={timelineRef}
                    onClick={handleTimelineClick}
                    className="relative h-20 bg-neutral-900/90 rounded-xl border border-white/15 p-2 overflow-hidden cursor-pointer select-none group"
                    title="Click anywhere to jump playhead"
                  >
                    {/* Scrub Playhead Indicator */}
                    <div
                      className="absolute top-0 bottom-0 z-30 pointer-events-none transition-transform duration-75"
                      style={{ left: `${playheadPos}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="w-3 h-3 bg-[var(--accent-coral)] rotate-45 mx-auto shadow-md" />
                      <div className="w-[1.5px] h-full bg-[var(--accent-coral)] mx-auto shadow-sm" />
                    </div>

                    {/* Track 1: Video */}
                    <div className="h-6 mb-1.5 flex gap-1 relative">
                      <div className="h-full w-[22%] rounded bg-sky-500/30 border border-sky-500/50 flex items-center px-2 text-[10px] text-sky-200 font-mono">
                        V1: Hook
                      </div>
                      <div className="h-full w-[10%] rounded bg-rose-500/40 border border-rose-500/70 border-dashed flex items-center justify-center text-[9px] text-rose-200 font-mono">
                        ✂️ Trim
                      </div>
                      <div className="h-full w-[40%] rounded bg-sky-500/30 border border-sky-500/50 flex items-center px-2 text-[10px] text-sky-200 font-mono">
                        V1: Core Dialogue
                      </div>
                      <div className="h-full w-[28%] rounded bg-sky-500/30 border border-sky-500/50 flex items-center px-2 text-[10px] text-sky-200 font-mono">
                        V1: Outro CTA
                      </div>
                    </div>

                    {/* Track 2: Audio */}
                    <div className="h-6 flex gap-1">
                      <div className="h-full w-[22%] rounded bg-indigo-500/30 border border-indigo-500/50 flex items-center px-2 text-[10px] text-indigo-200 font-mono">
                        A1: Voice
                      </div>
                      <div className="h-full w-[10%] rounded bg-transparent border border-neutral-700/50 border-dotted flex items-center justify-center text-[9px] text-neutral-500 font-mono">
                        (Silence)
                      </div>
                      <div className="h-full w-[40%] rounded bg-indigo-500/30 border border-indigo-500/50 flex items-center px-2 text-[10px] text-indigo-200 font-mono">
                        A1: Voice
                      </div>
                      <div className="h-full w-[28%] rounded bg-indigo-500/30 border border-indigo-500/50 flex items-center px-2 text-[10px] text-indigo-200 font-mono">
                        A2: Lofi Bed
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Proposal Inspector & Allowlisted Spec */}
              <div className="lg:col-span-4 bg-[var(--bg-surface)] p-5 border-l border-[var(--border-subtle)] flex flex-col justify-between">
                <div>
                  {/* Proposal Inspector Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-[var(--accent-coral)]/10 text-[var(--accent-coral)]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        AI Proposal Inspector
                      </span>
                    </div>

                    {/* View Switcher: Cards vs JSON */}
                    <div className="flex items-center gap-1 bg-[var(--bg-elevated)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setInspectorView('cards')}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium transition-all cursor-pointer ${
                          inspectorView === 'cards'
                            ? 'bg-[var(--accent-coral)] text-white shadow-2xs'
                            : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorView('json')}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium transition-all cursor-pointer flex items-center gap-1 ${
                          inspectorView === 'json'
                            ? 'bg-[var(--accent-coral)] text-white shadow-2xs'
                            : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Code2 className="w-2.5 h-2.5" />
                        JSON
                      </button>
                    </div>
                  </div>

                  {inspectorView === 'cards' ? (
                    /* Visual Operation Cards */
                    <div className="mt-4 flex flex-col gap-3">
                      {activeTab === 'shorts' ? (
                        <>
                          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                setAspectRatio (9:16 Shorts)
                              </span>
                              <span className="font-mono text-[10px] text-emerald-600">96% score</span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              Detected self-contained viral hook from 00:18.4 to 01:00.4 (42s duration).
                            </p>
                            <div className="mt-2.5 flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Ready for Export
                              </span>
                              <span className="text-[9px] font-mono text-neutral-400">cropRegion: center</span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-[var(--accent-coral)]">
                                Select Subtitle Style:
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                                Kinetic
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 mt-2">
                              {(['viral', 'minimal', 'neon'] as const).map((style) => (
                                <button
                                  key={style}
                                  type="button"
                                  onClick={() => setCaptionPreset(style)}
                                  className={`text-[10px] py-1.5 rounded-md border font-medium capitalize transition-all cursor-pointer ${
                                    captionPreset === style
                                      ? 'bg-amber-500 text-white border-amber-500 shadow-2xs font-bold'
                                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {style}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : activeTab === 'pauses' ? (
                        <>
                          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                removeSegment (Silence)
                              </span>
                              <span className="font-mono text-[10px] text-emerald-600">94% conf</span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              00:14.2 → 00:16.8 (2.6s silence trimmed with 150ms speech buffer).
                            </p>
                            <div className="mt-2.5 flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                <CheckCheck className="w-3 h-3" />
                                Accepted by Human
                              </span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-[var(--accent-coral)]">
                                removeSegment (Retake)
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                                89% conf
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              00:32.5 → 00:35.1 (Speaker checked notes before deliverable line).
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 shadow-xs">
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mb-1">
                              Select Subtitle Style:
                            </span>
                            <div className="grid grid-cols-3 gap-1.5 mt-2">
                              {(['viral', 'minimal', 'neon'] as const).map((style) => (
                                <button
                                  key={style}
                                  type="button"
                                  onClick={() => setCaptionPreset(style)}
                                  className={`text-[10px] py-1.5 rounded-md border font-medium capitalize transition-all cursor-pointer ${
                                    captionPreset === style
                                      ? 'bg-amber-500 text-white border-amber-500 shadow-2xs font-bold'
                                      : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {style}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
                            <span className="text-xs font-semibold text-[var(--text-primary)] block mb-1">
                              Word-Level Alignment
                            </span>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              Every word is synced via Groq Whisper timestamps. Download as SRT or burn directly into video.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    /* Allowlisted JSON Spec Inspection (Transparency Showcase) */
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-tertiary)] mb-1">
                        <span>ALLOWLISTED_SPEC.JSON</span>
                        <button
                          type="button"
                          onClick={handleCopyJson}
                          className="flex items-center gap-1 text-[var(--accent-coral)] hover:underline cursor-pointer"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>{isCopiedJson ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-xl bg-neutral-950 text-neutral-200 text-[10px] font-mono overflow-x-auto max-h-[220px] border border-white/10 leading-relaxed">
                        {JSON.stringify(getMockJsonSpec(activeTab), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Direct CTA into Studio */}
                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={onLaunchStudio}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent-coral)] text-white text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
                  >
                    <span>Launch Studio with Your Own Media</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO GRID — Features Crafted with Apple HIG & Swiss Style */}
        <section id="bento-features" className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Designed for Human Creators. <br className="hidden sm:inline" /> Powered by Deterministic Code.
            </h2>
            <p className="text-base text-[var(--text-secondary)] mt-3 max-w-xl mx-auto">
              No bloated clutter. Just the precise tools you need to take talking-head footage from raw recording to published cut.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Transcript is the Map */}
            <div className="md:col-span-2 p-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs flex flex-col justify-between hover:border-[var(--accent-coral)]/30 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center mb-4">
                  <Type className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-xl mb-2">The Transcript is Your Edit Map</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg">
                  Every spoken word has exact sub-second timestamps. Click any word in the transcript to jump the video playhead instantly, or delete a sentence to remove that cut from the video.
                </p>
              </div>

              {/* Micro Interactive Transcript Demo */}
              <div className="mt-6 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="text-[10px] font-mono text-[var(--text-tertiary)] mb-2">
                  CLICK ANY WORD TO TEST PLAYHEAD JUMP:
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    'Welcome',
                    'back',
                    'to',
                    'the',
                    'channel.',
                    'Today',
                    "we're",
                    'cutting',
                    'our',
                    'editing',
                    'time',
                    'by',
                    '80%.'
                  ].map((word, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveBentoWord(i)}
                      className={`px-2 py-1 rounded-md font-mono transition-all cursor-pointer ${
                        i === activeBentoWord
                          ? 'bg-[var(--accent-coral)] text-white font-semibold shadow-xs scale-105'
                          : i >= 7 && i <= 10
                          ? 'bg-[var(--accent-coral)]/15 text-[var(--accent-coral)] font-medium border border-[var(--accent-coral)]/30'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--text-secondary)]'
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bento Card 2: 9:16 Shorts Engine */}
            <div className="p-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs flex flex-col justify-between hover:border-purple-500/30 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
                  <Film className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-xl mb-2">1-Click Shorts (9:16)</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  The AI identifies self-contained, high-engagement segments and exports vertical clips formatted with animated captions.
                </p>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-1.5 mb-2">
                  {(['9:16', '1:1', '16:9'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setBentoRatio(ratio)}
                      className={`text-xs px-2.5 py-1 rounded-md font-mono transition-all cursor-pointer ${
                        bentoRatio === ratio
                          ? 'bg-purple-600 text-white font-semibold'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
                <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">
                    {bentoRatio} Vertical Framing
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                    96% viral score
                  </span>
                </div>
              </div>
            </div>

            {/* Bento Card 3: Silence Detection */}
            <div className="p-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs flex flex-col justify-between hover:border-rose-500/30 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
                  <Scissors className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-xl mb-2">Smart Silence Stripper</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Removes awkward hesitations and dead air while maintaining 150ms of natural breathing padding so cuts sound human.
                </p>
              </div>

              <div className="mt-6 p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-500">Avg. Silence Saved:</span>
                  <span className="text-rose-500 font-bold">-14.2 mins / hr</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 w-[24%]" />
                </div>
              </div>
            </div>

            {/* Bento Card 4: Audio Normalization */}
            <div className="md:col-span-2 p-8 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs flex flex-col justify-between hover:border-amber-500/30 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                  <Music className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-xl mb-2">Studio-Grade Audio & -14 LUFS Normalization</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg">
                  Dialogue leveling, background music ducking, and YouTube standard -14 LUFS loudness normalization powered directly by deterministic FFmpeg audio filter graphs.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-tertiary)]">Target:</span> -14 LUFS
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-tertiary)]">Channels:</span> Stereo 48kHz
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-emerald-600 font-semibold">
                  ✓ Broadcast Ready
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Architectural Commitments */}
        <section id="differentiators" className="max-w-6xl mx-auto px-6 py-20 border-t border-[var(--border-subtle)]">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Architectural Commitments, Not Gimmicks
            </h2>
            <p className="text-base text-[var(--text-secondary)] mt-3 max-w-xl mx-auto">
              Built with open-source determinism, human control, and zero cloud lock-in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-7 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-sm hover:border-[var(--accent-primary)]/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">1. 100% Visible Edits</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Every AI cut displays exact start/end timecodes, reasoning, and confidence metrics.
                No silent black-box modifications.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-sm hover:border-[var(--accent-coral)]/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">2. Human Decides</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                The AI only suggests. You accept, modify, reject, or undo any operation with a full
                granular operation history stack.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-sm hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-5">
                <FileCode className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">3. Reproducible JSON</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Edit plans export as standardized JSON. Re-render the exact same video identically
                anywhere, anytime, deterministically.
              </p>
            </div>

            <div className="p-7 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-sm hover:border-amber-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">4. Zero Cloud Waste</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Deterministic local FFmpeg for encoding. LLMs never process raw video pixels or audio
                buffers — zero cloud subscription lock-in.
              </p>
            </div>
          </div>
        </section>

        {/* 5-Step Workflow Section */}
        <section id="workflow" className="max-w-6xl mx-auto px-6 py-16 border-t border-[var(--border-subtle)]">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold tracking-tight">The 5-Step Vid-Edi Workflow</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              From raw footage to published upload in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[
              { num: '01', title: 'Import', desc: 'Drop MP4, WebM, MOV. FFprobe inspects properties.' },
              { num: '02', title: 'Understand', desc: 'Whisper word-level timestamps + silence maps.' },
              { num: '03', title: 'Instruct', desc: '"Remove pauses, add subtitles, make vertical".' },
              { num: '04', title: 'Review', desc: 'Accept, reject, or fine-tune operation cards.' },
              { num: '05', title: 'Export', desc: 'Deterministic FFmpeg render + SRT + JSON.' }
            ].map((step) => (
              <div
                key={step.num}
                className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col justify-between hover:border-[var(--accent-coral)]/30 transition-all"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-[var(--accent-coral)]">
                    {step.num}
                  </span>
                  <h4 className="font-bold text-base mt-2 mb-1">{step.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table Section */}
        <section id="comparison" className="max-w-5xl mx-auto px-6 py-20 border-t border-[var(--border-subtle)]">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight">How Vid-Edi Compares</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Why creators and developers choose open-source transparent editing.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="p-4 font-semibold">Capability</th>
                  <th className="p-4 font-bold text-[var(--accent-coral)]">Vid-Edi (OSS)</th>
                  <th className="p-4 font-semibold">Descript</th>
                  <th className="p-4 font-semibold">OpusClip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                <tr>
                  <td className="p-4 font-medium">Transparent AI Reasoning</td>
                  <td className="p-4 text-emerald-600 font-semibold">✅ Yes (Exact Timestamps & Reasons)</td>
                  <td className="p-4 text-neutral-500">❌ Opaque AI Edits</td>
                  <td className="p-4 text-neutral-500">❌ Black-box Cuts</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Pricing Model</td>
                  <td className="p-4 text-emerald-600 font-semibold">✅ 100% Free & Self-Hosted</td>
                  <td className="p-4 text-neutral-500">$24 to $40 / month</td>
                  <td className="p-4 text-neutral-500">Credit limits & paid tiers</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Reproducible JSON Edit Plans</td>
                  <td className="p-4 text-emerald-600 font-semibold">✅ Yes (Standardized Schema)</td>
                  <td className="p-4 text-neutral-500">❌ Proprietary Cloud Format</td>
                  <td className="p-4 text-neutral-500">❌ None</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Local Media Privacy</td>
                  <td className="p-4 text-emerald-600 font-semibold">✅ Videos never uploaded to LLMs</td>
                  <td className="p-4 text-neutral-500">Cloud Storage Required</td>
                  <td className="p-4 text-neutral-500">Cloud Storage Required</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Final Call to Action Banner */}
        <section className="max-w-5xl mx-auto px-6 py-16 mb-12">
          <div className="rounded-3xl bg-gradient-to-tr from-[var(--bg-surface)] to-[var(--bg-elevated)] border border-[var(--border-strong)] p-10 sm:p-14 text-center relative overflow-hidden shadow-xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to edit at the speed of thought?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] max-w-md mx-auto">
              Open the studio workspace in your browser right now and load our interactive podcast demo.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onLaunchStudio}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-[var(--accent-coral)] text-white font-bold text-base hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-[var(--accent-coral)]/30 cursor-pointer"
              >
                <span>Launch Vid-Edi Studio</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-8 px-6 text-center text-xs text-[var(--text-tertiary)]">
        <p>© 2026 Vid-Edi. Built with Vite, React 19, Tailwind CSS, and FFmpeg.</p>
      </footer>
    </div>
  );
}
