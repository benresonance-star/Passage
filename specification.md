# Passage - Bible Chapter Memoriser (v2.1.0)

## 🤖 AI Agent Protocol (Mandatory)
Before performing any actions in this codebase, all AI agents must:
1.  **Read this specification in full** to understand the architecture and strict constraints.
2.  **Plan before Execution**: Propose a high-level strategy for any requested changes.
3.  **Task Breakdown**: Break the plan into a granular list of actionable tasks.
4.  **Request Permission**: Obtain explicit user approval before implementing any code changes.
5.  **Maintain Specification**: Update this document immediately after any structural or logical changes to keep the specification and app versioning in sync.

---

## 1. Core Goal
Implement a fast, offline-capable iPhone-first PWA for memorising Bible chapters through chunked practice, recall modes, and shared community progress tracking with perfect cross-device synchronisation.

## 2. Technical Stack
- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: TailwindCSS with Dynamic Theme Engine (OLED Dark, Sepia, Midnight)
- **State**: Single `localStorage` key (`bcm_v1_state`) + **Supabase Personal Vault Sync**
- **Auth**: Passwordless 8-digit OTP & Magic Link Authentication via Supabase
- **PWA**: `@ducanh2912/next-pwa` with manifest and service worker
- **Icons**: Lucide React + Custom Orange Branding

## 3. Data Schema & Synchronization
The app utilizes an authoritative hybrid state where Supabase acts as the permanent source of truth for cross-device mirroring.

### A. Stable Identity System
- **Deterministic IDs**: All content uses stable "Slugs" rather than random timestamps.
    - **Chapter ID**: Generated from title (e.g., `romans-8`).
    - **Chunk ID**: Generated from Chapter + Verse Range (e.g., `romans-8-v1-4`).
- **Migration Engine**: Automatic background self-healing script ensures legacy data is re-keyed to stable IDs upon app launch.

### B. Personal Vault (Private Sync)
- **Tables**: `user_chapters` (full text), `user_cards` (SM2 history), `user_stats` (streaks).
- **Authoritative Mirroring**: Multi-device sync uses `updated_at` timestamps. The cloud version wins only if it is newer than the last local action on a specific chunk, preventing "echo" overwrites.
- **Atomic Realtime**: Devices subscribe to private Postgres channels to catch and apply specific data packets (individual card updates) instantly without full-page refreshes.

### C. Local State Model
```typescript
interface BCMState {
  chapters: Record<string, Chapter>;
  selectedChapterId: string | null;
  cards: Record<string, Record<string, SM2Card>>; 
  stats: Record<string, Stats>; 
  settings: {
    clozeLevel: 0 | 20 | 40 | 60 | 80 | "mnemonic";
    showHeadings: boolean;
    showMemorised: boolean;
    activeChunkId: Record<string, string | null>;
    theme: { bg: string; text: string; };
  };
}
```

## 4. Key Features & Social Logic

### A. Social & Group Management
- **OTP Login**: 8-digit verification codes sent via email allow users to log in directly within the PWA sandbox without leaving the app.
- **Admin-Only Controls**:
    - Only Group Admins can **Add New Chapters** or **Delete Chapters** from the library.
    - Admins can **Remove Members** from the study group directory.
- **Team Progress Board**: Positioned prominently on the home screen (above Library). Shows the actual group name and real-time chunk progress (e.g., `1 / 15 Chunks`) for every member.
- **Zero-Lag UI**: The current user's progress always prioritizes local state to ensure instant visual feedback while cloud sync happens in the background.

### B. Learning Loop
- **Practice Mode**:
    - **Read**: Full text.
    - **Cloze**: Seeded, deterministic word hiding (0-80%).
    - **Mnemonic**: First-letter scaffolding (Abc).
    - **Type**: Recall with accuracy diffing.
- **Recite Mode**: Tap-to-reveal line pills with self-grading via SM-2.
- **Chapter Mastery**: Simplified review interface focusing on verse text and memorisation status. All "Due" or "Hard" icons have been removed for a cleaner experience.

## 5. UI/UX Refinements
- **iPhone-First**: Optimized for notch, safe areas, and one-thumb navigation.
- **Layout Priority**: Active Chapter → Team Progress → Library → Navigation.
- **Persistence**: Wake-lock API prevents screen dimming; 8-digit OTP ensures session persistence in PWA standalone mode.

## 6. Deployment & DevOps
- **Backend**: Supabase handles Auth, Postgres Database, and Realtime Vault subscriptions.
- **Realtime Publication**: `supabase_realtime` includes `shared_progress`, `user_chapters`, `user_cards`, and `user_stats`.
- **Environment**: Keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are managed in Vercel.
- **CI/CD**: Automatic deployments from `main` branch via Vercel (limited by daily build quotas).
