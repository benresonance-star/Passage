export interface DiffResult {
  word: string;
  status: "correct" | "wrong" | "missing" | "extra";
  expected?: string;
}

/**
 * Normalize a word for comparison: lowercase, strip punctuation.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

/**
 * Calculate a word-level diff using sequential matching with a look-ahead window.
 * This approach prevents the algorithm from jumping too far ahead for common words
 * (like "the" or "desires") and correctly identifies missing words in sequence.
 */
export function calculateDiff(expected: string, actual: string) {
  const expectedWords = expected.split(/\s+/).filter(w => w.length > 0);
  const actualWords = actual.split(/\s+/).filter(w => w.length > 0);
  
  const results: DiffResult[] = [];
  let expIdx = 0;
  const WINDOW_SIZE = 8; // Look ahead up to 8 words for a match

  for (let actIdx = 0; actIdx < actualWords.length; actIdx++) {
    const actWord = actualWords[actIdx];
    const normAct = normalize(actWord);
    
    // Try to find the word within the window of expected words
    let matchIdx = -1;
    const searchLimit = Math.min(expIdx + WINDOW_SIZE, expectedWords.length);
    
    for (let i = expIdx; i < searchLimit; i++) {
      if (normalize(expectedWords[i]) === normAct) {
        matchIdx = i;
        break;
      }
    }

    if (matchIdx !== -1) {
      // Match found! 
      // 1. Mark all words we skipped over as MISSING
      for (let i = expIdx; i < matchIdx; i++) {
        results.push({ word: expectedWords[i], status: "missing", expected: expectedWords[i] });
      }
      
      // 2. Mark the current word as CORRECT
      results.push({ word: expectedWords[matchIdx], status: "correct" });
      
      // 3. Advance expected pointer
      expIdx = matchIdx + 1;
    } else {
      // No match found in the window. This is an EXTRA word.
      results.push({ word: actWord, status: "extra" });
    }
  }

  // After processing all actual words, any remaining expected words are MISSING
  for (let i = expIdx; i < expectedWords.length; i++) {
    results.push({ word: expectedWords[i], status: "missing", expected: expectedWords[i] });
  }

  // Calculate accuracy based on number of correct matches relative to total expected words
  const correctCount = results.filter(r => r.status === "correct").length;
  const accuracy = expectedWords.length > 0
    ? Math.round((correctCount / expectedWords.length) * 100)
    : 0;

  return { results, accuracy };
}
