# Passage - Bible Chapter Memoriser (v1.0.0)

## 🤖 AI Agent Protocol (Mandatory)
Before performing any actions in this codebase, all AI agents must:
1.  **Read this specification in full** to understand the architecture and strict constraints.
2.  **Plan before Execution**: Propose a high-level strategy for any requested changes.
3.  **Task Breakdown**: Break the plan into a granular list of actionable tasks.
4.  **Request Permission**: Obtain explicit user approval before implementing any code changes.
5.  **Maintain Specification**: Update this document immediately after any structural or logical changes to keep the specification and app versioning in sync.

---

## 1. Core Goal
Implement a fast, offline-capable iPhone-first PWA for memorising Bible chapters through chunked practice, recall modes, and spaced repetition.

## 2. Technical Stack
- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: TailwindCSS (OLED Dark Mode)
- **State**: Single `localStorage` key (`bcm_v1_state`)
- **PWA**: `@ducanh2912/next-pwa` with manifest and service worker
- **Icons**: Lucide React + Custom Orange/Black Branding

## 3. Data Schema (Library Model)
The app transitioned from a single-chapter model to a **Multi-Chapter Library**.
```typescript
interface BCMState {
  chapters: Record<string, Chapter>; // Store multiple chapters
  selectedChapterId: string | null;
  cards: Record<string, Record<string, SM2Card>>; // Per-chapter spaced repetition
  stats: Record<string, Stats>; // Per-chapter streaks
  settings: {
    clozeLevel: 0 | 20 | 40 | 60 | 80;
    showHeadings: boolean;
    showMemorised: boolean;
    activeChunkId: Record<string, string | null>;
  };
}
```

## 4. Key Features & Learning Modes

### A. Smart Import & Parser
- **Format**: Supports `<n>` markers for verses and blank lines for paragraph boundaries.
- **Section Headings**: Automatically identifies lines without markers as "Headings." These are stored as distinct types for contextual display.
- **Auto-Fix**: Detects and fixes common export errors (e.g., missing brackets on verse numbers).
- **Cleanup**: Strips URLs and Bible reference citations (e.g., Romans 8:1-4 NIV).

### B. Dynamic Chunking
- **Natural Boundaries**: Chunks do not cross Section Headings or Paragraph breaks.
- **Size**: Default 4 verses per chunk, forced early break if a heading or paragraph break is encountered.

### C. Learning Loop
- **Practice Mode**:
    - **Read**: Full text visible with optional Section Headings.
    - **Cloze**: Seeded, deterministic word hiding (0%, 20%, 40%, 60%, 80%).
    - **Mnemonic**: First-letter scaffolding mode (Abc) to bridge the gap between Cloze and full Type recall.
    - **Type**: Textarea recall with word-level diffing and accuracy percentage.
- **Recite Mode**:
    - Tap-to-reveal line pills (sentence-based or ~12 word segments).
    - Self-grading via SM-2: "Nailed it" (1.0), "Shaky" (0.75), "Missed" (0.3).
- **Smart Continue**: Entering Practice/Recite without a selection automatically jumps to the **first unmemorised chunk**.

### D. Spaced Repetition (SM-2)
- Automatically calculates `nextDueAt` based on performance.
- Failed chunks are marked "Hard" for 24 hours and prioritized in views.

### E. Chapter Mastery Dashboard (Review)
- Unified list of all chunks in the chapter.
- **Memorised Toggle**: A gold "Award" toggle to mark chunks as mastered.
- **Visual Feedback**: Memorised chunks turn gold-orange (Amber) in the list.
- **Progress Tracking**: Real-time progress bar showing "X / Y Chunks Memorised."

## 5. UI/UX Refinements
- **iPhone-First**: Optimized for notch, home indicator, and one-thumb navigation.
- **Chapter Scroll**: Tapping a chunk toggles highlight; bold active state for focused reading.
- **Visual Styles**:
    - **Active**: White highlight/ring.
    - **Memorised**: Gold-Orange (Amber) text and labels.
    - **Info Modal**: Slide-up "How to Memorise" guide with principles.
- **Persistence**: Streak tracking and screen wake-lock to prevent dimming during active study.

## 6. Project Library
- **Seeded Start**: Romans 8 is bundled as a default chapter for all new users.
- **Library Management**: Users can import, switch between, and delete multiple chapters.
- **Celebration**: A Gold Trophy appears next to chapter titles on the Home Screen upon 100% mastery.

## 7. Deployment & DevOps
The project is configured for a continuous deployment workflow:
- **Git/GitHub**: Hosted at `benresonance-star/Passage.git`. 
- **CI/CD**: Connected to **Vercel** for automated builds on every push to the `main` branch.
- **Production URL**: [https://passage-4grh.vercel.app](https://passage-4grh.vercel.app)
- **PWA Requirements**: Builds are forced to use **Webpack** (via `next build --webpack`) to maintain compatibility with the `@ducanh2912/next-pwa` plugin and generate valid service workers.
- **Icon Assets**: `public/icons/` contains the mandatory `apple-touch-icon.png`, `icon-192.png`, and `icon-512.png` for cross-platform PWA support.

