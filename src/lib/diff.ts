export interface DiffResult {
  word: string;
  status: "correct" | "wrong" | "missing" | "extra";
  expected?: string;
}

export function calculateDiff(expected: string, actual: string) {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "").trim();
  
  const expectedWords = expected.split(/\s+/);
  const actualWords = actual.split(/\s+/);
  
  const results: DiffResult[] = [];
  let correctCount = 0;
  
  // Basic word-by-word comparison for simplicity
  // In a more advanced version, we'd use Levenshtein or LCS
  const maxLen = Math.max(expectedWords.length, actualWords.length);
  
  for (let i = 0; i < maxLen; i++) {
    const exp = expectedWords[i];
    const act = actualWords[i];
    
    if (exp && act) {
      if (normalize(exp) === normalize(act)) {
        results.push({ word: act, status: "correct" });
        correctCount++;
      } else {
        results.push({ word: act, status: "wrong", expected: exp });
      }
    } else if (exp) {
      results.push({ word: "___", status: "missing", expected: exp });
    } else if (act) {
      results.push({ word: act, status: "extra" });
    }
  }
  
  const accuracy = Math.round((correctCount / expectedWords.length) * 100);
  
  return { results, accuracy };
}






