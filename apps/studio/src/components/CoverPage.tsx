import { useState, useEffect } from 'react';
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
  Laptop
} from 'lucide-react';
import { ThemeToggle } from '@vid-edi/ui';

interface CoverPageProps {
  onLaunchStudio: () => void;
}

export function CoverPage({ onLaunchStudio }: CoverPageProps) {
  const [activeTab, setActiveTab] = useState<'pauses' | 'shorts' | 'captions'>('pauses');
  const [isPlayingDemo, setIsPlayingDemo] = useState(true);
  const [playheadPos, setPlayheadPos] = useState(25);

  // Playhead animation in hero preview
  useEffect(() => {
    if (!isPlayingDemo) return;
    const interval = setInterval(() => {
      setPlayheadPos((prev) => (prev >= 88 ? 12 : prev + 0.5));
    }, 50);
    return () => clearInterval(interval);
  }, [isPlayingDemo]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[var(--accent-coral)]/20 selection:text-[var(--accent-coral)] overflow-y-auto">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-[var(--accent-coral)]/10 via-[var(--accent-primary)]/5 to-transparent rounded-full blur-3xl opacity-80" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-[var(--accent-primary)]/5 rounded-full blur-3xl" />
        <div className="absolute top-2/3 -right-40 w-[600px] h-[600px] bg-[var(--accent-coral)]/5 rounded-full blur-3xl" />
      </div>

      {/* Apple-grade Liquid Glass Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[var(--bg-surface)]/80 border-b border-[var(--border-subtle)] shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Status */}
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
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/25 text-[var(--accent-coral)] text-xs font-medium mb-6 shadow-2xs backdrop-blur-md">
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
        <section id="hero-stage" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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

              {/* Interactive Demo Tabs */}
              <div className="flex items-center gap-1 bg-[var(--bg-base)] p-1 rounded-xl border border-[var(--border-subtle)]">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
              {/* Left Column: Video Preview & Captions */}
              <div className="lg:col-span-8 bg-black/95 p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs px-2.5 py-1 rounded-full font-mono">
                    00:14.2 / 01:14.5 • 1080p60
                  </span>
                  {activeTab === 'pauses' && (
                    <span className="bg-rose-500/20 backdrop-blur-md text-rose-300 border border-rose-500/40 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Scissors className="w-3 h-3" />
                      Detected 3 dead-air pauses (total -6.8s)
                    </span>
                  )}
                  {activeTab === 'shorts' && (
                    <span className="bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-full">
                      Vertical 9:16 Crop Active • 94% Engagement Score
                    </span>
                  )}
                </div>

                <div className="my-auto py-8 flex flex-col items-center justify-center text-center">
                  <div
                    className={`transition-all duration-300 border border-white/20 shadow-2xl relative rounded-2xl flex items-center justify-center bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-900 ${
                      activeTab === 'shorts' ? 'w-56 h-88' : 'w-full max-w-lg aspect-video'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/90">
                      <Film className="w-7 h-7" />
                    </div>

                    <div className="absolute bottom-5 left-4 right-4 text-center">
                      <span className="bg-black/80 backdrop-blur-md text-white font-bold text-sm sm:text-base px-3 py-1.5 rounded-lg border border-white/10 shadow-lg">
                        {activeTab === 'captions' ? (
                          <>
                            <span className="text-amber-400">"Transparent</span> AI Edit Planner"
                          </>
                        ) : (
                          '"Cut long pauses without losing breathing room"'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline Strip */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="relative h-20 bg-neutral-900/90 rounded-xl border border-white/10 p-2 overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 z-30 pointer-events-none transition-transform duration-75"
                      style={{ left: `${playheadPos}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="w-2.5 h-2.5 bg-[var(--accent-coral)] rotate-45 mx-auto" />
                      <div className="w-[1.5px] h-full bg-[var(--accent-coral)] mx-auto" />
                    </div>

                    <div className="h-6 mb-1.5 flex gap-1 relative">
                      <div className="h-full w-[20%] rounded bg-sky-500/30 border border-sky-500/50 flex items-center px-2 text-[10px] text-sky-200">
                        Take 1
                      </div>
                      <div className="h-full w-[8%] rounded bg-rose-500/40 border border-rose-500/70 border-dashed flex items-center justify-center text-[9px] text-rose-200">
                        Cut
                      </div>
                      <div className="h-full w-[45%] rounded bg-sky-500/30 border border-sky-500/50 flex items-center px-2 text-[10px] text-sky-200">
                        Dialogue Main
                      </div>
                      <div className="h-full w-[25%] rounded bg-sky-500/30 border border-sky-500/50 flex items-center px-2 text-[10px] text-sky-200">
                        Outro
                      </div>
                    </div>

                    <div className="h-6 flex gap-1">
                      <div className="h-full w-[20%] rounded bg-indigo-500/30 border border-indigo-500/50 flex items-center px-2 text-[10px] text-indigo-200">
                        Audio
                      </div>
                      <div className="h-full w-[8%] rounded bg-transparent flex items-center justify-center text-[9px] text-neutral-500">
                        (Silence)
                      </div>
                      <div className="h-full w-[45%] rounded bg-indigo-500/30 border border-indigo-500/50 flex items-center px-2 text-[10px] text-indigo-200">
                        Audio Track 1
                      </div>
                      <div className="h-full w-[25%] rounded bg-indigo-500/30 border border-indigo-500/50 flex items-center px-2 text-[10px] text-indigo-200">
                        Outro Audio
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Proposals */}
              <div className="lg:col-span-4 bg-[var(--bg-surface)] p-5 border-l border-[var(--border-subtle)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-[var(--accent-coral)]/10 text-[var(--accent-coral)]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        AI Proposal Inspector
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                      Allowlisted JSON
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          removeSegment (Silence)
                        </span>
                        <span className="font-mono text-[10px] text-emerald-600/80">94% conf</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        00:14.2 → 00:16.8 (2.6s gap trimmed with 150ms natural speech buffer)
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Accepted by Human
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[var(--accent-coral)]">
                          setAspectRatio (9:16 Shorts)
                        </span>
                        <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                          91% conf
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Extracted 42s self-contained thought into vertical Shorts format.
                      </p>
                    </div>
                  </div>
                </div>

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

        {/* 4 Architectural Commitments */}
        <section id="differentiators" className="max-w-6xl mx-auto px-6 py-20">
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
              { num: '05', title: 'Export', desc: 'Deterministic FFmpeg render + SRT + JSON.' },
            ].map((step) => (
              <div
                key={step.num}
                className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex flex-col justify-between"
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
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-8 px-6 text-center text-xs text-[var(--text-tertiary)]">
        <p>© 2026 Vid-Edi. Built with Vite, React 19, Tailwind CSS, and FFmpeg.</p>
      </footer>
    </div>
  );
}
