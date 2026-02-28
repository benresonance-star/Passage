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
  prosodyIntensity: number; // 0 to 1
}

export const DEFAULT_TUNING: SpeechTuning = {
  sylBase: 0.6,
  sylStep: 0.6,
  pauseFull: 1000,
  pauseComma: 500,
  pauseHyphen: 150,
  prosodyIntensity: 0.5,
};

const FUNCTION_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else", "as", "at", 
  "by", "for", "from", "in", "into", "of", "off", "on", "onto", "out", 
  "over", "to", "up", "with", "is", "was", "be", "been", "being", "it", "its"
]);

/**
 * Calculates the delay in milliseconds for a given word based on its
 * linguistic properties (syllables, punctuation, length) and a base WPM.
 */
export function getWordDelay(
  word: string, 
  wpm: number, 
  tuning: SpeechTuning = DEFAULT_TUNING,
  wordIndex: number = 0,
  allWords: string[] = []
): number {
  // Base delay for an "average" word (approx 5 letters / 1.5 syllables)
  // At 100 WPM, 600ms per word.
  const baseDelay = (60 / wpm) * 1000;
  
  const syllables = countSyllables(word);
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
  
  // 1. Syllable factor: adjust timing based on complexity.
  let syllableFactor = tuning.sylBase + (syllables * tuning.sylStep);
  
  // --- PROSODY HEURISTICS ---
  const intensity = tuning.prosodyIntensity;
  let prosodyMultiplier = 1.0;

  if (intensity > 0) {
    // A. Function Word Compression
    if (FUNCTION_WORDS.has(cleanWord)) {
      prosodyMultiplier *= (1.0 - (0.3 * intensity)); // Up to 0.7x
    }

    // B. Proper Noun Weight (Capitalized words in middle of sentence)
    const isCapitalized = /^[A-Z]/.test(word);
    const isStartOfSentence = wordIndex === 0 || (wordIndex > 0 && /[.!?]$/.test(allWords[wordIndex - 1]));
    if (isCapitalized && !isStartOfSentence) {
      prosodyMultiplier *= (1.0 + (0.2 * intensity)); // Up to 1.2x
    }

    // C. Phrase Ramping (Accelerate in middle of clauses)
    if (allWords.length > 0) {
      // Find distance to previous and next punctuation
      let distFromPrev = 0;
      for (let i = wordIndex - 1; i >= 0; i--) {
        if (/[,;:.!?]$/.test(allWords[i])) break;
        distFromPrev++;
      }
      
      let distToNext = 0;
      for (let i = wordIndex + 1; i < allWords.length; i++) {
        distToNext++;
        if (/[,;:.!?]$/.test(allWords[i])) break;
      }

      const clauseLength = distFromPrev + distToNext + 1;
      if (clauseLength > 3) {
        // Words in middle of clause are faster
        const position = distFromPrev / (clauseLength - 1); // 0 to 1
        // Parabolic speedup: fastest at 0.5 position
        const speedup = Math.sin(position * Math.PI) * 0.2 * intensity;
        prosodyMultiplier *= (1.0 - speedup);
      }
    }
  }

  // 2. Punctuation factor: add pauses for natural breaks.
  let punctuationPause = 0;
  if (/[.!?]$/.test(word)) {
    punctuationPause = tuning.pauseFull;
    
    // D. Sentence Length Fatigue (longer pause after long sentences)
    if (intensity > 0 && allWords.length > 0) {
      let sentenceWordCount = 0;
      for (let i = wordIndex - 1; i >= 0; i--) {
        sentenceWordCount++;
        if (/[.!?]$/.test(allWords[i])) break;
      }
      if (sentenceWordCount > 15) {
        punctuationPause += (sentenceWordCount - 15) * 20 * intensity;
      }
    }
  } else if (/[,;:—]$/.test(word)) {
    punctuationPause = tuning.pauseComma;
  } else if (/-$/.test(word)) {
    punctuationPause = tuning.pauseHyphen;
  }

  // 3. Length factor: very long words take slightly longer even if syllables are low
  const lengthFactor = Math.max(1, word.length / 7);
  
  // Combine factors
  // We apply the syllable factor and prosody multiplier to the base delay, then add punctuation.
  const adjustedDelay = (baseDelay * Math.min(syllableFactor, 2.5) * Math.min(lengthFactor, 1.5) * prosodyMultiplier) + punctuationPause;
  
  return Math.round(adjustedDelay);
}
