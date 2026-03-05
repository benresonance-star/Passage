# Passage - Bible Chapter Memoriser (v3.8.0)

An iPhone-first PWA for memorising Bible chapters through chunked practice, immersive soaking, spaced repetition, and shared group progress tracking with cross-device cloud sync.

## Features

- **Home Dashboard**: A central landing page with a personalised greeting, a "Recall" button for spaced repetition (based on the shortest interval of memorised sections), a "Learn Next" button for seamless progression, and a collapsible Library list.
- **Guided Practice Session**: Single-screen flow from reading to recall with 7 stages — Attend, Abide (inline verse-focus), Breathe (natural speech-paced rhythmic reading), Reveal (tap-to-reveal), Recollect (scaffolded word-hiding), Speak (free recall), and Result (accuracy feedback with SM-2 grading). Text stays anchored in the same position across all stages.
- **My Progress**: Unified view of memorisation progress with bidirectional sync between Parts and Verses. Access via the Home page or active chapter card. Includes a centered header and back navigation.
- **Practice Units**: Choose between practicing "Parts" (groups of ~4 verses) or individual "Verses" via a toggle on the Chapter page. Both track SM-2 progress independently but share memorisation state.
- **Soak Mode**: Full-screen verse-by-verse meditation with a 3-second Psalm 46:10 introductory screen, breathing gradient background, double-buffer crossfade transitions, and wake lock. Supports swipe navigation on mobile and click navigation on desktop.
- **Spaced Repetition**: Modified SM-2 algorithm with auto-promotion to memorised after 3 consecutive high scores. Spacing for recall sessions is optimized for consolidation by using the shortest interval among memorised sections.
- **Theme Engine**: 7 presets (OLED, Amber, Midnight, Sepia, Night Dusk, Classic, Dawn) with CSS custom properties and animated gradients.
- **Cloud Sync**: Cross-device synchronisation via Supabase with realtime subscriptions and timestamp-based conflict resolution.
- **Practice Groups**: Shared progress boards, invite links, admin-controlled chapter libraries, and member management.
- **Word Highlighting**: Tap any word to highlight all instances across the chapter.
- **Offline First**: LocalStorage as primary store with background cloud sync.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | TailwindCSS 4, CSS custom properties |
| Animations | Framer Motion 12 |
| Fonts | Google Fonts — Inter (UI), Cormorant Garamond (Soak/Splash) |
| State | React Context → `localStorage` (`bcm_v1_state`) |
| Cloud Sync | Supabase (Auth, Postgres, Realtime) |
| Auth | Passwordless 8-digit OTP via Supabase |
| PWA | `@ducanh2912/next-pwa` |
| Icons | Lucide React |
| Testing | Vitest + jsdom |

## Getting Started

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (`next build --webpack`) |
| `npm start` | Serve production build |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | ESLint |

## Deployment

The app deploys automatically from the `main` branch via Vercel. Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are managed in the Vercel dashboard. PWA assets are generated at build time.

## iPhone Installation

1. Open the app in **Safari** on your iPhone.
2. Tap the **Share** button (square with an up arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add in the top right corner**.
5. Launch **Passage** from your home screen for the full app experience.

## Import Formats

### Library Mode

Select from pre-loaded Bible content stored in Supabase. Choose a version, book, and chapter — the text is imported automatically.

- **Paste Mode**: Paste formatted text with verse markers and optional heading tags. The app now supports a smarter import flow with metadata detection and a review step:
    - **Metadata Detection**: Automatically detects Book, Chapter/Verse Range, and Version from the first line (e.g., `Colossians 3:1-17 (NIV)`).
    - **Review Step**: A dedicated review screen allows you to verify parsed verses, headings, and chunks before saving.
    - **Manual Correction**: Edit Book, Title, or Version directly on the review screen if needed.
    - **Footnote Cleaning**: Automatically strips footnote markers (e.g., `[a]`, `[b]`) common in Bible site copies.

```text
Colossians 3:1-17 (NIV)
Living as Those Made Alive in Christ

3 Since, then, you have been raised with Christ...
```

- `<n>` marks a verse number (auto-detected if missing brackets).
- `<heading>...</heading>` marks a section heading.
- The first line is parsed for metadata; subsequent lines are treated as headings or verses.
- New paragraphs are preserved.
- A "Strip References" toggle removes URLs, parenthetical references, and footnote markers.

## Specification

For full architecture, data models, screen details, and system documentation, see [specification.md](specification.md).
