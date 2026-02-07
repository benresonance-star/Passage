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
 * Compute the Longest Common Subsequence (LCS) table between two word arrays.
 * Returns a 2D table where dp[i][j] = length of LCS of expected[0..i-1] and actual[0..j-1].
 */
function lcsTable(expected: string[], actual: string[]): number[][] {
  const m = expected.length;
  const n = actual.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (normalize(expected[i - 1]) === normalize(actual[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Backtrack through the LCS table to produce a word-level diff.
 * This approach gracefully handles inserted, deleted, and substituted words
 * without causing cascading mismatches from a single early error.
 */
function backtrackDiff(expected: string[], actual: string[], dp: number[][]): DiffResult[] {
  const results: DiffResult[] = [];
  let i = expected.length;
  let j = actual.length;

  // Collect results in reverse, then flip
  const reversed: DiffResult[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalize(expected[i - 1]) === normalize(actual[j - 1])) {
      // Match
      reversed.push({ word: actual[j - 1], status: "correct" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Extra word in actual (user typed a word that doesn't belong)
      reversed.push({ word: actual[j - 1], status: "extra" });
      j--;
    } else {
      // Missing word from expected (user skipped a word)
      reversed.push({ word: expected[i - 1], status: "missing", expected: expected[i - 1] });
      i--;
    }
  }

  return reversed.reverse();
}

/**
 * Calculate a word-level diff between expected and actual text using LCS.
 * Returns individual word results and an overall accuracy percentage.
 */
export function calculateDiff(expected: string, actual: string) {
  const expectedWords = expected.split(/\s+/).filter(w => w.length > 0);
  const actualWords = actual.split(/\s+/).filter(w => w.length > 0);

  const dp = lcsTable(expectedWords, actualWords);
  const results = backtrackDiff(expectedWords, actualWords, dp);

  const correctCount = results.filter(r => r.status === "correct").length;
  const accuracy = expectedWords.length > 0
    ? Math.round((correctCount / expectedWords.length) * 100)
    : 0;

  return { results, accuracy };
}
