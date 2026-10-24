import React from 'react';
import { Sparkles, Film, ArrowRight, CheckCircle2, ShieldCheck, Zap, Sliders, Play } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-coral)]/15 border border-[var(--accent-coral)]/30 flex items-center justify-center text-[var(--accent-coral)]">
              <Film className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">Vid-Edi</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-medium border border-[var(--accent-primary)]/20">
              Open Source
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/AwadhDhoot23/vid-edi"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              GitHub
            </a>
            <a
              href="http://localhost:5173"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-semibold hover:opacity-90 transition-all shadow-xs"
            >
              Open Studio
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/25 text-[var(--accent-coral)] text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Edit Planner with Zero Black Boxes</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.15]">
            Edit spoken videos with <br className="hidden sm:inline" />
            <span className="text-[var(--accent-coral)]">plain language</span>, not hours of scrubbing.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Describe edits naturally. The AI proposes transparent, inspectable changes to a real
            timeline. A deterministic media engine renders your video with zero cloud waste.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="http://localhost:5173"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--accent-coral)] text-white font-semibold text-base hover:opacity-90 transition-all shadow-sm active:scale-98"
            >
              <Play className="w-4 h-4 fill-current" />
              Launch Studio Workspace
            </a>
            <a
              href="#differentiators"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] font-semibold text-base hover:bg-[var(--bg-surface)] transition-all"
            >
              How It Works
            </a>
          </div>
        </section>

        {/* 4 Architectural Differentiators */}
        <section id="differentiators" className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Our 4 Architectural Commitments
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Engineered from the ground up to respect human control and open-source determinism.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">1. Visible AI Edits</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Every AI proposal shows exact source timestamps, reasons, and confidence. No hidden
                silent cuts.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">2. Human Decides</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Every change can be accepted, rejected, fine-tuned, or undone with a complete
                operation history.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">3. Reproducible JSON</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Save projects as structured Edit Plan JSON. Render the exact same output on any
                machine anytime.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">4. Zero-Cost Engine</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Deterministic FFmpeg for rendering. AI only proposes text operations — never re-encodes
                raw video.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-8 px-6 text-center text-xs text-[var(--text-tertiary)]">
        <p>© 2026 Vid-Edi. Built with Turborepo, React 19, Next.js 15, and Vite.</p>
      </footer>
    </div>
  );
}
