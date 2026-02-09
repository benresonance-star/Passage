/**
 * Shared streak calculation utilities.
 * Extracted to avoid duplicating this logic across Practice, Recite, and BCMContext.
 */

/**
 * Calculate the number of days between two dates (ignoring time).
 */
function daysBetween(a: Date, b: Date): number {
  const aDate = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((aDate.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Given the current stats for a chapter, returns an updated streak count.
 * Used after a grading event (Practice / Recite).
 */
export function calculateUpdatedStreak(currentStreak: number, lastActivity: string | null): number {
  if (!lastActivity) return 1;

  const diff = daysBetween(new Date(), new Date(lastActivity));

  if (diff === 1) return currentStreak + 1;
  if (diff > 1) return 1;
  return currentStreak; // same day — no change
}

/**
 * Check if a streak should be reset to 0 (e.g. on app load when >1 day has passed).
 */
export function shouldResetStreak(lastActivity: string | null): boolean {
  if (!lastActivity) return false;
  return daysBetween(new Date(), new Date(lastActivity)) > 1;
}


