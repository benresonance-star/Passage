import { DisplayToken } from "./types";

/**
 * Tokenize a verse string into display tokens.
 *
 * Splits on whitespace; trailing punctuation stays attached to the word
 * so commas/periods aren't orphaned. Each token gets an index-based key
 * that resets per verse — no duplicate-key collisions.
 */
export function tokenizeVerse(text: string): DisplayToken[] {
  // First split by [LINEBREAK] to preserve them as special tokens
  const lines = text.split("[LINEBREAK]");
  const tokens: DisplayToken[] = [];
  let keyIndex = 0;

  lines.forEach((line, lineIdx) => {
    const words = line.split(/\s+/).filter(Boolean);
    words.forEach((word) => {
      tokens.push({
        text: word,
        isWord: true,
        key: keyIndex++,
      });
    });

    // Add a linebreak token if this isn't the last line
    if (lineIdx < lines.length - 1) {
      tokens.push({
        text: "[LINEBREAK]",
        isWord: false,
        key: keyIndex++,
      });
    }
  });

  return tokens;
}


