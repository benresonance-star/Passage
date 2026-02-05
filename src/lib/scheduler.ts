import { SM2Card } from "@/types";

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




