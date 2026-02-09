// A simple deterministic pseudo-random generator based on a seed
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function hideWords(text: string, percentage: number, chunkId: string): string {
  if (percentage === 0) return text;
  
  // Split into tokens: words (\w+), punctuation ([^\w\s]+), and whitespace (\s+)
  const tokens = text.split(/(\w+|[^\w\s]+|\s+)/).filter(Boolean);
  const wordIndices: number[] = [];
  
  // Find only actual word indices (alphanumeric)
  tokens.forEach((t, i) => {
    if (/^\w+$/.test(t)) wordIndices.push(i);
  });

  // Use chunkId as seed for deterministic hiding
  const seed = chunkId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = mulberry32(seed);

  const countToHide = Math.floor(wordIndices.length * (percentage / 100));
  
  // Shuffle word indices using the seeded random
  for (let i = wordIndices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [wordIndices[i], wordIndices[j]] = [wordIndices[j], wordIndices[i]];
  }

  const hiddenIndices = new Set(wordIndices.slice(0, countToHide));

  return tokens.map((t, i) => {
    if (hiddenIndices.has(i)) {
      return "_".repeat(t.length);
    }
    return t;
  }).join("");
}

export function generateMnemonic(text: string): string {
  // Split into tokens: words (\w+), punctuation ([^\w\s]+), and whitespace (\s+)
  const tokens = text.split(/(\w+|[^\w\s]+|\s+)/).filter(Boolean);
  
  return tokens.map((t) => {
    if (/^\w+$/.test(t)) {
      // Keep first character, underscore the rest
      const firstChar = t.charAt(0);
      const rest = "_".repeat(t.length - 1);
      return firstChar + rest;
    }
    return t;
  }).join("");
}


