# Passage - Bible Chapter Memoriser (v2.0.0)

## 🤖 AI Agent Protocol (Mandatory)
Before performing any actions in this codebase, all AI agents must:
1.  **Read this specification in full** to understand the architecture and strict constraints.
2.  **Plan before Execution**: Propose a high-level strategy for any requested changes.
3.  **Task Breakdown**: Break the plan into a granular list of actionable tasks.
4.  **Request Permission**: Obtain explicit user approval before implementing any code changes.
5.  **Maintain Specification**: Update this document immediately after any structural or logical changes to keep the specification and app versioning in sync.

---

## 1. Core Goal
Implement a fast, offline-capable iPhone-first PWA for memorising Bible chapters through chunked practice, recall modes, and shared community progress tracking.

## 2. Technical Stack
- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: TailwindCSS with Dynamic Theme Engine (OLED Dark, Sepia, Midnight)
- **State**: Single `localStorage` key (`bcm_v1_state`) + **Supabase Cloud Sync**
- **Auth**: Passwordless Magic Link Authentication via Supabase
- **PWA**: `@ducanh2912/next-pwa` with manifest and service worker
- **Icons**: Lucide React + Custom Orange Branding

## 3. Data Schema (Cloud Model)
The app utilizes a hybrid Local/Cloud state.
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
    theme: { bg: string; text: string; }; // Persistent custom styling
  };
}
```

## 4. Key Features & Learning Modes

### A. Passage v2.0 Social
- **OTP & Magic Link Login**: Passwordless email authentication for frictionless iPhone onboarding. Supports both direct Magic Link clicks and 8-digit OTP verification for PWA persistence.
- **URL Sanitizer**: Automatically wipes access tokens from the browser hash (`#access_token=...`) upon successful login to prevent session conflicts and allow clean navigation.
- **Study Groups**: Users can create or join groups using a unique Group ID.
- **Robust Group Lifecycle**: Explicit membership filtering and instant UI refresh logic ensuring group context is preserved and accurately displayed across all screens.
- **Team Progress Board**: Real-time leaderboard on the home screen showing group members' chunk progress and mastery percentages via Supabase Realtime subscriptions.
- **Member Management**: Study group members can set custom **Display Names** and view a full directory of the group, including the Admin and member status.
- **Cloud Sync**: Personal themes, profile settings, and "Memorised" progress are automatically backed up to Supabase.
- **Error Feedback**: Comprehensive success/error alerts for all cloud operations (Auth, Group Management, Sync).

### B. Learning Loop
- **Practice Mode**:
    - **Read**: Full text visible.
    - **Cloze**: Seeded, deterministic word hiding (0%, 20%, 40%, 60%, 80%).
    - **Mnemonic**: First-letter scaffolding mode (Abc) to bridge the gap between Cloze and full Type recall.
    - **Type**: Textarea recall with word-level diffing and accuracy percentage.
- **Recite Mode**:
    - Tap-to-reveal line pills with a "Master Toggle" eye icon for quick reveal/hide.
    - Self-grading via SM-2 algorithm.

### C. Appearance & Customization
- **Theme Engine**: Users can override background and text colors.
- **Smart Contrast**: UI elements (borders, subtext, inputs) automatically adjust their brightness based on the selected background color.
- **Branding**: Balanced home screen header with a `52px` `BookOpen` icon aligned to title text.

## 5. UI/UX Refinements
- **iPhone-First**: Optimized for notch, safe areas, and one-thumb navigation.
- **Smart Continue**: Automatically jumps to the first unmemorised chunk when entering practice.
- **Persistence**: Wake-lock API used to prevent screen dimming during study sessions.

## 6. Deployment & DevOps
- **Git/GitHub**: Hosted at `benresonance-star/Passage.git`. 
- **CI/CD**: Vercel for automated builds.
- **Backend**: Supabase handles Auth, Postgres Database, and Realtime progress subscriptions.
- **Build Safety**: Supabase client initialization is guarded to return `null` during server-side prerendering, preventing "URL required" build errors.
- **Environment**: Keys (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be configured in Vercel.
