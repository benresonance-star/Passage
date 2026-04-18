import type { Chapter, ChunkAudioRef } from "@/types";

type ChunkAudioManifest = Record<string, Record<string, ChunkAudioRef[]>>;

const ROMANS_8_CHAPTER_ID = "niv-romans-romans-8";
const ROMANS_8_VERSES_1_4_CHUNK_ID = "niv-romans-romans-8-v1-4";

// Example mapping for the sample Romans track. In the Vercel-hosted setup, keep
// the deployed file under public/music/... so Next serves it at /music/...
// without changing the chunk metadata shape.
const chunkAudioManifest: ChunkAudioManifest = {
  [ROMANS_8_CHAPTER_ID]: {
    [ROMANS_8_VERSES_1_4_CHUNK_ID]: [
      {
        id: "romans-8-verses-1-4-niv",
        title: "No Condemnation",
        storageKey: "music/Romans 8 Verses 1-4 NIV/No Condemnation.mp3",
        source: "Romans 8 Verses 1-4 NIV",
      },
    ],
  },
};

export function getChunkAudioRefs(
  chapterId: string,
  chunkId: string,
): ChunkAudioRef[] {
  return chunkAudioManifest[chapterId]?.[chunkId] ?? [];
}

export function hydrateChapterAudio(chapter: Chapter): Chapter {
  const chapterManifest = chunkAudioManifest[chapter.id];

  if (!chapterManifest) {
    return chapter;
  }

  let changed = false;
  const hydratedChunks = chapter.chunks.map((chunk) => {
    if (chunk.audio?.length) {
      return chunk;
    }

    const manifestTracks = chapterManifest[chunk.id];
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
