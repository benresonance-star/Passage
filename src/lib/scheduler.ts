import { SM2Card, BCMState, StudySection } from "@/types";
import { getSections } from "./parser";

/**
 * Auto-promotion threshold: once a card has been successfully recalled
 * this many times in a row with high scores, it is marked as memorised.
 */
const MEMORISED_REP_THRESHOLD = 3;

/**
 * Finds the next section to learn (the first one not memorised).
 */
export function getLearnNextSection(chapterId: string, state: BCMState): StudySection | null {
  const chapter = state.chapters[chapterId];
  if (!chapter) return null;
  
  const unit = state.settings.studyUnit || "chunk";
  const sections = getSections(chapter, unit);
  const chapterCards = state.cards[chapterId] || {};
  
  return sections.find(s => !chapterCards[s.id]?.isMemorised) || null;
}

/**
 * Determines if a recall session is due for the chapter.
 * Based on the shortest interval of all memorised sections.
 */
export function getRecallDueStatus(chapterId: string, state: BCMState): { isDue: boolean; nextDueAt: string | null } {
  const chapterCards = state.cards[chapterId] || {};
  const memorisedCards = Object.values(chapterCards).filter(c => c.isMemorised);
  
  if (memorisedCards.length === 0) return { isDue: false, nextDueAt: null };
  
  // Find the earliest nextDueAt among memorised cards
  const earliestDue = memorisedCards.reduce((earliest, card) => {
    const cardDue = new Date(card.nextDueAt).getTime();
    return cardDue < earliest ? cardDue : earliest;
  }, Infinity);
  
  const now = Date.now();
  return {
    isDue: now >= earliestDue,
    nextDueAt: earliestDue === Infinity ? null : new Date(earliestDue).toISOString()
  };
}

export function updateCard(card: SM2Card, score: number): SM2Card {
  const newCard = { ...card };
  newCard.lastScore = score;

  if (score >= 0.9) {
    // Nailed it or high accuracy
    if (newCard.reps === 0) {
      newCard.intervalDays = 1;
    } else if (newCard.reps === 1) {
      newCard.intervalDays = 6;
    } else {
      newCard.intervalDays = Math.round(newCard.intervalDays * newCard.ease);
    }
    newCard.reps += 1;
    newCard.ease = Math.max(1.3, newCard.ease + (0.1 - (1 - score) * (0.1 + (1 - score) * 0.1)));
    newCard.hardUntilAt = null;

    // Auto-promote to memorised after sustained high performance
    if (newCard.reps >= MEMORISED_REP_THRESHOLD && !newCard.isMemorised) {
      newCard.isMemorised = true;
    }
  } else if (score >= 0.75) {
    // Shaky or decent accuracy
    newCard.intervalDays = Math.max(1, Math.round(newCard.intervalDays * 0.5));
    newCard.ease = Math.max(1.3, newCard.ease - 0.2);
    newCard.hardUntilAt = null;
  } else {
    // Missed or low accuracy
    newCard.reps = 0;
    newCard.intervalDays = 0;
    newCard.lapses += 1;
    newCard.ease = Math.max(1.3, newCard.ease - 0.5);

    // Demote if the user fails a previously memorised chunk
    if (newCard.isMemorised) {
      newCard.isMemorised = false;
    }
    
    // Mark as hard for 24 hours
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    newCard.hardUntilAt = tomorrow.toISOString();
  }

  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + newCard.intervalDays);
  newCard.nextDueAt = nextDue.toISOString();

  return newCard;
}

export function createDefaultCard(id: string): SM2Card {
  return {
    id,
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    nextDueAt: new Date().toISOString(),
    lastScore: null,
    hardUntilAt: null,
    isMemorised: false,
  };
}

/**
 * Unified Memorisation Logic:
 * Syncs memorised state between parts (chunks) and verses.
 */
export function syncMemorisedState(
  cards: Record<string, SM2Card>,
  chapter: { chunks: { id: string; verseRange: string }[] },
  targetId: string,
  isMemorised: boolean
): Record<string, SM2Card> {
  const newCards = { ...cards };
  
  // 1. Ensure the target card exists and update it
  if (!newCards[targetId]) {
    newCards[targetId] = createDefaultCard(targetId);
  }
  newCards[targetId] = { ...newCards[targetId], isMemorised };

  const isPart = targetId.includes("-v") && targetId.split("-v").pop()?.includes("-");
  const isVerse = targetId.includes("-v") && !targetId.split("-v").pop()?.includes("-");

  if (isPart) {
    // If a PART is toggled, toggle all constituent VERSES
    const range = targetId.split("-v").pop() || "";
    const [start, end] = range.split("-").map(Number);
    const chapterPrefix = targetId.split("-v")[0];

    for (let v = start; v <= end; v++) {
      const verseId = `${chapterPrefix}-v${v}`;
      if (!newCards[verseId]) {
        newCards[verseId] = createDefaultCard(verseId);
      }
      newCards[verseId] = { ...newCards[verseId], isMemorised };
    }
  } else if (isVerse) {
    // If a VERSE is toggled
    const verseNum = Number(targetId.split("-v").pop());
    const chapterPrefix = targetId.split("-v")[0];

    // Find the PART containing this verse
    const containingPart = chapter.chunks.find(chunk => {
      const [start, end] = chunk.verseRange.split("-").map(Number);
      return verseNum >= start && (end ? verseNum <= end : verseNum === start);
    });

    if (containingPart) {
      if (!isMemorised) {
        // If verse is UNMARKED, the part MUST be unmarked
        if (!newCards[containingPart.id]) {
          newCards[containingPart.id] = createDefaultCard(containingPart.id);
        }
        newCards[containingPart.id] = { ...newCards[containingPart.id], isMemorised: false };
      } else {
        // If verse is MARKED, check if ALL verses in that part are now marked
        const [start, end] = containingPart.verseRange.split("-").map(Number);
        let allVersesMemorised = true;
        for (let v = start; v <= end; v++) {
          const vId = `${chapterPrefix}-v${v}`;
          // If a verse card doesn't exist yet, it definitely isn't memorised
          if (!newCards[vId] || !newCards[vId].isMemorised) {
            allVersesMemorised = false;
            break;
          }
        }
        if (allVersesMemorised) {
          if (!newCards[containingPart.id]) {
            newCards[containingPart.id] = createDefaultCard(containingPart.id);
          }
          newCards[containingPart.id] = { ...newCards[containingPart.id], isMemorised: true };
        }
      }
    }
  }

  return newCards;
}






