# 🎬 Vid-Edi — Open-Source AI Video Studio

> **An open-source, AI-assisted video editor where you describe edits in plain language, the AI proposes transparent changes to a real timeline, and a deterministic media engine renders the final video.**

[![CI](https://github.com/AwadhDhoot23/vid-edi/actions/workflows/ci.yml/badge.svg)](https://github.com/AwadhDhoot23/vid-edi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-blue)](https://turbo.build/)

---

## 💡 The 4 Architectural Commitments

1. **🔍 Every AI change is visible:** Cuts show source time ranges, explanations, and confidence. No silent black-box edits.
2. **✋ Human control comes first:** Every proposal can be accepted, modified, rejected, or undone. The AI suggests; the human decides.
3. **📋 Edit plans are reproducible:** Save timeline operations + export settings as portable JSON. Re-render the same project identically.
4. **💰 Cost-conscious processing:** Deterministic FFmpeg for heavy media processing. AI only proposes operations — never generates or re-encodes footage.

---

## 🏗️ Repository Architecture

This repository is organized as a Turborepo + pnpm workspaces monorepo:

```
vid-edi/
├── apps/
│   ├── web/                    # Next.js 15 — Marketing Landing Page & SEO
│   └── studio/                 # Vite + React 19 — Studio Editor SPA (Timeline, Preview, AI)
├── packages/
│   ├── editor-engine/          # Timeline state, undo/redo, clip operations (framework-agnostic)
│   ├── ai-planner/             # AI provider adapters, Zod validation, prompt templates
│   ├── media-processing/       # FFmpeg/FFprobe wrappers & browser media inspector
│   ├── shared-types/           # TypeScript models shared across packages
│   ├── ui/                     # Design system (Warm Light + Dark themes, Tailwind CSS)
│   └── config/                 # Shared TypeScript & ESLint configs
├── workers/
│   ├── transcription/          # Whisper transcription worker
│   ├── render/                 # FFmpeg render worker
│   └── analysis/               # Scene detection & silence mapping
├── docker-compose.yml          # Redis & MongoDB for local development
└── turbo.json
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: `v22.x LTS`
- **pnpm**: `v12.x` (or `npm i -g pnpm`)
- **Docker**: (Optional, for local Redis & MongoDB)

### Installation

```bash
# Clone the repository
git clone https://github.com/AwadhDhoot23/vid-edi.git
cd vid-edi

# Install dependencies
pnpm install

# Start local dev services (Redis + MongoDB)
docker-compose up -d

# Start the development server (Studio & Web)
pnpm dev
```

- **Studio Editor**: [http://localhost:5173](http://localhost:5173)
- **Marketing Page**: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing & Verification

```bash
# Run unit & integration test suites
pnpm test

# Type-check all packages
pnpm build
```

---

## 📜 License
MIT License © 2026 Awadh Dhoot
