# Passage - Bible Chapter Memoriser

A minimal, iPhone-first PWA for memorising one Bible chapter at a time using chunked practice and spaced repetition.

## Features
- **Chunked Practice**: Breaks chapters into manageable 4-verse chunks.
- **Learning Modes**: 
  - **Read**: Initial familiarization.
  - **Cloze**: Deterministic word-hiding (20/40/60/80%).
  - **Type**: Full recall with word-level accuracy feedback.
  - **Recite**: Tap-to-reveal lines with self-grading (SM-2 scheduler).
- **Spaced Repetition**: Simple SM-2 algorithm to manage your review queue.
- **Offline First**: Works entirely offline via LocalStorage.

## Tech Stack
- Next.js (App Router)
- TailwindCSS
- Lucide React (Icons)
- next-pwa (PWA support)

## Local Development

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

Build the project:
```bash
npm run build
```
Deploy the `.next` folder to any provider (Vercel recommended).

## iPhone Installation

1. Open the app in **Safari** on your iPhone.
2. Tap the **Share** button (square with an up arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top right corner.
5. Launch **Passage** from your home screen for the full app experience.

## Supported Import Format
Paste your text with verse markers like this:
```text
Romans 8
<1> Therefore, there is now no condemnation for those who are in Christ Jesus,
<2> because through Christ Jesus the law of the Spirit who gives life has set you free...
```
- `<n>` marks a verse.
- The first line without `<>` is treated as the title.
- New paragraphs are preserved.
