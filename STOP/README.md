# AURA — AI Creative Director for Social Video

A next-generation video editing platform that transforms the creative workflow from track-based timeline editing to intent-driven AI creative direction.

## 🎯 Vision

**From:** Track-based timeline editor  
**To:** Intent-driven AI creative director

The timeline is an **output artifact**, not the primary interface. You describe what you want to make. AURA drafts it. You steer.

## 🚀 What Makes AURA Different

### Intent Layer
- Type or speak what you want → AI generates a full edit draft in < 30 seconds
- Natural language: *"Make a 60s TikTok hook from my gym footage, high energy, trending sound"*

### Moment Graph
- Card-based scene view replaces timeline as primary interface for non-technical users
- Each card = one AI-detected moment with engagement prediction score

### Platform-Native Intelligence
- Not one video exported to 5 platforms
- 5 genuinely different cuts with different pacing, captions, hooks, aspect ratios

### Brand Memory
- Learns your color palette, font, music taste, caption style from past projects
- Every AI generation keeps it on-brand

### Performance Feedback Loop
- Imports analytics → understands what cuts/hooks worked → applies to new edits
- Data-driven creative decisions

## 📦 Monorepo Structure

```
aura-monorepo/
├── apps/
│   ├── web/              # Next.js 14 App Router (main editor)
│   ├── desktop/          # Tauri shell around web app
│   └── mobile/           # Expo (quick edit mode)
├── packages/
│   ├── ui/               # Shared component library
│   └── types/            # Shared TypeScript types
├── backend/              # (To be implemented)
│   ├── services/
│   ├── models/
│   ├── routes/
│   └── workers/
└── turbo.json
```

## 🛠️ Tech Stack

### Frontend
- **Web:** Next.js 14 (App Router), React 18, TypeScript
- **Desktop:** Tauri (Rust + web frontend)
- **Mobile:** Expo (React Native)
- **UI:** Custom design system with Radix primitives
- **State:** Zustand + Yjs (CRDT for real-time collaboration)

### Backend (Planned)
- **Runtime:** Node.js + Python (for ML services)
- **Database:** PostgreSQL (Supabase)
- **Storage:** S3/R2 for assets
- **Queue:** BullMQ for job processing
- **Real-time:** Yjs + y-websocket
- **AI/ML:** PyTorch, Transformers, CLIP, Whisper

### Design System
- **Colors:** Dark-first (#0d0d0d bg, #181818 panel)
- **Accents:** Purple (#7c5cfc AI), Green (#00e5a0 publish), Orange (#f5820a CTA)
- **Fonts:** Clash Display/Syne (display), DM Sans (body)

## 🏃 Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/aura.git
cd aura

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Development

```bash
# Run all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Run linting
pnpm lint

# Run tests
pnpm test
```

## 📋 Task Roadmap

### Phase 1: Foundation (T001-T005)
- [x] Monorepo scaffold with design system
- [ ] Project + Auth data model
- [ ] Asset pipeline (ingest, transcode, proxy)
- [ ] Real-time project state sync (Yjs CRDT)
- [ ] Version history (git-style branching)

### Phase 2: AI Creative Director (T006-T010)
- [ ] Intent input interface
- [ ] AI edit draft generator
- [ ] 3 draft variants system
- [ ] Voice command editing
- [ ] Script-to-video mode

### Phase 3: Moment Graph UI (T011-T013)
- [ ] Moment graph interface
- [ ] Engagement prediction scoring
- [ ] AI moment suggestions

### Phase 4: Platform Intelligence (T014-T016)
- [ ] Platform-native multi-export
- [ ] Trend intelligence feed
- [ ] Hook analyzer + generator

### Phase 5: AI Enhancement (T017-T024)
- [ ] One-tap AI enhance
- [ ] Beauty pipeline (6 models)
- [ ] Background system
- [ ] B-roll AI finder/generator
- [ ] Talking head/avatar
- [ ] Audio mastering
- [ ] Voice cloning + dubbing
- [ ] Beat-sync + mood matching

### Phase 6: Captions & Brand (T025-T029)
- [ ] Word-level animated captions
- [ ] Auto title/hook text generator
- [ ] Brand profile memory
- [ ] Intro/outro templates
- [ ] Analytics feedback loop

### Phase 7: Pro Timeline (T030-T033)
- [ ] Full timeline editor
- [ ] Speed ramp editor
- [ ] Color grading suite
- [ ] Transitions library

### Phase 8: Collaboration (T034-T035)
- [ ] Real-time multiplayer editing
- [ ] Frame-level comments + review

### Phase 9: Publishing (T036-T038)
- [ ] Smart scheduler
- [ ] AI metadata generator
- [ ] A/B thumbnail testing

### Phase 10: Render & Export (T039-T040)
- [ ] Final render engine
- [ ] Platform-native batch export

### Phase 11: Mobile (T041-T042)
- [ ] Phone QR upload
- [ ] Mobile quick editor

### Phase 12: System (T043-T045)
- [ ] GPU job queue
- [ ] Template marketplace
- [ ] E2E integration + performance

## 🏆 Competitive Advantages

| Feature | CapCut | Descript | Opus | Premiere | **AURA** |
|---------|--------|----------|------|----------|----------|
| Intent-to-draft | ❌ | ⚠️ | ❌ | ❌ | ✅ |
| Engagement prediction | ❌ | ❌ | ❌ | ❌ | ✅ |
| Platform-native cuts | ⚠️ | ❌ | ⚠️ | ❌ | ✅ |
| Analytics feedback | ❌ | ❌ | ❌ | ❌ | ✅ |
| Multilingual dub | ❌ | ⚠️ | ❌ | ❌ | ✅ |
| Real-time collab | ❌ | ⚠️ | ❌ | ❌ | ✅ |
| Template marketplace | ⚠️ | ❌ | ❌ | ❌ | ✅ |
| Phone QR upload | ❌ | ❌ | ❌ | ❌ | ✅ |
| A/B thumbnail test | ❌ | ❌ | ❌ | ❌ | ✅ |

## 📄 License

MIT © 2024 AURA

## 🙏 Acknowledgments

Inspired by the gap between what creators need and what current tools provide. Built for the next generation of social video creators.
