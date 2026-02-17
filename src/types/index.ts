export interface Verse {
  number?: number;
  text: string;
  type: "scripture" | "heading";
}

export interface Chunk {
  id: string;
  verseRange: string; // e.g. "1-3"
  verses: Verse[];
  text: string;
}

export interface SM2Card {
  id: string; // same as chunkId
  ease: number; // starts at 2.5
  intervalDays: number; // starts at 0
  reps: number;
  lapses: number;
  nextDueAt: string; // ISO date
  lastScore: number | null;
  hardUntilAt: string | null; // for failed chunks (24h)
  isMemorised: boolean;
}

export interface BibleVersion {
  id: string; // e.g. "niv"
  name: string; // e.g. "New International Version"
  abbreviation: string; // e.g. "NIV"
}

export interface Chapter {
  id: string;
  versionId: string;
  bookName: string;
  title: string;
  fullText: string;
  verses: Verse[];
  chunks: Chunk[];
  createdAt: string;
}

export interface BCMState {
  versions: Record<string, BibleVersion>;
  chapters: Record<string, Chapter>;
  selectedChapterId: string | null;
  cards: Record<string, Record<string, SM2Card>>; // Keyed by chapterId, then chunkId
  stats: Record<string, {
    streak: number;
    lastActivity: string | null;
  }>; // Keyed by chapterId
  settings: {
    clozeLevel: 0 | 20 | 40 | 60 | 80 | "mnemonic";
    showHeadings: boolean;
    visibilityMode?: 0 | 1 | 2; // 0: All, 1: No Headings, 2: Hide All (Headings + Verse Numbers)
    showMemorised: boolean;
    activeChunkId: Record<string, string | null>; // Keyed by chapterId
    theme?: {
      bg: string;
      text: string;
      id?: string; // "dawn" for the breathing gradient theme
    };
    highlightedWords?: string[]; // Array of normalized words to highlight
  };
}

