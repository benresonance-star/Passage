import { BCMState, SM2Card, Chapter } from "@/types";
import { ROMANS_8_SEED } from "./seed";
import { parseChapter, chunkVerses } from "./parser";

const STORAGE_KEY = "bcm_v1_state";

export const INITIAL_STATE: BCMState = {
  chapters: {},
  selectedChapterId: null,
  cards: {},
  stats: {},
  settings: {
    clozeLevel: 20,
    showHeadings: true,
    showMemorised: true,
    activeChunkId: {},
    theme: {
      bg: "#000000",
      text: "#f4f4f5",
    },
  },
};

function seedData(state: BCMState): BCMState {
  const { title, verses } = parseChapter(ROMANS_8_SEED.fullText!);
  const chunks = chunkVerses(verses);
  const chapterId = "romans-8";
  const now = new Date().toISOString();

  const initialCards: Record<string, SM2Card> = {};
  chunks.forEach((chunk) => {
    initialCards[chunk.id] = {
      id: chunk.id,
      ease: 2.5,
      intervalDays: 0,
      reps: 0,
      lapses: 0,
      nextDueAt: now,
      lastScore: null,
      hardUntilAt: null,
      isMemorised: false,
    };
  });

  const starterChapter: Chapter = {
    id: chapterId,
    title: title || "Romans 8",
    fullText: ROMANS_8_SEED.fullText!,
    verses,
    chunks,
    createdAt: now,
  };

  return {
    ...state,
    chapters: { [chapterId]: starterChapter },
    selectedChapterId: chapterId,
    cards: { [chapterId]: initialCards },
    stats: { [chapterId]: { streak: 0, lastActivity: null } },
    settings: {
      ...state.settings,
      activeChunkId: { [chapterId]: chunks[0]?.id || null }
    }
  };
}

export function loadState(): BCMState {
  if (typeof window === "undefined") return INITIAL_STATE;
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    
    // If absolutely no data exists, seed with Romans 8
    if (!data) {
      return seedData(INITIAL_STATE);
    }

    const parsed = JSON.parse(data);

    // Migration for v1 (single chapter) to v2 (multi-chapter)
    if (parsed.chapter && !parsed.chapters) {
      const chapterId = parsed.chapter.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const migratedState: BCMState = {
        ...INITIAL_STATE,
        chapters: {
          [chapterId]: {
            ...parsed.chapter,
            id: chapterId,
            createdAt: new Date().toISOString(),
          }
        },
        selectedChapterId: chapterId,
        cards: {
          [chapterId]: parsed.cards || {}
        },
        stats: {
          [chapterId]: parsed.stats || { streak: 0, lastActivity: null }
        },
        settings: {
          ...INITIAL_STATE.settings,
          activeChunkId: {
            [chapterId]: parsed.settings?.activeChunkId || null
          }
        }
      };
      return migratedState;
    }

    // If library became empty after deletions, we don't re-seed (respect user choice)
    return parsed;
  } catch (e) {
    console.error("Failed to load state:", e);
    return INITIAL_STATE;
  }
}

export function saveState(state: BCMState): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}
