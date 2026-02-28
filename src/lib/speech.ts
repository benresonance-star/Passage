/**
 * Heuristic to count syllables in an English word.
 */
export function countSyllables(word: string): number {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleanWord.length <= 3) return 1;
  
  // Basic syllable counting heuristic
  let processed = cleanWord
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "") // remove silent e, es, ed
    .replace(/^y/, ""); // handle y at start
    
  const syllables = processed.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

export interface SpeechTuning {
  sylBase: number;
  sylStep: number;
  pauseFull: number;
  pauseComma: number;
  pauseHyphen: number;
}

export const DEFAULT_TUNING: SpeechTuning = {
  sylBase: 0.6,
  sylStep: 0.6,
  pauseFull: 1000,
  pauseComma: 500,
  pauseHyphen: 150,
};

/**
 * Calculates the delay in milliseconds for a given word based on its
 * linguistic properties (syllables, punctuation, length) and a base WPM.
 */
export function getWordDelay(word: string, wpm: number, tuning: SpeechTuning = DEFAULT_TUNING): number {
  // Base delay for an "average" word (approx 5 letters / 1.5 syllables)
  // At 100 WPM, 600ms per word.
  const baseDelay = (60 / wpm) * 1000;
  
  const syllables = countSyllables(word);
  
  // Syllable factor: adjust timing based on complexity.
  // We normalize around 1.5 syllables as "standard".
  const syllableFactor = tuning.sylBase + (syllables * tuning.sylStep);
  
  // Punctuation factor: add pauses for natural breaks.
  let punctuationPause = 0;
  if (/[.!?]$/.test(word)) {
    punctuationPause = tuning.pauseFull;
  } else if (/[,;:—]$/.test(word)) {
    punctuationPause = tuning.pauseComma;
  } else if (/-$/.test(word)) {
    punctuationPause = tuning.pauseHyphen;
  }

  // Length factor: very long words take slightly longer even if syllables are low
  const lengthFactor = Math.max(1, word.length / 7);
  
  // Combine factors
  // We apply the syllable factor to the base delay, then add the punctuation pause.
  // We cap the syllable factor to prevent extreme outliers.
  const adjustedDelay = (baseDelay * Math.min(syllableFactor, 2.5) * Math.min(lengthFactor, 1.5)) + punctuationPause;
  
  return Math.round(adjustedDelay);
}
