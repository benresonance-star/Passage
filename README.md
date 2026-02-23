# Passage - Bible Chapter Memoriser (v3.0.0)

An iPhone-first PWA for memorising Bible chapters through chunked practice, immersive soaking, spaced repetition, and shared group progress tracking with cross-device cloud sync.

## Features

- **Chunked Practice**: Breaks chapters into 4-verse chunks with six learning modes — Read, Flow (word-by-word timed reading), Cloze (deterministic word-hiding at 0/20/40/60/80% + mnemonic), Type (free recall with word-level diff), and Recite (tap-to-reveal with self-grading).
- **Soak Mode**: Full-screen verse-by-verse meditation with breathing gradient background, double-buffer crossfade transitions, and wake lock.
- **Spaced Repetition**: Modified SM-2 algorithm with auto-promotion to memorised after 3 consecutive high scores.
- **Theme Engine**: 6 presets (OLED, Midnight, Sepia, Night Dusk, Classic, Dawn) with CSS custom properties and animated gradients.
- **Cloud Sync**: Cross-device synchronisation via Supabase with realtime subscriptions and timestamp-based conflict resolution.
- **Study Groups**: Shared progress boards, invite links, admin-controlled chapter libraries, and member management.
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
4. Tap **Add** in the top right corner.
5. Launch **Passage** from your home screen for the full app experience.

## Import Formats

### Library Mode

Select from pre-loaded Bible content stored in Supabase. Choose a version, book, and chapter — the text is imported automatically.

### Paste Mode

Paste formatted text with verse markers and optional heading tags:

```text
Romans 8
<heading>Life Through the Spirit</heading>
<1> Therefore, there is now no condemnation for those who are in Christ Jesus,
<2> because through Christ Jesus the law of the Spirit who gives life has set you free...
```

- `<n>` marks a verse number.
- `<heading>...</heading>` marks a section heading.
- The first line without markers is treated as the title.
- New paragraphs are preserved.
- A "Strip References" toggle removes URLs and parenthetical references.

## Specification

For full architecture, data models, screen details, and system documentation, see [specification.md](specification.md).
