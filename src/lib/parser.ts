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
    
    // Join the rest of the text to process multi-line verses
    const remainingText = lines.slice(firstIdx + 1).join("\n");
    
    // Split the text into segments: either a verse block or a heading block
    // A verse block starts with <n>
    // A heading block is anything else between verse blocks
    const segments = remainingText.split(/(?=<(?:\d+)>)/);
    
    let currentParagraph = false;
    
    for (const segment of segments) {
      const trimmedSegment = segment.trim();
      if (!trimmedSegment) continue;

      const verseMatch = trimmedSegment.match(/^<(\d+)>([\s\S]*)/);
      
      if (verseMatch) {
        const num = parseInt(verseMatch[1]);
        let text = verseMatch[2].trim();
        
        // Preserve internal newlines as [LINEBREAK]
        text = text.replace(/\n/g, "[LINEBREAK]");
        
        verses.push({
          number: num,
          text: (currentParagraph ? "[PARAGRAPH] " : "") + text,
          type: "scripture",
        });
        currentParagraph = false;
      } else {
        // This is a segment that doesn't start with a verse tag.
        // It could be a heading, OR it could be orphaned text (like a quote) belonging to the previous verse.
        
        const lastVerse = verses.length > 0 ? verses[verses.length - 1] : null;
        
        // HEURISTIC: If it starts with a quote or doesn't look like a heading (e.g. not all caps/short),
        // and we have a previous scripture verse, append it to that verse.
        const looksLikeContinuation = lastVerse?.type === "scripture" && 
          (trimmedSegment.startsWith("“") || trimmedSegment.startsWith("\"") || trimmedSegment.startsWith("'") || trimmedSegment.match(/^[a-z]/));

        const isKnownHeading = ["Present Suffering and Future Glory", "More Than Conquerors"].includes(trimmedSegment);

        if (looksLikeContinuation && lastVerse && !isKnownHeading) {
          // Append to previous verse
          const continuationText = trimmedSegment.replace(/\n/g, "[LINEBREAK]");
          lastVerse.text += "[LINEBREAK]" + continuationText;
        } else {
          // Treat as heading(s)
          const parts = trimmedSegment.split(/\n\s*\n/);
          for (const part of parts) {
            const trimmedPart = part.trim();
            if (!trimmedPart) {
              currentParagraph = true;
              continue;
            }
            
            verses.push({
              text: trimmedPart.replace(/\n/g, " "),
              type: "heading",
            });
            currentParagraph = false;
          }
        }
      }
    }
  }

  return { title, verses };
}

/**
 * Generates a stable, deterministic ID from a chapter title, book name, and version.
 * Used to ensure all devices use the same key for the same content.
 */
export function getChapterSlug(title: string, bookName?: string, versionId?: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special chars
    .replace(/[\s_-]+/g, "-") // replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ""); // remove leading/trailing hyphens

  if (bookName && versionId) {
    const versionPart = versionId.toLowerCase().trim();
    const bookPart = bookName.toLowerCase().trim().replace(/[\s_-]+/g, "-");
    // If title already contains book name, we avoid redundancy if possible, 
    // but for simplicity and stability, we use a strict hierarchy: version-book-chapter
    return `${versionPart}-${bookPart}-${base}`;
  }
  
  return base;
}

export function chunkVerses(verses: Verse[], title: string, maxVersesPerChunk: number = 4, bookName?: string, versionId?: string): Chunk[] {
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
        const verseRange = startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`;
        const chapterId = getChapterSlug(title, bookName, versionId);
        
        chunks.push({
          id: `${chapterId}-v${verseRange}`,
          verseRange,
          verses: currentBatch.map(bv => ({
            ...bv,
            text: bv.text.replace("[PARAGRAPH] ", "").trim()
          })),
          text: scriptureVerses.map(sv => sv.text.replace("[PARAGRAPH] ", "").replace(/\[LINEBREAK\]/g, " ").trim()).join(" "),
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
