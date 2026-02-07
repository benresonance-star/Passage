import { DisplayToken } from "./types";

/**
 * Tokenize a verse string into display tokens.
 *
 * Splits on whitespace; trailing punctuation stays attached to the word
 * so commas/periods aren't orphaned. Each token gets an index-based key
 * that resets per verse — no duplicate-key collisions.
 */
export function tokenizeVerse(text: string): DisplayToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => ({
      text: word,
      isWord: true,
      key: index,
    }));
}

