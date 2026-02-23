# Passage - Bible Chapter Memoriser (v3.1.0)

An iPhone-first PWA for memorising Bible chapters through chunked practice, immersive soaking, spaced repetition, and shared group progress tracking with cross-device cloud sync.

## Features

- **Guided Study Session**: Single-screen flow from reading to recall with 7 stages — Read, Soak (inline verse-focus), Flow (word-by-word rhythmic reading), Recite (tap-to-reveal), Cloze (scaffolded word-hiding), Type (free recall), and Result (accuracy feedback with SM-2 grading). Text stays anchored in the same position across all stages.
- **Study Units**: Choose between studying "Chunks" (groups of ~4 verses) or individual "Verses" via a toggle on the Chapter page. Both track SM-2 progress independently.
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
