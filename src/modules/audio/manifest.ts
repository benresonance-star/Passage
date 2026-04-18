import type { Chapter, ChunkAudioRef } from "@/types";

interface ChunkAudioManifestEntry {
  chapterIds: string[];
  bookName: string;
  versionId: string;
  chapterNumber: number;
  chunks: Array<{
    chunkIds: string[];
    verseRange: string;
    tracks: ChunkAudioRef[];
  }>;
}

const romans84Track: ChunkAudioRef = {
  id: "romans-8-verses-1-4-niv",
  title: "No Condemnation",
  storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
  source: "Romans 8 Verses 1-4 NIV",
};

// Example mapping for the sample Romans track. In the Vercel-hosted setup, keep
// the deployed file under public/music/... so Next serves it at /music/...
// without changing the chunk metadata shape.
const chunkAudioManifest: ChunkAudioManifestEntry[] = [
  {
    chapterIds: [
      "niv-romans-romans-8",
      "niv-romans-8",
      "romans-8",
      "8",
    ],
    bookName: "Romans",
    versionId: "niv",
    chapterNumber: 8,
    chunks: [
      {
        chunkIds: [
          "niv-romans-romans-8-v1-4",
          "niv-romans-8-v1-4",
          "romans-8-v1-4",
          "8-v1-4",
        ],
        verseRange: "1-4",
        tracks: [romans84Track],
      },
    ],
  },
];

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function getChapterNumber(title: string): number | null {
  const match = title.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function findManifestChapterEntry(
  chapterId: string,
  chapter?: Pick<Chapter, "bookName" | "versionId" | "title">,
): ChunkAudioManifestEntry | undefined {
  return chunkAudioManifest.find((entry) => {
    if (entry.chapterIds.includes(chapterId)) {
      return true;
    }

    if (!chapter) {
      return false;
    }

    return (
      normalize(chapter.bookName) === normalize(entry.bookName) &&
      normalize(chapter.versionId) === normalize(entry.versionId) &&
      getChapterNumber(chapter.title) === entry.chapterNumber
    );
  });
}

function findManifestChunkTracks(
  entry: ChunkAudioManifestEntry | undefined,
  chunkId: string,
  verseRange?: string,
): ChunkAudioRef[] {
  if (!entry) {
    return [];
  }

  const manifestChunk = entry.chunks.find(
    (chunk) => chunk.chunkIds.includes(chunkId) || chunk.verseRange === verseRange,
  );

  return manifestChunk?.tracks ?? [];
}

export function getChunkAudioRefs(
  chapterId: string,
  chunkId: string,
): ChunkAudioRef[] {
  const manifestEntry = findManifestChapterEntry(chapterId);
  return findManifestChunkTracks(manifestEntry, chunkId);
}

export function hydrateChapterAudio(chapter: Chapter): Chapter {
  const chapterManifest = findManifestChapterEntry(chapter.id, chapter);
  if (!chapterManifest) {
    return chapter;
  }

  let changed = false;
  const hydratedChunks = chapter.chunks.map((chunk) => {
    if (chunk.audio?.length) {
      return chunk;
    }

    const manifestTracks = findManifestChunkTracks(
      chapterManifest,
      chunk.id,
      chunk.verseRange,
    );
    if (!manifestTracks?.length) {
      return chunk;
    }

    changed = true;
    return {
      ...chunk,
      audio: manifestTracks,
    };
  });

  return changed
    ? {
        ...chapter,
        chunks: hydratedChunks,
      }
    : chapter;
}
