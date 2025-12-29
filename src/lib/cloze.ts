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
  
  const words = text.split(/(\s+)/); // Keep whitespace
  const wordIndices: number[] = [];
  
  // Find only actual word indices (not whitespace)
  words.forEach((w, i) => {
    if (/\w+/.test(w)) wordIndices.push(i);
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

  return words.map((w, i) => {
    if (hiddenIndices.has(i)) {
      return "_".repeat(w.length);
    }
    return w;
  }).join("");
}


