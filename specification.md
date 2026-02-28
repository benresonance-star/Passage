# Passage - Bible Chapter Memoriser (v3.7.1)

## AI Agent Protocol (Mandatory)

This document is the authoritative specification for **Passage**, a Bible chapter memorisation PWA. It describes every screen, data model, system, and pattern in the codebase. Any AI agent working in this environment must treat this file as the single source of truth for how the app works.

Before performing any actions in this codebase, all AI agents must:

1.  **Read this specification in full** to understand the architecture, screens, data model, and constraints.
2.  **Plan before Execution**: Propose a high-level strategy for any requested changes.
3.  **Task Breakdown**: Break the plan into a granular list of actionable tasks.
4.  **Request Permission**: Obtain explicit user approval before implementing any code changes.
5.  **Verify & Update Specification**: After implementing a feature, ask the user to confirm it works correctly. Upon confirmation, update this specification to reflect the change and bump the version in both this file's heading and `package.json`.
6.  **Update README**: When any feature is added, changed, or removed, update `README.md` to reflect the change. The README version in its heading, the specification version, and `package.json` version must always match. The README serves as the concise developer quick-start guide; the specification is the authoritative detail. Both must stay in sync.
7.  **Push to GitHub**: After any successful update to the app, commit all changes and push to the remote repository.

---

## 1. Core Goal
A fast, offline-capable iPhone-first PWA for memorising Bible chapters through chunked practice, immersive soaking, recall modes, and shared community progress tracking with cross-device synchronisation via Supabase.

---

## 2. Technical Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | TailwindCSS 4, CSS custom properties for dynamic theming |
| Animations | Framer Motion 12, hardware-accelerated CSS transitions |
| Fonts | Google Fonts — Inter (UI), Cormorant Garamond (Soak/Splash) |
| State | React Context (`BCMContext`) → single `localStorage` key (`bcm_v1_state`) |
| Cloud Sync | Supabase (Auth, Postgres, Realtime channels) |
| Auth | Passwordless 8-digit OTP & Magic Link via Supabase |
| PWA | `@ducanh2912/next-pwa` with manifest and service worker |
| Icons | Lucide React |
| Testing | Vitest + jsdom |

---

## 3. Architecture

### A. Screen Map & Navigation Model

```
LIBRARY (/)
  ├── Active Chapter card
  ├── Library list
  ├── Memorised Chapters
  └── Info Modal
        
Tab Bar (BottomNav — fixed pill)
  ├── Chapter  (/chapter)
  ├── Soak     (/soak)
  └── Practice (/study)

Guided Session Route
  └── Practice (/study)  — single-screen practice flow with 7 stages

Legacy Routes (still accessible, not in nav)
  ├── Practice (/practice)  — direct multi-mode practice
  └── My Progress (/review) — chapter mastery overview (linked from Home)
  
Modal / Push Routes
  ├── Import   (/import)
  ├── Group    (/group)
  └── ThemeModal (overlay within /chapter)
```

**Navigation rules:**
- The bottom nav is a collapsible pill (`BottomNav.tsx`). It collapses to a book icon on scroll and expands on tap.
- Soak, Practice, and Review tabs are disabled when no chapter is selected.
- Tapping an already-active tab resets its state (dispatches `bcm-reset-practice` / `bcm-reset-recite` custom events).
- The Home screen (`/`) is reached via the Settings cog in the Chapter header, not from the tab bar.

**Swift mapping:** `TabView` with 4 tabs + `NavigationStack` for push routes (Import, Group). Home becomes the root of a `NavigationStack` wrapping the tab view.

### B. State Management

All app state lives in a single `BCMState` object managed by `BCMContext` (React Context + `useState`).

**Lifecycle:**
1. `loadState()` reads `bcm_v1_state` from `localStorage` and runs the migration engine.
2. On login, `pullVault()` merges cloud data using `updated_at` timestamps (cloud wins only if newer).
3. Every `setState` call triggers `saveState()` to `localStorage`.
4. Card/chapter changes sync to Supabase in the background (`syncProgress`, `pushChapter`).
5. Realtime subscriptions on `user_cards` and `user_chapters` apply incoming changes, guarded by `lastUpdateRef` to prevent echo overwrites.

**Swift mapping:** `@Observable` class with `SwiftData` persistence. Supabase sync maps to a background actor. Realtime subscriptions map to Combine publishers or AsyncStream.

### C. Component Hierarchy

```
layout.tsx
  └── ThemeContent (applies CSS vars, manages splash/meditation sequence)
        ├── SplashScreen → MeditationScreen → App content
        ├── BottomNav (collapsible pill, scroll-aware)
        └── Page views (/, /chapter, /soak, /practice, /review, /import, /group)
```

**Shared components:** `EmptyState`, `TeamBoard`, `ThemeModal`, `LibrarySelector`, `FlowControls`, `AppModal` (confirm/toast).

---

## 4. Data Model

### A. Core Types

```typescript
interface Verse {
  number?: number;
  text: string;               // May contain [LINEBREAK] markers
  type: "scripture" | "heading";
}

interface Chunk {
  id: string;                 // Deterministic slug: "{chapterId}-v{range}"
  verseRange: string;         // e.g. "1-4"
  verses: Verse[];
  text: string;               // Flattened scripture text (no headings)
}

type PracticeSection = Chunk;    // A chunk or a single verse — same shape
type PracticeUnit = "chunk" | "verse";

interface SM2Card {
  id: string;                 // Same as chunkId
  ease: number;               // Starts at 2.5
  intervalDays: number;
  reps: number;
  lapses: number;
  nextDueAt: string;          // ISO date
  lastScore: number | null;
  hardUntilAt: string | null; // 24h cooldown on failure
  isMemorised: boolean;
}

interface Chapter {
  id: string;                 // Deterministic slug
  versionId: string;
  bookName: string;
  title: string;
  fullText: string;
  verses: Verse[];
  chunks: Chunk[];
  createdAt: string;
}

interface BibleVersion {
  id: string;                 // e.g. "niv"
  name: string;
  abbreviation: string;
}

interface ChapterStats {
  streak: number;
  lastActivity: string | null;
}
```

### B. Local State Schema

```typescript
interface BCMState {
  versions: Record<string, BibleVersion>;
  chapters: Record<string, Chapter>;
  selectedChapterId: string | null;
  cards: Record<string, Record<string, SM2Card>>;   // [chapterId][chunkId]
  stats: Record<string, ChapterStats>;               // [chapterId]
  settings: {
    clozeLevel: 0 | 20 | 40 | 60 | 80 | "mnemonic";
    showHeadings: boolean;
    visibilityMode?: 0 | 1 | 2;         // 0: All, 1: No Headings, 2: Hide All
    showMemorised: boolean;
    activeChunkId: Record<string, string | null>;  // [chapterId] → chunkId
    theme?: {
      bg: string;
      text: string;
      id?: string;                       // "dawn" or "night-dusk" for special themes
    };
    highlightedWords?: string[];         // Normalised words highlighted by the user
    studyUnit?: PracticeUnit;               // "chunk" (default) or "verse" — controls practice section granularity
  };
}
```

### C. Stable Identity System
- **Deterministic IDs**: All content uses stable slugs rather than random timestamps.
    - **Chapter ID**: `{versionId}-{bookName}-{title}` slug (e.g. `niv-romans-romans-8`).
    - **Chunk ID**: `{chapterId}-v{verseRange}` (e.g. `niv-romans-romans-8-v1-4`).
- **Migration Engine**: Automatic background self-healing script re-keys legacy data to stable IDs on app launch.

### D. Supabase Schema

**Personal Vault (private to each user):**

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `user_chapters` | `user_id`, `chapter_id`, `data` (JSON Chapter), `updated_at` | Full chapter storage |
| `user_cards` | `user_id`, `chapter_id`, `chunk_id`, `data` (JSON SM2Card), `updated_at` | Spaced repetition state |
| `user_stats` | `user_id`, `chapter_id`, `data` (JSON ChapterStats), `updated_at` | Streak tracking |

**Social:**

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `shared_progress` | `group_id`, `user_id`, `chapter_title`, `chunk_id`, `is_memorised`, `updated_at` | Group leaderboard data |
| `groups` | `id`, `name`, `admin_id` | Practice groups |
| `group_members` | `user_id`, `group_id`, `role` ("admin" / "member") | Membership |
| `profiles` | `id`, `display_name`, `email`, `last_active`, `theme` | User profiles |

**Content:**

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `bible_library` | `version_id`, `book_name`, `chapter_number`, `verse_number`, `content`, `is_heading`, `heading_text` | Pre-loaded Bible verses for library import |

**Realtime subscriptions:** `user_cards`, `user_chapters`, `shared_progress`, `user_stats`.

**Conflict resolution:** `updated_at` timestamp comparison. Cloud wins only if its timestamp is newer than the last local action for that specific record.

---

## 5. Screens

### A. LIBRARY (`/`)

The dashboard and library manager.

- **Header**: Displays centered "LIBRARY" title with a back arrow to the Chapter page (`/chapter`), Group icon (links to `/group`), and Info icon.
- **Active Chapter Card**: Shows title, version abbreviation, verse/chunk counts, memorised progress (`n / m Chunks`), trophy icon when fully memorised. Two action buttons: Read Chapter and My Progress.
- **Library List**: All chapters sorted by creation date (newest first). Each row shows title, memorised count, and a delete button (admin only). The currently active chapter is marked with an "ACTIVE" label and includes a "Progress" button next to the trash can. An "Add New Chapter" button (dashed border, admin only) links to `/import`.
- **Memorised Chapters**: Separate section for fully memorised chapters with amber/gold styling and trophy icons.
- **Info Modal**: Centered pop-up card with a 7-step meditative memorisation guide ("How to Memorise a Chapter"). Uses zoom-in animation and high-contrast styling.
- **Group Button**: Top-right icon linking to `/group`. Highlighted orange when logged in.
- **Admin logic**: If not logged in, user is treated as their own admin. If in a group, only the admin role can add/delete chapters.
- **Version Label**: Faint text at the bottom of the page showing the current app version (read from `package.json`).

### B. Chapter (`/chapter`)

Full chapter text view with interactive chunked layout.

- **Header**: Chapter title, version abbreviation, verse count, chunk count. Collapsible top actions bar (scroll-aware via `useScrollAwareTopActions`).
- **Top Actions** (collapsible pill, same pattern as bottom nav):
    - **Clear Highlights** (Eraser icon): Visible only when highlighted words exist.
    - **Theme** (Palette icon): Opens `ThemeModal` overlay.
    - **Visibility Mode** (Eye/EyeOff icon): Cycles through 3 modes: 0 = All, 1 = No Headings, 2 = Hide All (headings + verse numbers).
    - **Memorised Toggle** (Award icon): Highlights memorised chunks in amber.
    - **Home** (Settings icon): Navigates to `/`. When collapsed, tapping expands the pill instead.
- **Practice Unit Toggle**: Segmented control below the header subtitle with two options: "Parts" (default, groups of ~4 verses) and "Verses" (individual verses). Persisted in `settings.studyUnit`. Switching clears the active section.
- **Section Display**: Based on the active practice unit, each section (chunk or verse) is a card showing verse range label, verse text with inline verse numbers, and heading text (when visibility mode = 0). Headings are rendered as centered uppercase labels.
- **Long-press Activation**: 600ms long-press on a section toggles it as the active section (highlighted with ring + shadow). Haptic feedback via `navigator.vibrate`. Touch-move cancels the long-press (20px threshold).
- **Practice & Memorised Actions**: When a section is active, a small action group appears in the section header row (right-aligned):
    - **Memorised Toggle** (Award icon): Toggles the `isMemorised` state for that section. Styled amber when memorised, zinc when not.
    - **Practice Pill**: Navigates to `/study`.
- **Word Highlighting**: Tap any word to toggle it as highlighted (gold `#FFCB1F`, bold, with glow). Highlights are stored in `settings.highlightedWords` as normalised (lowercase, no punctuation) strings. All instances of the same normalised word are highlighted across the chapter.
- **Memorised Overlay**: When `showMemorised` is on, memorised chunks are styled with `--chunk-memorised` colour.
- **Line Breaks**: Verse text containing `[LINEBREAK]` markers is rendered with `<br>` elements.

### C. Abide (`/soak`)

Immersive verse-by-verse meditation screen.

- **Full-screen layout**: No header, no nav bar. Fixed position covering entire viewport.
- **Content Loading**: If a specific section (chunk or verse) is active on the Chapter page, Abide mode loads only that section. If no section is active, the entire chapter is loaded for continuous meditation.
- **Double-buffer crossfade**: Two verse "slots" (A and B) are always in the DOM. On navigation, the inactive slot receives the new verse, then: preparing (60ms paint time) → crossfading (800ms opacity interpolation) → idle (swap active slot). No DOM mutation ever happens during a visible transition.
- **Navigation**: Swipe left/right (30px threshold, horizontal must exceed 2× vertical) or click left/right zones (30%/30% of screen width) for verse navigation. Centre zone (40%) reveals the exit button. Click navigation is enabled for desktop users.
- **Word Highlighting**: Tap any word to toggle highlight (per-verse, stored in component state as `"verseIndex-wordIndex"` keys).
- **Breathing Background**: CSS animation (`soak-breathe` class in `breathe.css`) creates a slowly animating gradient background.
- **Font**: Cormorant Garamond (Light 300, Regular 400, Bold 700).
- **Verse Indicator**: Top-centre shows `"n / total"` in faint uppercase text.
- **Exit**: Bottom-centre X button, initially nearly invisible (opacity 0.12). Tap the bottom zone or centre zone to reveal it (3s auto-hide). Tap the revealed button to exit back to `/chapter`.
- **Cooldown**: 800ms minimum dwell time before navigation is allowed.
- **Wake Lock**: Screen stays on via `useWakeLock` hook.
- **Data mapping**: Headings are stripped — only `"scripture"` type verses are shown.

### D. Practice (`/study`)

Multi-mode practice screen for the active chunk. Modes are sequential or selectable.

- **Header**: "Attend", "Abide", "Breathe", etc. title centered. Subtitle shows verse range and chapter title.

1. **Attend**: Full text with verse structure, headings optional. Three action buttons at the bottom:
    - **Breathe**: Enters Breathe Mode.
    - **Reveal**: Enters Reveal Mode.
    - **Recollect**: Advances to Recollect Mode.

2. **Breathe** (sub-mode of Attend): Word-by-word timed reading.
    - Words transition from unread (`--flow-unread`) to read (`--flow-read` with `--flow-glow` text shadow) at the current index.
    - **Focus Mode** (default on): Unread words are hidden (opacity 0), revealing text progressively.
    - **FlowControls**: Play/pause, skip forward/back, reset, WPM slider (adjustable speed), focus toggle, close.
    - Timer: `(60 / wpm) * 1000` ms per word. Auto-pauses at end.

3. **Recollect**: Deterministic word hiding.
    - Levels: 0%, 20%, 40%, 60%, 80% (seeded by chunkId for consistency across sessions).
    - **Mnemonic** ("Abc"): First-letter scaffolding via `generateMnemonic()`.
    - Level selector bar with 6 buttons. Active level is highlighted (orange or white/gold in Dawn).
    - Action: "Speak It" advances to Speak Mode.

4. **Speak** (Recall): Free-text textarea for typing from memory.
    - Auto-growing textarea (max height = viewport - 320px).
    - Placeholder: "Speak from memory..."
    - Action: "Submit" calculates diff and advances to Result Mode. Grading is automatic (`accuracy / 100`).

5. **Result**: Word-level diff display.
    - Accuracy percentage with CheckCircle icon.
    - Word-by-word results: correct words in white (or gold in Dawn), missing words in faded orange.
    - "Try Again" button resets to Speak Mode. "Continue" returns to `/chapter`.
    - SM-2 card update happens automatically on submission.

6. **Reveal**: Oral practice with tap-to-reveal lines.
    - Text is split into sentence-based lines (`splitIntoLines` — splits on `.!?`, wraps at 15 words).
    - Each line is a tappable pill: hidden (transparent text, 40% opacity) or revealed (visible with border).
    - Eye/EyeOff toggle in header to reveal/hide all at once.
    - "Done" button grades at 0.75 and returns to Attend Mode.

**Back navigation:** Breathe → Attend, Recollect → Attend, Reveal → Attend, Speak → Recollect, Result → Speak, Attend → `/chapter`.

**Reset:** Custom event `bcm-reset-practice` resets all mode state.

### D2. Practice Session (`/study`)

A unified single-screen practice flow that guides the user through a practice section (chunk or verse) from passive reading to active recall. The practice text remains anchored in the same visual position across all stages.

**Practice Units:** Users choose between "Chunks" (groups of ~4 verses) or "Verses" (single verse) via a segmented toggle on the Chapter page header. Both use the `PracticeSection` type (same shape as `Chunk`). SM2 cards are tracked independently for each unit size — IDs don't collide (`-v9-12` for chunks, `-v9` for single verses).

**Entry Points:**
- **Practice pill**: Appears on the active (highlighted) chunk/verse card on the Chapter page. Long-press activates a section, then tap the pill to enter Practice.
- **Review page**: "Practice" button per chunk navigates to `/study`.
- **Bottom nav**: Practice tab in the navigation bar.

**Stages (ordered by desirable difficulty):**

1. **Attend**: Full section text, normal styling. Subtitle: "Attend to the text carefully."
2. **Abide**: Inline verse-focus mode — current verse at full opacity, others dimmed to ~15%. Tap left/right zones to navigate between verses. Breathing gradient background overlay. Verse counter shown below text.
3. **Breathe**: Word-by-word timed illumination with natural speech pacing. Words transition from unread to read styling at user-controlled WPM, adjusted by a syllable-based timing model that accounts for word complexity and punctuation pauses (e.g., longer pauses for periods and commas). Controls: play/pause, skip forward/back, reset, WPM slider, focus mode toggle (hides unread words).
4. **Reveal**: Text split into sentence-based lines (`splitIntoLines`). Lines are hidden (transparent, 40% opacity). Tap to reveal individual lines. Reveal All / Hide All toggle.
5. **Recollect**: Deterministic word hiding at configurable levels (0%, 20%, 40%, 60%, 80%, Mnemonic). Uses `hideWords()` and `generateMnemonic()` from `lib/cloze.ts`.
6. **Speak**: Section text hidden, replaced by auto-growing textarea. "Submit" calculates diff and advances to Result.
7. **Result**: Word-level diff display with accuracy percentage. SM-2 grading happens automatically. "Try Again" returns to Speak. "Done" exits to `/chapter`.

**Stage Navigation:**
- Bottom bar with stage indicator dots (current stage is elongated pill, completed stages are filled, future stages are faded).
- Back/forward chevrons to move between adjacent stages.
- Tapping a dot jumps to that stage (only accessible stages — current or earlier).
- Exit (X) button returns to `/chapter`.
- Stage-specific controls appear above the dots (Flow controls, Recollect level selector, Receive reveal toggle, Speak submit button, Result action buttons).

**Text Anchor Pattern:** One `<div>` renders the section text and never unmounts or repositions between stages. Each stage applies a different visual "lens" (opacity, colour, blur, word hiding). Speak and Result replace the text area with their own content.

**Components:**
- `TextAnchor` (`src/components/study/TextAnchor.tsx`): Shared verse renderer with stage-based styling.
- `StageControls` (`src/components/study/StageControls.tsx`): Bottom navigation and context controls.
- `StudyPage` (`src/app/study/page.tsx`): Stage state machine, section resolution, SM2 grading.

### E. MY PROGRESS (`/review`)

Chapter Mastery overview.

- **Header**: "MY PROGRESS" title centered with a back arrow to the Library (Home). Progress bar (`memorised / total`) and fraction label.
- **Chunk Cards**: Each chunk displayed as a card with:
    - Verse range label (faded when memorised).
    - Full verse text with inline verse numbers, headings, and `[LINEBREAK]` rendering.
    - Active chunk gets a ring outline (`ring-2 ring-[var(--theme-text)]`).
    - Memorised chunks get amber border styling and `--chunk-memorised` text colour.
- **Actions per chunk**:
    - **Practice**: Sets the chunk as active and navigates to `/study`.
    - **Mark / Memorised**: Toggles `isMemorised` on the SM2Card and syncs to cloud using unified logic.
- **Tap to select**: Tapping a card sets it as the active chunk.

### F. Import (`/import`)

Two-mode chapter import screen with a smart verification flow.

- **Mode Toggle**: "Library" (database icon) or "Paste" (type icon) tabs.
- **Library Mode** (`LibrarySelector.tsx`):
    - Queries `bible_library` table on Supabase.
    - Three-stage selector: Version → Book → Chapter.
    - On selection, reconstructs formatted text with `<n>` verse markers and `<heading>` tags.
    - Auto-fills book name and version ID.
- **Paste Mode**:
    - Textarea for pasting formatted text.
    - **Smart Metadata Detection**: Automatically detects Book, Chapter/Verse Range, and Version from the first line (e.g., `Colossians 3:1-17 (NIV)`).
    - **Review Step**: A dedicated `ReviewView` screen allows users to verify parsed verses, headings, and chunks before saving.
    - **Manual Correction**: Users can edit Book, Title, or Version directly on the review screen.
    - **Footnote Cleaning**: Automatically strips footnote markers (e.g., `[a]`, `[b]`) common in Bible site copies.
    - **Admin Push to Global**: Admins can toggle "Push to Global Library" to upload pasted text directly to the `bible_library` table, making it available for all users.
    - Expected format: First line = metadata/title. Subsequent lines: `<n> verse text`, `<heading>heading text</heading>`.
    - Book name input field (auto-filled if detected).
    - Version selector dropdown (auto-filled if detected).
    - "Strip References" toggle (removes URLs, parenthetical references, and footnote markers).
- **Duplicate detection**: If a chapter with the same slug already exists, shows a confirm dialog offering to overwrite.
- **Import flow**: `parseChapter()` → `ReviewView` → `chunkVerses()` (max 4 verses per chunk) → generates SM2Cards → saves to state → `pushChapter()` to cloud → navigates to `/chapter`.

### G. STUDY GROUP (`/group`)

Social and community progress tracking.

- **Header**: "STUDY GROUP" title centered with a back arrow to the Library (Home).
- **User Profile**: Displays user's initial, display name (editable), and email. Sign-out button.
- **Group Management**:
    - **Group Selector**: Tabs for switching between joined groups.
    - **Active Group Details**: Shows group name, role (Admin/Member), and a "Leave Group" button.
    - **Invite System**: Displays Group ID and a "Copy Invite Link" button.
    - **Member List**: Real-time progress of each member for the currently active chapter. Admin can remove members.
    - **Missing Chapters**: Alerts user if the group is studying chapters they haven't imported yet.
    - **Create/Join**: Buttons to create a new group or join one via ID.
- **Auth Flow**: Passwordless sign-in (Email + OTP) for users who are not logged in.

---

## 6. Core Systems

### A. Learning Loop & SM-2 Algorithm

The spaced repetition system (`lib/scheduler.ts`) uses a modified SM-2 algorithm with a unified memorisation logic:

**Unified Memorisation Logic:**
- **Bidirectional Sync**: Marking a **Part** as memorised automatically marks all constituent **Verses**. Marking all **Verses** in a part as memorised automatically marks the **Part**.
- **Unmarking Logic**: Unmarking a **Verse** automatically unmarks its containing **Part**. Unmarking a **Part** automatically unmarks all its constituent **Verses**.
- **Consistency**: This ensures that switching between "Parts" and "Verses" modes retains the correct memorised state for all units.

**Scoring tiers:**
- **≥ 0.9 (Nailed it)**: Interval grows (1 day → 6 days → `interval × ease`). Ease increases. Reps increment. Auto-promotes to memorised after 3 consecutive high scores (`MEMORISED_REP_THRESHOLD`).
- **≥ 0.75 (Shaky)**: Interval halved (min 1 day). Ease decreases by 0.2.
- **< 0.75 (Missed)**: Reps reset to 0. Interval reset to 0. Lapses increment. Ease decreases by 0.5. Demotes from memorised. 24h `hardUntilAt` cooldown.

**Minimum ease:** 1.3 (floor).

**Streak system** (`lib/streak.ts`): Tracks daily practice streaks per chapter. Resets if gap > 1 day.

### B. Theme Engine

Seven theme presets defined in `ThemeModal.tsx`:

| Name | Background | Text | ID | Special |
|------|-----------|------|----|---------|
| OLED | `#000000` | `#f4f4f5` | — | Pure black |
| Amber | `#000000` | `#ffb347` | `amber-night` | Zero blue light, night mode |
| Midnight | `#0f172a` | `#e2e8f0` | — | Dark blue |
| Sepia | `#fdf6e3` | `#433422` | — | Light/warm, white nav bg |
| Night Dusk | `#1a1816` | `#f2e8d5` | `night-dusk` | Warm dark with gradient |
| Classic | `#18181b` | `#d4d4d8` | — | Zinc dark |
| Dawn | `#3d3566` | `#fffcf0` | `dawn` | Animated breathing gradient |

**CSS variable system** (`globals.css`):
- **Surface tokens**: `--surface`, `--surface-alt`, `--surface-border`
- **Theme UI**: `--theme-ui-bg`, `--theme-ui-border`, `--theme-ui-subtext`, `--theme-text`
- **Flow mode**: `--flow-read`, `--flow-unread`, `--flow-glow`
- **Chunk highlights**: `--chunk-active`, `--chunk-memorised`, `--chunk-memorised-sub`
- **Overlay**: `--overlay`, `--overlay-surface`

**Dawn theme** applies `data-dawn` attribute to `<html>`, enabling:
- Animated breathing gradient background (`soak-breathe` CSS class, also used for Soak screen)
- Cormorant Garamond font override for larger text
- Larger font sizes via `html[data-dawn]` CSS selectors
- Glass morphism (backdrop-blur on translucent surfaces)
- Gold accent colour (`#FFCB1F`) instead of orange

**Theme is applied** via `ThemeContent.tsx` which sets CSS custom properties on `:root` and data attributes on `<html>`.

### C. Synchronization (Personal Vault)

- **Authoritative mirroring**: Multi-device sync uses `updated_at` timestamps. Cloud wins only if its timestamp is newer than the last local action on a specific record.
- **Atomic realtime**: Devices subscribe to private Postgres channels filtered by `user_id`. Incoming card/chapter payloads are deep-compared (`JSON.stringify`) before applying to avoid unnecessary re-renders.
- **`lastUpdateRef`**: A mutable ref tracks the timestamp of the last local write per record key (e.g. `card_{chunkId}`). Incoming realtime updates are ignored if their `updated_at` is not newer.
- **Shared progress**: Card updates also push to `shared_progress` table for group visibility, using an upsert on `(group_id, user_id, chunk_id)`.
- **Zero-lag UI**: Local state is always the source of truth for rendering. Cloud sync happens in the background.

### D. Bible Library

The `bible_library` Supabase table stores pre-loaded Bible content verse by verse.

- **Schema**: `version_id`, `book_name`, `chapter_number`, `verse_number` (nullable for headings), `content`, `is_heading`, `heading_text`.
- **Query flow** (`LibrarySelector.tsx`): Distinct versions → distinct books for version → distinct chapters for book → all rows for chapter, ordered by verse number.
- **Text reconstruction**: Rows are assembled into the app's `<n> text` format with `<heading>` tags, then passed to `parseChapter()`.

### E. Chapter Parser

`lib/parser.ts` handles text parsing and chunking:

- **`parseChapter(text, stripRefs)`**: Extracts metadata (book, title, version) from the first line or treats it as the title. Supports `<n>` verse markers, `<heading>...</heading>` tags, `[LINEBREAK]` preservation, `[PARAGRAPH]` markers from double newlines, and heuristic continuation detection (quotes/lowercase text appended to previous verse). Also strips footnote markers `[a]`, `[b]`, etc. if `stripRefs` is true.
- **`chunkVerses(verses, title, max, bookName, versionId)`**: Groups verses into chunks of up to 4 scripture verses. Break points: max size, paragraph markers, heading boundaries. Trailing headings attach to the last chunk.
- **`getChapterSlug(title, bookName, versionId)`**: Generates deterministic chapter IDs by slugifying `{versionId}-{bookName}-{title}`.
- **`getVerseSections(chapter)`**: Derives single-verse `PracticeSection` objects from a chapter's scripture verses. Each section has a deterministic ID (`{chapterId}-v{number}`), a single verse range, and flattened text.
- **`getSections(chapter, unit)`**: Returns either `chapter.chunks` (when unit is `"chunk"`) or `getVerseSections(chapter)` (when unit is `"verse"`).
- **`splitIntoLines(text)`**: Splits text on sentence boundaries (`.!?`) for Receive Mode. Lines exceeding 15 words are further split into 12-word sub-lines.

### F. Text Diffing

`lib/diff.ts` provides word-level accuracy calculation for Speak Mode:

- **Algorithm**: Sequential matching with an 8-word look-ahead window. For each typed word, searches the expected words within the window. Skipped expected words are marked as `missing`. Unmatched typed words are `extra`.
- **Normalisation**: Lowercase, strip non-word characters.
- **Output**: `{ results: DiffResult[], accuracy: number }` where accuracy = `(correct / totalExpected) × 100`, rounded.
- **DiffResult statuses**: `correct`, `wrong`, `missing`, `extra`.

---

## 7. UI/UX Patterns

### A. iPhone-First Design
- Safe area insets: `pt-safe`, `pb-safe`, `env(safe-area-inset-*)` throughout.
- Fixed viewport height: `100dvh` for full-screen layouts.
- Touch targets: minimum 44px, `active:scale-95` press feedback.
- One-thumb navigation: bottom tab bar, bottom-positioned action buttons.
- Haptic feedback: `navigator.vibrate(50)` on long-press activation.

### B. Bottom Navigation
- **Collapsible pill**: Fixed at bottom centre, rounded-[32px], max-width `md`.
- **Collapsed state**: `nav-pill-clip` CSS clip-path shrinks to a small pill showing a BookOpen icon. Background uses `color-mix` with transparency + `backdrop-blur-md`.
- **Expanded state**: `nav-full-clip` shows 3 nav items in a grid (Chapter, Soak, Practice).
- **Scroll-aware**: Parent layout (`ThemeContent`) manages collapse state based on scroll events.
- **Liquid transition**: `clip-path` animation over 500ms `ease-in-out` for smooth shape morphing.
- **Disabled items**: Soak and Practice are greyed out (20% opacity, `pointer-events-none`) when no chapter is selected.
- **Theme-aware**: Dawn gets transparent black background; Sepia gets white background with zinc border; others get surface background.

### C. Splash & Meditation Sequence
- **SplashScreen**: Displays "Passage" title and "Dwell in the Word" subtitle on the breathing gradient background. Uses Cormorant Garamond Light. Subtitle fades in after 1.5s. Holds for 5s, then fades out over 900ms. Shown once per session (tracked via `sessionStorage`).
- **MeditationScreen**: Displays a sequence of meditation verses after the splash screen. Transitions seamlessly from splash (fires `onFadeStart` while splash still covers screen).
- **Sequence**: SplashScreen → (fade) → MeditationScreen (Proverbs 3:5-6) → (tap) → MeditationScreen (Isaiah 26:3) → (tap) → App content. Managed by `ThemeContent` via `showSplash` and `showMeditation` state.

### D. Animations
- **Page transitions**: `animate-in fade-in duration-500` for content appearance.
- **Mode transitions**: `animate-in zoom-in-95 duration-300` for result cards.
- **Bottom-sheet modals**: `animate-in slide-in-from-bottom duration-500` (Info modal, Theme modal).
- **Crossfade** (Soak): Pure opacity transitions on pre-rendered layers — no DOM mutation during animation.
- **Flow Mode**: `transition: color 0.8s ease-out, text-shadow 0.8s ease-out, opacity 0.8s ease-out` for word illumination.
- **Hardware acceleration**: `transform: translate3d(0,0,0)`, `will-change`, and layer isolation used throughout for iOS Safari compositor optimisation.
- **Reduced Motion**: Respects `prefers-reduced-motion` for splash animations while preserving opacity fades.

### E. Wake Lock & PWA Persistence
- `useWakeLock` hook: Requests `navigator.wakeLock.request("screen")` on Soak and Practice screens to prevent screen dimming.
- 8-digit OTP auth ensures session persistence in PWA standalone mode (no redirecting to external auth pages).
- Service worker via `@ducanh2912/next-pwa` for offline asset caching.

---

## 8. Social & Groups

- **OTP Login**: 8-digit verification codes sent via email. Entered digit-by-digit with auto-advance between inputs. Works entirely within the PWA sandbox.
- **Admin-Only Controls**:
    - Only Group Admins can **Add New Chapters** or **Delete Chapters** from the library.
    - Admins can **Remove Members** from the study group directory.
    - If not logged in (local mode), the user is treated as their own admin.
- **Team Progress Board** (`TeamBoard.tsx`): Positioned on the home screen below the active chapter card. Shows group name and real-time chunk progress (e.g., `1 / 15 Chunks`) for every member. Current user's row always uses local state for zero-lag display.
- **Invite Flow**: Shareable link with `?join=groupId` parameter. New users joining via link are auto-directed to the group join flow.
- **Missing Chapter Detection**: When a group member's shared progress references a chapter not in the local library, a notification prompts them to add it.

---

## 9. Deployment & DevOps
- **Backend**: Supabase handles Auth, Postgres Database, and Realtime subscriptions.
- **Realtime Publication**: `supabase_realtime` includes `shared_progress`, `user_chapters`, `user_cards`, and `user_stats`.
- **Bible Library**: The `bible_library` table is pre-populated with verse-by-verse Bible content and is read-only for clients.
- **Environment**: Keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are managed in Vercel.
- **CI/CD**: Automatic deployments from `main` branch via Vercel.
- **Build**: `next build --webpack`. PWA assets generated at build time.
- **Testing**: `vitest run` for unit tests, `vitest` for watch mode.
- **Version Sync**: The version in `package.json`, the specification heading, the `README.md` heading, and the in-app version label must always match. Bump all four together on any release.
- **GitHub Push**: After any successful app update, all changes (including specification updates) must be committed and pushed to the remote repository.
