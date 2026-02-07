/** A single verse for Soak mode. */
export interface SoakVerse {
  id: string;
  text: string;
}

/** A contiguous section of verses to soak through. */
export interface SoakSection {
  id: string;
  verses: SoakVerse[];
}

/** A display token produced by the tokenizer. */
export interface DisplayToken {
  /** The visible text (word + any attached punctuation). */
  text: string;
  /** True if this token is a tappable word. */
  isWord: boolean;
  /** Unique key within the verse (index-based). */
  key: number;
}

