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

/**
 * Calculates the delay in milliseconds for a given word based on its
 * linguistic properties (syllables, punctuation, length) and a base WPM.
 */
export function getWordDelay(word: string, wpm: number): number {
  // Base delay for an "average" word (approx 5 letters / 1.5 syllables)
  // At 100 WPM, 600ms per word.
  const baseDelay = (60 / wpm) * 1000;
  
  const syllables = countSyllables(word);
  
  // Syllable factor: adjust timing based on complexity.
  // We normalize around 1.5 syllables as "standard".
  const syllableFactor = 0.6 + (syllables * 0.3); // 1 syl = 0.9x, 2 syl = 1.2x, 3 syl = 1.5x
  
  // Punctuation factor: add pauses for natural breaks.
  let punctuationPause = 0;
  if (/[.!?]$/.test(word)) {
    punctuationPause = 750; // Increased from 450
  } else if (/[,;:—]$/.test(word)) {
    punctuationPause = 400; // Increased from 250
  } else if (/-$/.test(word)) {
    punctuationPause = 150; // Increased from 100
  }

  // Length factor: very long words take slightly longer even if syllables are low
  const lengthFactor = Math.max(1, word.length / 7);
  
  // Combine factors
  // We apply the syllable factor to the base delay, then add the punctuation pause.
  // We cap the syllable factor to prevent extreme outliers.
  const adjustedDelay = (baseDelay * Math.min(syllableFactor, 2.5) * Math.min(lengthFactor, 1.5)) + punctuationPause;
  
  return Math.round(adjustedDelay);
}
