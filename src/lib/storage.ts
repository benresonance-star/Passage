import { BCMState, SM2Card, Chapter } from "@/types";
import { ROMANS_8_SEED } from "./seed";
import { parseChapter, chunkVerses, getChapterSlug } from "./parser";

const STORAGE_KEY = "bcm_v1_state";

export const INITIAL_STATE: BCMState = {
  versions: {
    niv: { id: "niv", name: "New International Version", abbreviation: "NIV" },
  },
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
  const finalTitle = title || "Romans 8";
  const bookName = ROMANS_8_SEED.bookName || "Romans";
  const versionId = ROMANS_8_SEED.versionId || "niv";
  const chunks = chunkVerses(verses, finalTitle, 4, bookName, versionId);
  const chapterId = getChapterSlug(finalTitle, bookName, versionId);
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
    versionId,
    bookName,
    title: finalTitle,
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
      const chapterId = getChapterSlug(parsed.chapter.title, "Romans", "niv");
      const migratedState: BCMState = {
        ...INITIAL_STATE,
        chapters: {
          [chapterId]: {
            ...parsed.chapter,
            id: chapterId,
            versionId: "niv",
            bookName: "Romans",
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

    // Migration for v2.1 (adding Bible Version and Book Name)
    if (parsed.chapters && !parsed.versions) {
      const migratedState: BCMState = {
        ...INITIAL_STATE,
        ...parsed,
        versions: INITIAL_STATE.versions,
        chapters: {},
        cards: {},
        stats: {},
        settings: {
          ...parsed.settings,
          activeChunkId: {}
        }
      };

      // Re-key all chapters with new deterministic IDs
      Object.values(parsed.chapters as Record<string, any>).forEach((ch) => {
        const bookName = ch.bookName || "Romans"; // Default for existing
        const versionId = ch.versionId || "niv";
        const newChapterId = getChapterSlug(ch.title, bookName, versionId);
        
        migratedState.chapters[newChapterId] = {
          ...ch,
          id: newChapterId,
          versionId,
          bookName,
        };

        if (parsed.cards && parsed.cards[ch.id]) {
          migratedState.cards[newChapterId] = parsed.cards[ch.id];
        }
        if (parsed.stats && parsed.stats[ch.id]) {
          migratedState.stats[newChapterId] = parsed.stats[ch.id];
        }
        if (parsed.settings?.activeChunkId?.[ch.id]) {
          migratedState.settings.activeChunkId[newChapterId] = parsed.settings.activeChunkId[ch.id];
        }
      });

      if (parsed.selectedChapterId && parsed.chapters[parsed.selectedChapterId]) {
        const sel = parsed.chapters[parsed.selectedChapterId];
        migratedState.selectedChapterId = getChapterSlug(sel.title, sel.bookName || "Romans", sel.versionId || "niv");
      }

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
