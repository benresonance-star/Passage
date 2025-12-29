import { Verse, Chunk } from "@/types";

export function parseChapter(text: string, stripRefs: boolean = true): { title: string; verses: Verse[] } {
  let processedText = text;
  
  if (stripRefs) {
    processedText = processedText.replace(/https?:\/\/\S+/gi, "");
    processedText = processedText.replace(/\([A-Z\d\s:]+(?:\s[A-Z]+)?\)/gi, "");
  }

  // Auto-fix missing brackets
  processedText = processedText.replace(/(^|\s)(\d+)(?=\s[A-Z])/g, "$1<$2>");

  const lines = processedText.split("\n").map(l => l.trim());
  let title = "My Chapter";
  const verses: Verse[] = [];

  const firstIdx = lines.findIndex(l => l.length > 0);
  if (firstIdx !== -1) {
    title = lines[firstIdx].replace(/[<>]/g, "");
    
    let currentParagraph = false;
    
    for (let i = firstIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length === 0) {
        currentParagraph = true;
        continue;
      }

      const verseMatch = line.match(/<(\d+)>([\s\S]*?)(?=<|$)/g);
      
      if (verseMatch) {
        verseMatch.forEach((v) => {
          const m = v.match(/<(\d+)>([\s\S]*)/);
          if (m) {
            verses.push({
              number: parseInt(m[1]),
              text: (currentParagraph ? "[PARAGRAPH] " : "") + m[2].trim(),
              type: "scripture",
            });
            currentParagraph = false;
          }
        });
      } else {
        verses.push({
          text: line,
          type: "heading",
        });
        currentParagraph = false;
      }
    }
  }

  return { title, verses };
}

/**
 * Generates a stable, deterministic ID from a chapter title.
 * Used to ensure all devices use the same key for the same content.
 */
export function getChapterSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special chars
    .replace(/[\s_-]+/g, "-") // replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ""); // remove leading/trailing hyphens
}

export function chunkVerses(verses: Verse[], maxVersesPerChunk: number = 4): Chunk[] {
  const chunks: Chunk[] = [];
  let currentBatch: Verse[] = [];
  let scriptureCount = 0;

  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    const nextV = verses[i + 1];

    const isScripture = v.type === "scripture";
    const isHeading = v.type === "heading";
    const hasParagraphBreak = isScripture && v.text.includes("[PARAGRAPH]");
    
    // Heading check: Does the next item exist and is it a heading?
    // If so, we MUST close the current chunk before the heading starts.
    const nextIsHeading = nextV && nextV.type === "heading";

    currentBatch.push(v);
    if (isScripture) scriptureCount++;

    const isLast = i === verses.length - 1;
    
    // Break logic:
    // 1. We have scripture AND (max size reached OR paragraph break OR next is a new section heading)
    // 2. We are at the end of the verses
    const shouldBreak = scriptureCount > 0 && (
      scriptureCount >= maxVersesPerChunk || 
      hasParagraphBreak || 
      nextIsHeading || 
      isLast
    );

    if (shouldBreak) {
      const scriptureVerses = currentBatch.filter(bv => bv.type === "scripture");
      
      // Safety check: if we only have headings in currentBatch (shouldn't happen with scriptureCount > 0)
      if (scriptureVerses.length > 0) {
        const startVerse = scriptureVerses[0].number;
        const endVerse = scriptureVerses[scriptureVerses.length - 1].number;
        
        chunks.push({
          id: `chunk-${startVerse}-${endVerse}-${Date.now()}-${chunks.length}`,
          verseRange: startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`,
          verses: currentBatch.map(bv => ({
            ...bv,
            text: bv.text.replace("[PARAGRAPH] ", "").trim()
          })),
          text: scriptureVerses.map(sv => sv.text.replace("[PARAGRAPH] ", "").trim()).join(" "),
        });
        
        currentBatch = [];
        scriptureCount = 0;
      }
    }
  }
  
  // Clean up any trailing headings (attach to last chunk if they exist)
  if (currentBatch.length > 0 && chunks.length > 0) {
    const lastChunk = chunks[chunks.length - 1];
    lastChunk.verses = [...lastChunk.verses, ...currentBatch];
  }

  return chunks;
}

export function splitIntoLines(text: string): string[] {
  const parts = text.split(/([.!?]+\s+)/);
  const lines: string[] = [];
  
  for (let i = 0; i < parts.length; i += 2) {
    const line = (parts[i] + (parts[i + 1] || "")).trim();
    if (line.length > 0) {
      const words = line.split(" ");
      if (words.length > 15) {
        for (let j = 0; j < words.length; j += 12) {
          const subLine = words.slice(j, j + 12).join(" ");
          lines.push(subLine);
        }
      } else {
        lines.push(line);
      }
    }
  }
  
  return lines;
}
